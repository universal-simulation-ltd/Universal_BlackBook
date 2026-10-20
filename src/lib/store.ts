// IndexedDB persistence — three object stores, no dependency.
//
// This is the ONLY copy of a user's book (a backup file the user saves from
// Import & export is the only other, and only if they made one). A bug here is
// not a sync conflict, it is somebody's address book gone. Two rules follow from that and are worth keeping:
//
//   • `onupgradeneeded` only ever ADDS stores. Never delete or rebuild one on
//     a version bump — a partially-shipped migration would take the data with
//     it, and there is nowhere to restore from.
//   • Reads tolerate junk. A record that fails to parse is dropped from the
//     result, never thrown over: one bad row must not make the whole book
//     unopenable.

import type { Contact, Tag } from './types'
import { isValidBirthday } from './birthday'
import { SORT_KEYS, type SortKey, type View } from './filter'
import { toLockRecord, type LockRecord } from './lock'
import { toTodos, type Todo } from './todos'

const DB_NAME = 'blackbook'
const DB_VERSION = 1
const CONTACTS = 'contacts'
// ⚠️ The object store is still called 'categories', and must stay called that.
// Tags were renamed from categories in the UI on 2026-08-24; renaming an
// IndexedDB store means creating the new one and copying every record across
// on a version bump, and this file's first rule is that a partially-shipped
// migration takes somebody's only copy of their address book with it. The name
// is a wire format. It is not worth a single byte of risk.
const TAGS = 'categories'
/**
 * Out-of-line store: the PIN lock, the saved view, the to-do list and the seed
 * marker (and, until 2026-10-20, the online vault's key and bookkeeping).
 *
 * ⚠️ The lock record lives HERE, in an existing store, rather than in one of
 * its own — because a new object store means a DB_VERSION bump, and this
 * file's first rule is that a partially-shipped migration takes somebody's
 * only copy of their address book with it. A third fixed key in a keyed store
 * costs nothing and migrates nothing. The name 'sync' is a wire format by now;
 * read it as "the small settings store".
 */
const SYNC = 'sync'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CONTACTS)) db.createObjectStore(CONTACTS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(TAGS)) db.createObjectStore(TAGS, { keyPath: 'id' })
      // No keyPath — this store holds a CryptoKey and a small settings record
      // under fixed keys, neither of which has an id field of its own.
      if (!db.objectStoreNames.contains(SYNC)) db.createObjectStore(SYNC)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(store, mode)
      const req = fn(t.objectStore(store))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

/**
 * Coerce whatever came back out of IndexedDB into a Contact, or null.
 *
 * Everything in the record was written by this app, so this is not defending
 * against an attacker — it is defending against OUR OWN older shapes, and
 * against a hand-edited import. `tagIds` in particular is filtered to strings
 * because a dangling id is harmless (it just matches no tag) whereas a
 * non-string one crashes the chip renderer.
 *
 * ⚠️ `tagIds` falls back to `categoryIds`, which is what every record written
 * before 2026-08-24 carries. That fallback is not decoration: without it, the
 * rename silently un-files every contact in every existing book, and since the
 * book is the ONLY copy there is nothing to restore from. Writes use the new
 * name only, so a book heals as it is edited — but the read has to keep
 * accepting the old one for as long as anybody's browser might still hold it,
 * which is forever, because a user who last opened this app in 2026 and comes
 * back in 2030 is exactly the person a local-first address book is for.
 *
 * `frequency` is simply dropped: the field was removed on 2026-08-24 and an
 * old record's value is ignored rather than migrated anywhere.
 */
