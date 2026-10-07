import { supabase } from './supabase'
import type { RankingRow } from '../types/database'

// Lectura del ranking público mediante las funciones `security definer`
// ejecutables por anon (PLAN §5). Neutra: la usan la vista pública y la
// exportación de gestión.

export async function fetchSeasons(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_seasons')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.season)
}

export async function fetchRanking(season: string): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc('get_ranking', { p_season: season })
  if (error) throw new Error(error.message)
  return data ?? []
}
