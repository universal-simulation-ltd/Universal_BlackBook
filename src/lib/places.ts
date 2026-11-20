// The Places tab (James, 2026-11-19: "Add a 'Places' tab as well similar to
// people"): the places you go back to, kept the way people are — a name, an
// address in parts (Street, City, County, Country, as a contact's), a phone
// number, a website, notes and the book's tags. Built the way the To-do tab is
// (lib/todos.ts): one record on this device (lib/store.ts 'places'), the
// encrypted online copy (VaultPayload.places) and a backup file.
//
// The tags are the BOOK's tags, as to-dos' and notes' are: "Family" on a person
// and "Family" on a place are the same idea.

import { tagNames } from './filter'
import { locationLines, toLocation, type Location } from './geo'
import { matchesNote, toContactIds, type Note } from './notes'

/**
 * A comment on a place (James, 2026-11-20: "you put a place in and then you
 * make comments around that place"): what happened there, what to remember,
 * dated. Newest first on the place's page; the latest shows on its row.
 */
export interface PlaceComment {
  id: string
  text: string
  /** When it was written (ms). */
  at: number
}

export interface Place {
  id: string
  /** What it is called. The only required field. */
  name: string
  /** Where: Street, City, County, Country. Its `place` part is never used — `name` is. */
  location?: Location
  phone: string
  website: string
  /** Notes of your own: opening hours, the door code, what to order. */
  details: string
  /** Tag ids — the same `Tag` records contacts carry. Lists are never offered. */
  tagIds: string[]
  /** Pinned to the top of the list: when. Absent = not pinned. */
  pinnedAt?: number
  /**
   * People linked to this place (2026-11-19, "both ways, like notes"): the
   * person's view lists the places linked to them. A deleted person's id
   * matches nobody and is not shown, as on a note.
   */
  contactIds?: string[]
  /** Comments on it (2026-11-20), oldest first as stored. Absent = none. */
  comments?: PlaceComment[]
  createdAt: number
  updatedAt: number
}

export const PLACE_LIMITS = { places: 20_000, name: 500, phone: 100, website: 2_000, details: 100_000, comments: 2_000, comment: 10_000 } as const

/** Stored comments as PlaceComments: bad ones dropped, duplicates by id dropped, oldest first. */
export function toPlaceComments(raw: unknown): PlaceComment[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: PlaceComment[] = []
  const seen = new Set<string>()
  for (const r of raw.slice(-PLACE_LIMITS.comments)) {
    if (!r || typeof r !== 'object') continue
    const c = r as Record<string, unknown>
    if (typeof c.id !== 'string' || !c.id || c.id.length > 100 || seen.has(c.id)) continue
    const text = typeof c.text === 'string' ? c.text.slice(0, PLACE_LIMITS.comment) : ''
    if (!text.trim()) continue
    const at = typeof c.at === 'number' && Number.isFinite(c.at) ? c.at : 0
    out.push({ id: c.id, text, at })
    seen.add(c.id)
  }
  out.sort((a, b) => a.at - b.at)
  return out.length ? out : undefined
}

/** A place's comments, newest first. */
export function newestComments(place: Place): PlaceComment[] {
  return [...(place.comments ?? [])].sort((a, b) => b.at - a.at)
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

/** A stored, synced or backed-up record as a Place, or null. One bad row is dropped, never thrown over. */
export function toPlace(raw: unknown, knownTags?: Set<string>): Place | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id || r.id.length > 100) return null
  const name = str(r.name, PLACE_LIMITS.name)
  const location = toLocation(r.location)
  const tagIds = Array.isArray(r.tagIds)
    ? [...new Set(r.tagIds.filter((v): v is string => typeof v === 'string' && (!knownTags || knownTags.has(v))))].slice(0, 500)
    : []
  const createdAt = typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : Date.now()
  return {
    id: r.id,
    name,
    ...(location ? { location } : {}),
    phone: str(r.phone, PLACE_LIMITS.phone),
    website: str(r.website, PLACE_LIMITS.website),
    details: str(r.details, PLACE_LIMITS.details),
    tagIds,
    ...(typeof r.pinnedAt === 'number' && Number.isFinite(r.pinnedAt) ? { pinnedAt: r.pinnedAt } : {}),
    ...(toContactIds(r.contactIds) ? { contactIds: toContactIds(r.contactIds) } : {}),
    ...(toPlaceComments(r.comments) ? { comments: toPlaceComments(r.comments) } : {}),
    createdAt,
    updatedAt: typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : createdAt,
  }
}

export function toPlaces(raw: unknown, knownTags?: Set<string>): Place[] {
  if (!Array.isArray(raw)) return []
  const out: Place[] = []
  const seen = new Set<string>()
  for (const r of raw.slice(0, PLACE_LIMITS.places)) {
    const p = toPlace(r, knownTags)
    if (p && !seen.has(p.id)) {
      out.push(p)
      seen.add(p.id)
    }
  }
  return out
}

/** Pinned first, the latest pin first; then A to Z by name. */
export function comparePlaces(a: Place, b: Place, locale = 'en'): number {
  if (Boolean(a.pinnedAt) !== Boolean(b.pinnedAt)) return a.pinnedAt ? -1 : 1
  if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) return b.pinnedAt - a.pinnedAt
  return a.name.localeCompare(b.name, locale, { sensitivity: 'base' }) || b.createdAt - a.createdAt
}

/** OR across the chosen tags, the same as the contact list's tag filter. */
export function matchesPlaceTags(place: Place, tagIds: string[]): boolean {
  return tagIds.length === 0 || place.tagIds.some((id) => tagIds.includes(id))
}

/** The town line under a place's name: "Guildford, Surrey" — or the street when there is no town. */
export function placeWhere(place: Place, locale: string): string {
  const loc = place.location
  if (!loc) return ''
  const town = [loc.city, loc.county].filter(Boolean).join(', ')
  return town || (loc.street ?? '').split('\n')[0] || locationLines(loc, locale).join(', ')
}

/** A place's search: its name, address, phone, website, notes, comments and its tags' names. */
export function matchesPlace(place: Place, query: string, byId: ReadonlyMap<string, { name: string }>, locale = 'en'): boolean {
  if (!query.trim()) return true
  const text = [place.details, ...locationLines(place.location, locale), place.phone, place.website, ...(place.comments ?? []).map((c) => c.text)]
    .filter(Boolean)
    .join('\n')
  return matchesNote({ ...place, title: place.name, details: text } as unknown as Note, query, tagNames(place.tagIds, byId))
}

/** A website as a link: `example.com` gets its https://. Anything else that is not http(s) is no link. */
export function websiteUrl(website: string): string | null {
  const w = website.trim()
  if (!w) return null
  const url = /^https?:\/\//i.test(w) ? w : `https://${w}`
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

/**
 * Two devices' places into one — the places half of `mergeBooks`, as
 * `mergeTodos`: by id, the newer edit winning, following the contact merge's
 * tag remap.
 */
export function mergePlaces(online: Place[], local: Place[], remap: Map<string, string> = new Map()): Place[] {
  const out = [...online]
  const index = new Map(out.map((p, i) => [p.id, i]))
  for (const raw of local) {
    const p = remap.size ? { ...raw, tagIds: [...new Set(raw.tagIds.map((id) => remap.get(id) ?? id))] } : raw
    const at = index.get(p.id)
    if (at === undefined) {
      index.set(p.id, out.length)
      out.push(p)
    } else if (p.updatedAt > out[at].updatedAt) {
      out[at] = p
    }
  }
  return out
}
