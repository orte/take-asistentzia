import type { Match } from '../../types/database'
import { parseCsvToRows, type CsvRowError } from './csv'

// Importación del calendario de partidos desde CSV. Tres columnas, en este
// orden: Denboraldia (temporada), Aurkaria (rival), Data (fecha).

export interface MatchCsvRow {
  line: number
  season: string
  opponent: string
  matchDate: string // normalizada a 'YYYY-MM-DD'
}

export interface MatchesCsvParseResult {
  rows: MatchCsvRow[]
  errors: CsvRowError[]
}

export interface MatchesImportPreview {
  toCreate: MatchCsvRow[]
  existing: number
  errors: CsvRowError[]
}

export const MATCH_CSV_REASON = {
  missingColumns: 'Zutabeak falta dira (Denboraldia, Aurkaria, Data behar dira)',
  emptySeason: 'Denboraldia hutsik dago',
  emptyOpponent: 'Aurkaria hutsik dago',
  invalidDate: 'Data baliogabea (erabili UUUU-HH-EE edo EE/HH/UUUU)',
  duplicate: 'Partida errepikatuta fitxategian',
} as const

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return day >= 1 && day <= daysInMonth
}

// Acepta 'YYYY-MM-DD' o 'DD/MM/YYYY' (o con guiones) y normaliza a 'YYYY-MM-DD'.
// Devuelve null si no es una fecha de calendario válida.
export function parseCsvDate(input: string): string | null {
  const text = input.trim()

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    return isValidYmd(year, month, day) ? `${year}-${pad2(month)}-${pad2(day)}` : null
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    const year = Number(dmy[3])
    return isValidYmd(year, month, day) ? `${year}-${pad2(month)}-${pad2(day)}` : null
  }

  return null
}

export function parseMatchesCsv(text: string): MatchesCsvParseResult {
  const data = parseCsvToRows(text)
  const rows: MatchCsvRow[] = []
  const errors: CsvRowError[] = []
  const seen = new Set<string>()

  // Cabecera: si la fecha de la primera fila no es válida, se toma como cabecera.
  const firstDate = data[0]?.[2] ?? ''
  const startIndex = parseCsvDate(firstDate) === null ? 1 : 0

  for (let i = startIndex; i < data.length; i++) {
    const cells = data[i] ?? []
    const line = i + 1
    const raw = cells.join(' | ')

    if (cells.length < 3) {
      errors.push({ line, raw, reason: MATCH_CSV_REASON.missingColumns })
      continue
    }

    const season = (cells[0] ?? '').trim()
    if (season.length === 0) {
      errors.push({ line, raw, reason: MATCH_CSV_REASON.emptySeason })
      continue
    }

    const opponent = (cells[1] ?? '').trim()
    if (opponent.length === 0) {
      errors.push({ line, raw, reason: MATCH_CSV_REASON.emptyOpponent })
      continue
    }

    const matchDate = parseCsvDate(cells[2] ?? '')
    if (matchDate === null) {
      errors.push({ line, raw, reason: MATCH_CSV_REASON.invalidDate })
      continue
    }

    const key = `${season}|${matchDate}|${opponent}`
    if (seen.has(key)) {
      errors.push({ line, raw, reason: MATCH_CSV_REASON.duplicate })
      continue
    }
    seen.add(key)
    rows.push({ line, season, opponent, matchDate })
  }

  return { rows, errors }
}

// Compara con los partidos existentes por (temporada, fecha, rival): así una
// reimportación del mismo calendario no crea duplicados.
export function buildMatchesImportPreview(
  parsed: MatchesCsvParseResult,
  existingMatches: readonly Match[],
): MatchesImportPreview {
  const key = (season: string, date: string, opponent: string) =>
    `${season}|${date}|${opponent}`
  const existingKeys = new Set(
    existingMatches.map((m) => key(m.season, m.match_date, m.opponent)),
  )

  const toCreate: MatchCsvRow[] = []
  let existing = 0
  for (const row of parsed.rows) {
    if (existingKeys.has(key(row.season, row.matchDate, row.opponent))) {
      existing += 1
    } else {
      toCreate.push(row)
    }
  }

  return { toCreate, existing, errors: parsed.errors }
}
