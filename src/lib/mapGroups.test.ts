import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseTowns, setGeoData } from './geo'
import { bounds, mapGroups } from './mapGroups'
import type { Contact } from './types'
import type { Note } from './notes'

const file = (f: string) => readFileSync(new URL(`../../public/geo/${f}`, import.meta.url), 'utf8')
beforeAll(() => {
  setGeoData({ countries: JSON.parse(file('countries.json')), divisions: JSON.parse(file('divisions.json')), towns: parseTowns(file('cities.tsv')) })
})

const c = (id: string, p: Partial<Contact>): Contact => ({ id, name: id, email: '', phone: '', tagIds: [], notes: '', createdAt: 1, updatedAt: 1, ...p })
const n = (id: string, p: Partial<Note>): Note => ({ id, title: id, details: '', createdAt: 1, updatedAt: 1, ...p })

describe('the map: pins by town', () => {
  const contacts = [
    c('a', { location: { city: 'Guildford', county: 'Surrey', country: 'GB' }, tagIds: ['fam'] }),
    c('b', { location: { city: 'Guildford', country: 'GB' } }),
    c('x', { location: { city: 'Nowheresville', country: 'GB' } }),
    c('y', { address: '1 High St\nLeeds' }),
  ]
  const notes = [n('n1', { location: { place: "Mum's", city: 'Leeds', country: 'GB' }, templateId: 'tpl-book' })]

  it('groups people and notes by their town, placed at the town', () => {
    const { groups, unplaced } = mapGroups(contacts, notes, { kind: 'all', tagIds: [], templateId: null })
    const guildford = groups.find((g) => g.town.name === 'Guildford')!
    expect(guildford.contacts.map((x) => x.id)).toEqual(['a', 'b'])
    expect(guildford.town.lat).toBeCloseTo(51.24, 1)
    expect(groups.find((g) => g.town.name === 'Leeds')!.notes.map((x) => x.id)).toEqual(['n1'])
    expect(unplaced).toBe(1)
    expect(bounds(groups)![0][1]).toBeLessThan(51.3)
  })

  it('filters by kind, tag and template', () => {
    expect(mapGroups(contacts, notes, { kind: 'notes', tagIds: [], templateId: null }).groups.map((g) => g.town.name)).toEqual(['Leeds'])
    expect(mapGroups(contacts, notes, { kind: 'contacts', tagIds: ['fam'], templateId: null }).groups[0].contacts.map((x) => x.id)).toEqual(['a'])
    expect(mapGroups(contacts, notes, { kind: 'all', tagIds: [], templateId: 'other' }).groups.every((g) => g.notes.length === 0)).toBe(true)
  })
})
