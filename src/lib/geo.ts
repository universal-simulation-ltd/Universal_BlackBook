// Places, offline (James, 2026-10-25): a structured location — Place, Street,
// City, County, Country — with City / County / Country suggestions from real
// lists, "Fill in my current location" worked out on the device, and the map's
// pins. The lists are GeoNames' (CC BY 4.0): countries, their divisions, and
// every town of 5,000 people or more, built by scripts/geo-build.mjs into
// public/geo/ and fetched from the app's own files only when a location form
// or the map opens. No geocoding service, nothing about the user sent anywhere,
// and no coordinates ever stored on a contact or a note.

export interface Location {
  /** A name of your own: "Mum's", "The Crown". */
  place?: string
  street?: string
  city?: string
  /** County / State / Region / Province, as the country calls it. */
  county?: string
  /** An ISO 3166 code ("GB") when it is a known country, else as typed. */
  country?: string
}

export const LOCATION_LIMITS = { place: 300, street: 2000, city: 200, county: 200, country: 100 } as const

/** Countries whose everyday "county / province" is GeoNames' admin2 (keep in step with scripts/geo-build.mjs). */
export const ADMIN2_COUNTRIES = new Set(['GB', 'IE', 'IT', 'ES'])

export type DivisionWord = 'county' | 'state' | 'province' | 'region'
const STATE = new Set(['US', 'AU', 'BR', 'MX', 'IN', 'DE', 'AT', 'NG', 'MY', 'VE', 'SS', 'SD', 'MM', 'PW', 'FM'])
const PROVINCE = new Set(['CA', 'ES', 'IT', 'NL', 'AR', 'CN', 'ZA', 'PH', 'BE', 'TR', 'KR', 'ID', 'PK', 'IR', 'TH', 'VN', 'CU', 'EC', 'DO', 'PE', 'PA', 'CR', 'AF', 'SA', 'ZM', 'ZW', 'KE', 'RW', 'MZ', 'AO'])
/** What a country calls the field: the UK and Ireland a county, the US a state… */
export function divisionWord(country?: string): DivisionWord {
  const cc = (country ?? '').toUpperCase()
  if (cc === 'GB' || cc === 'IE') return 'county'
  if (STATE.has(cc)) return 'state'
  if (PROVINCE.has(cc)) return 'province'
  return cc ? 'region' : 'county'
}

function clip(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim().slice(0, max)
  return s || undefined
}

/**
 * A location from storage, the vault or a file, or undefined. Also reads the
 * first shape (2026-10-25 morning, `Note.place`): `{ name, address, lat, lng }`
 * — the name becomes the place, the address the street, and the coordinates
 * are dropped (James: "remove coordinates").
 */
export function toLocation(raw: unknown): Location | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const loc: Location = {
    place: clip(r.place ?? r.name, LOCATION_LIMITS.place),
    street: clip(r.street ?? r.address, LOCATION_LIMITS.street),
    city: clip(r.city, LOCATION_LIMITS.city),
    county: clip(r.county, LOCATION_LIMITS.county),
    country: clip(r.country, LOCATION_LIMITS.country),
  }
  for (const k of Object.keys(loc) as (keyof Location)[]) if (loc[k] === undefined) delete loc[k]
  return Object.keys(loc).length ? loc : undefined
}

/**
 * Is it a place worth recording — a town at least (James, 2026-10-30: "only
 * record a location if it's at least town level, not just country")? A
 * country or a county on its own is not: every new location starts with the
 * device's country filled in (`newLocation`), so counting it would record
 * one on everything. A street or a place name of your own is finer than a
 * town, so either of those counts too. Anything less is dropped on save.
 */
export function hasLocation(loc?: Location): loc is Location {
  return Boolean(loc && (loc.place?.trim() || loc.street?.trim() || loc.city?.trim()))
}

/** A country code's name in the language on screen; free text as it is. */
export function countryName(country: string | undefined, locale: string): string {
  if (!country) return ''
  if (/^[A-Z]{2}$/.test(country)) {
    try {
      return new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country
    } catch {
      return country
    }
  }
  return country
}

