import { supabase } from '../../lib/supabase'
import type { Attendance, Match, Member } from '../../types/database'

// Capa de acceso a datos de la pantalla de puerta. Toda la lógica de decisión
// (válido/duplicado/...) vive en registration.ts; aquí solo hay IO.

export type WriteResult =
  | { kind: 'ok' }
  | { kind: 'duplicate' } // violación de la restricción unique
  | { kind: 'network' } // sin red: reintentar
  | { kind: 'error'; message: string }

const UNIQUE_VIOLATION = '23505'

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchAttendances(matchId: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('match_id', matchId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function insertAttendance(input: {
  matchId: string
  memberNumber: number
  deviceLabel: string | null
}): Promise<WriteResult> {
  try {
    const { error } = await supabase.from('attendances').insert({
      match_id: input.matchId,
      member_number: input.memberNumber,
      device_label: input.deviceLabel,
    })
    if (!error) return { kind: 'ok' }
    if (error.code === UNIQUE_VIOLATION) return { kind: 'duplicate' }
    return { kind: 'error', message: error.message }
  } catch {
    // fetch rechazado => sin red
    return { kind: 'network' }
  }
}

export async function deleteAttendance(
  matchId: string,
  memberNumber: number,
): Promise<WriteResult> {
  try {
    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('match_id', matchId)
      .eq('member_number', memberNumber)
    if (!error) return { kind: 'ok' }
    return { kind: 'error', message: error.message }
  } catch {
    return { kind: 'network' }
  }
}

export async function createMatch(input: {
  season: string
  matchDate: string
  opponent: string
}): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      season: input.season,
      match_date: input.matchDate,
      opponent: input.opponent,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
