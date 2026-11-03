import { LIMITS } from './backup'
import { newId } from './id'
import type { ImportedNote } from './noteImport'
import type { Contact } from './types'

// People from OneNote (James, 2026-11-03: "for import allow a OneNote import
// directly to people"). His notebook has a People section group (People -
// KyJam, People - HRV, People - James) with a page per person: the page title
// is who it is about, the page is what he knows about them. The files are read
// exactly as Notes ▸ Import reads them (lib/noteImport.ts); this decides what
// each page does to the book.
//
//   • A page becomes a person: the title is their name, the text their Notes,
//     OneNote's date under the title the day they were added.
//   • A page whose title is somebody already in the book (same name, ignoring
//     case and spacing) is ADDED under that person's notes, never in place of
//     them, and not again if their notes already hold it — so importing the
//     same section twice changes nothing.
//   • A tag per file, when asked: a section exported from OneNote for Windows
//     is one Word file named after the section, so "People - KyJam.docx" tags
//     everybody on it "People - KyJam".

export interface PeopleImport {
  added: Contact[]
  /** People already in the book, with the page added to their notes (and the tag). */
  updated: Contact[]
  /** Pages already in that person's notes, and already tagged — nothing to do. */
  already: number
}

const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

/** "Holiday_ideas.final.docx" → "Holiday ideas.final": the tag a file gives. */
export function fileTagName(file: string): string {
  return file.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim().slice(0, LIMITS.tagName)
}

/**
 * What adding these pages does to the book. `tagFor` gives a page's file its
 * tag id, or nothing when tagging was not asked for.
 */
export function planPeopleImport(
  pages: ImportedNote[],
  existing: Contact[],
  tagFor: (file: string) => string | undefined = () => undefined,
  now = Date.now(),
): PeopleImport {
  // Somebody only on an Email list still counts: the page joins them, and
  // they come into People, as adding them by hand would.
  const byName = new Map<string, Contact>()
  for (const c of existing) if (c.name.trim() && !byName.has(key(c.name))) byName.set(key(c.name), c)
  const changed = new Map<string, Contact>()
  const fresh = new Set<string>()
  let already = 0

  for (const p of pages) {
    const name = p.title.trim().slice(0, LIMITS.name)
    if (!name) continue
    const text = p.details.trim()
    const tagId = tagFor(p.file)
    const match = byName.get(key(name))
    if (!match) {
      const at = p.createdAt ?? now
      const person: Contact = {
        id: newId(),
        name,
        email: '',
        phone: '',
        tagIds: tagId ? [tagId] : [],
        notes: text.slice(0, LIMITS.notes),
        createdAt: at,
        updatedAt: now,
      }
      byName.set(key(name), person)
      fresh.add(person.id)
      changed.set(person.id, person)
      continue
    }
    const current = changed.get(match.id) ?? match
    const addText = text !== '' && !current.notes.includes(text)
    const addTag = Boolean(tagId) && !current.tagIds.includes(tagId!)
    if (!addText && !addTag && !current.listOnly) {
      already++
      continue
    }
    const notes = addText ? (current.notes.trim() ? `${current.notes.trimEnd()}\n\n${text}` : text) : current.notes
    const next: Contact = {
      ...current,
      notes: notes.slice(0, LIMITS.notes),
      tagIds: addTag ? [...current.tagIds, tagId!] : current.tagIds,
      updatedAt: now,
    }
    delete next.listOnly
    changed.set(match.id, next)
  }

  const all = [...changed.values()]
  return { added: all.filter((c) => fresh.has(c.id)), updated: all.filter((c) => !fresh.has(c.id)), already }
}

/** Is a page's title somebody already in the book? (The review's sub-line.) */
export function knownNames(existing: Contact[]): (title: string) => boolean {
  const names = new Set(existing.filter((c) => c.name.trim()).map((c) => key(c.name)))
  return (title) => names.has(key(title))
}
