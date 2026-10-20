import type { SupabaseClient } from '@supabase/supabase-js'
import { create } from 'zustand'
import {
  createVault,
  deleteVault,
  fetchVault,
  payloadTags,
  updateVault,
  VaultConflictError,
  VaultOfflineError,
  type VaultPayload,
  type VaultRow,
} from '../lib/cloud'
import {
  forgetVault,
  forgetVaultKey,
  loadSyncMeta,
  loadVaultKey,
  saveSyncMeta,
  saveVaultKey,
  type SyncMeta,
} from '../lib/store'
import type { Contact, Tag } from '../lib/types'
import {
  decryptJson,
  deriveKey,
  encryptJson,
  KDF_ITERATIONS,
  newSalt,
  VAULT_VERSION,
  vaultSizeError,
} from '../lib/vault'
import { mergeBooks, unsyncedWork } from '../lib/merge'
import { useBookStore } from './bookStore'
import { useTodoStore } from './todoStore'
import { mergeTodos, toTodos } from '../lib/todos'

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
   * asked whether to merge this device's contacts into it or to take the
   * online copy as it is.
   */
  pending: VaultPayload | null
  /**
   * The book has changed since the last successful push — true from the edit
   * until the autosave lands. Drives "Syncing…" beside the page title, so
   * adding people shows them going up rather than an unexplained wait.
   */
  dirty: boolean
  markDirty: () => void
  /**
   * Saves in a row that failed for want of a network (0 = the last one got
   * through). App retries while it is above 0 — see `useCloudSync` — and a
   * count rather than a flag so every failure schedules the next try.
   */
  offline: number

  hydrate: (supabase: SupabaseClient, userId: string | null) => Promise<void>
  enable: (supabase: SupabaseClient, userId: string, passphrase: string, remember: boolean) => Promise<void>
  unlock: (supabase: SupabaseClient, userId: string, passphrase: string, remember: boolean) => Promise<void>
  adoptPending: () => Promise<void>
  mergePending: (supabase: SupabaseClient) => Promise<void>
  push: (supabase: SupabaseClient, force?: boolean) => Promise<void>
  pull: (supabase: SupabaseClient) => Promise<void>
  /**
   * Re-encrypt the online copy under a new passphrase. Resolves true once it
   * has landed. Needs the CURRENT passphrase even on a remembered device —
   * whoever is holding an unlocked phone must not be able to lock its owner
   * out of their own backup.
   */
  changePassphrase: (supabase: SupabaseClient, current: string, next: string) => Promise<boolean>
  disable: (supabase: SupabaseClient) => Promise<void>
  forgetDevice: () => Promise<void>
  reset: () => void
}

function bookPayload(): VaultPayload {
  const { contacts, tags } = useBookStore.getState()
  const todo = useTodoStore.getState()
  // `categories` is the deprecated mirror of `tags` — see VaultPayload for why
  // a stale PWA build reading this blob makes the duplication necessary.
  // `todos` only once the list has been read off the disk: an empty array
  // before then would overwrite the online list with nothing.
  return {
    version: VAULT_VERSION,
    contacts,
    tags,
    categories: tags,
    ...(todo.loaded && { todos: todo.todos }),
    savedAt: Date.now(),
  }
}

/**
 * Adopt a decrypted payload as the local book.
 *
 * A replace: the vault is a snapshot of a whole book. Merging is a separate,
 * explicit answer (`mergePending`) — a device that already has contacts is
 * always asked before this runs, so a replace is a choice rather than a
 * surprise.
 */
async function adopt(payload: VaultPayload) {
  const contacts: Contact[] = Array.isArray(payload.contacts) ? payload.contacts : []
  const tags: Tag[] = payloadTags(payload)
  await useBookStore.getState().importBook(contacts, tags, 'replace', null)
  // Absent = the blob says nothing about to-dos (see VaultPayload): keep ours.
  if (Array.isArray(payload.todos)) await useTodoStore.getState().replace(toTodos(payload.todos))
}

