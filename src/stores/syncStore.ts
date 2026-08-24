import type { SupabaseClient } from '@supabase/supabase-js'
import { create } from 'zustand'
import {
  createVault,
  deleteVault,
  fetchVault,
  updateVault,
  VaultConflictError,
  type VaultPayload,
} from '../lib/cloud'
import {
  forgetVault,
  loadSyncMeta,
  loadVaultKey,
  saveSyncMeta,
  saveVaultKey,
  type SyncMeta,
} from '../lib/store'
import type { Category, Contact } from '../lib/types'
import {
  decryptJson,
  deriveKey,
  encryptJson,
  KDF_ITERATIONS,
  newSalt,
  VAULT_VERSION,
  vaultSizeError,
} from '../lib/vault'
import { useBookStore } from './bookStore'

/**
 * Where this device stands with the online copy.
 *
 *   'signed-out'  no Universal ID — the only state where the feature is not
 *                 available at all.
 *   'off'         signed in, no vault on the server. The default, and the
 *                 state the app stays in unless somebody opts in.
 *   'locked'      a vault exists but this device has no key for it. Needs the
 *                 passphrase; this is what a second device sees.
 *   'on'          unlocked and syncing.
 */
export type SyncState = 'signed-out' | 'off' | 'locked' | 'on'

export type SyncStatus = 'idle' | 'working' | 'saved' | 'error' | 'conflict'

interface SyncStore {
  state: SyncState
  status: SyncStatus
  message: string | null
  /** Server revision this device believes is current. */
  rev: number
  salt: string | null
  iterations: number
  lastPushedAt: number | null
  /** Held in memory only while unlocked; never serialised. */
  key: CryptoKey | null
  /** True once `remember` was chosen, so the UI can offer to undo it. */
  remembered: boolean
  /**
   * A vault decrypted during `unlock` but not yet adopted — the user is being
   * asked whether to take it or to overwrite it with this device's book.
   */
  pending: VaultPayload | null

  hydrate: (supabase: SupabaseClient, userId: string | null) => Promise<void>
  enable: (supabase: SupabaseClient, userId: string, passphrase: string, remember: boolean) => Promise<void>
  unlock: (supabase: SupabaseClient, userId: string, passphrase: string, remember: boolean) => Promise<void>
  adoptPending: () => Promise<void>
  discardPending: (supabase: SupabaseClient) => Promise<void>
  push: (supabase: SupabaseClient, force?: boolean) => Promise<void>
  pull: (supabase: SupabaseClient) => Promise<void>
  disable: (supabase: SupabaseClient) => Promise<void>
  forgetDevice: () => Promise<void>
  reset: () => void
}

function bookPayload(): VaultPayload {
  const { contacts, categories } = useBookStore.getState()
  return { version: VAULT_VERSION, contacts, categories, savedAt: Date.now() }
}

/**
 * Adopt a decrypted payload as the local book.
 *
 * Goes through `replaceAll` in bookStore rather than merging: the vault is a
 * snapshot of a whole book, and a field-level merge of two address books
 * without per-record clocks produces duplicates nobody asked for. The user is
 * always asked before this runs (see `pending`), so a replace is a choice
 * rather than a surprise.
 */
