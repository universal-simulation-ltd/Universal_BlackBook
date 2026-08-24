import { describe, expect, it } from 'vitest'
import { compare, fold, matchesCategories, matchesFrequency, matchesText, runQuery, UNCATEGORISED } from './filter'
import type { Contact } from './types'

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: over.id ?? 'c1',
  name: 'Sam Okonkwo',
  email: 'sam@example.com',
  categoryIds: ['work'],
  frequency: 'monthly',
  notes: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

describe('fold', () => {
  it('strips case and surrounding space', () => {
    expect(fold('  Sam  ')).toBe('sam')
  })

  it('strips accents so a plain-ASCII search finds an accented name', () => {
    expect(fold('Zoë')).toBe('zoe')
    expect(fold('José Ramírez')).toBe('jose ramirez')
  })
})

describe('matchesText', () => {
  it('matches nothing typed', () => {
    expect(matchesText(contact(), '   ')).toBe(true)
  })

  it('searches name, email and notes', () => {
    const c = contact({ name: 'Priya', email: 'p@corp.io', notes: 'Met in Berlin' })
    expect(matchesText(c, 'priya')).toBe(true)
    expect(matchesText(c, 'corp')).toBe(true)
    expect(matchesText(c, 'berlin')).toBe(true)
  })

  it('ANDs the terms across fields — a second word narrows, never widens', () => {
    const c = contact({ name: 'Sam', email: 'sam@x.com', notes: 'Met in Berlin' })
    expect(matchesText(c, 'sam berlin')).toBe(true)
    expect(matchesText(c, 'sam paris')).toBe(false)
  })

  it('finds an accented name from the plain spelling', () => {
    expect(matchesText(contact({ name: 'Zoë Fenwick' }), 'zoe')).toBe(true)
  })
})

describe('matchesCategories', () => {
  it('passes everything when nothing is selected', () => {
    expect(matchesCategories(contact(), [])).toBe(true)
  })

  it('ORs within the selection', () => {
    const c = contact({ categoryIds: ['work'] })
    expect(matchesCategories(c, ['work', 'family'])).toBe(true)
    expect(matchesCategories(c, ['family'])).toBe(false)
  })

  it('matches the uncategorised pseudo-filter only when a contact has none', () => {
    expect(matchesCategories(contact({ categoryIds: [] }), [UNCATEGORISED])).toBe(true)
    expect(matchesCategories(contact({ categoryIds: ['work'] }), [UNCATEGORISED])).toBe(false)
  })

  it('does not let the uncategorised filter swallow a categorised contact when combined', () => {
    const c = contact({ categoryIds: ['work'] })
    expect(matchesCategories(c, [UNCATEGORISED, 'work'])).toBe(true)
    expect(matchesCategories(c, [UNCATEGORISED, 'family'])).toBe(false)
  })
})

describe('matchesFrequency', () => {
  it('passes everything when nothing is selected', () => {
    expect(matchesFrequency(contact(), [])).toBe(true)
  })

  it('filters to the chosen cadences', () => {
    expect(matchesFrequency(contact({ frequency: 'weekly' }), ['weekly', 'yearly'])).toBe(true)
    expect(matchesFrequency(contact({ frequency: 'monthly' }), ['weekly'])).toBe(false)
  })
})

describe('compare', () => {
  const a = contact({ id: 'a', name: 'Alice', frequency: 'yearly', createdAt: 10 })
  const b = contact({ id: 'b', name: 'bob', frequency: 'weekly', createdAt: 20 })

  it('sorts by name case-insensitively', () => {
    expect([b, a].sort(compare('name')).map((c) => c.id)).toEqual(['a', 'b'])
    expect([a, b].sort(compare('name-desc')).map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('sorts numerically within a name, so Flat 9 precedes Flat 10', () => {
    const nine = contact({ id: '9', name: 'Flat 9' })
    const ten = contact({ id: '10', name: 'Flat 10' })
    expect([ten, nine].sort(compare('name')).map((c) => c.id)).toEqual(['9', '10'])
  })

  it('sorts the most demanding cadence first and big-news last', () => {
    const news = contact({ id: 'n', name: 'Zara', frequency: 'big-news' })
    expect([news, a, b].sort(compare('frequency')).map((c) => c.id)).toEqual(['b', 'a', 'n'])
  })

  it('breaks frequency ties by name, so the order never wobbles between renders', () => {
    const x = contact({ id: 'x', name: 'Xavier', frequency: 'monthly' })
    const y = contact({ id: 'y', name: 'Aaron', frequency: 'monthly' })
    expect([x, y].sort(compare('frequency')).map((c) => c.id)).toEqual(['y', 'x'])
    expect([y, x].sort(compare('frequency')).map((c) => c.id)).toEqual(['y', 'x'])
  })

  it('sorts recently added first', () => {
    expect([a, b].sort(compare('recent')).map((c) => c.id)).toEqual(['b', 'a'])
  })
})

describe('runQuery', () => {
  const people = [
    contact({ id: '1', name: 'Alice', categoryIds: ['fam'], frequency: 'weekly', notes: 'sister' }),
    contact({ id: '2', name: 'Bob', categoryIds: [], frequency: 'yearly', notes: '' }),
    contact({ id: '3', name: 'Carla', categoryIds: ['work'], frequency: 'monthly', notes: 'Berlin office' }),
  ]

  it('applies text, category and frequency together', () => {
    const out = runQuery(people, { text: '', categoryIds: ['work'], frequencies: ['monthly'], sort: 'name' })
    expect(out.map((c) => c.id)).toEqual(['3'])
  })

  it('returns everything for an empty query', () => {
    const out = runQuery(people, { text: '', categoryIds: [], frequencies: [], sort: 'name' })
    expect(out).toHaveLength(3)
  })

  it('does not mutate the array it was given', () => {
    const original = [...people]
    runQuery(people, { text: '', categoryIds: [], frequencies: [], sort: 'name-desc' })
    expect(people).toEqual(original)
  })
})
