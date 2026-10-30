// The server side of the vault: one row per Universal ID in
// `public.blackbook_vaults`, reached through the SDK's Supabase client so it
// carries the signed-in user's JWT and RLS does the authorisation.
//
// Nothing in this file can read a book. It moves an opaque base64 string and
// the PBKDF2 parameters needed to re-derive the key from a passphrase — or,
// for a vault without one, the key itself (`account_key`, see lib/vault.ts);
// the encrypt/decrypt pair lives in lib/vault.ts and never leaves the browser.

import type { NoteTemplate } from './templates'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contact, Tag } from './types'
import type { Todo } from './todos'
import type { Note } from './notes'
import type { TabLayout } from './tabs'
import type { Tuning } from './tuning'

export const TABLE = 'blackbook_vaults'

/**
 * What one vault holds, once decrypted.
 *
 * ⚠️ `tags` and `categories` are the SAME LIST, written twice, and the
 * duplication is load-bearing until roughly 2026-09. Tags were called
 * categories until 2026-08-24. The danger is not reading an old vault — that
 * is a one-line fallback — it is an old CLIENT reading a new vault: this is a
 * PWA, a device can be running yesterday's cached JavaScript, and that build
 * looks for `categories`, finds nothing, and then its own autosave pushes a
 * tag-less book back over the top. Every other device pulls the loss.
 *
 * A device cannot be asked to update before it syncs, so the vault carries
 * both spellings and every client finds the one it knows. The cost is one
 * duplicated array of small objects inside a blob capped at 2 MB.
 *
 * When this comes out, `categories` goes and `tags` becomes required.
 */
export interface VaultPayload {
  version: number
  contacts: Contact[]
  tags?: Tag[]
  /** @deprecated Legacy mirror of `tags`, for pre-2026-08-24 clients. */
  categories?: Tag[]
  /**
   * The To-do tab's list (2026-09-27). ABSENT — not empty — means "this blob
   * says nothing about to-dos": written by a build from before them, or by a
   * device whose list had not loaded. Reading an absent field as "no to-dos"
   * would let either wipe them.
   */
  todos?: Todo[]
  /**
   * The Notes tab's notes (2026-10-23), named `pages` so they are never taken
   * for a contact's `notes`. Absent means "says nothing about notes", exactly
   * as `todos`: a build from before them pushes without it, and that must not
   * wipe them.
   */
  pages?: Note[]
  /** Note templates (2026-10-25). Absent means "says nothing about them", as `pages`. */
  templates?: NoteTemplate[]
  /**
   * Which tabs are shown and their order (2026-10-30), so a tab hidden or
   * moved on the phone is hidden or moved on the website too. Absent means
   * "says nothing about tabs": each device keeps its own. Read through
   * `parseTabLayout`, never trusted as it stands.
   */
  tabs?: TabLayout
  /**
   * The rest of Tune this app (2026-10-30), stamped like `tabs` and written
   * with it. Read through `parseTuning`. Absent: says nothing.
   */
  tune?: Tuning
  /**
   * The book's shape, as the backup file's schema (lib/backup.ts): 3 since
   * 2026-10-25 (reminders, links, templates, to-do order, tag patterns, all
   * optional fields). Advisory: absent on older blobs, which read as they are.
   */
  schema?: number
  /** Epoch ms the writing device stamped. Advisory — used only in messages. */
  savedAt: number
}

/** The tag list out of a vault of either vintage. */
export function payloadTags(payload: VaultPayload): Tag[] {
  const list = payload.tags ?? payload.categories
  return Array.isArray(list) ? list : []
}

export interface VaultRow {
  user_id: string
  ciphertext: string
  kdf_salt: string
  kdf_iterations: number
  /**
   * The vault's key, base64, when it has no passphrase (2026-10-26); null when
   * a passphrase guards it. `kdf_salt` is still a fresh value either way: it
   * is how a device notices the key changed under it.
   */
  account_key: string | null
  rev: number
  updated_at: string
}

