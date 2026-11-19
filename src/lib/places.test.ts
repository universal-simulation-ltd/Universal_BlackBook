import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { comparePlaces, matchesPlace, mergePlaces, placeWhere, toPlace, toPlaces, websiteUrl, type Place } from './places'
import { parseBackup } from './backup'
import { mapGroups, mappedFilters } from './mapGroups'
import { parseTowns, setGeoData } from './geo'

const place = (over: Partial<Place> = {}): Place => ({
  id: 'p1',
  name: 'The Crown',
  phone: '',
  website: '',
  details: '',
  tagIds: [],
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

describe('places (2026-11-19)', () => {
  it('reads a stored record back, dropping junk rather than throwing', () => {
    expect(toPlaces([place(), null, { id: '' }, 'x', place()])).toHaveLength(1)
    const p = toPlace({ id: 'a', name: 'Shop', location: { city: 'Leeds', country: 'GB' }, tagIds: ['t', 3], pinnedAt: 5 })!
    expect(p).toMatchObject({ name: 'Shop', location: { city: 'Leeds', country: 'GB' }, tagIds: ['t'], pinnedAt: 5, phone: '' })
    expect(toPlace({ id: 'a', tagIds: ['t', 'u'] }, new Set(['u']))!.tagIds).toEqual(['u'])
  })

  it('sorts pinned first, then A to Z', () => {
    const list = [place({ id: 'b', name: 'beta' }), place({ id: 'a', name: 'Alpha' }), place({ id: 'z', name: 'Zed', pinnedAt: 9 })]
    expect(list.sort((x, y) => comparePlaces(x, y)).map((p) => p.id)).toEqual(['z', 'a', 'b'])
  })

  it('is found by its name, town, phone, notes or tag', () => {
    const p = place({ location: { street: '1 High St', city: 'Guildford' }, phone: '01483 123456', details: 'Ask for Sam', tagIds: ['pub'] })
    const byId = new Map([['pub', { name: 'Pubs' }]])
    for (const q of ['crown', 'guildford', '01483', 'sam', 'pubs']) expect(matchesPlace(p, q, byId)).toBe(true)
    expect(matchesPlace(p, 'leeds', byId)).toBe(false)
    expect(placeWhere(p, 'en')).toBe('Guildford')
    expect(placeWhere(place({ location: { street: '1 High St\nFlat 2' } }), 'en')).toBe('1 High St')
  })

  it('makes a website a link, and refuses anything that is not one', () => {
    expect(websiteUrl('example.com')).toBe('https://example.com/')
    expect(websiteUrl('http://example.com/x')).toBe('http://example.com/x')
    expect(websiteUrl('javascript:alert(1)')).toBeNull()
    expect(websiteUrl('  ')).toBeNull()
  })

  it('merges two devices, the newer edit winning and following a tag remap', () => {
    const online = [place({ updatedAt: 5, name: 'Old' })]
    const local = [place({ updatedAt: 9, name: 'New', tagIds: ['local'] }), place({ id: 'p2' })]
    const merged = mergePlaces(online, local, new Map([['local', 'online']]))
    expect(merged.map((p) => [p.id, p.name, p.tagIds])).toEqual([
      ['p1', 'New', ['online']],
      ['p2', 'The Crown', []],
    ])
  })

  it('travel in a backup file, an older file reading as none', () => {
    const data = parseBackup({ contacts: [], tags: [{ id: 't', name: 'T', colour: 'amber' }], places: [place({ tagIds: ['t', 'gone'] })] })!
    expect(data.places).toEqual([expect.objectContaining({ id: 'p1', tagIds: ['t'] })])
    expect(parseBackup({ contacts: [] })!.places).toEqual([])
  })
})

describe('places on the map', () => {
  const file = (f: string) => readFileSync(new URL(`../../public/geo/${f}`, import.meta.url), 'utf8')
  beforeAll(() => {
    setGeoData({ countries: JSON.parse(file('countries.json')), divisions: JSON.parse(file('divisions.json')), towns: parseTowns(file('cities.tsv')) })
  })

  it('get a pin in their town, and their tags a chip', () => {
    const places = [place({ location: { city: 'Leeds', country: 'GB' }, tagIds: ['pub'] }), place({ id: 'p2', tagIds: ['nowhere'] })]
    const all = mapGroups([], [], { kind: 'all', tagIds: [], templateId: null }, places)
    expect(all.groups.map((g) => [g.town.name, g.places.map((p) => p.id)])).toEqual([['Leeds', ['p1']]])
    expect(mapGroups([], [], { kind: 'contacts', tagIds: [], templateId: null }, places).groups).toEqual([])
    expect(mapGroups([], [], { kind: 'places', tagIds: ['other'], templateId: null }, places).groups).toEqual([])
    expect([...mappedFilters([], [], places).tagIds]).toEqual(['pub'])
  })
})
