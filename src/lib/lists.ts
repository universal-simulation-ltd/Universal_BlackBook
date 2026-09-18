import type { Contact, Tag } from './types'

/** Is this tag an Email list? See `Tag.kind`. */
export const isList = (t: Tag): boolean => t.kind === 'list'

/** The ids of every list, for `runQuery` and the contact cards. */
export function listIdsOf(tags: Tag[]): Set<string> {
  return new Set(tags.filter(isList).map((t) => t.id))
}

/**
 * Is this person kept off Contacts?
 *
 * A `listOnly` person who is on at least one list — somebody taken off every
 * list is back to being just a person, and must not vanish. ⚠️ Always, with no
 * exception for searching or for a filter (owner's call, 2026-09-18: "that's
 * the whole point of the link contact feature"). Somebody who belongs in both
 * places is a CONTACT linked onto the list; a list-only person is seen by
 * opening their list on the Lists tab.
 */
export function keptOffContacts(contact: Contact, listIds: Set<string>): boolean {
  if (!contact.listOnly) return false
  return contact.tagIds.some((id) => listIds.has(id))
}

/** The people on this list, by name. What the Lists tab shows when one is open. */
export function membersOf(contacts: Contact[], listId: string): Contact[] {
  return contacts
    .filter((c) => c.tagIds.includes(listId))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base', numeric: true }))
}