async function adopt(payload: VaultPayload) {
  const contacts: Contact[] = Array.isArray(payload.contacts) ? payload.contacts : []
  const categories: Category[] = Array.isArray(payload.categories) ? payload.categories : []
  await useBookStore.getState().importBook(contacts, categories, 'replace', null)
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  state: 'signed-out',
  status: 'idle',
  message: null,
  rev: 0,
  salt: null,
  iterations: KDF_ITERATIONS,
  lastPushedAt: null,
  key: null,
  remembered: false,
  pending: null,

  reset: () =>
    set({
      state: 'signed-out',
      status: 'idle',
      message: null,
      rev: 0,
      salt: null,
      key: null,
      remembered: false,
      pending: null,
      lastPushedAt: null,
    }),

  hydrate: async (supabase, userId) => {
    if (!userId) {
      // Signing out drops the in-memory key immediately. The REMEMBERED key
      // is cleared separately, by App's sign-out effect, because forgetting it
      // is a disk write and this path also runs on a transient session blip.
      set({ state: 'signed-out', key: null, pending: null, status: 'idle', message: null })
      return
    }
    set({ status: 'working', message: null })
    try {
      const row = await fetchVault(supabase)
      if (!row) {
        set({ state: 'off', status: 'idle', rev: 0, salt: null, key: null, remembered: false })
        return
      }
      const [storedKey, meta] = await Promise.all([loadVaultKey(), loadSyncMeta()])
      // A remembered key belongs to ONE account. Signing in as somebody else
      // on the same browser must not try it against their vault — it would
      // fail the GCM tag anyway, but "wrong passphrase" is a misleading thing
      // to tell someone who never typed one.
      //
      // Narrowed with an early return on `meta` itself rather than on a
      // combined `usable` flag, so the rest of the branch keeps `meta` as
      // non-null without a cast.
      if (!storedKey || !meta || meta.userId !== userId) {
        set({
          state: 'locked',
          status: 'idle',
          rev: row.rev,
          salt: row.kdf_salt,
          iterations: row.kdf_iterations,
          key: null,
          remembered: false,
        })
        return
      }
      const payload = await decryptJson<VaultPayload>(row.ciphertext, storedKey)
      if (!payload) {
        set({ state: 'locked', status: 'idle', rev: row.rev, salt: row.kdf_salt, iterations: row.kdf_iterations, key: null })
        return
      }
      // The device is up to date with the server → nothing to ask, just adopt.
      // Behind it → the server has newer work, and adopting is right too: this
      // device's own edits were pushed as they happened, so anything newer on
      // the server came from a device that had them.
      if (meta.rev !== row.rev) await adopt(payload)
      set({
        state: 'on',
        status: 'idle',
        rev: row.rev,
        salt: row.kdf_salt,
        iterations: row.kdf_iterations,
        key: storedKey,
        remembered: true,
        lastPushedAt: meta.pushedAt,
      })
      await saveSyncMeta({ ...meta, rev: row.rev })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not reach the server' })
    }
  },

  enable: async (supabase, userId, passphrase, remember) => {
    set({ status: 'working', message: null })
    try {
      const salt = newSalt()
      const key = await deriveKey(passphrase, salt, KDF_ITERATIONS)
      const ciphertext = await encryptJson(bookPayload(), key)
      // Refuse an oversized book BEFORE the insert. Nothing has been persisted
      // at this point — no meta, no stored key — so the app simply stays off.
      const tooBig = vaultSizeError(ciphertext)
      if (tooBig) {
        set({ status: 'error', message: tooBig })
        return
      }
      const rev = await createVault(supabase, ciphertext, salt, KDF_ITERATIONS)
      const meta: SyncMeta = { userId, rev, salt, iterations: KDF_ITERATIONS, pushedAt: Date.now() }
      await saveSyncMeta(meta)
      if (remember) await saveVaultKey(key)
      set({
        state: 'on',
        status: 'saved',
        rev,
        salt,
        iterations: KDF_ITERATIONS,
        key,
        remembered: remember,
        lastPushedAt: meta.pushedAt,
        message: null,
      })
    } catch (e) {
      set({
        status: 'error',
        message:
          e instanceof VaultConflictError
            ? 'You already have an online copy — reload and unlock it instead.'
            : e instanceof Error
              ? e.message
              : 'Could not save online',
      })
    }
  },

  unlock: async (supabase, userId, passphrase, remember) => {
    set({ status: 'working', message: null })
    try {
      const row = await fetchVault(supabase)
      if (!row) {
        set({ state: 'off', status: 'idle' })
        return
      }
      // Derive with the salt and iteration count THE VAULT WAS WRITTEN WITH,
      // never with today's constants — see the note on KDF_ITERATIONS.
      const key = await deriveKey(passphrase, row.kdf_salt, row.kdf_iterations)
      const payload = await decryptJson<VaultPayload>(row.ciphertext, key)
      if (!payload) {
        set({ status: 'error', message: 'That passphrase does not open this book.' })
        return
      }
      const meta: SyncMeta = {
        userId,
        rev: row.rev,
        salt: row.kdf_salt,
        iterations: row.kdf_iterations,
        pushedAt: Date.now(),
      }
      await saveSyncMeta(meta)
      if (remember) await saveVaultKey(key)
      const local = useBookStore.getState().contacts.length
      set({
        state: 'on',
        rev: row.rev,
        salt: row.kdf_salt,
        iterations: row.kdf_iterations,
        key,
        remembered: remember,
        // An empty device just takes the online copy — there is nothing to
        // lose and nothing to ask about. A device that already has contacts is
        // asked, because either answer destroys one of the two books.
        pending: local > 0 ? payload : null,
        status: 'idle',
        message: null,
      })
      if (local === 0) await adopt(payload)
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not reach the server' })
    }
  },

  adoptPending: async () => {
    const { pending } = get()
    if (!pending) return
    await adopt(pending)
    set({ pending: null, status: 'saved' })
  },

  discardPending: async (supabase) => {
    set({ pending: null })
    await get().push(supabase, true)
  },

  push: async (supabase, force = false) => {
    const { key, rev, salt, iterations, state } = get()
    if (state !== 'on' || !key || !salt) return
    set({ status: 'working', message: null })
    try {
      const ciphertext = await encryptJson(bookPayload(), key)
      // Same check on every save, not just the first: a book goes over the line
      // by being edited, and this is the path an edit takes. `rev` is left
      // where it was, so the next push after a prune is an ordinary one.
      const tooBig = vaultSizeError(ciphertext)
      if (tooBig) {
        set({ status: 'error', message: tooBig })
        return
      }
      let expected = rev
      if (force) {
        // Re-read the server's revision and write on top of it. Only reachable
        // from an explicit "overwrite the online copy" — never automatically,
        // or the compare-and-set would be decorative.
        const row = await fetchVault(supabase)
        expected = row?.rev ?? 0
        if (!row) {
          const created = await createVault(supabase, ciphertext, salt, iterations)
          set({ status: 'saved', rev: created, lastPushedAt: Date.now() })
          return
        }
      }
      const next = await updateVault(supabase, ciphertext, salt, iterations, expected)
      const meta = await loadSyncMeta()
      if (meta) await saveSyncMeta({ ...meta, rev: next, pushedAt: Date.now() })
      set({ status: 'saved', rev: next, lastPushedAt: Date.now() })
    } catch (e) {
      if (e instanceof VaultConflictError) {
        set({
          status: 'conflict',
          message: 'Another device saved a newer copy. Choose which one to keep.',
        })
        return
      }
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not save online' })
    }
  },

  pull: async (supabase) => {
    const { key } = get()
    if (!key) return
    set({ status: 'working', message: null })
    try {
      const row = await fetchVault(supabase)
      if (!row) {
        set({ state: 'off', status: 'idle', rev: 0, key: null })
        return
      }
      const payload = await decryptJson<VaultPayload>(row.ciphertext, key)
      if (!payload) {
        set({ status: 'error', message: 'The online copy could not be opened with this device’s key.' })
        return
      }
      await adopt(payload)
      const meta = await loadSyncMeta()
      if (meta) await saveSyncMeta({ ...meta, rev: row.rev })
      set({ status: 'saved', rev: row.rev, message: null })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not reach the server' })
    }
  },

  disable: async (supabase) => {
    set({ status: 'working', message: null })
    try {
      await deleteVault(supabase)
      await forgetVault()
      set({ state: 'off', status: 'idle', rev: 0, salt: null, key: null, remembered: false, pending: null, lastPushedAt: null })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not delete the online copy' })
    }
  },

  forgetDevice: async () => {
    await forgetVault()
    set({ state: 'locked', key: null, remembered: false, status: 'idle', message: null })
  },
}))
