import { describe, expect, it } from 'vitest'
import { compareNotes, mapsUrl, matchesNote, parseCoords, toContactIds, toNote, toPlace, type Note } from './notes'
import { parseBackup } from './backup'

describe('note links and places (2026-10-25)', () => {
  it('reads coordinates written the usual ways, and refuses the rest', () => {
    expect(parseCoords('51.5007, -0.1246')).toEqual({ lat: 51.5007, lng: -0.1246 })
    expect(parseCoords('38.7 -9.13')).toEqual({ lat: 38.7, lng: -9.13 })
    expect(parseCoords('91, 0')).toBeNull()
    expect(parseCoords('Lisbon')).toBeNull()
  })

  it('keeps a place with a name, an address or both coordinates, and nothing else', () => {
    expect(toPlace({ name: ' Alfama ', lat: 38.7, lng: -9.1 })).toEqual({ name: 'Alfama', lat: 38.7, lng: -9.1 })
    expect(toPlace({ name: '', address: '', lat: 38.7 })).toBeUndefined()
    expect(toPlace({ name: 'x', lat: 200, lng: 0 })).toEqual({ name: 'x' })
    expect(toPlace('nope')).toBeUndefined()
  })

  it('opens the system maps for the platform', () => {
    const p = { name: 'Alfama', address: 'Rua A\nLisbon', lat: 38.7, lng: -9.1 }
    expect(mapsUrl(p, 'ios')).toBe('https://maps.apple.com/?q=Alfama%2C+Rua+A%2C+Lisbon&ll=38.7%2C-9.1')
    expect(mapsUrl(p, 'android')).toBe('geo:38.7,-9.1?q=Alfama%2C%20Rua%20A%2C%20Lisbon')
    expect(mapsUrl({ name: 'Alfama' }, 'web')).toBe('https://www.openstreetmap.org/search?query=Alfama')
  })

  it('keeps links through storage and a backup file, and drops junk ids', () => {
    expect(toContactIds(['c1', 'c1', 'bad id', 7])).toEqual(['c1'])
    const n = toNote({ id: 'n1', title: 'T', details: '', contactIds: ['c1'], place: { name: 'Pub' } })!
    expect(n.contactIds).toEqual(['c1'])
    expect(n.place).toEqual({ name: 'Pub' })
    const data = parseBackup({ contacts: [], pages: [{ id: 'n1', title: 'T', contactIds: ['c1', '<x>'], place: { address: 'Here' } }] })!
    expect(data.pages[0].contactIds).toEqual(['c1'])
    expect(data.pages[0].place).toEqual({ name: '', address: 'Here' })
  })

  it('search finds a note by its place', () => {
    expect(matchesNote({ id: 'n', title: 'Dinner', details: '', place: { name: 'The Crown' }, createdAt: 0, updatedAt: 0 }, 'crown')).toBe(true)
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
