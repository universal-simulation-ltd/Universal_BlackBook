import { describe, expect, it } from 'vitest'
import {
  CONTACT_ACTIONS,
  DEFAULT_CONTACT_ACTIONS,
  DEFAULT_QUICK_ACTIONS,
  hiddenActions,
  moveSlot,
  NOTE_ACTIONS,
  normaliseContactActions,
  normaliseQuickActions,
  QUICK_SLOTS,
} from './quickActions'

describe('quick buttons', () => {
  it('start with three, so the fourth place is a +', () => {
    expect(normaliseQuickActions(undefined)).toEqual([...DEFAULT_QUICK_ACTIONS, null])
    expect(normaliseContactActions(undefined)).toEqual([...DEFAULT_CONTACT_ACTIONS, null])
    expect(DEFAULT_QUICK_ACTIONS.length).toBe(QUICK_SLOTS - 1)
    expect(DEFAULT_CONTACT_ACTIONS.length).toBe(QUICK_SLOTS - 1)
    expect(hiddenActions(NOTE_ACTIONS, normaliseQuickActions(undefined))).toEqual(['copy', 'copyDelete', 'share'])
    expect(hiddenActions(CONTACT_ACTIONS, normaliseContactActions(undefined))).toEqual(['email', 'place', 'remind', 'copy', 'pin'])
  })

  it('keep what was stored, gaps where they were, dropping unknown and repeated buttons and any past the fourth', () => {
    expect(normaliseQuickActions(['copy', 'gone', 'copy', 'place'])).toEqual(['copy', 'place', null, null])
    expect(normaliseQuickActions([])).toEqual([null, null, null, null])
    expect(normaliseQuickActions(['contacts', null, 'remind'])).toEqual(['contacts', null, 'remind', null])
    expect(normaliseQuickActions(['contacts', 'place', 'remind', 'copy', 'copyDelete'])).toEqual(['contacts', 'place', 'remind', 'copyDelete'])
    expect(normaliseQuickActions(['contacts', 'place', 'remind', 'copy', 'share'])).toEqual(['contacts', 'place', 'remind', 'copy'])
    expect(normaliseContactActions(['pin', 'contacts', 'call'])).toEqual(['pin', 'call', null, null])
  })

  it('slide in among the buttons, and swap places with a +', () => {
    expect(moveSlot(['contacts', 'place', 'remind', 'copy'], 3, 0)).toEqual(['copy', 'contacts', 'place', 'remind'])
    expect(moveSlot(['call', 'message', 'share', null], 0, 3)).toEqual([null, 'message', 'share', 'call'])
    expect(moveSlot([null, 'message', 'share', 'call'], 2, 0)).toEqual(['share', 'message', null, 'call'])
    expect(moveSlot(['call', 'message', null, 'share'], 3, 0)).toEqual(['share', 'call', 'message', null])
  })

  it('move a + itself along the row', () => {
    expect(moveSlot(['call', 'message', 'share', null], 3, 0)).toEqual([null, 'call', 'message', 'share'])
    expect(moveSlot(['call', null, 'share', null], 1, 3)).toEqual(['call', null, 'share', null])
  })
})
