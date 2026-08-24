// The online copy, against the REAL server. Two devices, one account.
//
// ⚠️ This file talks to production Supabase and is therefore NOT part of
// `npm test`. It runs only with BLACKBOOK_LIVE=1 set:
//
//     BLACKBOOK_LIVE=1 npm test -- cloud.live
//
// ── Why it exists ────────────────────────────────────────────────────────────
//
// Everything else about the vault is tested against a fake: the crypto in
// vault.test.ts, the two-device orchestration in stores/sync.test.ts. A fake
// proves that our code does what we think the server does. It cannot prove
// that the server does it. The three things only a real round trip can settle:
//
//   • RLS actually scopes a vault to its owner — the "we cannot read it" claim
//     rests on the policies in migration 0123, not on anything in this repo.
//   • A second device creating a vault really does hit `23505` and not some
//     other code, because `createVault` branches on that exact string.
//   • `.eq('rev', expected)` returning zero rows really is how PostgREST
//     reports a lost compare-and-set — the whole no-silent-data-loss story.
//
// ── The identity ─────────────────────────────────────────────────────────────
//
// A throwaway ANONYMOUS session, not a real Universal ID. Supabase's anonymous
// users carry a genuine `auth.uid()` and the `authenticated` role, which is
// exactly what the policies key on, so the server cannot tell the difference —
// and no real account's vault is ever touched. Device B is handed the same
// session tokens, because "the same account on a second device" IS the same
// JWT arriving from a different client.
//
// Each run leaves two anonymous rows in `auth.users` (device A/B's shared
// identity, and the outsider). The vault row is deleted in `afterAll`.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  createVault,
  deleteVault,
  fetchVault,
  updateVault,
  VaultConflictError,
  type VaultPayload,
} from './cloud'
import {
  decryptJson,
  deriveKey,
  encryptJson,
  KDF_ITERATIONS,
  newSalt,
  VAULT_VERSION,
} from './vault'
import type { Contact } from './types'

// The same public values main.tsx ships in the bundle. The anon key is not a
// secret — it is served to every visitor — and RLS is what protects the table.
const SUPABASE_URL = 'https://rygfxgalojojppxmhddo.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Z4Z2Fsb2pvanBweG1oZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTY4MjUsImV4cCI6MjA5NDMzMjgyNX0.hLy_vt9vY_rdPKF3nL32yAuMCD604E3CH5VM7D7CaNE'

/** No session persistence: each client is its own device, with its own memory. */
function newClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function contact(name: string, notes: string): Contact {
  return {
    id: `live-${name.toLowerCase()}`,
    name,
    email: `${name.toLowerCase()}@example.test`,
    categoryIds: [],
    frequency: 'na',
    notes,
    createdAt: 1,
    updatedAt: 1,
  }
}

function book(...contacts: Contact[]): VaultPayload {
  return { version: VAULT_VERSION, contacts, categories: [], savedAt: 1 }
}

const PASSPHRASE = 'correct horse battery staple'

// The real iteration count, not the fast one the unit tests use. This file is
// the only place that proves a key derived on device B from the parameters
// device A stored opens device A's ciphertext, and doing that with a stand-in
// constant would prove it for a number production never uses.
const ITERATIONS = KDF_ITERATIONS

const LIVE = process.env.BLACKBOOK_LIVE === '1'

