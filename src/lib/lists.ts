import type { Contact, Tag } from './types'

/** Is this tag an Email list? See `Tag.kind`. */
export const isList = (t: Tag): boolean => t.kind === 'list'

/** The ids of every list, for `runQuery` and the contact cards. */
export function listIdsOf(tags: Tag[]): Set<string> {
  return new Set(tags.filter(isList).map((t) => t.id))
}

/**
 * Is this person kept off Contacts right now?
 *
 * Only a `listOnly` person who is on at least one list — somebody taken off
 * every list is back to being just a person, and must not vanish. And not
 * while one of their lists is the filter: tapping a list on the Lists tab
 * opens Contacts filtered to it, and a list showing none of its members would
 * be a lie.
 */
export function keptOffContacts(contact: Contact, listIds: Set<string>, filterTagIds: string[]): boolean {
  if (!contact.listOnly) return false
  const lists = contact.tagIds.filter((id) => listIds.has(id))
  if (lists.length === 0) return false
  return !lists.some((id) => filterTagIds.includes(id))
}
