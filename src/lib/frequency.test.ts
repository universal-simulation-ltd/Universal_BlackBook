import { describe, expect, it } from 'vitest'
import { DEFAULT_FREQUENCY, FREQUENCIES, frequencyRank, frequencyShort, isFrequency } from './frequency'
import { compare } from './filter'
import type { Contact, Frequency } from './types'

const contact = (name: string, frequency: Frequency): Contact => ({
  id: name,
  name,
  email: '',
  categoryIds: [],
  frequency,
  notes: '',
  createdAt: 1,
  updatedAt: 1,
})

describe('frequency', () => {
  it('defaults to N/A, so the app never invents a commitment', () => {
    expect(DEFAULT_FREQUENCY).toBe('na')
    expect(FREQUENCIES[0].value).toBe('na')
  })

  it('recognises every value it offers', () => {
    for (const f of FREQUENCIES) expect(isFrequency(f.value)).toBe(true)
    expect(isFrequency('quarterlyish')).toBe(false)
  })

  it('gives every value a finite, distinct sort rank', () => {
    const ranks = FREQUENCIES.map((f) => frequencyRank(f.value))
    // ⚠️ The regression this pins: ranking by `days` put TWO Infinities in the
    // list (big-news, and now na), and the comparator subtracts them —
    // `Infinity - Infinity` is NaN. It happened to fall through to the name
    // tiebreak because NaN is falsy, i.e. it worked by accident. `order` is
    // finite and unique, so the comparator means what it says.
    for (const r of ranks) expect(Number.isFinite(r)).toBe(true)
    expect(new Set(ranks).size).toBe(ranks.length)
  })

  it('sorts most demanding first, with the two no-cadence answers last', () => {
    const order = [...FREQUENCIES]
      .sort((a, b) => frequencyRank(a.value) - frequencyRank(b.value))
      .map((f) => f.value)
    expect(order).toEqual([
      'weekly',
      'fortnightly',
      'monthly',
      'quarterly',
      'biannually',
      'yearly',
      'big-news',
      'na',
    ])
  })

  it('breaks a tie between two N/A contacts by name rather than returning NaN', () => {
    const rows = [contact('Zara', 'na'), contact('Aaron', 'na')]
    expect([...rows].sort(compare('frequency')).map((c) => c.name)).toEqual(['Aaron', 'Zara'])
    expect([...rows].reverse().sort(compare('frequency')).map((c) => c.name)).toEqual(['Aaron', 'Zara'])
  })

  it('puts N/A after big-news when both are present', () => {
    const rows = [contact('Nell', 'na'), contact('Bea', 'big-news'), contact('Wes', 'weekly')]
    expect([...rows].sort(compare('frequency')).map((c) => c.name)).toEqual(['Wes', 'Bea', 'Nell'])
  })

  it('has a short label short enough for the card chip', () => {
    for (const f of FREQUENCIES) expect(frequencyShort(f.value).length).toBeLessThanOrEqual(13)
  })
})
