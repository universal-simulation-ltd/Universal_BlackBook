// IndexedDB persistence — three object stores, no dependency.
//
// This is the ONLY copy of a user's book (the encrypted vault is an optional
// backup, not the primary). There is no export-on-write, so a bug here is not
// a sync conflict, it is somebody's address book gone. Two rules follow from that and are worth keeping:
//
//   • `onupgradeneeded` only ever ADDS stores. Never delete or rebuild one on
//     a version bump — a partially-shipped migration would take the data with
//     it, and there is nowhere to restore from.
//   • Reads tolerate junk. A record that fails to parse is dropped from the
//     result, never thrown over: one bad row must not make the whole book
//     unopenable.

import type { Contact, Tag } from './types'
import { isValidBirthday } from './birthday'
import { toLockRecord, type LockRecord } from './lock'

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
 * Out-of-line store: the remembered vault key, the sync bookkeeping, and the
 * PIN lock.
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

// ─────────────────────────────────────────────────────── the sync store
//
// Two fixed keys, both scoped to the browser profile they live in:
//
//   'key'   the remembered vault CryptoKey. IndexedDB stores CryptoKey objects
//           natively via the structured clone algorithm — the key is put in as
//           an object, not as bytes, and because it was derived with
//           `extractable: false` (lib/vault.ts) its material still cannot be
//           read back out. This is the whole reason "remember this device"
//           can be offered without writing a passphrase to disk.
//   'meta'  what the last sync saw, so the next one can detect that the
//           server moved underneath us.
//   'lock'  the PIN lock's salt and digest (lib/lock.ts). Device-local, and
//           NOT part of the vault — it is never uploaded, and `forgetVault`
//           below leaves it alone: signing out of a Universal ID has nothing
//           to do with the door on the front of this device's app.

export interface SyncMeta {
  /** The Universal ID this vault belongs to. */
  userId: string
  /** Server revision this device last successfully read or wrote. */
  rev: number
  /** PBKDF2 parameters the vault was written with. */
  salt: string
  iterations: number
  /** Epoch ms of the last successful push. */
  pushedAt: number
}

export async function loadVaultKey(): Promise<CryptoKey | null> {
  const key = await tx<CryptoKey | undefined>(SYNC, 'readonly', (s) => s.get('key') as IDBRequest<CryptoKey | undefined>)
  return key ?? null
}

export async function saveVaultKey(key: CryptoKey): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.put(key, 'key'))
}

export async function loadSyncMeta(): Promise<SyncMeta | null> {
  const meta = await tx<SyncMeta | undefined>(SYNC, 'readonly', (s) => s.get('meta') as IDBRequest<SyncMeta | undefined>)
  return meta ?? null
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.put(meta, 'meta'))
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
 * ⚠️ **The remembered vault key is the part that is easy to miss, and leaving
 * it would undo everything above.** It is a non-extractable CryptoKey sitting
 * in this same store; a reset that wiped the contacts and left it behind would
 * hand the next screen a device that pulls the whole book back down from the
 * vault on its own, with no passphrase asked for. So the key and the sync
 * bookkeeping go too, and getting the book back afterwards costs a Universal
 * ID sign-in AND the vault passphrase — neither of which this device now
 * holds.
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
}

/**
 * Forget everything about the online copy on THIS device — the remembered key
 * and the bookkeeping, never the contacts.
 *
 * Called on "forget this device" and on sign-out. Sign-out matters: a shared
 * machine must not leave a key behind that decrypts the next person's view of
 * an account they have just signed into.
 */
export async function forgetVault(): Promise<void> {
  await tx(SYNC, 'readwrite', (s) => s.delete('key'))
  await tx(SYNC, 'readwrite', (s) => s.delete('meta'))
}
