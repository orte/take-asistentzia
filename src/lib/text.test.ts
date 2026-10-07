import { describe, it, expect } from 'vitest'
import { normalizeText } from './text'

describe('normalizeText', () => {
  it('pasa a minúsculas', () => {
    expect(normalizeText('AITOR')).toBe('aitor')
  })

  it('quita tildes y diacríticos', () => {
    expect(normalizeText('Begoña')).toBe('begona')
    expect(normalizeText('Íñigo')).toBe('inigo')
    expect(normalizeText('José Mª')).toBe('jose mª')
  })

  it('recorta espacios al principio y al final', () => {
    expect(normalizeText('  Jon  ')).toBe('jon')
  })

  it('es idempotente para texto ya normalizado', () => {
    expect(normalizeText(normalizeText('Etxeberría'))).toBe('etxeberria')
  })
})
