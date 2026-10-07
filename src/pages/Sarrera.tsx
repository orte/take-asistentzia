import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { eu } from '../i18n/eu'
import { formatClock, formatDate, madridDateString } from '../lib/datetime'
import { seasonForDate } from '../lib/season'
import { supabase } from '../lib/supabase'
import type { Attendance, Match, Member } from '../types/database'
import {
  createMatch,
  deleteAttendance,
  fetchAttendances,
  fetchMatches,
  fetchMembers,
  insertAttendance,
} from '../features/sarrera/api'
import { evaluateRegistration, parseMemberNumber, searchMembers } from '../features/sarrera/registration'
import FeedbackOverlay, { type Feedback } from '../features/sarrera/FeedbackOverlay'
import Keypad from '../features/sarrera/Keypad'
import MatchSelector from '../features/sarrera/MatchSelector'
import { useRetryQueue } from '../features/sarrera/useRetryQueue'
import { useWakeLock } from '../features/sarrera/useWakeLock'

const DEVICE_LABEL_KEY = 'take.deviceLabel'
const MAX_DIGITS = 6
const RELOAD_MS = 20_000

interface LocalReg {
  memberNumber: number
  name: string
  at: string
}

export default function Sarrera() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)
  const [attendances, setAttendances] = useState<Map<number, Attendance>>(new Map())

  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [lastRegs, setLastRegs] = useState<LocalReg[]>([])

  const [selecting, setSelecting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectorError, setSelectorError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [deviceLabel, setDeviceLabel] = useState(
    () => localStorage.getItem(DEVICE_LABEL_KEY) ?? '',
  )
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const { pendingCount, enqueue, dropMember } = useRetryQueue()
  useWakeLock()

  const membersMap = useMemo(
    () => new Map(members.map((m) => [m.number, m])),
    [members],
  )
  const nonceRef = useRef(0)
  const inputRef = useRef('')
  const today = madridDateString(new Date())

  // --- Carga inicial: socios + partidos, y autoselección del partido de hoy ---
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [mem, mat] = await Promise.all([fetchMembers(), fetchMatches()])
        if (!active) return
        setMembers(mem)
        setMatches(mat)
        const todays = mat.find((m) => m.match_date === madridDateString(new Date())) ?? null
        setActiveMatch(todays)
        setSelecting(todays === null)
        setPhase('ready')
      } catch (e) {
        if (!active) return
        setLoadError(e instanceof Error ? e.message : String(e))
        setPhase('error')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // --- Asistencias del partido activo: carga, Realtime y recarga periódica ---
  useEffect(() => {
    if (!activeMatch) {
      setAttendances(new Map())
      return
    }
    const matchId = activeMatch.id
    let active = true

    async function reload() {
      try {
        const rows = await fetchAttendances(matchId)
        if (!active) return
        setAttendances((prev) => {
          const next = new Map<number, Attendance>(rows.map((r) => [r.member_number, r]))
          // Conservamos los optimistas aún no escritos (siguen en cola).
          for (const [num, att] of prev) {
            if (!next.has(num) && att.id.startsWith('local-')) next.set(num, att)
          }
          return next
        })
      } catch {
        // la recarga es un respaldo; ignoramos fallos puntuales de red
      }
    }

    void reload()
    const intervalId = window.setInterval(() => void reload(), RELOAD_MS)

    const channel = supabase
      .channel(`attendances:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances', filter: `match_id=eq.${matchId}` },
        (payload: RealtimePostgresChangesPayload<Attendance>) => {
          const row = payload.new as Attendance
          if (typeof row.member_number !== 'number') return
          setAttendances((prev) =>
            prev.has(row.member_number) ? prev : new Map(prev).set(row.member_number, row),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'attendances', filter: `match_id=eq.${matchId}` },
        (payload: RealtimePostgresChangesPayload<Attendance>) => {
          const old = payload.old as Partial<Attendance>
          if (typeof old.member_number !== 'number') return
          const num = old.member_number
          setAttendances((prev) => {
            if (!prev.has(num)) return prev
            const next = new Map(prev)
            next.delete(num)
            return next
          })
          setLastRegs((prev) => prev.filter((r) => r.memberNumber !== num))
        },
      )
      .subscribe()

    return () => {
      active = false
      window.clearInterval(intervalId)
      void supabase.removeChannel(channel)
    }
  }, [activeMatch])

  // --- Auto-cierre del aviso (~1,5 s) ---
  useEffect(() => {
    if (!feedback) return
    const id = window.setTimeout(() => setFeedback(null), 1500)
    return () => window.clearTimeout(id)
  }, [feedback])

  // --- Teclado físico: dígitos, Retroceso y Enter (PLAN §7.1) ---
  const handlers = useRef({ digit: (_d: string) => {}, remove: () => {}, submit: () => {} })
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (e.key >= '0' && e.key <= '9') {
        handlers.current.digit(e.key)
        e.preventDefault()
      } else if (e.key === 'Backspace') {
        handlers.current.remove()
        e.preventDefault()
      } else if (e.key === 'Enter') {
        handlers.current.submit()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function setInputValue(value: string) {
    inputRef.current = value
    setInput(value)
  }

  function handleDigit(digit: string) {
    if (feedback) setFeedback(null) // teclear cierra el aviso al instante
    if (inputRef.current.length >= MAX_DIGITS) return
    setInputValue(inputRef.current + digit)
  }

  function handleRemove() {
    setInputValue(inputRef.current.slice(0, -1))
  }

  function handleSubmit() {
    const parsed = parseMemberNumber(inputRef.current)
    setInputValue('')
    if (parsed === null) return
    register(parsed)
  }

  handlers.current = { digit: handleDigit, remove: handleRemove, submit: handleSubmit }

  function register(memberNumber: number) {
    if (!activeMatch) return
    const outcome = evaluateRegistration({ members: membersMap, attendances }, memberNumber)
    setFeedback({
      status: outcome.status,
      memberNumber,
      name: outcome.name,
      previousAt: outcome.previousAt,
      nonce: ++nonceRef.current,
    })

    if (outcome.status === 'unknown' || outcome.status === 'inactive') {
      navigator.vibrate?.(150)
      return
    }
    if (outcome.status === 'duplicate') return

    // registered: UI optimista + escritura en segundo plano
    const nowIso = new Date().toISOString()
    const label = deviceLabel.trim() || null
    const matchId = activeMatch.id
    const optimistic: Attendance = {
      id: `local-${memberNumber}`,
      match_id: matchId,
      member_number: memberNumber,
      registered_at: nowIso,
      device_label: label,
    }
    setAttendances((prev) => new Map(prev).set(memberNumber, optimistic))
    setLastRegs((prev) =>
      [
        { memberNumber, name: outcome.name ?? '', at: nowIso },
        ...prev.filter((r) => r.memberNumber !== memberNumber),
      ].slice(0, 5),
    )

    void insertAttendance({ matchId, memberNumber, deviceLabel: label }).then((result) => {
      if (result.kind === 'duplicate') {
        // Carrera entre puertas: la restricción unique es la garantía final.
        setFeedback({
          status: 'duplicate',
          memberNumber,
          name: outcome.name,
          previousAt: null,
          nonce: ++nonceRef.current,
        })
      } else if (result.kind === 'network') {
        enqueue({
          clientId: crypto.randomUUID(),
          matchId,
          memberNumber,
          registeredAt: nowIso,
          deviceLabel: label,
        })
      } else if (result.kind === 'error') {
        console.error('Errorea erregistratzean:', result.message)
      }
    })
  }

  function removeRegistration(memberNumber: number) {
    if (!activeMatch) return
    const matchId = activeMatch.id
    setAttendances((prev) => {
      const next = new Map(prev)
      next.delete(memberNumber)
      return next
    })
    setLastRegs((prev) => prev.filter((r) => r.memberNumber !== memberNumber))
    setConfirmDelete(null)
    dropMember(matchId, memberNumber)
    void deleteAttendance(matchId, memberNumber)
  }

  function selectMatch(match: Match) {
    setActiveMatch(match)
    setSelecting(false)
    setSelectorError(null)
    setLastRegs([])
  }

  async function handleCreateMatch(opponent: string) {
    setCreating(true)
    setSelectorError(null)
    try {
      const todayStr = madridDateString(new Date())
      const match = await createMatch({
        season: seasonForDate(todayStr),
        matchDate: todayStr,
        opponent,
      })
      setMatches((prev) => [match, ...prev.filter((m) => m.id !== match.id)])
      selectMatch(match)
    } catch (e) {
      setSelectorError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  function updateDeviceLabel(value: string) {
    setDeviceLabel(value)
    localStorage.setItem(DEVICE_LABEL_KEY, value)
  }

  const results = useMemo(() => searchMembers(members, query), [members, query])

  if (phase === 'loading') {
    return <p className="text-slate-500">{eu.common.loading}</p>
  }
  if (phase === 'error') {
    return (
      <div className="text-red-600">
        <p>{eu.common.error}</p>
        {loadError && <p className="text-sm text-slate-500">{loadError}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      {/* Cabecera del partido activo: siempre visible (PLAN §7.1) */}
      <div className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-3">
        {activeMatch ? (
          <div>
            <div className="font-bold text-slate-900">{activeMatch.opponent}</div>
            <div className="text-sm text-slate-500">{formatDate(activeMatch.match_date)}</div>
          </div>
        ) : (
          <div className="text-slate-500">{eu.sarrera.noMatchToday}</div>
        )}
        <button
          type="button"
          onClick={() => setSelecting(true)}
          className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
        >
          {eu.sarrera.changeMatch}
        </button>
      </div>

      {/* Contador + etiqueta de dispositivo + pendientes */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-700">
          {eu.sarrera.attendees}: {attendances.size}
        </span>
        <input
          value={deviceLabel}
          onChange={(e) => updateDeviceLabel(e.target.value)}
          placeholder={eu.sarrera.deviceLabel}
          className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          aria-label={eu.sarrera.deviceLabel}
        />
      </div>
      {pendingCount > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-800">
          {eu.sarrera.pendingSync}: {pendingCount}
        </div>
      )}

      {/* Visor del número */}
      <div className="h-20 rounded-xl bg-white border border-slate-300 flex items-center justify-center">
        <span className="text-4xl font-mono tracking-widest text-slate-900">
          {input || <span className="text-slate-300">—</span>}
        </span>
      </div>

      <Keypad
        onDigit={handleDigit}
        onDelete={handleRemove}
        onSubmit={handleSubmit}
        disabled={!activeMatch}
      />

      {/* Búsqueda por nombre */}
      <div className="flex flex-col gap-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={eu.sarrera.searchByName}
          className="rounded-lg border border-slate-300 px-3 py-2"
          aria-label={eu.sarrera.searchByName}
        />
        {results.length > 0 && (
          <ul className="flex flex-col gap-1">
            {results.map((m) => (
              <li key={m.number}>
                <button
                  type="button"
                  disabled={!activeMatch}
                  onClick={() => {
                    register(m.number)
                    setQuery('')
                  }}
                  className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-slate-500"> · #{m.number}</span>
                  {!m.active && (
                    <span className="text-red-500"> · {eu.kudeaketa.active}: {eu.common.no}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Últimos 5 registros de este dispositivo */}
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-500">
          {eu.sarrera.lastRegistrations}
        </h2>
        {lastRegs.length === 0 ? (
          <p className="text-sm text-slate-400">{eu.sarrera.noRegistrations}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {lastRegs.map((reg, index) => (
              <li
                key={`${reg.memberNumber}-${reg.at}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <span className="truncate">
                  <span className="font-medium">{reg.name}</span>
                  <span className="text-slate-500"> · #{reg.memberNumber}</span>
                  <span className="text-slate-400"> · {formatClock(reg.at)}</span>
                </span>
                {index === 0 ? (
                  <button
                    type="button"
                    onClick={() => removeRegistration(reg.memberNumber)}
                    className="shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    {eu.sarrera.undo}
                  </button>
                ) : confirmDelete === reg.memberNumber ? (
                  <span className="shrink-0 flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => removeRegistration(reg.memberNumber)}
                      className="font-semibold text-red-600"
                    >
                      {eu.common.yes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="text-slate-500"
                    >
                      {eu.common.no}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(reg.memberNumber)}
                    className="shrink-0 text-sm font-medium text-slate-400 hover:text-red-600"
                  >
                    {eu.sarrera.delete}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {feedback && <FeedbackOverlay feedback={feedback} onClose={() => setFeedback(null)} />}

      {selecting && (
        <MatchSelector
          matches={matches}
          today={today}
          creating={creating}
          error={selectorError}
          onSelect={selectMatch}
          onCreate={handleCreateMatch}
          onClose={activeMatch ? () => setSelecting(false) : null}
        />
      )}
    </div>
  )
}
