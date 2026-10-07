import { describe, it, expect } from 'vitest'
import { madridDateString, formatClock, formatDate } from './datetime'

describe('madridDateString', () => {
  it('convierte a la fecha local de Madrid (verano, CEST = UTC+2)', () => {
    // 23:30 UTC del 7-oct ya es el 8-oct (01:30) en Madrid.
    expect(madridDateString(new Date('2026-10-07T23:30:00Z'))).toBe('2026-10-08')
  })

  it('convierte a la fecha local de Madrid (invierno, CET = UTC+1)', () => {
    expect(madridDateString(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16')
    expect(madridDateString(new Date('2026-01-15T10:00:00Z'))).toBe('2026-01-15')
  })
})

describe('formatClock', () => {
  it('devuelve la hora en formato HH:MM', () => {
    const value = formatClock('2026-10-07T17:05:00Z') // 19:05 en Madrid (verano)
    expect(value).toMatch(/^\d{2}:\d{2}$/)
    expect(value).toBe('19:05')
  })
})

describe('formatDate', () => {
  it('pasa YYYY-MM-DD a dd/mm/yyyy', () => {
    expect(formatDate('2026-10-07')).toBe('07/10/2026')
  })
})
