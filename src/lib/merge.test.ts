import { describe, expect, it } from 'vitest'
import { mergeBooks } from './merge'
import type { Contact, Tag } from './types'

const contact = (id: string, name: string, patch: Partial<Contact> = {}): Contact => ({
  id,
  name,
  email: `${name.toLowerCase()}@example.com`,
  phone: '',
  tagIds: [],
  notes: '',
  createdAt: 1,
  updatedAt: 1,
  ...patch,
})

const tag = (id: string, name: string): Tag => ({ id, name, colour: 'blue' })

describe('mergeBooks', () => {
  it('adds the contacts the online copy does not have', () => {
    const m = mergeBooks(
      { contacts: [contact('a', 'Ada')], tags: [] },
      { contacts: [contact('b', 'Bob')], tags: [] },
    )
    expect(m.contacts.map((c) => c.name)).toEqual(['Ada', 'Bob'])
    expect(m.added).toBe(1)
  })

  it('the same id keeps whichever copy was edited last', () => {
    const online = contact('a', 'Ada', { notes: 'old', updatedAt: 1 })
    const newer = contact('a', 'Ada', { notes: 'new', updatedAt: 2 })
    expect(mergeBooks({ contacts: [online], tags: [] }, { contacts: [newer], tags: [] })).toMatchObject({
      contacts: [{ notes: 'new' }],
      added: 0,
      updated: 1,
    })
    expect(mergeBooks({ contacts: [newer], tags: [] }, { contacts: [online], tags: [] })).toMatchObject({
      contacts: [{ notes: 'new' }],
      updated: 0,
    })
  })

  it('the same person under a different id is not added twice', () => {
    const m = mergeBooks(
      { contacts: [contact('a', 'Ada')], tags: [] },
      { contacts: [contact('x', 'ada')], tags: [] },
    )
    expect(m.contacts).toHaveLength(1)
    expect(m.contacts[0].id).toBe('a')
    expect(m.added).toBe(0)
  })

  it('a tag of the same name becomes one tag, and contacts follow it', () => {
    const m = mergeBooks(
      { contacts: [], tags: [tag('t1', 'Work')] },
      { contacts: [contact('b', 'Bob', { tagIds: ['t9', 't2'] })], tags: [tag('t9', 'work'), tag('t2', 'Gym')] },
    )
    expect(m.tags.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(m.contacts[0].tagIds).toEqual(['t1', 't2'])
  })
})
