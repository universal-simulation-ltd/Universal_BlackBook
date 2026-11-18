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
  it('start with two, so the third place is a +', () => {
    expect(normaliseQuickActions(undefined)).toEqual([...DEFAULT_QUICK_ACTIONS, null])
    expect(normaliseContactActions(undefined)).toEqual([...DEFAULT_CONTACT_ACTIONS, null])
    expect(DEFAULT_QUICK_ACTIONS.length).toBe(QUICK_SLOTS - 1)
    expect(DEFAULT_CONTACT_ACTIONS.length).toBe(QUICK_SLOTS - 1)
    expect(DEFAULT_QUICK_ACTIONS).not.toEqual(DEFAULT_CONTACT_ACTIONS)
    expect(hiddenActions(NOTE_ACTIONS, normaliseQuickActions(undefined))).toEqual(['tags', 'place', 'copy', 'copyDelete', 'share'])
    expect(hiddenActions(CONTACT_ACTIONS, normaliseContactActions(undefined))).toEqual(['email', 'place', 'tags', 'share', 'remind', 'copy', 'pin'])
  })

  it('read the old four-place default, never rearranged, as the new default', () => {
    expect(normaliseQuickActions(['contacts', 'place', 'remind', null])).toEqual([...DEFAULT_QUICK_ACTIONS, null])
    expect(normaliseContactActions(['call', 'message', 'share', null])).toEqual([...DEFAULT_CONTACT_ACTIONS, null])
  })

  it('keep what was stored, gaps where they were, dropping unknown and repeated buttons and any past the third', () => {
    expect(normaliseQuickActions(['copy', 'gone', 'copy', 'place'])).toEqual(['copy', 'place', null])
    expect(normaliseQuickActions([])).toEqual([null, null, null])
    expect(normaliseQuickActions(['contacts', null, 'remind'])).toEqual(['contacts', null, 'remind'])
    expect(normaliseQuickActions(['contacts', 'place', 'remind', 'copy', 'copyDelete'])).toEqual(['contacts', 'place', 'remind'])
    expect(normaliseContactActions(['pin', 'contacts', 'call'])).toEqual(['pin', 'call', null])
  })

  it('keep every button of a full four-place row that fits, its gaps going first', () => {
    expect(normaliseQuickActions(['copy', null, 'place', 'share'])).toEqual(['copy', 'place', 'share'])
    expect(normaliseContactActions(['email', 'call', 'pin', 'tags'])).toEqual(['email', 'call', 'pin'])
  })

  it('slide in among the buttons, and swap places with a +', () => {
    expect(moveSlot(['contacts', 'place', 'remind'], 2, 0)).toEqual(['remind', 'contacts', 'place'])
    expect(moveSlot(['call', 'message', null], 0, 2)).toEqual([null, 'message', 'call'])
    expect(moveSlot([null, 'message', 'call'], 2, 0)).toEqual(['call', 'message', null])
  })

  it('move a + itself along the row', () => {
    expect(moveSlot(['call', 'message', null], 2, 0)).toEqual([null, 'call', 'message'])
    expect(moveSlot(['call', null, null], 1, 2)).toEqual(['call', null, null])
  })
})
