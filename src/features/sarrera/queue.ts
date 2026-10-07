// Cola de reintentos para registros cuya escritura falló por red (PLAN §7.1).
// Lógica pura y serializable; el acceso a localStorage y a Supabase vive en el
// hook useRetryQueue.

export interface QueuedRegistration {
  /** Id de cliente para gestionar la cola (no se guarda en la base de datos). */
  clientId: string
  matchId: string
  memberNumber: number
  /** Hora local del registro (ISO), informativa. */
  registeredAt: string
  deviceLabel: string | null
}

export function serializeQueue(queue: readonly QueuedRegistration[]): string {
  return JSON.stringify(queue)
}

export function parseQueue(raw: string | null): QueuedRegistration[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isQueuedRegistration)
  } catch {
    return []
  }
}

// Añade a la cola evitando duplicados del mismo socio en el mismo partido.
export function addToQueue(
  queue: readonly QueuedRegistration[],
  item: QueuedRegistration,
): QueuedRegistration[] {
  const exists = queue.some(
    (q) => q.matchId === item.matchId && q.memberNumber === item.memberNumber,
  )
  return exists ? [...queue] : [...queue, item]
}

export function removeFromQueue(
  queue: readonly QueuedRegistration[],
  clientId: string,
): QueuedRegistration[] {
  return queue.filter((q) => q.clientId !== clientId)
}

export function removeByMember(
  queue: readonly QueuedRegistration[],
  matchId: string,
  memberNumber: number,
): QueuedRegistration[] {
  return queue.filter(
    (q) => !(q.matchId === matchId && q.memberNumber === memberNumber),
  )
}

function isQueuedRegistration(value: unknown): value is QueuedRegistration {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.clientId === 'string' &&
    typeof v.matchId === 'string' &&
    typeof v.memberNumber === 'number' &&
    typeof v.registeredAt === 'string' &&
    (typeof v.deviceLabel === 'string' || v.deviceLabel === null)
  )
}