/**
 * Fold a decrypted payload and this device's book together, the online copy
 * as the base (see lib/merge.ts). Nothing is pushed here — the caller does
 * that once sync is on.
 *
 * Signing in merges WITHOUT ASKING (owner's call, 2026-10-08: "when logging
 * in and entering the passphrase, I expect to just see any entries I created
 * as a guest and the ones saved online without a dialog"). It used to be a
 * Merge / "Use the online copy only" question; merge is the answer that loses
 * nothing, and the other one is a menu away (Advanced ▸ Online backup ▸
 * Fetch online copy).
 */
async function mergeIn(payload: VaultPayload) {
  const { contacts, tags } = useBookStore.getState()
  const merged = mergeBooks({ contacts: payload.contacts ?? [], tags: payloadTags(payload) }, { contacts, tags })
  await useBookStore.getState().importBook(merged.contacts, merged.tags, 'replace', null)
  await useTodoStore.getState().init()
  await useTodoStore
    .getState()
    .replace(mergeTodos(toTodos(payload.todos), useTodoStore.getState().todos, merged.remap))
}

/**
 * If the server's salt is not the one this device's key was derived with, the
 * passphrase was changed on another device: lock this one and say so.
 * Returns true when it locked.
 *
 * Nothing local is lost. Unlocking with the new passphrase offers to merge
 * this device's contacts in, the same as any second device.
 */
async function lockIfPassphraseChanged(row: VaultRow): Promise<boolean> {
  if (row.kdf_salt === useSyncStore.getState().salt) return false
  await forgetVaultKey()
  useSyncStore.setState({
    state: 'locked',
    status: 'idle',
    rev: row.rev,
    salt: row.kdf_salt,
    iterations: row.kdf_iterations,
    key: null,
    remembered: false,
    message: PASSPHRASE_CHANGED,
  })
  return true
}

/** Shown while a save is waiting for the network; App keeps retrying. */
export const OFFLINE = 'Not saved online yet — no connection. It will try again by itself.'