function toContact(raw: unknown): Contact | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  const ids = Array.isArray(r.tagIds) ? r.tagIds : Array.isArray(r.categoryIds) ? r.categoryIds : []
  return {
    id: r.id,
    name: typeof r.name === 'string' ? r.name : '',
    email: typeof r.email === 'string' ? r.email : '',
    // Added 2026-08-30. Every record written before then has no `phone` at
    // all, and this is the whole migration for them: absent reads as empty,
    // and the record gains the field the next time it is saved.
    phone: typeof r.phone === 'string' ? r.phone : '',
    company: typeof r.company === 'string' && r.company ? r.company : undefined,
    // Added 2026-09-29, and missing from this reader until 2026-10-20: every
    // address was on disk but dropped from memory on the next launch.
    address: typeof r.address === 'string' && r.address ? r.address : undefined,
    tagIds: ids.filter((v): v is string => typeof v === 'string'),
    // Dropped rather than kept when unparseable. A malformed birthdate would
    // otherwise reach formatBirthday on every render of that card, and an
    // empty string there is indistinguishable from "not recorded" anyway.
    birthdate: typeof r.birthdate === 'string' && isValidBirthday(r.birthdate) ? r.birthdate : undefined,
    // Only ever stored when TRUE, so the field is absent on every record that
    // predates it and on everyone who is simply shown — which is the great
    // majority. Anything other than a literal `true` reads as "shown": the
    // failure mode of a corrupt value has to be a visible birthday, never a
    // silently missing one.
    hideBirthday: r.hideBirthday === true ? true : undefined,
    // Same rule, same reason: a corrupt value must leave the person VISIBLE.
    hideFromList: r.hideFromList === true ? true : undefined,
    listOnly: r.listOnly === true ? true : undefined,
    pinnedAt:
      typeof r.pinnedAt === 'number'
        ? r.pinnedAt
        : r.pinned === true && typeof r.updatedAt === 'number'
          ? r.updatedAt
          : undefined,
    notes: typeof r.notes === 'string' ? r.notes : '',
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

function toTag(raw: unknown): Tag | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  return {
    id: r.id,
    name: typeof r.name === 'string' ? r.name : 'Untitled',
    colour: typeof r.colour === 'string' ? r.colour : 'amber',
    // ⚠️ Kept through this reader or lists turn back into tags on the next
    // load — every unknown field is dropped here.
    ...(r.kind === 'list'
      ? {
          kind: 'list' as const,
          tagIds: Array.isArray(r.tagIds) ? r.tagIds.filter((v): v is string => typeof v === 'string') : [],
        }
      : {}),
  }
}

export async function loadContacts(): Promise<Contact[]> {
  const all = await tx<unknown[]>(CONTACTS, 'readonly', (s) => s.getAll() as IDBRequest<unknown[]>)
  return all.map(toContact).filter((c): c is Contact => c !== null)
}

export async function loadTags(): Promise<Tag[]> {
  const all = await tx<unknown[]>(TAGS, 'readonly', (s) => s.getAll() as IDBRequest<unknown[]>)
  return all.map(toTag).filter((t): t is Tag => t !== null)
}

export async function putContact(contact: Contact): Promise<void> {
  await tx(CONTACTS, 'readwrite', (s) => s.put(contact))
}

export async function deleteContact(id: string): Promise<void> {
  await tx(CONTACTS, 'readwrite', (s) => s.delete(id))
}

export async function putTag(tag: Tag): Promise<void> {
  await tx(TAGS, 'readwrite', (s) => s.put(tag))
}

export async function deleteTag(id: string): Promise<void> {
  await tx(TAGS, 'readwrite', (s) => s.delete(id))
}

/**
 * Replace the whole book — used by CSV import's "replace" mode only.
 *
 * Both stores are cleared and rewritten inside ONE transaction each, so a
 * failure mid-import cannot leave contacts pointing at tags that were never
 * written. IndexedDB aborts the transaction on any failed request, which rolls
 * the clear back with it.
 */
export async function replaceAll(contacts: Contact[], tags: Tag[]): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction([CONTACTS, TAGS], 'readwrite')
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
      const cs = t.objectStore(CONTACTS)
      const gs = t.objectStore(TAGS)
      cs.clear()
      gs.clear()
      for (const c of contacts) cs.put(c)
      for (const g of tags) gs.put(g)
    })
  } finally {
    db.close()
  }
}

// ─────────────────────────────────────────────────────── the 'sync' store
//
// Fixed keys, all scoped to the browser profile they live in:
//
//   'key'   (gone) the online vault's remembered CryptoKey, and
//   'meta'  (gone) its sync bookkeeping. Online sync was removed on 2026-10-20
//           (no sign-in; a backup file instead). `forgetOldSync` deletes both
//           from any device that still has them.
//   'lock'  the PIN lock's salt and digest (lib/lock.ts). Device-local, and
//           NOT part of a backup file: a PIN is the door on this device.
//   'view'  the filters and order this app opens on. A preference about this
//           device, so a backup file carries it but only "Replace everything"
//           brings it back; "Add to what's here" leaves this device's own.
//   'todos' the To-do tab's whole list, as ONE array. Here rather than in an
//           object store of its own for the reason the lock is: a new store is
//           a DB_VERSION bump. A to-do list is small enough that rewriting it
//           whole on every tick costs nothing. It is data, not a preference,
//           and always part of a backup file.
//   'seed'  whether this device has ever been given its two starting tags. A
//           marker and not a count, so deleting them is a decision that sticks.

// ── the view the app opens on ────────────────────────────────────────────────

/**
 * Coerce a stored view, or null.
 *
 * Tolerant in the same way every other read in this file is: an unknown sort
 * key or a non-array tag list reads as "no saved view" rather than as a
 * filtered list nobody can explain. The failure mode has to be the whole book,
 * never a book with people missing from it.
 */
