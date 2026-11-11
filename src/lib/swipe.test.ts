import { describe, expect, it } from 'vitest'
import { ACTION_WIDTH, FIRE_DISTANCE, FIRE_TRAVEL, decideAxis, dragOffset, dragOffsetFromOpen, firesOnRelease, restingOffset, settles } from './swipe'
import type { Widths } from './swipe'

describe('decideAxis', () => {
  it('waits for the slop before committing', () => {
    expect(decideAxis(0, 0)).toBe('none')
    expect(decideAxis(-4, 3)).toBe('none')
  })

  it('reads a mostly-sideways drag as a swipe', () => {
    expect(decideAxis(-30, 4)).toBe('x')
    expect(decideAxis(30, -4)).toBe('x')
  })

  it('leaves a mostly-vertical drag to the scroller', () => {
    expect(decideAxis(-6, 40)).toBe('y')
    // The diagonal case that matters: a flick down a long list, started with a
    // few pixels of sideways drift. Reading this as a swipe means the list
    // stops scrolling and a Delete button appears instead.
    expect(decideAxis(-20, 30)).toBe('y')
  })
})

describe('dragOffset', () => {
  it('follows the finger left', () => {
    expect(dragOffset(0, -40)).toBe(-40)
  })

  it('never opens to the right of closed', () => {
    expect(dragOffset(0, 60)).toBe(0)
  })

  it('stops at the button, with no overdrag suggesting more is there', () => {
    expect(dragOffset(0, -400)).toBe(-ACTION_WIDTH)
  })

  it('closes again from open', () => {
    expect(dragOffset(-ACTION_WIDTH, 30)).toBe(-ACTION_WIDTH + 30)
    expect(dragOffset(-ACTION_WIDTH, 400)).toBe(0)
  })
})

describe('settles', () => {
  it('opens past halfway and springs back before it', () => {
    expect(settles(-ACTION_WIDTH / 2 - 1)).toBe('right')
    expect(settles(-ACTION_WIDTH / 2 + 1)).toBe(null)
    expect(settles(0)).toBe(null)
    expect(settles(-ACTION_WIDTH)).toBe('right')
  })
})

// ── swiping the other way ────────────────────────────────────────────────────

describe('a row with an action on both edges', () => {
  const BOTH: Widths = { left: ACTION_WIDTH, right: ACTION_WIDTH }

  it('follows the finger to the right as well as the left', () => {
    expect(dragOffset(0, 40, BOTH)).toBe(40)
    expect(dragOffset(0, -40, BOTH)).toBe(-40)
  })

  it('stops at each button, with no overdrag either way', () => {
    expect(dragOffset(0, 400, BOTH)).toBe(ACTION_WIDTH)
    expect(dragOffset(0, -400, BOTH)).toBe(-ACTION_WIDTH)
  })

  it('names the edge the button sits on, not the way the finger went', () => {
    // Swiping RIGHT (a positive offset) uncovers the LEFT edge. Getting this
    // backwards is the one bug this whole naming convention exists to prevent.
    expect(settles(ACTION_WIDTH, BOTH)).toBe('left')
    expect(settles(-ACTION_WIDTH, BOTH)).toBe('right')
  })

  it('springs back from the middle in both directions', () => {
    expect(settles(ACTION_WIDTH / 2 - 1, BOTH)).toBe(null)
    expect(settles(-ACTION_WIDTH / 2 + 1, BOTH)).toBe(null)
  })

  it('crosses from one side to the other in a single drag', () => {
    // Open on the right, then a long drag rightwards. It should not stop at
    // closed: the finger kept going and the other action is what it asked for.
    expect(dragOffset(-ACTION_WIDTH, ACTION_WIDTH * 2, BOTH)).toBe(ACTION_WIDTH)
  })
})

describe('a row with no action on one edge', () => {
  it('is a WALL, not an empty gap — a row must never open onto nothing', () => {
    const rightOnly: Widths = { left: 0, right: ACTION_WIDTH }
    expect(dragOffset(0, 200, rightOnly)).toBe(0)
    expect(settles(0, rightOnly)).toBe(null)
  })

  it('never reports a side it does not have, even at offset zero', () => {
    // `offset >= 0 / 2` is true at rest, so a naive check would report the
    // absent left action as open on every closed row in the list.
    const none: Widths = { left: 0, right: 0 }
    expect(settles(0, none)).toBe(null)
  })
})

describe('restingOffset', () => {
  it('is the inverse of settles', () => {
    const BOTH: Widths = { left: ACTION_WIDTH, right: ACTION_WIDTH }
    expect(restingOffset('left', BOTH)).toBe(ACTION_WIDTH)
    expect(restingOffset('right', BOTH)).toBe(-ACTION_WIDTH)
    expect(restingOffset(null, BOTH)).toBe(0)
    expect(settles(restingOffset('left', BOTH), BOTH)).toBe('left')
    expect(settles(restingOffset('right', BOTH), BOTH)).toBe('right')
  })
})

describe('second swipe fires', () => {
  const both: Widths = { left: ACTION_WIDTH, right: ACTION_WIDTH }

  it('runs the open side when the finger carries on that way', () => {
    expect(firesOnRelease('right', -FIRE_DISTANCE, both)).toBe('right')
    expect(firesOnRelease('left', FIRE_DISTANCE + 10, both)).toBe('left')
  })

  it('never fires from closed, however long the flick', () => {
    expect(firesOnRelease(null, -400, both)).toBeNull()
    expect(firesOnRelease(null, 400, both)).toBeNull()
  })

  it('does not fire on a short nudge or the opposite way', () => {
    expect(firesOnRelease('right', -FIRE_DISTANCE + 1, both)).toBeNull()
    expect(firesOnRelease('right', 80, both)).toBeNull()
    expect(firesOnRelease('left', -80, both)).toBeNull()
  })

  it('lets an open row travel a little past its edge, no further', () => {
    expect(dragOffsetFromOpen('right', -ACTION_WIDTH, -20, both)).toBe(-ACTION_WIDTH - 10)
    expect(dragOffsetFromOpen('right', -ACTION_WIDTH, -500, both)).toBe(-ACTION_WIDTH - FIRE_TRAVEL)
    expect(dragOffsetFromOpen('left', ACTION_WIDTH, 500, both)).toBe(ACTION_WIDTH + FIRE_TRAVEL)
    // Closing still follows the finger as before.
    expect(dragOffsetFromOpen('right', -ACTION_WIDTH, 40, both)).toBe(-ACTION_WIDTH + 40)
  })
})
