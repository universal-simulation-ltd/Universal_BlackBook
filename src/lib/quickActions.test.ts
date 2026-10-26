import { describe, expect, it } from 'vitest'
import { DEFAULT_QUICK_ACTIONS, hiddenQuickActions, moveQuickAction, normaliseQuickActions } from './quickActions'

describe('a note’s quick buttons', () => {
  it('start as the four there always were, with Copy and delete waiting behind a +', () => {
    expect(normaliseQuickActions(undefined)).toEqual(DEFAULT_QUICK_ACTIONS)
    expect(hiddenQuickActions([...DEFAULT_QUICK_ACTIONS])).toEqual(['copyDelete'])
  })

  it('keep what was stored, dropping unknown and repeated buttons; an empty row stays empty', () => {
    expect(normaliseQuickActions(['copy', 'gone', 'copy', 'place'])).toEqual(['copy', 'place'])
    expect(normaliseQuickActions([])).toEqual([])
  })

  it('move one to a new place', () => {
    expect(moveQuickAction(['contacts', 'place', 'remind', 'copy'], 'copy', 0)).toEqual(['copy', 'contacts', 'place', 'remind'])
    expect(moveQuickAction(['contacts', 'place'], 'contacts', 9)).toEqual(['place', 'contacts'])
  })
})
