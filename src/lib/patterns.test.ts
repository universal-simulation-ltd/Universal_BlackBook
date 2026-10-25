import { describe, expect, it } from 'vitest'
import { inkFor, isPattern, PATTERNS } from './patterns'
import { parseBackup } from './backup'

describe('tag patterns (2026-10-25)', () => {
  it('knows its patterns and nothing else', () => {
    expect(PATTERNS).toEqual(['dots', 'stripes', 'stars', 'rings', 'checks'])
    expect(isPattern('stars')).toBe(true)
    expect(isPattern('plaid')).toBe(false)
  })

  it('draws dark marks on a light colour and white on a dark one', () => {
    expect(inkFor('#a3e635')).not.toBe('#ffffff')
    expect(inkFor('#f43f5e')).toBe('#ffffff')
  })

  it('a pattern is part of the tag in a backup file; an unknown one reads as plain', () => {
    const data = parseBackup({ contacts: [], tags: [{ id: 't1', name: 'Work', colour: 'sky', pattern: 'stripes' }, { id: 't2', name: 'X', colour: 'sky', pattern: 'plaid' }] })!
    expect(data.tags[0]).toEqual({ id: 't1', name: 'Work', colour: 'sky', pattern: 'stripes' })
    expect(data.tags[1]).not.toHaveProperty('pattern')
  })
})
