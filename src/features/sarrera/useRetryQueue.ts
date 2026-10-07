import { useCallback, useEffect, useRef, useState } from 'react'
import { insertAttendance } from './api'
import {
  addToQueue,
  parseQueue,
  removeByMember,
  removeFromQueue,
  serializeQueue,
  type QueuedRegistration,
} from './queue'

const STORAGE_KEY = 'take.attendanceQueue'
const RETRY_INTERVAL_MS = 10_000

function load(): QueuedRegistration[] {
  return parseQueue(localStorage.getItem(STORAGE_KEY))
}

function save(queue: QueuedRegistration[]): void {
  localStorage.setItem(STORAGE_KEY, serializeQueue(queue))
}

export interface RetryQueue {
  pendingCount: number
  enqueue: (item: QueuedRegistration) => void
  dropMember: (matchId: string, memberNumber: number) => void
}

// Cola persistente en localStorage: si una escritura falla por red, se guarda
// aquí y se reintenta sola (al volver online, por intervalo o al encolar).
// No se pierde ningún registro por un corte puntual de WiFi (PLAN §7.1).
export function useRetryQueue(): RetryQueue {
  const [queue, setQueue] = useState<QueuedRegistration[]>(load)
  const flushing = useRef(false)

  const commit = useCallback((next: QueuedRegistration[]) => {
    save(next)
    setQueue(next)
  }, [])

  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    try {
      let current = load()
      for (const item of current) {
        const result = await insertAttendance({
          matchId: item.matchId,
          memberNumber: item.memberNumber,
          deviceLabel: item.deviceLabel,
        })
        if (result.kind === 'network') break // seguimos sin red: reintentar luego
        // ok, duplicate (ya existe) o error no reintentable: fuera de la cola
        current = removeFromQueue(current, item.clientId)
        save(current)
        setQueue(current)
      }
    } finally {
      flushing.current = false
    }
  }, [])

  const enqueue = useCallback(
    (item: QueuedRegistration) => {
      commit(addToQueue(load(), item))
      void flush()
    },
    [commit, flush],
  )

  const dropMember = useCallback(
    (matchId: string, memberNumber: number) => {
      commit(removeByMember(load(), matchId, memberNumber))
    },
    [commit],
  )

  useEffect(() => {
    void flush()
    const onOnline = () => void flush()
    window.addEventListener('online', onOnline)
    const id = window.setInterval(() => void flush(), RETRY_INTERVAL_MS)
    return () => {
      window.removeEventListener('online', onOnline)
      window.clearInterval(id)
    }
  }, [flush])

  return { pendingCount: queue.length, enqueue, dropMember }
}
