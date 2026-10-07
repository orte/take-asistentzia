import type { Member } from '../../types/database'
import { normalizeText } from '../../lib/text'
import { parseMemberNumber } from '../../lib/memberNumber'

// Re-exportado para compatibilidad: la implementación vive en lib/memberNumber.
export { parseMemberNumber }

// Resultado de evaluar un número en la pantalla de puerta (PLAN §7.1).
export type RegistrationStatus = 'registered' | 'duplicate' | 'unknown' | 'inactive'

export interface RegistrationOutcome {
  status: RegistrationStatus
  memberNumber: number
  name: string | null
  /** Hora del registro previo (ISO), solo en 'duplicate'. */
  previousAt: string | null
}

export interface RegistrationContext {
  members: ReadonlyMap<number, Member>
  attendances: ReadonlyMap<number, { registered_at: string }>
}

// Validación local e instantánea (existe / duplicado / inactivo), sin tocar la
// base de datos. La escritura va en segundo plano (PLAN §7.1).
export function evaluateRegistration(
  ctx: RegistrationContext,
  memberNumber: number,
): RegistrationOutcome {
  const member = ctx.members.get(memberNumber)
  if (!member) {
    return { status: 'unknown', memberNumber, name: null, previousAt: null }
  }
  if (!member.active) {
    return { status: 'inactive', memberNumber, name: member.name, previousAt: null }
  }
  const existing = ctx.attendances.get(memberNumber)
  if (existing) {
    return {
      status: 'duplicate',
      memberNumber,
      name: member.name,
      previousAt: existing.registered_at,
    }
  }
  return { status: 'registered', memberNumber, name: member.name, previousAt: null }
}

// Búsqueda por nombre (sin mayúsculas ni tildes) o, si se teclean dígitos, por
// prefijo de número. Sobre la lista en memoria (PLAN §7.1).
export function searchMembers(
  members: readonly Member[],
  query: string,
  limit = 8,
): Member[] {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []

  if (/^\d+$/.test(trimmed)) {
    return members.filter((m) => String(m.number).startsWith(trimmed)).slice(0, limit)
  }

  const needle = normalizeText(trimmed)
  return members.filter((m) => normalizeText(m.name).includes(needle)).slice(0, limit)
}
