import { currentT } from '../i18n'
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
  loadBackupOff,
  loadSyncMeta,
  loadVaultKey,
  saveBackupOff,
  saveSyncMeta,
  saveVaultKey,
  type SyncMeta,
} from '../lib/store'
import type { Contact, Tag } from '../lib/types'
import {
  decryptJson,
  deriveKey,
  encryptJson,
  importAccountKey,
  KDF_ITERATIONS,
  newAccountKey,
  newSalt,
  VAULT_VERSION,
  vaultSizeError,
} from '../lib/vault'
import { mergeBooks, unsyncedWork } from '../lib/merge'
import { useBookStore } from './bookStore'
import { useTodoStore } from './todoStore'
import { useNoteStore } from './noteStore'
import { mergeNotes, toNotes } from '../lib/notes'
import { BACKUP_SCHEMA } from '../lib/backup'
import { mergeTemplates, toTemplates } from '../lib/templates'
import { mergeTodos, toTodos } from '../lib/todos'
import { parseTabLayout } from '../lib/tabs'
import { useSettingsStore } from './settingsStore'

/**
 * Where this device stands with the online copy.
 *
 *   'signed-out'  no Universal ID — the only state where the feature is not
 *                 available at all.
 *   'off'         signed in, no vault on the server, and this device is not
 *                 starting one: it was turned off here, or deleted on another
 *                 device. Signing in otherwise turns it on by itself, without
 *                 a passphrase (James, 2026-10-26: an account in BlackBook is
 *                 for syncing every device).
 *   'locked'      a vault with a passphrase, and no key for it on this device.
 *                 What a second device sees — only ever with a passphrase:
 *                 one without opens on signing in.
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
  /** The online copy has a passphrase (on or locked). Without one its key is `accountKey`. */
  hasPassphrase: boolean
  /**
   * A vault without a passphrase keeps its key in the row (lib/vault.ts); it
   * goes back with every write, which would otherwise clear it.
   */
  accountKey: string | null
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
  /** `passphrase` null: no passphrase — the key is kept with the account. */
  enable: (supabase: SupabaseClient, userId: string, passphrase: string | null, remember: boolean) => Promise<void>
  unlock: (supabase: SupabaseClient, userId: string, passphrase: string, remember: boolean) => Promise<void>
  adoptPending: () => Promise<void>
  mergePending: (supabase: SupabaseClient) => Promise<void>
  push: (supabase: SupabaseClient, force?: boolean) => Promise<void>
  pull: (supabase: SupabaseClient) => Promise<void>
  /**
   * Re-encrypt the online copy under a new passphrase — or, with `next` null,
   * under a random key kept with the account (no passphrase). Resolves true
   * once it has landed. Needs the CURRENT passphrase even on a remembered
   * device — whoever is holding an unlocked phone must not be able to lock its
   * owner out of their own backup. A copy without one has nothing to prove.
   * `remember` applies only when adding the first passphrase; a change keeps
   * whatever this device chose before.
   */
  changePassphrase: (supabase: SupabaseClient, current: string | null, next: string | null, remember?: boolean) => Promise<boolean>
  disable: (supabase: SupabaseClient) => Promise<void>
  forgetDevice: () => Promise<void>
  reset: () => void
}

function bookPayload(): VaultPayload {
  const { contacts, tags } = useBookStore.getState()
  const todo = useTodoStore.getState()
  const note = useNoteStore.getState()
  // `categories` is the deprecated mirror of `tags` — see VaultPayload for why
  // a stale PWA build reading this blob makes the duplication necessary.
  // `todos` only once the list has been read off the disk: an empty array
  // before then would overwrite the online list with nothing.
  return {
    version: VAULT_VERSION,
    schema: BACKUP_SCHEMA,
    contacts,
    tags,
    categories: tags,
    ...(todo.loaded && { todos: todo.todos }),
    ...(note.loaded && { pages: note.notes, templates: note.templates }),
    ...tabLayout(),
    savedAt: Date.now(),
  }
}

