// Merging this device's book into the online copy — what happens when somebody
// signs in on a device that already has contacts of its own.
//
// ⚠️ The ONLINE copy is the base, and this device's book is folded into it.
// Signing in is "bring my book here", so everything already online stays, and
// the only question is which of this device's contacts it does not have yet.
//
// A person counts as already there by either of two tests:
//
//   1. **The same id.** The contact went up from this device, or came down to
//      it, at some point. Whichever copy was edited last wins.
//   2. **The same person** by `identityKeys` — name + email, or name + phone.
//      The same friend typed in on two devices before either was signed in has
//      two ids and is still one person. The online copy is kept.
//
// Tags are matched by id and then by name, so "Work" made on both devices
// becomes one tag and this device's contacts are re-pointed at it.

import { identityKeys } from './deviceContacts'
import { fold } from './filter'
import type { Contact, Tag } from './types'

export interface MergedBook {
  contacts: Contact[]
  tags: Tag[]
  /** This device's contacts that were not online at all. */
  added: number
  /** Contacts in both, where this device's copy was the newer edit. */
  updated: number
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

  return { contacts, tags, added, updated }
}
