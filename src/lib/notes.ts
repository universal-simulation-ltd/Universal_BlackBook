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

export interface Note {
  id: string
  /** What it is about. The only required field. */
  title: string
  /** The note itself, free text. */
  details: string
  /** "Add notification" on a note (2026-10-25), the contacts' engine (lib/reminders.ts). */
  reminders?: Reminder[]
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
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

export function toNotes(raw: unknown): Note[] {
  return Array.isArray(raw) ? raw.map(toNote).filter((n): n is Note => n !== null) : []
}

/** Newest edited first. */
export function compareNotes(a: Note, b: Note): number {
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
  const hay = fold(`${note.title}\n${note.details}`)
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
