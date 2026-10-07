import Papa from 'papaparse'
import { parseMemberNumber } from '../../lib/memberNumber'
import type { Member } from '../../types/database'

// Importación de socios desde CSV (PLAN §7.3): columnas nº de socio y nombre,
// con detección automática de delimitador (`;` o `,`), con o sin cabecera, y
// UTF-8 con o sin BOM. La lógica es pura y testeable; la escritura (upsert) va
// aparte en la capa de datos.

export interface CsvRowError {
  line: number
  raw: string
  reason: string
}

export interface ParsedMemberRow {
  line: number
  number: number
  name: string
}

export interface CsvParseResult {
  rows: ParsedMemberRow[]
  errors: CsvRowError[]
}

export interface ImportPreview {
  toCreate: ParsedMemberRow[]
  toRename: Array<{ number: number; oldName: string; newName: string }>
  unchanged: number
  errors: CsvRowError[]
}

export const CSV_REASON = {
  missingColumns: 'Zutabeak falta dira (zenbakia eta izena behar dira)',
  invalidNumber: 'Bazkide zenbaki baliogabea',
  emptyName: 'Izena hutsik dago',
  duplicate: 'Zenbakia errepikatuta fitxategian',
} as const

// Delimitador a partir de la primera línea (estructural): `;` o `,`.
// Más fiable que la autodetección de PapaParse, que una fila malformada engaña.
function detectDelimiter(text: string): ';' | ',' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const semicolons = firstLine.split(';').length - 1
  const commas = firstLine.split(',').length - 1
  return semicolons > commas ? ';' : ','
}

export function parseMembersCsv(text: string): CsvParseResult {
  // Quita el BOM (U+FEFF) si lo hubiera.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const parsed = Papa.parse<string[]>(clean, {
    delimiter: detectDelimiter(clean),
    skipEmptyLines: true,
  })
  const data = parsed.data

  const rows: ParsedMemberRow[] = []
  const errors: CsvRowError[] = []
  const seen = new Set<number>()

  // Cabecera: si la primera fila no empieza por un nº válido, se considera
  // cabecera y se ignora (sirva el texto que sirva).
  const firstCell = data[0]?.[0] ?? ''
  const startIndex = parseMemberNumber(firstCell) === null ? 1 : 0

  for (let i = startIndex; i < data.length; i++) {
    const cells = data[i] ?? []
    const line = i + 1
    const raw = cells.join(' | ')

    if (cells.length < 2) {
      errors.push({ line, raw, reason: CSV_REASON.missingColumns })
      continue
    }

    const number = parseMemberNumber(cells[0] ?? '')
    if (number === null) {
      errors.push({ line, raw, reason: CSV_REASON.invalidNumber })
      continue
    }

    const name = (cells[1] ?? '').trim()
    if (name.length === 0) {
      errors.push({ line, raw, reason: CSV_REASON.emptyName })
      continue
    }

    if (seen.has(number)) {
      errors.push({ line, raw, reason: CSV_REASON.duplicate })
      continue
    }
    seen.add(number)
    rows.push({ line, number, name })
  }

  return { rows, errors }
}

// Compara las filas válidas con los socios existentes: nuevos, cambios de
// nombre y sin cambios. No toca a los que no vengan en el fichero (PLAN §7.3).
export function buildImportPreview(
  parsed: CsvParseResult,
  existing: readonly Member[],
): ImportPreview {
  const byNumber = new Map(existing.map((m) => [m.number, m]))
  const toCreate: ParsedMemberRow[] = []
  const toRename: ImportPreview['toRename'] = []
  let unchanged = 0

  for (const row of parsed.rows) {
    const current = byNumber.get(row.number)
    if (!current) {
      toCreate.push(row)
    } else if (current.name !== row.name) {
      toRename.push({ number: row.number, oldName: current.name, newName: row.name })
    } else {
      unchanged += 1
    }
  }

  return { toCreate, toRename, unchanged, errors: parsed.errors }
}

// Filas a aplicar como upsert (altas + renombres). El upsert solo lleva number
// y name, así que el `active` de los existentes se conserva (PLAN §7.3).
export function previewToUpsert(
  preview: ImportPreview,
): Array<{ number: number; name: string }> {
  return [
    ...preview.toCreate.map((r) => ({ number: r.number, name: r.name })),
    ...preview.toRename.map((r) => ({ number: r.number, name: r.newName })),
  ]
}
