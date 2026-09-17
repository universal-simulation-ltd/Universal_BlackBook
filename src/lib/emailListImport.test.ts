import { describe, expect, it } from 'vitest'
import { planListImport } from './emailListImport'
import type { Contact } from './types'

const person = (id: string, name: string, email: string, tagIds: string[] = []): Contact => ({
  id,
  name,
  email,
  phone: '',
  tagIds,
  notes: '',
  createdAt: 1,
  updatedAt: 1,
})

describe('planListImport', () => {
  it('adds new people carrying the list tag, and skips blank rows', () => {
    const plan = planListImport(
      [
        { name: 'Sam', email: 'sam@example.com' },
        { name: '', email: '' },
        { name: '', email: 'solo@example.com' },
      ],
      [],
      'list',
    )
    expect(plan.added.map((c) => [c.name, c.tagIds])).toEqual([
      ['Sam', ['list']],
      ['solo@example.com', ['list']],
    ])
  })

  it('puts somebody already in the book ON the list rather than adding them twice', () => {
    const ada = person('a', 'Ada', 'ada@example.com', ['work'])
    const plan = planListImport([{ name: 'ada', email: 'ADA@example.com' }], [ada], 'list', 5)
    expect(plan.added).toEqual([])
    expect(plan.tagged).toEqual([{ ...ada, tagIds: ['work', 'list'], updatedAt: 5 }])
  })

  it('a row note becomes a new person\'s notes, and is appended to an existing person\'s', () => {
    const ada = person('a', 'Ada', 'ada@example.com', ['list'])
    const plan = planListImport(
      [
        { name: 'Sam', email: 'sam@example.com', notes: 'Met at the fair' },
        { name: 'Ada', email: 'ada@example.com', notes: 'Prefers post' },
      ],
      [{ ...ada, notes: 'Old note' }],
      'list',
    )
    expect(plan.added[0].notes).toBe('Met at the fair')
    expect(plan.tagged[0].notes).toBe('Old note\n\nPrefers post')
    expect(plan.already).toBe(0)
  })

  it('a linked row is that contact by id, and new people are list-only', () => {
    const ada = person('a', 'Ada Lovelace', 'ada@work.example')
    const plan = planListImport(
      [
        { name: 'Ada', email: 'ada@home.example', contactId: 'a' },
        { name: 'Bob', email: 'bob@example.com' },
      ],
      [ada],
      'list',
    )
    expect(plan.tagged.map((c) => c.id)).toEqual(['a'])
    expect(plan.added[0].listOnly).toBe(true)
  })

  it('counts people already on the list, and a row typed twice once', () => {
    const plan = planListImport(
      [
        { name: 'Ada', email: 'ada@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
      ],
      [person('a', 'Ada', 'ada@example.com', ['list'])],
      'list',
    )
    expect(plan.already).toBe(1)
    expect(plan.added).toHaveLength(1)
  })
})
