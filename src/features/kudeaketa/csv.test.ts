import { describe, it, expect } from 'vitest'
import type { Member } from '../../types/database'
import {
  buildImportPreview,
  CSV_REASON,
  parseMembersCsv,
  previewToUpsert,
} from './csv'

function member(number: number, name: string, active = true): Member {
  return { number, name, active, created_at: '2026-10-01T00:00:00Z' }
}

describe('parseMembersCsv', () => {
  it('delimitador punto y coma con cabecera', () => {
    const csv = 'zenbakia;izena\n1;Jon Agirre\n2;Ane Lasa'
    const { rows, errors } = parseMembersCsv(csv)
    expect(errors).toEqual([])
    expect(rows).toEqual([
      { line: 2, number: 1, name: 'Jon Agirre' },
      { line: 3, number: 2, name: 'Ane Lasa' },
    ])
  })

  it('delimitador coma sin cabecera', () => {
    const csv = '10,Mikel Zubizarreta\n11,Uxue Mujika'
    const { rows, errors } = parseMembersCsv(csv)
    expect(errors).toEqual([])
    expect(rows.map((r) => r.number)).toEqual([10, 11])
  })

  it('ignora el BOM al principio', () => {
    const csv = '﻿1;Jon'
    const { rows, errors } = parseMembersCsv(csv)
    expect(errors).toEqual([])
    expect(rows).toEqual([{ line: 1, number: 1, name: 'Jon' }])
  })

  it('normaliza ceros a la izquierda del número', () => {
    const { rows } = parseMembersCsv('007;Jon')
    expect(rows[0]?.number).toBe(7)
  })

  it('marca errores: número inválido, nombre vacío y columna que falta', () => {
    const csv = ['1;Jon', 'abc;Mikel', '3;', 'soloUnaColumna'].join('\n')
    const { rows, errors } = parseMembersCsv(csv)
    expect(rows.map((r) => r.number)).toEqual([1])
    expect(errors.map((e) => e.reason)).toEqual([
      CSV_REASON.invalidNumber,
      CSV_REASON.emptyName,
      CSV_REASON.missingColumns,
    ])
  })

  it('marca como error el número repetido en el fichero', () => {
    const { rows, errors } = parseMembersCsv('1;Jon\n1;Jon berria')
    expect(rows).toHaveLength(1)
    expect(errors[0]?.reason).toBe(CSV_REASON.duplicate)
  })
})

describe('buildImportPreview', () => {
  const existing = [member(1, 'Jon Agirre'), member(2, 'Ane Lasa', false)]

  it('clasifica en nuevos, renombrados y sin cambios', () => {
    const parsed = parseMembersCsv(
      ['1;Jon Agirre', '2;Ane Lasa Berri', '3;Iker Berria'].join('\n'),
    )
    const preview = buildImportPreview(parsed, existing)
    expect(preview.unchanged).toBe(1) // nº 1 igual
    expect(preview.toRename).toEqual([
      { number: 2, oldName: 'Ane Lasa', newName: 'Ane Lasa Berri' },
    ])
    expect(preview.toCreate.map((r) => r.number)).toEqual([3])
  })
})

describe('previewToUpsert', () => {
  it('incluye altas y renombres, con el nombre nuevo', () => {
    const parsed = parseMembersCsv(['2;Ane Berri', '3;Iker'].join('\n'))
    const preview = buildImportPreview(parsed, [member(2, 'Ane Lasa')])
    expect(previewToUpsert(preview)).toEqual([
      { number: 3, name: 'Iker' },
      { number: 2, name: 'Ane Berri' },
    ])
  })
})