/**
 * This device's tabs for the online copy — only once they have been changed
 * here. A device still on the defaults says nothing, so it cannot undo a
 * layout chosen on the phone just by being opened.
 */
function tabLayout(): Pick<VaultPayload, 'tabs'> {
  const s = useSettingsStore.getState()
  if (!s.tabsAt) return {}
  return { tabs: { order: s.tabOrder, lists: s.emailLists, todos: s.todos, notes: s.notes, contacts: s.contacts, at: s.tabsAt } }
}

/**
 * Take the online copy's tabs when they were changed more recently than this
 * device's (2026-10-30). Older or absent: ours stand, and the next push carries
 * them up.
 */
function adoptTabs(payload: VaultPayload) {
  const tabs = parseTabLayout(payload.tabs)
  if (!tabs || tabs.at <= useSettingsStore.getState().tabsAt) return
  useSettingsStore.getState().set({
    tabOrder: tabs.order,
    emailLists: tabs.lists,
    todos: tabs.todos,
    notes: tabs.notes,
    contacts: tabs.contacts,
    tabsAt: tabs.at,
  })
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
  if (Array.isArray(payload.pages)) await useNoteStore.getState().replace(toNotes(payload.pages))
  if (Array.isArray(payload.templates)) await useNoteStore.getState().replaceTemplates(toTemplates(payload.templates))
  adoptTabs(payload)
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
  await useNoteStore.getState().init()
  await useNoteStore.getState().replace(mergeNotes(toNotes(payload.pages), useNoteStore.getState().notes))
  await useNoteStore.getState().replaceTemplates(mergeTemplates(toTemplates(payload.templates), useNoteStore.getState().templates))
  adoptTabs(payload)
}

/**
 * If the server's salt is not the one this device's key was derived with, the
 * passphrase was changed on another device: lock this one and say so.
 * Returns true when it locked.
 *
 * Nothing local is lost. Unlocking with the new passphrase offers to merge
 * this device's contacts in, the same as any second device.
 */
async function lockIfPassphraseChanged(supabase: SupabaseClient, row: VaultRow): Promise<boolean> {
  if (row.kdf_salt === useSyncStore.getState().salt) return false
  await forgetVaultKey()
  // Taken off (or the key renewed) on another device: nothing to ask for,
  // signing in opens it, so open it again the way a launch would.
  if (row.account_key) {
    const meta = await loadSyncMeta()
    if (meta) {
      await useSyncStore.getState().hydrate(supabase, meta.userId)
      return true
    }
  }
  useSyncStore.setState({
    state: 'locked',
    hasPassphrase: true,
    accountKey: null,
    status: 'idle',
    rev: row.rev,
    salt: row.kdf_salt,
    iterations: row.kdf_iterations,
    key: null,
    remembered: false,
    message: passphraseChanged(),
  })
  return true
}

/** Shown while a save is waiting for the network; App keeps retrying. */
export const offlineMessage = () => currentT()('sync.offline')

/** Shown on a device whose key stopped working because of `changePassphrase` elsewhere. */
export const passphraseChanged = () => currentT()('sync.passphrase_changed')

/**
 * Take a decrypted vault on as this device's: what entering the passphrase
 * does, and what signing in does on its own for a vault without one. An empty
 * device just takes the online copy; one that already has entries (a guest's)
 * has them merged in, unasked — see `mergeIn` — and pushed straight up.
 */
