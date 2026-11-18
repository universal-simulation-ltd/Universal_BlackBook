import { describe, expect, it } from 'vitest'
import { isTagColour, swatch } from './palette'
import { parseBackup } from './backup'

describe('a colour of the person\'s own (2026-11-18)', () => {
  it('is drawn in that colour, and kept', () => {
    expect(swatch('#12ab9f').dot).toBe('#12ab9f')
    expect(swatch('#12ab9f').bg).toBe('rgba(18,171,159,0.14)')
    expect(isTagColour('#12ab9f')).toBe(true)
    expect(isTagColour('sky')).toBe(true)
  })

  it('is never anything but six hex digits', () => {
    expect(isTagColour('#12ab9')).toBe(false)
    expect(isTagColour('red')).toBe(false)
    expect(isTagColour('url(x)')).toBe(false)
    expect(swatch('#zzzzzz').key).toBe('amber')
  })

  it('survives a backup file', () => {
    const data = parseBackup({ contacts: [], tags: [{ id: 't1', name: 'Work', colour: '#12ab9f' }] })!
    expect(data.tags[0].colour).toBe('#12ab9f')
  })
})