describe.skipIf(!LIVE)('the online copy, against the real server', () => {
  /** Device A — the laptop the book was typed into. */
  let deviceA: SupabaseClient
  /** Device B — the phone. Same account, no key of its own yet. */
  let deviceB: SupabaseClient
  /** Somebody else entirely, for the RLS check. */
  let outsider: SupabaseClient

  let salt: string
  /** What each device believes the server's revision is. They diverge. */
  let revA = 0
  let revB = 0

  beforeAll(async () => {
    deviceA = newClient()
    const { data, error } = await deviceA.auth.signInAnonymously()
    if (error) throw new Error(`anonymous sign-in failed: ${error.message}`)
    const session = data.session
    if (!session) throw new Error('anonymous sign-in returned no session')

    deviceB = newClient()
    const handover = await deviceB.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (handover.error) throw new Error(`session handover failed: ${handover.error.message}`)

    outsider = newClient()
    const other = await outsider.auth.signInAnonymously()
    if (other.error) throw new Error(`outsider sign-in failed: ${other.error.message}`)

    // The premise of every assertion below: same uid, different clients.
    expect(handover.data.user?.id).toBe(session.user.id)
    expect(other.data.user?.id).not.toBe(session.user.id)

    salt = newSalt()
  }, 60_000)

  afterAll(async () => {
    // Best-effort: a failure mid-file must not leave a vault row behind for
    // an identity nothing will ever sign into again.
    try {
      if (deviceA) await deleteVault(deviceA)
    } catch {
      // Already gone, or the sign-in never happened. Nothing to clean up.
    }
  })

  it('starts with no vault at all', async () => {
    // `maybeSingle`, so first-run is null rather than an error. If this ever
    // starts throwing, the app's very first screen is broken.
    expect(await fetchVault(deviceA)).toBeNull()
  })

  it('device A enables the online copy without ever naming itself', async () => {
    // `createVault` sends no user_id — the column defaults to auth.uid(). If
    // that default were missing, this would fail the not-null constraint and
    // the user would see a message about a column rather than about
    // permission (the reason 0123 sets it).
    const key = await deriveKey(PASSPHRASE, salt, ITERATIONS)
    const ciphertext = await encryptJson(book(contact('Ada', 'met at the fair')), key)
    revA = await createVault(deviceA, ciphertext, salt, ITERATIONS)
    expect(revA).toBe(1)

    const row = await fetchVault(deviceA)
    expect(row?.rev).toBe(1)
    expect(row?.kdf_iterations).toBe(ITERATIONS)
    expect(row?.kdf_salt).toBe(salt)
  }, 60_000)

  it('device B opens it with the passphrase and gets the book back', async () => {
    // THE ROUND TRIP. B has no key, no salt and no local book — only the
    // passphrase and whatever the server hands it.
    const row = await fetchVault(deviceB)
    expect(row).not.toBeNull()

    const key = await deriveKey(PASSPHRASE, row!.kdf_salt, row!.kdf_iterations)
    const payload = await decryptJson<VaultPayload>(row!.ciphertext, key)
    expect(payload?.contacts).toHaveLength(1)
    expect(payload?.contacts[0].name).toBe('Ada')
    expect(payload?.contacts[0].notes).toBe('met at the fair')
    revB = row!.rev
  }, 60_000)

  it('refuses the wrong passphrase on the real ciphertext', async () => {
    const row = await fetchVault(deviceB)
    const wrong = await deriveKey('not the passphrase', row!.kdf_salt, row!.kdf_iterations)
    // Null, not a throw: GCM's tag check fails, and that is what lets the app
    // say "that passphrase does not open this book" rather than guess.
    expect(await decryptJson(row!.ciphertext, wrong)).toBeNull()
  }, 60_000)

  it('will not let a second device create the same vault', async () => {
    // The primary key is what stops two devices racing to enable and one of
    // them silently winning. `createVault` reads error.code === '23505', so
    // this is the assertion that the code it branches on is the code Postgres
    // actually sends.
    const key = await deriveKey(PASSPHRASE, salt, ITERATIONS)
    const ciphertext = await encryptJson(book(contact('Grace', 'second device')), key)
    await expect(createVault(deviceB, ciphertext, salt, ITERATIONS)).rejects.toBeInstanceOf(
      VaultConflictError,
    )
  }, 60_000)

  it('device B saves an edit, and device A is told rather than overwritten', async () => {
    const key = await deriveKey(PASSPHRASE, salt, ITERATIONS)

    // B edits and pushes: it is at the server's revision, so this succeeds.
    const bBook = book(contact('Ada', 'met at the fair'), contact('Grace', 'added on the phone'))
    revB = await updateVault(deviceB, await encryptJson(bBook, key), salt, ITERATIONS, revB)
    expect(revB).toBe(2)

    // A has been offline and still believes rev 1. Its book has Ada plus a
    // contact of its own — a blind write here would delete Grace with no
    // trace, which is the entire reason for the compare-and-set.
    const aBook = book(contact('Ada', 'met at the fair'), contact('Alan', 'added on the laptop'))
    await expect(
      updateVault(deviceA, await encryptJson(aBook, key), salt, ITERATIONS, revA),
    ).rejects.toBeInstanceOf(VaultConflictError)

    // And nothing was written: the server still holds B's copy, intact.
    const row = await fetchVault(deviceA)
    expect(row?.rev).toBe(2)
    const server = await decryptJson<VaultPayload>(row!.ciphertext, key)
    expect(server?.contacts.map((c) => c.name)).toEqual(['Ada', 'Grace'])
  }, 60_000)

  it('device A can take the online copy instead (pull)', async () => {
    // A key derived on A opens ciphertext written by B — same passphrase, same
    // stored salt. This is what makes the two devices one book.
    const row = await fetchVault(deviceA)
    const key = await deriveKey(PASSPHRASE, row!.kdf_salt, row!.kdf_iterations)
    const payload = await decryptJson<VaultPayload>(row!.ciphertext, key)
    expect(payload?.contacts.map((c) => c.name)).toEqual(['Ada', 'Grace'])
    revA = row!.rev
  }, 60_000)

  it('or overwrite it, once it has re-read where the server is', async () => {
    // The force path: re-read the revision, then write on top of it. Reachable
    // only from an explicit "keep this device's copy".
    const row = await fetchVault(deviceA)
    const key = await deriveKey(PASSPHRASE, salt, ITERATIONS)
    const aBook = book(contact('Ada', 'met at the fair'), contact('Alan', 'added on the laptop'))
    revA = await updateVault(deviceA, await encryptJson(aBook, key), salt, ITERATIONS, row!.rev)
    expect(revA).toBe(3)

    // B, still at rev 2, now loses in the other direction — the guard is not
    // one device's privilege.
    const bBook = book(contact('Grace', 'stale'))
    await expect(
      updateVault(deviceB, await encryptJson(bBook, key), salt, ITERATIONS, revB),
    ).rejects.toBeInstanceOf(VaultConflictError)
    expect(revB).toBe(2)
  }, 60_000)

  it('is invisible to another signed-in account', async () => {
    // The claim on the marketing page and in the table comment. `select`
    // returns nothing under a different uid...
    expect(await fetchVault(outsider)).toBeNull()

    // ...and a write under that uid cannot reach the row either: the update's
    // `using` clause matches nothing, which surfaces as the same zero-rows
    // conflict rather than as a successful overwrite of somebody else's book.
    await expect(
      updateVault(outsider, 'not-even-base64', salt, ITERATIONS, 3),
    ).rejects.toBeInstanceOf(VaultConflictError)

    // And the owner's row is untouched by the attempt.
    const row = await fetchVault(deviceA)
    expect(row?.rev).toBe(3)
  }, 60_000)

  it('deletes the online copy for real', async () => {
    // "Stop saving online" and "delete my data" are the same operation, which
    // is why it is a DELETE and not a flag.
    await deleteVault(deviceA)
    expect(await fetchVault(deviceA)).toBeNull()
    expect(await fetchVault(deviceB)).toBeNull()

    // A device that still thinks it is syncing gets a conflict, not a
    // resurrection of a book the user asked to remove.
    const key = await deriveKey(PASSPHRASE, salt, ITERATIONS)
    await expect(
      updateVault(deviceB, await encryptJson(book(), key), salt, ITERATIONS, 2),
    ).rejects.toBeInstanceOf(VaultConflictError)
  }, 60_000)
})