/** Read the caller's vault. `null` means they have never saved one. */
export async function fetchVault(supabase: SupabaseClient): Promise<VaultRow | null> {
  // `maybeSingle`, not `single`: `single` treats "no rows" as an error, and
  // "this user has no vault yet" is the normal first-run state, not a fault.
  const { data, error } = await supabase
    .from(TABLE)
    .select('user_id, ciphertext, kdf_salt, kdf_iterations, account_key, rev, updated_at')
    .maybeSingle()
  if (error) throw failure(error)
  return (data as VaultRow | null) ?? null
}

/**
 * The request never reached the server: no network, or a fetch cut off (on an
 * iPhone, typically by the app going to the background mid-save — WebKit
 * calls that "TypeError: Load failed"). postgrest-js hands these back as an
 * error with an EMPTY `code`; anything the server itself refused carries one.
 * Worth retrying, and not worth showing anybody the raw message.
 */
export class VaultOfflineError extends Error {
  constructor(cause: string) {
    super('Could not reach the server')
    this.name = 'VaultOfflineError'
    this.cause = cause
  }
}

function failure(error: { message: string; code?: string }): Error {
  return error.code ? new Error(error.message) : new VaultOfflineError(error.message)
}

export class VaultConflictError extends Error {
  constructor() {
    super('The online copy changed on another device')
    this.name = 'VaultConflictError'
  }
}

/**
 * Create the vault for the first time.
 *
 * A plain insert, so a second device racing to create the same vault hits the
 * primary-key conflict and is told, rather than silently clobbering whichever
 * one lost. RLS pins `user_id` to `auth.uid()`, so it is not passed here.
 */
export async function createVault(
  supabase: SupabaseClient,
  ciphertext: string,
  salt: string,
  iterations: number,
  accountKey: string | null = null,
): Promise<number> {
  const { error } = await supabase
    .from(TABLE)
    .insert({ ciphertext, kdf_salt: salt, kdf_iterations: iterations, account_key: accountKey, rev: 1 })
  if (error) {
    if (error.code === '23505') throw new VaultConflictError()
    throw failure(error)
  }
  return 1
}

/**
 * Overwrite the vault, but only if the server is still at the revision this
 * device last saw.
 *
 * This is the whole concurrency story, and it is a compare-and-set rather than
 * a blind upsert for one reason: the vault is a WHOLE-BOOK blob. A blind write
 * from a phone that has been offline all week does not merge — it deletes
 * every contact added on the laptop in the meantime, with no trace. The
 * `.eq('rev', expectedRev)` turns that silent data loss into a conflict the
 * user is asked about.
 *
 * PostgREST returns the updated rows, so zero rows back means the predicate
 * did not match — either the rev moved or (impossibly, given RLS) the row is
 * someone else's. Both are conflicts.
 */
export async function updateVault(
  supabase: SupabaseClient,
  ciphertext: string,
  salt: string,
  iterations: number,
  expectedRev: number,
  accountKey: string | null = null,
): Promise<number> {
  const nextRev = expectedRev + 1
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ciphertext,
      kdf_salt: salt,
      kdf_iterations: iterations,
      account_key: accountKey,
      rev: nextRev,
      updated_at: new Date().toISOString(),
    })
    .eq('rev', expectedRev)
    .select('rev')
  if (error) throw failure(error)
  if (!data || data.length === 0) throw new VaultConflictError()
  return nextRev
}

/**
 * Delete the online copy. The local book is untouched — this is "stop saving
 * online", and it is also the honest answer to "delete my data", which is why
 * it is a real DELETE rather than a flag.
 */
export async function deleteVault(supabase: SupabaseClient): Promise<void> {
  // `neq('rev', -1)` is a no-op predicate that exists only to satisfy
  // PostgREST, which refuses an unfiltered DELETE. RLS already scopes the
  // statement to this user's single row.
  const { error } = await supabase.from(TABLE).delete().neq('rev', -1)
  if (error) throw failure(error)
}
