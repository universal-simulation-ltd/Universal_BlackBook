// The Notes tab (James, 2026-10-23): notes of your own beside the address book,
// built the way the To-do tab is (lib/todos.ts). A note is a title and free
// text, nothing else. On only with Tune this app ▸ Notes.
//
// Not a contact's own notes (Contact.notes, the box on a person's form): these
// stand alone. They live with the rest of the book — this device's IndexedDB
// (lib/store.ts 'pages'), the encrypted online copy (VaultPayload.pages) and a
// backup file (lib/backup.ts, schema 2) — under the name `pages` so they can
// never be mistaken for the `notes` field every contact carries.

import { toReminders, type Reminder } from './reminders'
import { toFieldValues } from './templates'
import { locationLines, toLocation, type Location } from './geo'

/**
 * The system maps app for a location, no map service of our own (James,
 * 2026-10-25): Apple Maps on an iPhone, the geo: handler on Android (Google
 * Maps or whatever is chosen), OpenStreetMap on the website. A search for its
 * words: no coordinates are kept.
 */
export function mapsUrl(loc: Location, platform: string, locale = 'en'): string {
  const q = [loc.place, ...locationLines(loc, locale)].filter(Boolean).join(', ')
  if (platform === 'ios') return `https://maps.apple.com/?q=${encodeURIComponent(q)}`
  if (platform === 'android') return `geo:0,0?q=${encodeURIComponent(q)}`
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

export const NOTE_LINK_LIMITS = { contacts: 200 } as const

const LINK_ID = /^[A-Za-z0-9_-]{1,100}$/

/** Contact ids from storage or a file: valid, unique, capped. */
export function toContactIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = [...new Set(raw.filter((v): v is string => typeof v === 'string' && LINK_ID.test(v)))].slice(0, NOTE_LINK_LIMITS.contacts)
  return out.length ? out : undefined
}

export interface Note {
  id: string
  /** What it is about. The only required field. */
  title: string
  /** The note itself, free text. */
  details: string
  /** "Add notification" on a note (2026-10-25), the contacts' engine (lib/reminders.ts). */
  reminders?: Reminder[]
  /**
   * "Link to contact" (2026-10-25): people in the book this note is about.
   * The contact's view lists the notes linked to it. An id whose contact has
   * since been deleted simply matches nobody and is not shown.
   */
  contactIds?: string[]
  /**
   * "Link to location" (2026-10-25): Place, Street, City, County, Country
   * (lib/geo.ts). The first shape, `place` with coordinates, is read into this
   * and its coordinates dropped.
   */
  location?: Location
  /** Pinned to the top of the Notes list (swipe right, 2026-10-25): when. Absent = not pinned. */
  pinnedAt?: number
  /** The template it was made from (lib/templates.ts), if any. */
  templateId?: string
  /** That template's fields, filled in: field id → the value as typed. */
  fields?: Record<string, string>
  createdAt: number
  updatedAt: number
}

/**
 * Coerce a stored or synced record into a Note, or null. Same rule as
 * `toTodo`: one bad row is dropped, never thrown over.
 */
export function toNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  return {
    id: r.id,
    title: typeof r.title === 'string' ? r.title : '',
    details: typeof r.details === 'string' ? r.details : '',
    ...(toReminders(r.reminders) ? { reminders: toReminders(r.reminders) } : {}),
    ...(toContactIds(r.contactIds) ? { contactIds: toContactIds(r.contactIds) } : {}),
    ...(toLocation(r.location ?? r.place) ? { location: toLocation(r.location ?? r.place) } : {}),
    ...(typeof r.templateId === 'string' && LINK_ID.test(r.templateId) ? { templateId: r.templateId } : {}),
    ...(typeof r.pinnedAt === 'number' && Number.isFinite(r.pinnedAt) ? { pinnedAt: r.pinnedAt } : {}),
    ...(toFieldValues(r.fields) ? { fields: toFieldValues(r.fields) } : {}),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

export function toNotes(raw: unknown): Note[] {
  return Array.isArray(raw) ? raw.map(toNote).filter((n): n is Note => n !== null) : []
}

/** Pinned first (the latest pin first), then newest edited first. */
export function compareNotes(a: Note, b: Note): number {
  if (Boolean(a.pinnedAt) !== Boolean(b.pinnedAt)) return a.pinnedAt ? -1 : 1
  if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) return b.pinnedAt - a.pinnedAt
  return b.updatedAt - a.updatedAt || b.createdAt - a.createdAt
}

/** Lower-case, accents folded: "cafe" finds "Café". */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Every word of the search, somewhere in the title or the text. */
export function matchesNote(note: Note, text: string): boolean {
  const words = fold(text).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = fold(
    [note.title, note.details, ...Object.values(note.location ?? {}), ...Object.values(note.fields ?? {})].join('\n'),
  )
  return words.every((w) => hay.includes(w))
}

/** The first line of the text that has anything on it, for the list. */
export function preview(note: Note): string {
  return note.details.split('\n').find((l) => l.trim())?.trim() ?? ''
}

/** Two devices' notes into one, by id, the newer edit winning (as `mergeTodos`). */
export function mergeNotes(online: Note[], local: Note[]): Note[] {
  const out = [...online]
  const index = new Map(out.map((n, i) => [n.id, i]))
  for (const n of local) {
    const at = index.get(n.id)
    if (at === undefined) {
      index.set(n.id, out.length)
      out.push(n)
    } else if (n.updatedAt > out[at].updatedAt) {
      out[at] = n
    }
  }
  return out
}

/** A note as plain text for the clipboard: the title, a blank line, the details. */
export function noteText(title: string, details: string): string {
  const head = title.trim()
  const body = details.replace(/\s+$/, '')
  return head && body.trim() ? `${head}\n\n${body}` : head || body
}
