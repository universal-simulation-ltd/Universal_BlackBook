import { describe, expect, it } from 'vitest'
import { ACTION_WIDTH, decideAxis, dragOffset, settlesOpen } from './swipe'

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

describe('settlesOpen', () => {
  it('opens past halfway and springs back before it', () => {
    expect(settlesOpen(-ACTION_WIDTH / 2 - 1)).toBe(true)
    expect(settlesOpen(-ACTION_WIDTH / 2 + 1)).toBe(false)
    expect(settlesOpen(0)).toBe(false)
    expect(settlesOpen(-ACTION_WIDTH)).toBe(true)
  })
})
