// The map's pins (James, 2026-10-25: "view by location"): contacts and notes
// grouped by their town, each group placed at the town's position from the
// bundled list (lib/geo.ts ▸ townOf). Town-level on purpose: no coordinates
// are stored on anything, so there is nothing more exact to show.

import { townOf, type Location, type Town } from './geo'
import type { Note } from './notes'
import type { Contact } from './types'
import type { Place } from './places'

export type MapKind = 'all' | 'contacts' | 'notes' | 'places'

export interface MapFilter {
  kind: MapKind
  /** Contacts and places carrying any of these tags (none = all). */
  tagIds: string[]
  /** Notes from this template (null = all). */
  templateId: string | null
}

export interface MapGroup {
  key: string
  town: Town
  contacts: Contact[]
  notes: Note[]
  /** The Places tab's places in this town (2026-11-19). */
  places: Place[]
}

/** A contact's location: its parts, else nothing (an address kept only as text has no town to place). */
function contactLocation(c: Contact): Location | undefined {
  return c.location
}

export function mapGroups(contacts: Contact[], notes: Note[], filter: MapFilter, places: Place[] = []): { groups: MapGroup[]; unplaced: number } {
  const groups = new Map<string, MapGroup>()
  let unplaced = 0
  const add = (loc: Location | undefined, put: (g: MapGroup) => void) => {
    if (!loc?.city) return
    const town = townOf(loc)
    if (!town) {
      unplaced++
      return
    }
    const key = `${town.cc}|${town.div}|${town.name}`
    let g = groups.get(key)
    if (!g) {
      g = { key, town, contacts: [], notes: [], places: [] }
      groups.set(key, g)
    }
    put(g)
  }
  if (filter.kind === 'all' || filter.kind === 'contacts') {
    for (const c of contacts) {
      if (c.listOnly) continue
      if (filter.tagIds.length && !c.tagIds.some((t) => filter.tagIds.includes(t))) continue
      add(contactLocation(c), (g) => g.contacts.push(c))
    }
  }
  if (filter.kind === 'all' || filter.kind === 'notes') {
    for (const n of notes) {
      if (filter.templateId && n.templateId !== filter.templateId) continue
      add(n.location, (g) => g.notes.push(n))
    }
  }
  if (filter.kind === 'all' || filter.kind === 'places') {
    for (const p of places) {
      if (filter.tagIds.length && !p.tagIds.some((t) => filter.tagIds.includes(t))) continue
      add(p.location, (g) => g.places.push(p))
    }
  }
  return { groups: [...groups.values()], unplaced }
}

/**
 * The tags and templates worth a chip on the map (James, 2026-11-19: "don't
 * show a tag in the map view if it doesn't have any items with map
 * locations"): only those carried by something that lands on a pin.
 */
export function mappedFilters(contacts: Contact[], notes: Note[], places: Place[] = []): { tagIds: Set<string>; templateIds: Set<string> } {
  const tagIds = new Set<string>()
  const templateIds = new Set<string>()
  const placed = (loc: Location | undefined) => Boolean(loc?.city && townOf(loc))
  for (const c of contacts) if (!c.listOnly && placed(contactLocation(c))) for (const id of c.tagIds) tagIds.add(id)
  for (const n of notes) if (n.templateId && placed(n.location)) templateIds.add(n.templateId)
  for (const p of places) if (placed(p.location)) for (const id of p.tagIds) tagIds.add(id)
  return { tagIds, templateIds }
}

/** The box that holds every group, padded a little; null when there are none. */
export function bounds(groups: MapGroup[]): [[number, number], [number, number]] | null {
  if (!groups.length) return null
  let w = 180, s = 90, e = -180, n = -90
  for (const { town } of groups) {
    w = Math.min(w, town.lng)
    e = Math.max(e, town.lng)
    s = Math.min(s, town.lat)
    n = Math.max(n, town.lat)
  }
  const pad = 0.05
  return [
    [w - pad, s - pad],
    [e + pad, n + pad],
  ]
}
