import { describe, it, expect } from 'vitest'
import { seasonForDate } from './season'

describe('seasonForDate', () => {
  it('octubre de 2026 -> 2026-27', () => {
    expect(seasonForDate('2026-10-07')).toBe('2026-27')
  })

  it('justo en el corte: 1 de julio empieza temporada nueva', () => {
    expect(seasonForDate('2026-07-01')).toBe('2026-27')
    expect(seasonForDate('2026-06-30')).toBe('2025-26')
  })

  it('meses de la segunda mitad de la temporada', () => {
    expect(seasonForDate('2027-03-15')).toBe('2026-27')
    expect(seasonForDate('2027-05-31')).toBe('2026-27')
  })

  it('cruce de siglo/decena con cero a la izquierda', () => {
    expect(seasonForDate('2009-09-01')).toBe('2009-10')
    expect(seasonForDate('2099-08-01')).toBe('2099-00')
  })

  it('fecha inválida lanza error', () => {
    expect(() => seasonForDate('no-es-fecha')).toThrow()
  })
})
