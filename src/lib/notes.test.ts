import { describe, expect, it } from 'vitest'
import { compareNotes, mapsUrl, matchesNote, toContactIds, toNote, type Note } from './notes'
import { parseBackup } from './backup'

describe('note links and places (2026-10-25)', () => {
  it('opens the system maps for the place, by its words (no coordinates are kept)', () => {
    const loc = { place: 'Alfama', street: 'Rua A', city: 'Lisbon', country: 'PT' }
    expect(mapsUrl(loc, 'ios', 'en-GB')).toBe('https://maps.apple.com/?q=Alfama%2C%20Rua%20A%2C%20Lisbon%2C%20Portugal')
    expect(mapsUrl(loc, 'android', 'en-GB')).toBe('geo:0,0?q=Alfama%2C%20Rua%20A%2C%20Lisbon%2C%20Portugal')
    expect(mapsUrl({ place: 'Alfama' }, 'web')).toBe('https://www.openstreetmap.org/search?query=Alfama')
  })

  it('keeps links through storage and a backup file, and drops junk ids', () => {
    expect(toContactIds(['c1', 'c1', 'bad id', 7])).toEqual(['c1'])
    // The first shape (`place` with coordinates) is read into a location, coordinates dropped.
    const n = toNote({ id: 'n1', title: 'T', details: '', contactIds: ['c1'], place: { name: 'Pub', lat: 51, lng: 0 } })!
    expect(n.contactIds).toEqual(['c1'])
    expect(n.location).toEqual({ place: 'Pub' })
    const data = parseBackup({ contacts: [], pages: [{ id: 'n1', title: 'T', contactIds: ['c1', '<x>'], place: { address: 'Here' } }] })!
    expect(data.pages[0].contactIds).toEqual(['c1'])
    expect(data.pages[0].location).toEqual({ street: 'Here' })
  })

  it('search finds a note by its place', () => {
    expect(matchesNote({ id: 'n', title: 'Dinner', details: '', location: { place: 'The Crown', city: 'Guildford' }, createdAt: 0, updatedAt: 0 }, 'guildford')).toBe(true)
  })

  it('pinned notes come first, the latest pin first, then newest edited', () => {
    const n = (id: string, p: Partial<Note>): Note => ({ id, title: id, details: '', createdAt: 1, updatedAt: 1, ...p })
    const list = [n('a', { updatedAt: 9 }), n('b', { pinnedAt: 5 }), n('c', { updatedAt: 20 }), n('d', { pinnedAt: 7 })]
    expect([...list].sort(compareNotes).map((x) => x.id)).toEqual(['d', 'b', 'c', 'a'])
  })

  it('a pin survives storage and a backup file, and a bad one is dropped', () => {
    expect(toNote({ id: 'n1', title: 'T', pinnedAt: 42 })!.pinnedAt).toBe(42)
    expect(toNote({ id: 'n1', title: 'T', pinnedAt: 'x' })).not.toHaveProperty('pinnedAt')
    const data = parseBackup({ contacts: [], pages: [{ id: 'n1', title: 'T', pinnedAt: Date.UTC(2026, 0, 1) }, { id: 'n2', title: 'U', pinnedAt: -5 }] })!
    expect(data.pages[0].pinnedAt).toBe(Date.UTC(2026, 0, 1))
    expect(data.pages[1]).not.toHaveProperty('pinnedAt')
  })
})
