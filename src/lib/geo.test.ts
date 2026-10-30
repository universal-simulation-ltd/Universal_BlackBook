import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  hasLocation,
  countryName,
  divisionWord,
  locationText,
  nearestTown,
  parseTowns,
  setGeoData,
  suggestCountries,
  suggestDivisions,
  suggestTowns,
  toLocation,
  townFills,
  townOf,
} from './geo'

const file = (f: string) => readFileSync(new URL(`../../public/geo/${f}`, import.meta.url), 'utf8')

beforeAll(() => {
  setGeoData({ countries: JSON.parse(file('countries.json')), divisions: JSON.parse(file('divisions.json')), towns: parseTowns(file('cities.tsv')) })
})

describe('places, offline (GeoNames)', () => {
  it('"s" in County with the UK gives the English counties James expects', () => {
    const first = suggestDivisions('s', 'GB').map((s) => s.value)
    for (const c of ['Surrey', 'Somerset', 'Suffolk']) expect(first).toContain(c)
    const names = suggestDivisions('s', 'GB', 40).map((s) => s.value)
    expect(names.every((n) => /^s/i.test(n) || /\bs/i.test(n))).toBe(true)
  })

  it('calls the field what the country calls it', () => {
    expect(divisionWord('GB')).toBe('county')
    expect(divisionWord('US')).toBe('state')
    expect(divisionWord('CA')).toBe('province')
    expect(divisionWord('FR')).toBe('region')
  })

  it('suggests towns, biggest first, narrowed by country and county, and filling both in', () => {
    const lon = suggestTowns('lon', { country: 'GB', locale: 'en-GB' })
    expect(lon[0].value).toBe('London')
    const guild = suggestTowns('guil', { country: 'GB', county: 'Surrey', locale: 'en-GB' })
    expect(guild[0].value).toBe('Guildford')
    expect(townFills(guild[0].town!)).toEqual({ city: 'Guildford', county: 'Surrey', country: 'GB' })
    expect(suggestTowns('paris', { locale: 'en-GB' })[0].town!.cc).toBe('FR')
  })

  it('finds countries by their name in the language on screen', () => {
    expect(suggestCountries('deutsch', 'de')[0].code).toBe('DE')
    expect(suggestCountries('united k', 'en-GB')[0].code).toBe('GB')
    expect(countryName('GB', 'de')).toBe('Vereinigtes Königreich')
  })

  it('reverse lookup: a position becomes its nearest town, on the device', () => {
    const t = nearestTown(51.2365, -0.5703)!
    expect(t.name).toBe('Guildford')
    expect(townFills(t).county).toBe('Surrey')
    expect(townOf({ city: 'Guildford', county: 'Surrey', country: 'GB' })!.name).toBe('Guildford')
  })

  it('migrates the first location shape and drops the coordinates', () => {
    expect(toLocation({ name: 'The Crown', address: '1 High St', lat: 51, lng: 0 })).toEqual({ place: 'The Crown', street: '1 High St' })
    expect(toLocation({ lat: 1, lng: 2 })).toBeUndefined()
    expect(locationText({ street: '1 High St', city: 'Guildford', county: 'Surrey', country: 'GB' }, 'en-GB')).toBe('1 High St\nGuildford, Surrey\nUnited Kingdom')
  })
})

describe('a location is recorded from a town down (2026-10-30)', () => {
  it('a country or county on its own is not a location', () => {
    expect(hasLocation({ country: 'GB' })).toBe(false)
    expect(hasLocation({ county: 'Kent', country: 'GB' })).toBe(false)
    expect(hasLocation({ city: ' ' })).toBe(false)
  })
  it('a town, a street or a place name is', () => {
    expect(hasLocation({ city: 'Canterbury', country: 'GB' })).toBe(true)
    expect(hasLocation({ street: '1 High St' })).toBe(true)
    expect(hasLocation({ place: "Mum's" })).toBe(true)
  })
})
