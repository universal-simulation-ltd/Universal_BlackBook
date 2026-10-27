import { describe, expect, it } from 'vitest'
import {
  CONTACT_ACTIONS,
  DEFAULT_CONTACT_ACTIONS,
  DEFAULT_QUICK_ACTIONS,
  hiddenActions,
  moveQuickAction,
  NOTE_ACTIONS,
  normaliseContactActions,
  normaliseQuickActions,
  QUICK_SLOTS,
} from './quickActions'

describe('quick buttons', () => {
  it('start with three, so the fourth place is a +', () => {
    expect(normaliseQuickActions(undefined)).toEqual(DEFAULT_QUICK_ACTIONS)
    expect(normaliseContactActions(undefined)).toEqual(DEFAULT_CONTACT_ACTIONS)
    expect(DEFAULT_QUICK_ACTIONS.length).toBe(QUICK_SLOTS - 1)
    expect(DEFAULT_CONTACT_ACTIONS.length).toBe(QUICK_SLOTS - 1)
    expect(hiddenActions(NOTE_ACTIONS, [...DEFAULT_QUICK_ACTIONS])).toEqual(['copy', 'copyDelete', 'share'])
    expect(hiddenActions(CONTACT_ACTIONS, [...DEFAULT_CONTACT_ACTIONS])).toEqual(['email', 'remind', 'copy', 'pin'])
  })

  it('keep what was stored, dropping unknown and repeated buttons and any past the fourth', () => {
    expect(normaliseQuickActions(['copy', 'gone', 'copy', 'place'])).toEqual(['copy', 'place'])
    expect(normaliseQuickActions([])).toEqual([])
    expect(normaliseQuickActions(['contacts', 'place', 'remind', 'copy', 'copyDelete'])).toEqual(['contacts', 'place', 'remind', 'copyDelete'])
    expect(normaliseQuickActions(['contacts', 'place', 'remind', 'copy', 'share'])).toEqual(['contacts', 'place', 'remind', 'copy'])
    expect(normaliseContactActions(['pin', 'contacts', 'call'])).toEqual(['pin', 'call'])
  })

  it('move one to a new place', () => {
    expect(moveQuickAction(['contacts', 'place', 'remind', 'copy'], 'copy', 0)).toEqual(['copy', 'contacts', 'place', 'remind'])
    expect(moveQuickAction(['contacts', 'place'], 'contacts', 9)).toEqual(['place', 'contacts'])
  })
})
