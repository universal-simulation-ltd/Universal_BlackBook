// The map's pins (James, 2026-10-25: "view by location"): contacts and notes
// grouped by their town, each group placed at the town's position from the
// bundled list (lib/geo.ts ▸ townOf). Town-level on purpose: no coordinates
// are stored on anything, so there is nothing more exact to show.

import { townOf, type Location, type Town } from './geo'
import type { Note } from './notes'
import type { Contact } from './types'

export type MapKind = 'all' | 'contacts' | 'notes'

export interface MapFilter {
  kind: MapKind
  /** Contacts carrying any of these tags (none = all). */
  tagIds: string[]
  /** Notes from this template (null = all). */
  templateId: string | null
}

export interface MapGroup {
  key: string
  town: Town
  contacts: Contact[]
  notes: Note[]
}

/** A contact's location: its parts, else nothing (an address kept only as text has no town to place). */
function contactLocation(c: Contact): Location | undefined {
  return c.location
}

export function mapGroups(contacts: Contact[], notes: Note[], filter: MapFilter): { groups: MapGroup[]; unplaced: number } {
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
      g = { key, town, contacts: [], notes: [] }
      groups.set(key, g)
    }
    put(g)
  }
  if (filter.kind !== 'notes') {
    for (const c of contacts) {
      if (c.listOnly) continue
      if (filter.tagIds.length && !c.tagIds.some((t) => filter.tagIds.includes(t))) continue
      add(contactLocation(c), (g) => g.contacts.push(c))
    }
  }
  if (filter.kind !== 'contacts') {
    for (const n of notes) {
      if (filter.templateId && n.templateId !== filter.templateId) continue
      add(n.location, (g) => g.notes.push(n))
    }
  }
  return { groups: [...groups.values()], unplaced }
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
