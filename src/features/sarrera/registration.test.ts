import { describe, it, expect } from 'vitest'
import type { Member } from '../../types/database'
import {
  evaluateRegistration,
  parseMemberNumber,
  searchMembers,
  type RegistrationContext,
} from './registration'

function member(number: number, name: string, active = true): Member {
  return { number, name, active, created_at: '2026-10-01T00:00:00Z' }
}

function context(
  members: Member[],
  attendances: Array<{ number: number; registered_at: string }> = [],
): RegistrationContext {
  return {
    members: new Map(members.map((m) => [m.number, m])),
    attendances: new Map(
      attendances.map((a) => [a.number, { registered_at: a.registered_at }]),
    ),
  }
}

describe('parseMemberNumber', () => {
  it('acepta enteros positivos', () => {
    expect(parseMemberNumber('42')).toBe(42)
  })

  it('ignora ceros a la izquierda', () => {
    expect(parseMemberNumber('007')).toBe(7)
  })

  it('rechaza vacío, cero, negativos y no numéricos', () => {
    expect(parseMemberNumber('')).toBeNull()
    expect(parseMemberNumber('   ')).toBeNull()
    expect(parseMemberNumber('0')).toBeNull()
    expect(parseMemberNumber('00')).toBeNull()
    expect(parseMemberNumber('-5')).toBeNull()
    expect(parseMemberNumber('12a')).toBeNull()
    expect(parseMemberNumber('1.5')).toBeNull()
  })
})

describe('evaluateRegistration', () => {
  const members = [member(1, 'Jon Agirre'), member(2, 'Ane Lasa', false)]

  it('número inexistente -> unknown', () => {
    const outcome = evaluateRegistration(context(members), 99)
    expect(outcome.status).toBe('unknown')
    expect(outcome.name).toBeNull()
  })

  it('socio inactivo -> inactive (con nombre)', () => {
    const outcome = evaluateRegistration(context(members), 2)
    expect(outcome.status).toBe('inactive')
    expect(outcome.name).toBe('Ane Lasa')
  })

  it('socio activo sin registro previo -> registered', () => {
    const outcome = evaluateRegistration(context(members), 1)
    expect(outcome.status).toBe('registered')
    expect(outcome.name).toBe('Jon Agirre')
    expect(outcome.previousAt).toBeNull()
  })

  it('socio ya registrado -> duplicate (con hora previa)', () => {
    const ctx = context(members, [{ number: 1, registered_at: '2026-10-07T17:05:00Z' }])
    const outcome = evaluateRegistration(ctx, 1)
    expect(outcome.status).toBe('duplicate')
    expect(outcome.previousAt).toBe('2026-10-07T17:05:00Z')
  })

  it('inactivo tiene prioridad sobre duplicado', () => {
    const ctx = context(members, [{ number: 2, registered_at: '2026-10-07T17:05:00Z' }])
    expect(evaluateRegistration(ctx, 2).status).toBe('inactive')
  })
})

describe('searchMembers', () => {
  const members = [
    member(10, 'Jon Agirre'),
    member(11, 'Ane Lasa'),
    member(12, 'Iñaki Etxeberria'),
    member(123, 'Mikel Zubizarreta'),
  ]

  it('busca por nombre sin distinguir mayúsculas ni tildes', () => {
    expect(searchMembers(members, 'inaki').map((m) => m.number)).toEqual([12])
    expect(searchMembers(members, 'LASA').map((m) => m.number)).toEqual([11])
  })

  it('coincide por cualquier parte del nombre', () => {
    expect(searchMembers(members, 'agirre').map((m) => m.number)).toEqual([10])
  })

  it('con dígitos busca por prefijo de número', () => {
    expect(searchMembers(members, '12').map((m) => m.number)).toEqual([12, 123])
  })

  it('consulta vacía no devuelve nada', () => {
    expect(searchMembers(members, '  ')).toEqual([])
  })

  it('respeta el límite', () => {
    expect(searchMembers(members, 'a', 2)).toHaveLength(2)
  })
})