/** The lines of an envelope: street, then "City, County", then the country. */
export function locationLines(loc: Location | undefined, locale: string): string[] {
  if (!loc) return []
  const town = [loc.city, loc.county].filter(Boolean).join(', ')
  return [loc.street ?? '', town, countryName(loc.country, locale)].flatMap((l) => l.split('\n')).map((l) => l.trim()).filter(Boolean)
}

/** As one block of text (a contact's `address`, for CSV, share and search). */
export function locationText(loc: Location | undefined, locale: string): string {
  return locationLines(loc, locale).join('\n')
}

/** The device's country, from its language setting's region ("en-GB" → GB). */
export function defaultCountry(): string | undefined {
  try {
    const tag = (typeof navigator !== 'undefined' && navigator.language) || ''
    const region = new Intl.Locale(tag).maximize().region
    return region && /^[A-Z]{2}$/.test(region) ? region : undefined
  } catch {
    return undefined
  }
}

// ── The lists ────────────────────────────────────────────────────────────────

export interface Town {
  name: string
  lat: number
  lng: number
  cc: string
  /** The division's code within the country (see ADMIN2_COUNTRIES). */
  div: string
  /** Thousands of people: biggest first in suggestions and ties. */
  pop: number
}

export interface GeoData {
  countries: [string, string][]
  divisions: Record<string, [string, string][]>
  towns: Town[]
}

let data: GeoData | null = null
let loading: Promise<GeoData> | null = null

export function parseTowns(tsv: string): Town[] {
  const out: Town[] = []
  for (const line of tsv.split('\n')) {
    if (!line) continue
    const [name, lat, lng, cc, div, pop] = line.split('\t')
    out.push({ name, lat: Number(lat) / 100, lng: Number(lng) / 100, cc, div, pop: Number(pop) })
  }
  return out
}

/** For tests: hand the lists in directly. */
export function setGeoData(d: GeoData | null): void {
  data = d
  weights = null
}

export function geoLoaded(): GeoData | null {
  return data
}

/**
 * The lists, fetched from the app's own files (about 1 MB compressed, 2.2 MB
 * as files) the first time something needs them, then kept for the session.
 */
