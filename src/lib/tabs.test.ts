import { describe, expect, it } from 'vitest'
import { isDefaultOrder, moveTab, normaliseOrder, TABS, withShownOrder } from './tabs'
import { parseBackup } from './backup'
import { availableTabs } from '../appParts'

describe('tab order (2026-10-25)', () => {
  it('makes any stored order whole', () => {
    expect(normaliseOrder(undefined)).toEqual([...TABS])
    expect(normaliseOrder(['notes', 'contacts', 'notes', 'bogus'])).toEqual(['notes', 'contacts', 'lists', 'todos'])
    expect(isDefaultOrder(normaliseOrder([]))).toBe(true)
  })

  it('moves one tab', () => {
    expect(moveTab(['contacts', 'lists', 'todos', 'notes'], 'notes', 0)).toEqual(['notes', 'contacts', 'lists', 'todos'])
  })

  it('a hidden tab keeps its slot when the shown ones are reordered, and comes back there', () => {
    const full = ['contacts', 'lists', 'todos', 'notes'] as const
    // Lists hidden; drag Notes to the front of what is shown.
    const next = withShownOrder([...full], ['notes', 'contacts', 'todos'])
    expect(next).toEqual(['notes', 'lists', 'contacts', 'todos'])
    expect(availableTabs(false, true, true, next)).toEqual(['notes', 'contacts', 'todos'])
    expect(availableTabs(true, true, true, next)).toEqual(['notes', 'lists', 'contacts', 'todos'])
  })

  it('travels in the backup file; an older file says nothing', () => {
    const data = parseBackup({ contacts: [], settings: { emailLists: false, shownFields: [], tabOrder: ['notes', 'x'] } })!
    expect(data.settings?.tabOrder).toEqual(['contacts', 'lists', 'todos', 'notes'])
    expect(parseBackup({ contacts: [], settings: { emailLists: false, shownFields: [] } })!.settings).not.toHaveProperty('tabOrder')
  })
})
