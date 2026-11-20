// Move (James, 2026-10-26: "When selecting have a 'Move' option that allows
// you to move a contact to notes etc"): picked contacts, notes or to-dos
// become the same number of another kind, and the originals go (with Undo,
// stores/move.ts). Nothing typed is lost on the way:
//
//   • A contact becomes a note or to-do titled with their name, the rest of
//     the card (company, email, phone, address, birthday, notes) as its text.
//     A note keeps their place on the map; a to-do keeps their tags.
//   • A note or to-do becomes a contact named with its title, its text (a
//     template's fields and a deadline written out) as the contact's notes.
//     A to-do's tags come along.
//   • A note becomes a to-do and back with its title, text and tags; a
//     deadline is written into the note. Notes carry tags since 2026-11-03,
//     so a contact's tags (never its lists) come along to a note too.
//   • A place (2026-11-19) moves with its name, address, phone, website,
//     notes and tags. Its phone stays a phone on a contact and its address a
//     location on a note; whatever the other side has no field for is
//     written into its text, as everything else is.
//
// Pure functions of what is moved; the ids and times are the stores'.

import type { Contact, Tag } from './types'
import type { Note } from './notes'
import type { NoteTemplate } from './templates'
import type { Todo } from './todos'
import type { Place } from './places'

export type MoveKind = 'contacts' | 'notes' | 'todos' | 'places'

/** What every kind can be read as: a title, some text, and what else carries. */
export interface Moved {
  title: string
  details: string
  /** Book tags (contacts and to-dos have them; never a list). */
  tagIds: string[]
  location?: Note['location']
  due?: string
  done?: boolean
  /** A contact's or a place's phone; a place's website. Written into the text where there is no field for them. */
  phone?: string
  website?: string
}

export interface MoveWords {
  untitled: string
  birthday: (date: string) => string
  due: (date: string) => string
  formatBirthday: (value: string) => string
  formatDay: (iso: string) => string
}

const lines = (...xs: (string | undefined | null)[]) => xs.map((x) => x?.trim()).filter(Boolean).join('\n')
const para = (...xs: string[]) => xs.map((x) => x.trim()).filter(Boolean).join('\n\n')

export function fromContact(c: Contact, w: MoveWords): Moved {
  return {
    title: c.name.trim() || c.email.trim() || c.company?.trim() || w.untitled,
    details: para(
      lines(c.company, c.email, c.address, c.birthdate ? w.birthday(w.formatBirthday(c.birthdate)) : ''),
      c.notes,
    ),
    tagIds: c.tagIds,
    location: c.location,
    ...(c.phone.trim() ? { phone: c.phone.trim() } : {}),
  }
}

export function fromPlace(p: Place, w: MoveWords): Moved {
  // Its comments go along as dated lines under its notes, oldest first.
  const comments = (p.comments ?? []).map((c) => `${c.at ? `${new Date(c.at).toISOString().slice(0, 10)}: ` : ''}${c.text}`).join('\n')
  return {
    title: p.name.trim() || w.untitled,
    details: [p.details, comments].filter((x) => x.trim()).join('\n\n'),
    tagIds: p.tagIds,
    location: p.location,
    ...(p.phone.trim() ? { phone: p.phone.trim() } : {}),
    ...(p.website.trim() ? { website: p.website.trim() } : {}),
  }
}

/**
 * The text a moved one lands with: the phone and the website the new kind
 * has no field for, above the rest (and the deadline, unless `due` is false).
 */
export function textFor(m: Moved, w: MoveWords, keeps: { phone?: boolean; website?: boolean; due?: boolean } = {}): string {
  const body = keeps.due === false ? m.details : withDue(m, w)
  return para(lines(keeps.phone ? '' : m.phone, keeps.website ? '' : m.website), body)
}

export function fromNote(n: Note, template: NoteTemplate | undefined, w: MoveWords): Moved {
  const fields = template
    ? template.fields.map((f) => (n.fields?.[f.id]?.trim() ? `${f.label}: ${n.fields[f.id].trim()}` : '')).filter(Boolean)
    : []
  return { title: n.title.trim() || w.untitled, details: para(lines(...fields), n.details), tagIds: n.tagIds ?? [], location: n.location }
}

export function fromTodo(x: Todo, w: MoveWords): Moved {
  return {
    title: x.title.trim() || w.untitled,
    // A group's items go along as lines of its text: nothing else that it
    // can be moved to holds a list of to-dos.
    details: x.items?.length ? para(x.details, x.items.map((i) => `${i.doneAt ? '☑' : '☐'} ${i.title}`).join('\n')) : x.details,
    tagIds: x.tagIds,
    due: x.due,
    done: x.doneAt !== undefined,
  }
}

/** The deadline, written into the text of anything that has no deadline of its own. */
export function withDue(m: Moved, w: MoveWords): string {
  return m.due ? para(m.details, w.due(w.formatDay(m.due))) : m.details
}

/** A to-do's tags are the book's tags, never its lists (lib/todos.ts). */
export function tagsForTodo(tagIds: string[], tags: Tag[]): string[] {
  const lists = new Set(tags.filter((t) => t.kind === 'list').map((t) => t.id))
  return tagIds.filter((id) => !lists.has(id))
}