function toView(raw: unknown): View | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const sort = SORT_KEYS.includes(r.sort as SortKey) ? (r.sort as SortKey) : null
  if (!sort) return null
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  // `hiddenTagIds` is absent from every view saved before 2026-09-17, which
  // reads correctly as "nothing hidden".
  return { tagIds: ids(r.tagIds), hiddenTagIds: ids(r.hiddenTagIds), sort }
}

export async function loadTodos(): Promise<Todo[]> {
  return toTodos(await tx<unknown>(SYNC, 'readonly', (s) => s.get('todos') as IDBRequest<unknown>))
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.put(todos, 'todos'))
}

export async function loadDefaultView(): Promise<View | null> {
  const raw = await tx<unknown>(SYNC, 'readonly', (s) => s.get('view') as IDBRequest<unknown>)
  return toView(raw)
}

export async function saveDefaultView(view: View): Promise<void> {
  // A plain object, not the store's own state: whatever is handed in is copied
  // so a later edit of the live query cannot reach the record on disk.
  await tx(SYNC, 'readwrite', (s) => s.put({ tagIds: [...view.tagIds], hiddenTagIds: [...view.hiddenTagIds], sort: view.sort }, 'view'))
}

export async function clearDefaultView(): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.delete('view'))
}

// ── the starting tags ────────────────────────────────────────────────────────

/**
 * Has this device ever been offered its two starting tags?
 *
 * ⚠️ The marker is what makes "Important People" and "Important Notes" a
 * STARTING point rather than a pair of tags that grow back. Seeding on "the
 * book has no tags" alone would recreate both the moment somebody deleted them
 * — an app arguing with a decision its user has already made, every time they
 * open it.
 */
export async function loadSeeded(): Promise<boolean> {
  const raw = await tx<unknown>(SYNC, 'readonly', (s) => s.get('seed') as IDBRequest<unknown>)
  return raw === true
}

export async function markSeeded(): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.put(true, 'seed'))
}

// ── the PIN lock ─────────────────────────────────────────────────────────────

/**
 * The lock record, or null for "this device has no PIN".
 *
 * A record that fails to parse reads as null — see `toLockRecord` for why the
 * failure mode is deliberately "opens unlocked" and not "locked forever".
 */
export async function loadLock(): Promise<LockRecord | null> {
  const raw = await tx<unknown>(SYNC, 'readonly', (s) => s.get('lock') as IDBRequest<unknown>)
  return toLockRecord(raw)
}

export async function saveLock(rec: LockRecord): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.put(rec, 'lock'))
}

export async function clearLock(): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.delete('lock'))
}

/**
 * Throw this device away: the book, the tags, the lock, and every trace of the
 * online copy. Used by exactly one thing — "I have forgotten my PIN".
 *
 * ⚠️ **Clearing the lock alone would not be a reset, it would be a bypass.**
 * The PIN is a door in front of a book that is sitting in IndexedDB in the
 * clear (see lib/lock.ts), so anything that opens the door without the PIN has
 * to take the book with it. That is the whole design: a stranger who reaches
 * for this can destroy the book but can never read it, and the owner gets a
 * working app back instead of a phone they have to reinstall.
 *
 * The online vault's old key and bookkeeping go too, on a device that still
 * has them (see `forgetOldSync`).
 *
 * Each store is cleared in its own transaction. There is no atomicity to
 * protect here: every partial outcome is strictly safer than the state before
 * it, and a half-done wipe that has already taken the contacts is not a state
 * worth rolling back into.
 */
export async function wipeDevice(): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction([CONTACTS, TAGS], 'readwrite')
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
      t.objectStore(CONTACTS).clear()
      t.objectStore(TAGS).clear()
    })
  } finally {
    db.close()
  }
  await tx(SYNC, 'readwrite', (s) => s.delete('key'))
  await tx(SYNC, 'readwrite', (s) => s.delete('meta'))
  await tx(SYNC, 'readwrite', (s) => s.delete('lock'))
  // The saved view and the seed marker go too. A wiped device is a new book,
  // and a new book is entitled to its starting tags and to opening on Name A–Z
  // rather than on a filter belonging to a book that no longer exists.
  await tx(SYNC, 'readwrite', (s) => s.delete('view'))
  await tx(SYNC, 'readwrite', (s) => s.delete('seed'))
  // The to-do list is part of the book, and goes with it.
  await tx(SYNC, 'readwrite', (s) => s.delete('todos'))
}

/**
 * Drop what the online vault (removed 2026-10-20) left on this device: its
 * remembered key and its bookkeeping. Never the contacts. Run once per launch
 * by bookStore.init; deleting a key that is not there costs nothing.
 */
export async function forgetOldSync(): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.delete('key'))
  await tx(SYNC, 'readwrite', (s) => s.delete('meta'))
}
