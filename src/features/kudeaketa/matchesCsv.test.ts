import { describe, it, expect } from 'vitest'
import type { Match } from '../../types/database'
import {
  buildMatchesImportPreview,
  MATCH_CSV_REASON,
  parseCsvDate,
  parseMatchesCsv,
} from './matchesCsv'

function match(season: string, match_date: string, opponent: string): Match {
  return {
    id: `${season}-${opponent}`,
    season,
    match_date,
    opponent,
    created_at: '2026-10-01T00:00:00Z',
  }
}

describe('parseCsvDate', () => {
  it('acepta ISO YYYY-MM-DD', () => {
    expect(parseCsvDate('2026-10-07')).toBe('2026-10-07')
  })

  it('acepta DD/MM/YYYY y DD-MM-YYYY y normaliza', () => {
    expect(parseCsvDate('7/10/2026')).toBe('2026-10-07')
    expect(parseCsvDate('07-10-2026')).toBe('2026-10-07')
  })

  it('rechaza fechas imposibles o con formato raro', () => {
    expect(parseCsvDate('2026-13-01')).toBeNull()
    expect(parseCsvDate('31/02/2026')).toBeNull()
    expect(parseCsvDate('no-fecha')).toBeNull()
    expect(parseCsvDate('2026/10/07')).toBeNull()
  })
})

describe('parseMatchesCsv', () => {
  it('con cabecera y punto y coma', () => {
    const csv = ['Denboraldia;Aurkaria;Data', '2026-27;Gipuzkoa Basket;2026-10-07'].join('\n')
    const { rows, errors } = parseMatchesCsv(csv)
    expect(errors).toEqual([])
    expect(rows).toEqual([
      { line: 2, season: '2026-27', opponent: 'Gipuzkoa Basket', matchDate: '2026-10-07' },
    ])
  })

  it('sin cabecera, coma y fecha DD/MM/YYYY', () => {
    const { rows, errors } = parseMatchesCsv('2026-27,Araberri,14/10/2026')
    expect(errors).toEqual([])
    expect(rows[0]).toEqual({
      line: 1,
      season: '2026-27',
      opponent: 'Araberri',
      matchDate: '2026-10-14',
    })
  })

  it('marca errores: temporada vacía, rival vacío, fecha mala, columnas de menos', () => {
    const csv = [
      '2026-27;Bilbao;2026-10-07',
      ';Zornotza;2026-10-21',
      '2026-27;;2026-10-28',
      '2026-27;Tau;no-fecha',
      '2026-27;Soilik bi',
    ].join('\n')
    const { rows, errors } = parseMatchesCsv(csv)
    expect(rows).toHaveLength(1)
    expect(errors.map((e) => e.reason)).toEqual([
      MATCH_CSV_REASON.emptySeason,
      MATCH_CSV_REASON.emptyOpponent,
      MATCH_CSV_REASON.invalidDate,
      MATCH_CSV_REASON.missingColumns,
    ])
  })

  it('marca como error el partido repetido en el fichero', () => {
    const csv = ['2026-27;Araberri;2026-10-07', '2026-27;Araberri;07/10/2026'].join('\n')
    const { rows, errors } = parseMatchesCsv(csv)
    expect(rows).toHaveLength(1)
    expect(errors[0]?.reason).toBe(MATCH_CSV_REASON.duplicate)
  })
})

describe('buildMatchesImportPreview', () => {
  it('separa nuevos de los ya existentes por temporada+fecha+rival', () => {
    const existing = [match('2026-27', '2026-10-07', 'Gipuzkoa Basket')]
    const parsed = parseMatchesCsv(
      ['2026-27;Gipuzkoa Basket;2026-10-07', '2026-27;Araberri;2026-10-14'].join('\n'),
    )
    const preview = buildMatchesImportPreview(parsed, existing)
    expect(preview.existing).toBe(1)
    expect(preview.toCreate.map((r) => r.opponent)).toEqual(['Araberri'])
  })
})