/** Shown on a device whose key stopped working because of `changePassphrase` elsewhere. */
export const PASSPHRASE_CHANGED =
  'The passphrase for your online copy was changed on another device. Enter the new one to carry on syncing.'

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
  dirty: false,
  markDirty: () => set({ dirty: true }),
  offline: 0,

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
        // A new salt on the server is how a passphrase change elsewhere shows
        // up. Say so, and drop the dead key so the next opening does not try
        // it again.
        const changed = meta.salt !== row.kdf_salt
        if (changed) await forgetVaultKey()
        set({
          state: 'locked',
          status: 'idle',
          rev: row.rev,
          salt: row.kdf_salt,
          iterations: row.kdf_iterations,
          key: null,
          remembered: false,
          message: changed ? PASSPHRASE_CHANGED : null,
        })
        return
      }
      // Up to date with the server, with edits made here since → the next
      // push carries them up, because the online copy is what they were made
      // on top of. Nothing to ask.
      //
      // Behind it → the server has newer work from another device. Adopting
      // is right ONLY when this device has nothing the online copy lacks. ⚠️
      // "Its own edits were pushed as they happened" is not true of edits
      // made while signed out: a sign-out this app never saw (another suite
      // app on the same site, an expired session) leaves the remembered key
      // here, and adopting then silently deleted whoever was added in the
      // meantime (owner's report, 2026-09-29). So those devices are asked the
      // same merge question as an unlock.
      //
      // `since === 0` is an unlock whose question was never answered: the
      // books are unrelated, so it is asked again, or adopted if this device
      // has nothing of its own — never pushed over the online copy.
      await Promise.all([useBookStore.getState().init(), useTodoStore.getState().init()])
      const since = meta.syncedAt ?? meta.pushedAt
      const behind = meta.rev !== row.rev || since === 0
      const book = { contacts: useBookStore.getState().contacts, todos: useTodoStore.getState().todos }
      const ask = behind && unsyncedWork(book, payload, since) > 0
      if (behind && !ask) await adopt(payload)
      // Work this device has that the online copy lacks is merged in, not
      // asked about — see `mergeIn` — and pushed straight after the set below.
      if (ask) await mergeIn(payload)
      set({
        state: 'on',
        status: 'idle',
        rev: row.rev,
        salt: row.kdf_salt,
        iterations: row.kdf_iterations,
        key: storedKey,
        remembered: true,
        lastPushedAt: meta.pushedAt,
        pending: null,
      })
      // A merge is in sync once it has gone up: `push` writes the meta. Until
      // then (offline) a reload merges again, which changes nothing.
      if (ask) await get().push(supabase)
      else await saveSyncMeta({ ...meta, rev: row.rev, syncedAt: behind ? Date.now() : since })
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
      const now = Date.now()
      const meta: SyncMeta = { userId, rev, salt, iterations: KDF_ITERATIONS, pushedAt: now, syncedAt: now }
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
      // To-dos count as local data too: a device holding only to-dos must be
      // asked, not have them replaced by the online list.
      await Promise.all([useBookStore.getState().init(), useTodoStore.getState().init()])
      const local = useBookStore.getState().contacts.length + useTodoStore.getState().todos.length
      const now = Date.now()
      const meta: SyncMeta = {
        userId,
        rev: row.rev,
        salt: row.kdf_salt,
        iterations: row.kdf_iterations,
        pushedAt: now,
        // 0 until the merge has gone up (`push` sets it) — see SyncMeta.syncedAt.
        syncedAt: local > 0 ? 0 : now,
      }
      await saveSyncMeta(meta)
      if (remember) await saveVaultKey(key)
      set({
        state: 'on',
        rev: row.rev,
        salt: row.kdf_salt,
        iterations: row.kdf_iterations,
        key,
        remembered: remember,
        // An empty device just takes the online copy. One that already has
        // contacts (a guest's) has them merged in, unasked — see `mergeIn`.
        pending: null,
        status: 'idle',
        message: null,
      })
      if (local === 0) await adopt(payload)
      else {
        await mergeIn(payload)
        // Straight up: the online copy lacks the guest's contacts until it goes.
        await get().push(supabase)
      }
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not reach the server' })
    }
  },

  adoptPending: async () => {
    const { pending } = get()
    if (!pending) return
    await adopt(pending)
    const meta = await loadSyncMeta()
    if (meta) await saveSyncMeta({ ...meta, rev: get().rev, syncedAt: Date.now() })
    set({ pending: null, status: 'saved' })
  },

  mergePending: async (supabase) => {
    const { pending } = get()
    if (!pending) return
    await mergeIn(pending)
    set({ pending: null })
    // Straight up, rather than on the autosave timer: the online copy is
    // missing this device's contacts until it goes, and a second device
    // signing in during that window would not see them.
    await get().push(supabase)
  },

  push: async (supabase, force = false) => {
    const { key, rev, salt, iterations, state, pending } = get()
    // ⚠️ Never while the merge question is open. This device's book is not
    // the answer yet, and the autosave fires 2.5 s after sync turns on: it
    // used to write the local book over the online copy before anybody had
    // chosen, so closing the panel unanswered lost everything online that
    // this device did not have.
    if (state !== 'on' || !key || !salt || pending) return
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
        // ⚠️ Not after a passphrase change elsewhere. This device's key is the
        // OLD one, and "keep this device" would quietly put the old passphrase
        // back — undoing the change, and locking out the device that made it.
        if (row && (await lockIfPassphraseChanged(row))) return
        expected = row?.rev ?? 0
        if (!row) {
          const created = await createVault(supabase, ciphertext, salt, iterations)
          set({ status: 'saved', rev: created, lastPushedAt: Date.now(), dirty: false })
          return
        }
      }
      const next = await updateVault(supabase, ciphertext, salt, iterations, expected)
      const meta = await loadSyncMeta()
      const now = Date.now()
      if (meta) await saveSyncMeta({ ...meta, rev: next, pushedAt: now, syncedAt: now })
      set({ status: 'saved', rev: next, lastPushedAt: now, dirty: false, offline: 0 })
    } catch (e) {
      if (e instanceof VaultConflictError) {
        // A passphrase change moves the rev too. Offering "keep this device"
        // for that would be offering to revert it — see the force branch.
        const row = await fetchVault(supabase).catch(() => null)
        if (row && (await lockIfPassphraseChanged(row))) return
        set({
          status: 'conflict',
          message: 'Another device saved a newer copy. Choose which one to keep.',
        })
        return
      }
      if (e instanceof VaultOfflineError) {
        set((s) => ({ status: 'error', message: OFFLINE, offline: s.offline + 1 }))
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
        if (await lockIfPassphraseChanged(row)) return
        set({ status: 'error', message: 'The online copy could not be opened with this device’s key.' })
        return
      }
      await adopt(payload)
      const meta = await loadSyncMeta()
      if (meta) await saveSyncMeta({ ...meta, rev: row.rev, syncedAt: Date.now() })
      set({ status: 'saved', rev: row.rev, message: null })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not reach the server' })
    }
  },

  changePassphrase: async (supabase, current, next) => {
    const { state, rev, remembered } = get()
    if (state !== 'on') return false
    set({ status: 'working', message: null })
    try {
      const row = await fetchVault(supabase)
      if (!row) {
        set({ state: 'off', status: 'idle', rev: 0, salt: null, key: null, remembered: false })
        return false
      }
      // Checked against the server, not against the key in memory: the proof
      // asked for is "you know the passphrase", and a remembered device holds
      // the key without anybody having typed it.
      const oldKey = await deriveKey(current, row.kdf_salt, row.kdf_iterations)
      if (!(await decryptJson<VaultPayload>(row.ciphertext, oldKey))) {
        set({ status: 'error', message: 'That is not your current passphrase.' })
        return false
      }
      if (row.rev !== rev) {
        // Re-encrypting THIS device's book over a newer one would lose the
        // other device's edits under cover of a passphrase change. Settle
        // which book is current first.
        set({ status: 'conflict', message: 'Another device saved a newer copy. Choose which one to keep, then change the passphrase.' })
        return false
      }
      // A fresh salt, and today's iteration count — so a change is also how an
      // old vault picks up a raised KDF_ITERATIONS.
      const salt = newSalt()
      const key = await deriveKey(next, salt, KDF_ITERATIONS)
      const ciphertext = await encryptJson(bookPayload(), key)
      const tooBig = vaultSizeError(ciphertext)
      if (tooBig) {
        set({ status: 'error', message: tooBig })
        return false
      }
      // The same compare-and-set as every push. Ciphertext and salt go in ONE
      // row update, so there is no moment when the server holds a blob its
      // stored salt cannot open.
      const nextRev = await updateVault(supabase, ciphertext, salt, KDF_ITERATIONS, rev)
      const pushedAt = Date.now()
      const meta = await loadSyncMeta()
      if (meta) await saveSyncMeta({ ...meta, rev: nextRev, salt, iterations: KDF_ITERATIONS, pushedAt, syncedAt: pushedAt })
      // Replace the remembered key rather than leaving the old one on disk,
      // where the next opening would fail with it and ask for a passphrase.
      if (remembered) await saveVaultKey(key)
      set({
        key,
        salt,
        iterations: KDF_ITERATIONS,
        rev: nextRev,
        lastPushedAt: pushedAt,
        dirty: false,
        status: 'saved',
        message: 'Passphrase changed. Your other devices will ask for the new one.',
      })
      return true
    } catch (e) {
      if (e instanceof VaultConflictError) {
        set({ status: 'conflict', message: 'Another device saved a newer copy. Choose which one to keep, then change the passphrase.' })
        return false
      }
      set({ status: 'error', message: e instanceof Error ? e.message : 'Could not change the passphrase' })
      return false
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
