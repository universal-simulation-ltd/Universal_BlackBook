import { identityKeys } from './deviceContacts'
import { newId } from './id'
import type { Contact } from './types'

export interface ListImport {
  /** People not in the book yet, already carrying the list's tag. */
  added: Contact[]
  /** People already in the book, with the list's tag now added. */
  tagged: Contact[]
  /** Already in the book AND already on this list — nothing to do. */
  already: number
}

/**
 * What saving an Email list does to the book (owner's request, 2026-09-17).
 *
 * The list IS a tag. Each typed row is matched against the book by the same
 * identity rule the phone import uses (name + email). A match is not skipped,
 * as it is there: adding somebody you already know to a mailing list is the
 * point, so they gain the tag instead of being left out of the list.
 *
 * Blank rows are dropped; a row with only an email is named by its email.
 *
 * A row LINKED to a contact (＋ ▸ Link to a contact) is that contact, by id,
 * whatever its name and email say.
 *
 * New people are `listOnly`: they are on the list, not in Contacts.
 *
 * A row's note (the ＋ beside it) goes on a new person as their Notes. For
 * somebody already in the book it is APPENDED under what they had, never in
 * place of it, and not again if their notes already contain it.
 */
export function planListImport(
  rows: { name: string; email: string; notes?: string; contactId?: string }[],
  existing: Contact[],
  tagId: string,
  now = Date.now(),
): ListImport {
  const byKey = new Map<string, Contact>()
  for (const c of existing) for (const k of identityKeys(c)) byKey.set(k, c)
  const byId = new Map(existing.map((c) => [c.id, c]))
  const added: Contact[] = []
  const tagged = new Map<string, Contact>()
  const addedIds = new Set<string>()
  let already = 0

  for (const r of rows) {
    const name = r.name.trim()
    const email = r.email.trim()
    const note = (r.notes ?? '').trim()
    if (!name && !email) continue
    const row = { name: name || email, email, phone: '' }
    const keys = identityKeys(row)
    const match = (r.contactId ? byId.get(r.contactId) : undefined) ?? keys.map((k) => byKey.get(k)).find(Boolean)
    if (match && addedIds.has(match.id)) continue
    if (match) {
      const current = tagged.get(match.id) ?? match
      const addNote = note !== '' && !current.notes.includes(note)
      const addTag = !current.tagIds.includes(tagId)
      if (!addTag && !addNote) {
        already++
        continue
      }
      tagged.set(match.id, {
        ...current,
        tagIds: addTag ? [...current.tagIds, tagId] : current.tagIds,
        notes: addNote ? (current.notes.trim() ? `${current.notes.trimEnd()}\n\n${note}` : note) : current.notes,
        updatedAt: now,
      })
      continue
    }
    const contact: Contact = {
      id: newId(),
      ...row,
      tagIds: [tagId],
      listOnly: true,
      notes: note,
      createdAt: now,
      updatedAt: now,
    }
    // Typed twice in the same list counts once.
    for (const k of keys) byKey.set(k, contact)
    addedIds.add(contact.id)
    added.push(contact)
  }
  return { added, tagged: [...tagged.values()], already }
}