async function openVault(
  supabase: SupabaseClient,
  userId: string,
  row: VaultRow,
  key: CryptoKey,
  payload: VaultPayload,
  remember: boolean,
) {
  // To-dos count as local data too: a device holding only to-dos must be
  // asked, not have them replaced by the online list.
  await Promise.all([useBookStore.getState().init(), useTodoStore.getState().init(), useNoteStore.getState().init()])
  const local = useBookStore.getState().contacts.length + useTodoStore.getState().todos.length + useNoteStore.getState().notes.length
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
  // A key kept with the account is fetched every time; only a passphrase's is worth remembering.
  const keep = remember && !row.account_key
  if (keep) await saveVaultKey(key)
  useSyncStore.setState({
    state: 'on',
    rev: row.rev,
    salt: row.kdf_salt,
    iterations: row.kdf_iterations,
    key,
    remembered: keep,
    hasPassphrase: !row.account_key,
    accountKey: row.account_key,
    pending: null,
    status: 'idle',
    message: null,
  })
  if (local === 0) await adopt(payload)
  else {
    await mergeIn(payload)
    // Straight up: the online copy lacks the guest's contacts until it goes.
    await useSyncStore.getState().push(supabase)
  }
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
  hasPassphrase: false,
  accountKey: null,
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
      hasPassphrase: false,
      accountKey: null,
      pending: null,
      lastPushedAt: null,
    }),

  hydrate: async (supabase, userId) => {
    if (!userId) {
      // Signing out drops the in-memory key immediately. The REMEMBERED key
      // is cleared separately, by App's sign-out effect, because forgetting it
      // is a disk write and this path also runs on a transient session blip.
      set({ state: 'signed-out', key: null, accountKey: null, pending: null, status: 'idle', message: null })
      return
    }
    set({ status: 'working', message: null })
    try {
      const row = await fetchVault(supabase)
      if (!row) {
        set({ state: 'off', status: 'idle', rev: 0, salt: null, key: null, remembered: false, hasPassphrase: false, accountKey: null })
        // Signing in IS syncing (James, 2026-10-26): start the online copy,
        // without a passphrase, unless it was turned off here — or this
        // device was syncing it, so it was deleted on another one on purpose.
        const meta = await loadSyncMeta()
        if ((meta && meta.userId === userId) || (await loadBackupOff()) === userId) return
        // The book has to be off the disk first, or an empty one goes up.
        await Promise.all([useBookStore.getState().init(), useTodoStore.getState().init(), useNoteStore.getState().init()])
        await get().enable(supabase, userId, null, false)
        return
      }
      const accountKey = row.account_key ? await importAccountKey(row.account_key) : null
      const [storedKey, meta] = await Promise.all([accountKey ?? loadVaultKey(), loadSyncMeta()])
      // No passphrase and new to this device (or this account): open it as
      // entering a passphrase would — there is nothing to ask.
      if (accountKey && (!meta || meta.userId !== userId)) {
        const payload = await decryptJson<VaultPayload>(row.ciphertext, accountKey)
        if (!payload) {
          set({ status: 'error', message: currentT()('sync.bad_key') })
          return
        }
        await openVault(supabase, userId, row, accountKey, payload, false)
        return
      }
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
          hasPassphrase: true,
          accountKey: null,
        })
        return
      }
      const payload = await decryptJson<VaultPayload>(row.ciphertext, storedKey)
      if (!payload && accountKey) {
        set({ status: 'error', message: currentT()('sync.bad_key') })
        return
      }
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
          hasPassphrase: true,
          accountKey: null,
          message: changed ? passphraseChanged() : null,
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
      await Promise.all([useBookStore.getState().init(), useTodoStore.getState().init(), useNoteStore.getState().init()])
      const since = meta.syncedAt ?? meta.pushedAt
      const behind = meta.rev !== row.rev || since === 0
      const book = { contacts: useBookStore.getState().contacts, todos: useTodoStore.getState().todos, pages: useNoteStore.getState().notes }
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
        remembered: !accountKey,
        hasPassphrase: !accountKey,
        accountKey: row.account_key,
        lastPushedAt: meta.pushedAt,
        pending: null,
      })
      // A merge is in sync once it has gone up: `push` writes the meta. Until
      // then (offline) a reload merges again, which changes nothing.
      if (ask) await get().push(supabase)
      else await saveSyncMeta({ ...meta, rev: row.rev, salt: row.kdf_salt, iterations: row.kdf_iterations, syncedAt: behind ? Date.now() : since })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : currentT()('sync.unreachable') })
    }
  },

  enable: async (supabase, userId, passphrase, remember) => {
    set({ status: 'working', message: null })
    try {
      const salt = newSalt()
      const account = passphrase === null ? await newAccountKey() : null
      const iterations = account ? 0 : KDF_ITERATIONS
      const key = account ? account.key : await deriveKey(passphrase!, salt, KDF_ITERATIONS)
      const ciphertext = await encryptJson(bookPayload(), key)
      // Refuse an oversized book BEFORE the insert. Nothing has been persisted
      // at this point — no meta, no stored key — so the app simply stays off.
      const tooBig = vaultSizeError(ciphertext)
      if (tooBig) {
        set({ status: 'error', message: tooBig })
        return
      }
      const rev = await createVault(supabase, ciphertext, salt, iterations, account?.raw ?? null)
      const now = Date.now()
      const meta: SyncMeta = { userId, rev, salt, iterations, pushedAt: now, syncedAt: now }
      await saveSyncMeta(meta)
      const keep = remember && !account
      if (keep) await saveVaultKey(key)
      await saveBackupOff(null)
      set({
        state: 'on',
        status: 'saved',
        rev,
        salt,
        iterations,
        key,
        remembered: keep,
        hasPassphrase: !account,
        accountKey: account?.raw ?? null,
        lastPushedAt: meta.pushedAt,
        message: null,
      })
    } catch (e) {
      // Two devices starting it at once on signing in: the other one won, so
      // open what it made.
      if (e instanceof VaultConflictError && passphrase === null) {
        await get().hydrate(supabase, userId)
        return
      }
      set({
        status: 'error',
        message:
          e instanceof VaultConflictError
            ? currentT()('sync.exists')
            : e instanceof Error
              ? e.message
              : currentT()('sync.save_failed'),
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
      // never with today's constants — see the note on KDF_ITERATIONS. One
      // without a passphrase (taken off elsewhere meanwhile) needs none.
      const key = row.account_key
        ? await importAccountKey(row.account_key)
        : await deriveKey(passphrase, row.kdf_salt, row.kdf_iterations)
      const payload = await decryptJson<VaultPayload>(row.ciphertext, key)
      if (!payload) {
        set({ status: 'error', message: currentT()('sync.wrong_passphrase') })
        return
      }
      await openVault(supabase, userId, row, key, payload, remember)
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : currentT()('sync.unreachable') })
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
    const { key, rev, salt, iterations, state, pending, accountKey } = get()
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
        if (row && (await lockIfPassphraseChanged(supabase, row))) return
        expected = row?.rev ?? 0
        if (!row) {
          const created = await createVault(supabase, ciphertext, salt, iterations, accountKey)
          set({ status: 'saved', rev: created, lastPushedAt: Date.now(), dirty: false })
          return
        }
      }
      const next = await updateVault(supabase, ciphertext, salt, iterations, expected, accountKey)
      const meta = await loadSyncMeta()
      const now = Date.now()
      if (meta) await saveSyncMeta({ ...meta, rev: next, pushedAt: now, syncedAt: now })
      set({ status: 'saved', rev: next, lastPushedAt: now, dirty: false, offline: 0 })
    } catch (e) {
      if (e instanceof VaultConflictError) {
        // A passphrase change moves the rev too. Offering "keep this device"
        // for that would be offering to revert it — see the force branch.
        const row = await fetchVault(supabase).catch(() => null)
        if (row && (await lockIfPassphraseChanged(supabase, row))) return
        set({
          status: 'conflict',
          message: currentT()('sync.conflict'),
        })
        return
      }
      if (e instanceof VaultOfflineError) {
        set((s) => ({ status: 'error', message: offlineMessage(), offline: s.offline + 1 }))
        return
      }
      set({ status: 'error', message: e instanceof Error ? e.message : currentT()('sync.save_failed') })
    }
  },

  pull: async (supabase) => {
    const { key } = get()
    if (!key) return
    set({ status: 'working', message: null })
    try {
      const row = await fetchVault(supabase)
      if (!row) {
        set({ state: 'off', status: 'idle', rev: 0, key: null, accountKey: null })
        return
      }
      const payload = await decryptJson<VaultPayload>(row.ciphertext, key)
      if (!payload) {
        if (await lockIfPassphraseChanged(supabase, row)) return
        set({ status: 'error', message: currentT()('sync.bad_key') })
        return
      }
      await adopt(payload)
      const meta = await loadSyncMeta()
      if (meta) await saveSyncMeta({ ...meta, rev: row.rev, syncedAt: Date.now() })
      set({ status: 'saved', rev: row.rev, message: null })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : currentT()('sync.unreachable') })
    }
  },

  changePassphrase: async (supabase, current, next, remember = true) => {
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
      if (!row.account_key) {
        const oldKey = current === null ? null : await deriveKey(current, row.kdf_salt, row.kdf_iterations)
        if (!oldKey || !(await decryptJson<VaultPayload>(row.ciphertext, oldKey))) {
          set({ status: 'error', message: currentT()('sync.not_current') })
          return false
        }
      }
      if (row.rev !== rev) {
        // Re-encrypting THIS device's book over a newer one would lose the
        // other device's edits under cover of a passphrase change. Settle
        // which book is current first.
        set({ status: 'conflict', message: currentT()('sync.conflict_change') })
        return false
      }
      // A fresh salt, and today's iteration count — so a change is also how an
      // old vault picks up a raised KDF_ITERATIONS. The new salt is also how
      // the other devices notice, with or without a passphrase.
      const salt = newSalt()
      const account = next === null ? await newAccountKey() : null
      const iterations = account ? 0 : KDF_ITERATIONS
      const key = account ? account.key : await deriveKey(next!, salt, KDF_ITERATIONS)
      const ciphertext = await encryptJson(bookPayload(), key)
      const tooBig = vaultSizeError(ciphertext)
      if (tooBig) {
        set({ status: 'error', message: tooBig })
        return false
      }
      // The same compare-and-set as every push. Ciphertext and salt go in ONE
      // row update, so there is no moment when the server holds a blob its
      // stored salt cannot open.
      const nextRev = await updateVault(supabase, ciphertext, salt, iterations, rev, account?.raw ?? null)
      const pushedAt = Date.now()
      const meta = await loadSyncMeta()
      if (meta) await saveSyncMeta({ ...meta, rev: nextRev, salt, iterations, pushedAt, syncedAt: pushedAt })
      // Replace the remembered key rather than leaving the old one on disk,
      // where the next opening would fail with it and ask for a passphrase.
      const keep = !account && (row.account_key ? remember : remembered)
      if (keep) await saveVaultKey(key)
      else await forgetVaultKey()
      set({
        key,
        salt,
        iterations,
        rev: nextRev,
        remembered: keep,
        hasPassphrase: !account,
        accountKey: account?.raw ?? null,
        lastPushedAt: pushedAt,
        dirty: false,
        status: 'saved',
        message: currentT()(account ? 'sync.passphrase_removed' : row.account_key ? 'sync.passphrase_added' : 'sync.changed'),
      })
      return true
    } catch (e) {
      if (e instanceof VaultConflictError) {
        set({ status: 'conflict', message: currentT()('sync.conflict_change') })
        return false
      }
      set({ status: 'error', message: e instanceof Error ? e.message : currentT()('sync.change_failed') })
      return false
    }
  },

  disable: async (supabase) => {
    set({ status: 'working', message: null })
    try {
      const meta = await loadSyncMeta()
      await deleteVault(supabase)
      // Turned off on purpose: signing in again must not start it by itself.
      await saveBackupOff(meta?.userId ?? null)
      await forgetVault()
      set({ state: 'off', status: 'idle', rev: 0, salt: null, key: null, remembered: false, hasPassphrase: false, accountKey: null, pending: null, lastPushedAt: null })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : currentT()('sync.delete_failed') })
    }
  },

  forgetDevice: async () => {
    await forgetVault()
    set({ state: 'locked', key: null, remembered: false, status: 'idle', message: null })
  },
}))
