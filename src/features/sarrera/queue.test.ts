import { describe, it, expect } from 'vitest'
import {
  addToQueue,
  parseQueue,
  removeByMember,
  removeFromQueue,
  serializeQueue,
  type QueuedRegistration,
} from './queue'

function item(overrides: Partial<QueuedRegistration> = {}): QueuedRegistration {
  return {
    clientId: 'c1',
    matchId: 'm1',
    memberNumber: 1,
    registeredAt: '2026-10-07T17:00:00Z',
    deviceLabel: 'Atea 1',
    ...overrides,
  }
}

describe('addToQueue', () => {
  it('añade un elemento nuevo', () => {
    expect(addToQueue([], item())).toHaveLength(1)
  })

  it('no duplica el mismo socio en el mismo partido', () => {
    const q = addToQueue([], item({ clientId: 'a' }))
    expect(addToQueue(q, item({ clientId: 'b' }))).toHaveLength(1)
  })

  it('sí admite el mismo socio en partidos distintos', () => {
    const q = addToQueue([], item({ matchId: 'm1' }))
    expect(addToQueue(q, item({ clientId: 'x', matchId: 'm2' }))).toHaveLength(2)
  })
})

describe('removeFromQueue / removeByMember', () => {
  it('elimina por clientId', () => {
    const q = [item({ clientId: 'a' }), item({ clientId: 'b', memberNumber: 2 })]
    expect(removeFromQueue(q, 'a').map((i) => i.clientId)).toEqual(['b'])
  })

  it('elimina por partido+socio', () => {
    const q = [item({ memberNumber: 1 }), item({ clientId: 'b', memberNumber: 2 })]
    expect(removeByMember(q, 'm1', 1).map((i) => i.memberNumber)).toEqual([2])
  })
})

describe('serializeQueue / parseQueue', () => {
  it('ida y vuelta', () => {
    const q = [item(), item({ clientId: 'c2', memberNumber: 2, deviceLabel: null })]
    expect(parseQueue(serializeQueue(q))).toEqual(q)
  })

  it('entrada nula o basura devuelve cola vacía', () => {
    expect(parseQueue(null)).toEqual([])
    expect(parseQueue('no es json')).toEqual([])
    expect(parseQueue('{"foo":1}')).toEqual([])
  })

  it('descarta elementos con forma inválida', () => {
    const raw = JSON.stringify([item(), { clientId: 'x' }, { memberNumber: 'no' }])
    expect(parseQueue(raw)).toHaveLength(1)
  })
})
