import { supabase } from '../../lib/supabase'
import type { Match, Member } from '../../types/database'

// Capa de datos de Kudeaketa (PLAN §7.3 y §7.4).

const UNIQUE_VIOLATION = '23505'

export type InsertMemberResult =
  | { ok: true; member: Member }
  | { ok: false; reason: 'duplicate' | 'error'; message?: string }

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('number', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function insertMember(input: {
  number: number
  name: string
}): Promise<InsertMemberResult> {
  const { data, error } = await supabase
    .from('members')
    .insert({ number: input.number, name: input.name })
    .select()
    .single()
  if (!error) return { ok: true, member: data }
  if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate' }
  return { ok: false, reason: 'error', message: error.message }
}

export async function updateMemberName(number: number, name: string): Promise<void> {
  const { error } = await supabase.from('members').update({ name }).eq('number', number)
  if (error) throw new Error(error.message)
}

export async function setMemberActive(number: number, active: boolean): Promise<void> {
  const { error } = await supabase.from('members').update({ active }).eq('number', number)
  if (error) throw new Error(error.message)
}

// Upsert por nº de socio (solo number y name => conserva `active`, PLAN §7.3).
export async function upsertMembers(
  rows: Array<{ number: number; name: string }>,
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('members')
    .upsert(rows, { onConflict: 'number' })
  if (error) throw new Error(error.message)
}

export interface MatchWithCount extends Match {
  attendeeCount: number
}

export async function fetchMatchesWithCounts(): Promise<MatchWithCount[]> {
  const [matchesRes, attendancesRes] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: false }),
    supabase.from('attendances').select('match_id'),
  ])
  if (matchesRes.error) throw new Error(matchesRes.error.message)
  if (attendancesRes.error) throw new Error(attendancesRes.error.message)

  const counts = new Map<string, number>()
  for (const row of attendancesRes.data ?? []) {
    counts.set(row.match_id, (counts.get(row.match_id) ?? 0) + 1)
  }
  return (matchesRes.data ?? []).map((m) => ({
    ...m,
    attendeeCount: counts.get(m.id) ?? 0,
  }))
}

export async function fetchMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function createMatch(input: {
  season: string
  matchDate: string
  opponent: string
}): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert({ season: input.season, match_date: input.matchDate, opponent: input.opponent })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// Alta en bloque del calendario (importación CSV de partidos).
export async function insertMatches(
  rows: Array<{ season: string; matchDate: string; opponent: string }>,
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('matches')
    .insert(rows.map((r) => ({ season: r.season, match_date: r.matchDate, opponent: r.opponent })))
  if (error) throw new Error(error.message)
}

export async function updateMatch(
  id: string,
  input: { season: string; matchDate: string; opponent: string },
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ season: input.season, match_date: input.matchDate, opponent: input.opponent })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteMatch(id: string): Promise<void> {
  // Las asistencias se borran en cascada (FK on delete cascade).
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface AttendanceDetail {
  id: string
  memberNumber: number
  memberName: string | null
  registeredAt: string
  deviceLabel: string | null
}

interface RawAttendanceRow {
  id: string
  member_number: number
  registered_at: string
  device_label: string | null
  members: { name: string } | { name: string }[] | null
}

export async function fetchMatchAttendances(matchId: string): Promise<AttendanceDetail[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select('id, member_number, registered_at, device_label, members(name)')
    .eq('match_id', matchId)
    .order('registered_at', { ascending: true })
  if (error) throw new Error(error.message)

  // La forma del join embebido no la infiere el tipo escrito a mano; lo mapeamos.
  const rows = (data ?? []) as unknown as RawAttendanceRow[]
  return rows.map((row) => {
    const member = Array.isArray(row.members) ? (row.members[0] ?? null) : row.members
    return {
      id: row.id,
      memberNumber: row.member_number,
      memberName: member?.name ?? null,
      registeredAt: row.registered_at,
      deviceLabel: row.device_label,
    }
  })
}

export type AddAttendanceResult =
  | { ok: true }
  | { ok: false; reason: 'duplicate' | 'unknown' | 'error'; message?: string }

const FK_VIOLATION = '23503'

export async function addAttendance(
  matchId: string,
  memberNumber: number,
): Promise<AddAttendanceResult> {
  const { error } = await supabase
    .from('attendances')
    .insert({ match_id: matchId, member_number: memberNumber })
  if (!error) return { ok: true }
  if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate' }
  if (error.code === FK_VIOLATION) return { ok: false, reason: 'unknown' }
  return { ok: false, reason: 'error', message: error.message }
}

export async function removeAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('attendances').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
