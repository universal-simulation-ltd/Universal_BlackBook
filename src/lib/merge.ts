// Merging a backup file into the book on this device — "Add to what's here"
// in Import & export (lib/backup.ts). It was written for the online vault's
// sign-in merge, which went on 2026-10-20; the rules carried over unchanged.
//
// ⚠️ The book ALREADY HERE is the base (the `online` argument, named for its
// first job), and the file's book is folded into it (`local`). Everything here
// stays; the only question is which of the file's contacts it does not have.
//
// A person counts as already here by either of two tests:
//
//   1. **The same id.** The contact was in this book when the backup was
//      saved, or came from it. Whichever copy was edited last wins.
//   2. **The same person** by `identityKeys` — name + email, or name + phone.
//      The same friend typed in on two devices has two ids and is still one
//      person. The copy already here is kept.
//
// Tags are matched by id and then by name, so "Work" in both becomes one tag
// and the file's contacts are re-pointed at it.

import { identityKeys } from './deviceContacts'
import { fold } from './filter'
import type { Contact, Tag } from './types'

export interface MergedBook {
  contacts: Contact[]
  tags: Tag[]
  /** Contacts from the file that were not here at all. */
  added: number
  /** Contacts in both, where the file's copy was the newer edit. */
  updated: number
  /** File tag id → the tag of the same name already here that it was folded into. */
  remap: Map<string, string>
}

export function mergeBooks(
  online: { contacts: Contact[]; tags: Tag[] },
  local: { contacts: Contact[]; tags: Tag[] },
): MergedBook {
  const tags = [...online.tags]
  const tagIds = new Set(tags.map((t) => t.id))
  const tagByName = new Map(tags.map((t) => [fold(t.name), t.id]))
  const remap = new Map<string, string>()
  for (const t of local.tags) {
    if (tagIds.has(t.id)) continue
    const same = tagByName.get(fold(t.name))
    if (same) {
      remap.set(t.id, same)
      continue
    }
    tags.push(t)
    tagIds.add(t.id)
    tagByName.set(fold(t.name), t.id)
  }

  const contacts = [...online.contacts]
  const index = new Map(contacts.map((c, i) => [c.id, i]))
  const seen = new Set(contacts.flatMap(identityKeys))
  let added = 0
  let updated = 0

  for (const raw of local.contacts) {
    const c = remap.size
      ? { ...raw, tagIds: [...new Set(raw.tagIds.map((id) => remap.get(id) ?? id))] }
      : raw
    const at = index.get(c.id)
    if (at !== undefined) {
      if (c.updatedAt > contacts[at].updatedAt) {
        contacts[at] = c
        updated++
      }
      continue
    }
    const keys = identityKeys(c)
    if (keys.some((k) => seen.has(k))) continue
    for (const k of keys) seen.add(k)
    index.set(c.id, contacts.length)
    contacts.push(c)
    added++
  }

  return { contacts, tags, added, updated, remap }
}
