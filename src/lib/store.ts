// IndexedDB persistence — three object stores, no dependency.
//
// This is the ONLY copy of a user's book. There is no server, no account and
// no export-on-write, so a bug here is not a sync conflict, it is somebody's
// address book gone. Two rules follow from that and are worth keeping:
//
//   • `onupgradeneeded` only ever ADDS stores. Never delete or rebuild one on
//     a version bump — a partially-shipped migration would take the data with
//     it, and there is nowhere to restore from.
//   • Reads tolerate junk. A record that fails to parse is dropped from the
//     result, never thrown over: one bad row must not make the whole book
//     unopenable.

import type { Category, Contact } from './types'
import { isFrequency } from './frequency'

const DB_NAME = 'blackbook'
const DB_VERSION = 1
const CONTACTS = 'contacts'
const CATEGORIES = 'categories'
/** Out-of-line store: the remembered vault key and the sync bookkeeping. */
const SYNC = 'sync'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CONTACTS)) db.createObjectStore(CONTACTS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(CATEGORIES)) db.createObjectStore(CATEGORIES, { keyPath: 'id' })
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
 * against a hand-edited import. `categoryIds` in particular is filtered to
 * strings because a dangling id is harmless (it just matches no category)
 * whereas a non-string one crashes the chip renderer.
 */
function toContact(raw: unknown): Contact | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  const freq = typeof r.frequency === 'string' && isFrequency(r.frequency) ? r.frequency : 'quarterly'
  return {
    id: r.id,
    name: typeof r.name === 'string' ? r.name : '',
    email: typeof r.email === 'string' ? r.email : '',
    categoryIds: Array.isArray(r.categoryIds) ? r.categoryIds.filter((v): v is string => typeof v === 'string') : [],
    frequency: freq,
    notes: typeof r.notes === 'string' ? r.notes : '',
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

function toCategory(raw: unknown): Category | null {
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

export async function loadCategories(): Promise<Category[]> {
  const all = await tx<unknown[]>(CATEGORIES, 'readonly', (s) => s.getAll() as IDBRequest<unknown[]>)
  return all.map(toCategory).filter((c): c is Category => c !== null)
}

export async function putContact(contact: Contact): Promise<void> {
  await tx(CONTACTS, 'readwrite', (s) => s.put(contact))
}

export async function deleteContact(id: string): Promise<void> {
  await tx(CONTACTS, 'readwrite', (s) => s.delete(id))
}

export async function putCategory(category: Category): Promise<void> {
  await tx(CATEGORIES, 'readwrite', (s) => s.put(category))
}

export async function deleteCategory(id: string): Promise<void> {
  await tx(CATEGORIES, 'readwrite', (s) => s.delete(id))
}

/**
 * Replace the whole book — used by CSV import's "replace" mode only.
 *
 * Both stores are cleared and rewritten inside ONE transaction each, so a
 * failure mid-import cannot leave contacts pointing at categories that were
 * never written. IndexedDB aborts the transaction on any failed request, which
 * rolls the clear back with it.
 */
export async function replaceAll(contacts: Contact[], categories: Category[]): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction([CONTACTS, CATEGORIES], 'readwrite')
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
      const cs = t.objectStore(CONTACTS)
      const gs = t.objectStore(CATEGORIES)
      cs.clear()
      gs.clear()
      for (const c of contacts) cs.put(c)
      for (const g of categories) gs.put(g)
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
