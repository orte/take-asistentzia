import { describe, it, expect } from 'vitest'
import { safeFilename, toCsv } from './csvExport'

describe('toCsv', () => {
  it('usa punto y coma como separador y CRLF entre filas', () => {
    const csv = toCsv(['a', 'b'], [[1, 2], [3, 4]])
    expect(csv).toBe('a;b\r\n1;2\r\n3;4')
  })

  it('entrecomilla campos con separador, comillas o saltos de línea', () => {
    expect(toCsv(['x'], [['Agirre; Jon']])).toBe('x\r\n"Agirre; Jon"')
    expect(toCsv(['x'], [['dice "hola"']])).toBe('x\r\n"dice ""hola"""')
    expect(toCsv(['x'], [['dos\nlineas']])).toBe('x\r\n"dos\nlineas"')
  })

  it('convierte números a texto', () => {
    expect(toCsv(['n'], [[42]])).toBe('n\r\n42')
  })
})

describe('safeFilename', () => {
  it('quita tildes, espacios y caracteres raros', () => {
    expect(safeFilename('Gipuzkoa Basket / 2026')).toBe('gipuzkoa_basket_2026')
    expect(safeFilename('Áraberri')).toBe('araberri')
  })
})