export function loadGeo(base = import.meta.env?.BASE_URL ?? '/'): Promise<GeoData> {
  if (data) return Promise.resolve(data)
  loading ??= (async () => {
    const get = (f: string) => fetch(`${base}geo/${f}`).then((r) => (r.ok ? r : Promise.reject(new Error(f))))
    const [countries, divisions, towns] = await Promise.all([
      get('countries.json').then((r) => r.json()),
      get('divisions.json').then((r) => r.json()),
      get('cities.tsv').then((r) => r.text()),
    ])
    data = { countries, divisions, towns: parseTowns(towns) }
    weights = null
    return data
  })().catch((e) => {
    loading = null
    throw e
  })
  return loading
}

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** 0 = starts with it, 1 = a later word starts with it, 2 = contains it, -1 = no. */
function rank(name: string, q: string): number {
  const n = fold(name)
  if (n.startsWith(q)) return 0
  if (n.split(/[\s\-'’(),./]+/).some((w) => w.startsWith(q))) return 1
  // Anywhere inside only once there is enough typed to mean something:
  // "s" should not offer Essex.
  return q.length >= 3 && n.includes(q) ? 2 : -1
}

export interface Suggestion {
  /** What goes in the box. */
  value: string
  /** A second line: "Surrey, United Kingdom". */
  detail?: string
  /** For a town: what it fills in elsewhere. */
  town?: Town
  /** For a country: its code. */
  code?: string
}

/** Countries matching what was typed, in the language on screen as well as English. */
export function suggestCountries(q: string, locale: string, limit = 8): Suggestion[] {
  if (!data) return []
  const f = fold(q)
  if (!f) return []
  const scored: { s: Suggestion; r: number }[] = []
  for (const [code, english] of data.countries) {
    const local = countryName(code, locale)
    const r = Math.min(...[local, english, code].map((n) => rank(n, f)).map((x) => (x < 0 ? 9 : x)))
    if (r < 9) scored.push({ s: { value: local, code, detail: local !== english ? english : undefined }, r })
  }
  return scored.sort((a, b) => a.r - b.r || a.s.value.localeCompare(b.s.value, locale)).slice(0, limit).map((x) => x.s)
}

let weights: Map<string, number> | null = null
/** How many towns each division holds: the shires before the small boroughs. */
function weight(cc: string, code: string): number {
  if (!weights && data) {
    weights = new Map()
    for (const t of data.towns) weights.set(`${t.cc}.${t.div}`, (weights.get(`${t.cc}.${t.div}`) ?? 0) + 1)
  }
  return weights?.get(`${cc}.${code}`) ?? 0
}

/**
 * A country's divisions matching what was typed, the ones with most towns
 * first within each kind of match ("s" + GB → Surrey, Staffordshire,
 * Suffolk, Somerset… before the metropolitan boroughs).
 */
export function suggestDivisions(q: string, country: string | undefined, limit = 8): Suggestion[] {
  if (!data || !country) return []
  const cc = country.toUpperCase()
  const list = data.divisions[cc] ?? []
  const f = fold(q)
  const scored = list
    .map(([code, name]) => ({ name, r: f ? rank(name, f) : 0, w: weight(cc, code) }))
    .filter((x) => x.r >= 0)
  return scored
    .sort((a, b) => a.r - b.r || b.w - a.w || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((x) => ({ value: x.name }))
}

/** A division's name from its code, within a country. */
export function divisionName(cc: string, code: string): string | undefined {
  return data?.divisions[cc]?.find((d) => d[0] === code)?.[1]
}

function divisionCode(cc: string, name: string): string | undefined {
  const f = fold(name)
  return data?.divisions[cc]?.find((d) => fold(d[1]) === f)?.[0]
}

/**
 * Towns matching what was typed, narrowed to the country (and county) when
 * they are filled in, the biggest first within each kind of match. Each one
 * says its county and country, which a pick fills in.
 */
export function suggestTowns(q: string, opts: { country?: string; county?: string; locale: string }, limit = 8): Suggestion[] {
  if (!data) return []
  const f = fold(q)
  if (!f) return []
  const cc = opts.country && /^[A-Za-z]{2}$/.test(opts.country) ? opts.country.toUpperCase() : undefined
  const div = cc && opts.county ? divisionCode(cc, opts.county) : undefined
  const hits: { t: Town; r: number }[] = []
  for (const t of data.towns) {
    if (cc && t.cc !== cc) continue
    if (div && t.div !== div) continue
    const r = rank(t.name, f)
    if (r >= 0) hits.push({ t, r })
    if (hits.length > 4000) break
  }
  // `towns` is already biggest first, so a stable sort by match kind keeps that.
  return hits
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(({ t }) => ({
      value: t.name,
      town: t,
      detail: [divisionName(t.cc, t.div), countryName(t.cc, opts.locale)].filter(Boolean).join(', '),
    }))
}

/** What picking a town fills in: its county and its country. */
export function townFills(t: Town): Pick<Location, 'city' | 'county' | 'country'> {
  return { city: t.name, county: divisionName(t.cc, t.div), country: t.cc }
}

/**
 * The nearest town to a position — "Fill in my current location", worked out
 * here from the list, never by asking a server. The position is used for this
 * and thrown away.
 */
export function nearestTown(lat: number, lng: number): Town | null {
  if (!data) return null
  const rad = Math.PI / 180
  const cosLat = Math.cos(lat * rad)
  let best: Town | null = null
  let bestD = Infinity
  for (const t of data.towns) {
    // Equirectangular distance: exact enough to tell the nearest town apart.
    const dx = (t.lng - lng) * cosLat
    const dy = t.lat - lat
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

/**
 * Where to put a location on the map: its town's position from the list (no
 * coordinates are stored). Matched on the town's name, then narrowed by
 * country and county when they are given; the biggest of several wins.
 */
export function townOf(loc: Location | undefined): Town | null {
  if (!data || !loc?.city) return null
  const f = fold(loc.city)
  const cc = loc.country && /^[A-Za-z]{2}$/.test(loc.country) ? loc.country.toUpperCase() : undefined
  const div = cc && loc.county ? divisionCode(cc, loc.county) : undefined
  let fallback: Town | null = null
  for (const t of data.towns) {
    if (fold(t.name) !== f) continue
    if (cc && t.cc !== cc) continue
    if (div && t.div !== div) {
      fallback ??= t
      continue
    }
    return t
  }
  return fallback
}
