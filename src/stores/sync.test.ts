// The two-device orchestration — everything ABOVE the server.
//
// `lib/cloud.live.test.ts` proves the server contract: RLS, the 23505 on a
// racing create, the compare-and-set losing in both directions, delete. What it
// does not touch is `syncStore`'s enable / unlock / adopt / discard / force flow
// across two independent devices, which until now was only ever covered by hand
// — and which is where the interesting mistakes are, because every one of them
// silently destroys somebody's address book rather than raising anything.
//
// ── How two devices fit in one process ───────────────────────────────────────
//
// `vi.resetModules()` plus a dynamic import gives a second, completely
// independent module graph: its own `useSyncStore`, its own `useBookStore`, its
// own `lib/store` handle on IndexedDB. That is what makes a device a device —
// two zustand singletons that cannot see each other, exactly as two browsers
// cannot.
//
// ⚠️ THE DEVICES MUST NOT SHARE INDEXEDDB, and by default they would: both
// graphs open the same database name in the same global fake. Each device
// therefore owns an `IDBFactory` of its own — its disk — and `use(device)`
// points the global at it before that device does anything. `lib/store` opens a
// fresh connection per transaction and reads the global each time, so the
// pointer has to be right at the moment of the call, not merely at boot.
//
// This is not a detail. The first cut of this file reset the fake at boot only,
// so a test that interleaved A → B → A silently gave A's reload B's disk. It
// showed up as one failing assertion; it could just as easily have made a test
// pass for the wrong reason, which is what "device B is locked" would have done
// if the two had shared a remembered key.
//
// ⚠️ `fake-indexeddb` must round-trip a NON-EXTRACTABLE CryptoKey, which is the
// one thing that could have made this file impossible: the remembered key is
// deliberately unexportable, so a fake that structured-cloned it badly would
// break the only path worth testing. 6.2.5 does; there is a test for it below,
// because it is a property of a dependency rather than of our code.

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { fakeClient, newServer, type FakeServer } from '../test/fakePostgrest'
import type { Contact, Tag } from '../lib/types'

// PBKDF2 at 600k iterations is ~0.4 s per derive, and these tests derive a lot.
// The COUNT is not what is under test here — `cloud.live.test.ts` and
// vault.test.ts cover the real parameters — so the module is stubbed down to
// something a test suite can afford. The salt/iterations plumbing still runs;
// only the work factor changes.
vi.mock('../lib/vault', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/vault')>()
  return { ...real, KDF_ITERATIONS: 1_000 }
})

const USER = 'user-1'
const PASS = 'correct horse battery staple'

/** One device: its own module graph, its own stores, its own disk. */
interface Device {
  disk: IDBFactory
  sync: typeof import('./syncStore').useSyncStore
  book: typeof import('./bookStore').useBookStore
  client: SupabaseClient
}

/**
 * Point the global IndexedDB at this device's disk.
 *
 * Call it before every interaction — `use(a).sync.getState().push(...)`. It is
 * cheap, it reads as "on device A, …", and forgetting it is the one way this
 * harness lies.
 */
function use(device: Device): Device {
  globalThis.indexedDB = device.disk
  return device
}

/**
 * Boot a device against `server`.
 *
 * A new disk makes it a DIFFERENT device. Passing an existing device's disk is
 * how a RELOAD is modelled: same disk, new module graph — which is exactly what
 * a browser refresh is.
 */
async function boot(server: FakeServer, disk = new IDBFactory()): Promise<Device> {
  globalThis.indexedDB = disk
  vi.resetModules()
  const { useSyncStore } = await import('./syncStore')
  const { useBookStore } = await import('./bookStore')
  return { disk, sync: useSyncStore, book: useBookStore, client: fakeClient(server, USER) }
}

/** Reload a device: its disk survives, everything in memory does not. */
const reload = (server: FakeServer, device: Device) => boot(server, device.disk)

const contact = (name: string): Contact => ({
  id: `c-${name}`,
  name,
  email: `${name.toLowerCase()}@example.com`,
  tagIds: [],
  notes: '',
  createdAt: 1,
  updatedAt: 1,
})

const tag = (name: string): Tag => ({ id: `t-${name}`, name, colour: '#2f6fd8' })

/** Put a book on a device without going through the UI. */
async function seed(device: Device, names: string[], tags: Tag[] = []) {
  await use(device).book.getState().importBook(names.map(contact), tags, 'replace', null)
}

const names = (device: Device) => device.book.getState().contacts.map((c) => c.name).sort()

describe('two devices, one account', () => {
  let server: FakeServer

  beforeEach(() => {
    server = newServer()
  })

  it('device A enables, device B finds a vault it cannot open yet', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    expect(use(a).sync.getState().state).toBe('on')
    expect(use(a).sync.getState().rev).toBe(1)
    expect(server.row).not.toBeNull()

    // A second device: same account, same server, no remembered key.
    const b = await boot(server)
    await use(b).sync.getState().hydrate(b.client, USER)

    // ⚠️ 'locked', not 'off' and not 'on'. 'off' would offer to create a second
    // vault over the top of the first; 'on' would claim to be syncing a book it
    // cannot decrypt.
    expect(use(b).sync.getState().state).toBe('locked')
    expect(use(b).sync.getState().rev).toBe(1)
    expect(b.book.getState().contacts).toHaveLength(0)
  })

  it('an EMPTY second device takes the online copy without being asked', async () => {
    const a = await boot(server)
    await seed(a, ['Ada', 'Grace'], [tag('Work')])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    const b = await boot(server)
    await use(b).sync.getState().unlock(b.client, USER, PASS, true)

    expect(use(b).sync.getState().state).toBe('on')
    // Nothing to lose means nothing to ask about.
    expect(use(b).sync.getState().pending).toBeNull()
    expect(names(b)).toEqual(['Ada', 'Grace'])
    expect(b.book.getState().tags.map((t) => t.name)).toEqual(['Work'])
  })

  it('a second device that ALREADY has contacts is asked, and adopting replaces', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    const b = await boot(server)
    await seed(b, ['Bob'])
    await use(b).sync.getState().unlock(b.client, USER, PASS, true)

    // ⚠️ The book is UNTOUCHED until the question is answered. Either answer
    // destroys one of the two books, so unlocking must not pick one.
    expect(use(b).sync.getState().pending).not.toBeNull()
    expect(names(b)).toEqual(['Bob'])

    await use(b).sync.getState().adoptPending()
    expect(names(b)).toEqual(['Ada'])
    expect(use(b).sync.getState().pending).toBeNull()
  })

  it('discarding instead pushes THIS device’s book over the online copy', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)
    const revAfterEnable = server.row!.rev

    const b = await boot(server)
    await seed(b, ['Bob'])
    await use(b).sync.getState().unlock(b.client, USER, PASS, true)
    await use(b).sync.getState().discardPending(b.client)

    expect(names(b)).toEqual(['Bob'])
    expect(server.row!.rev).toBe(revAfterEnable + 1)

    // And device A pulling gets Bob — the discard really did reach the server,
    // rather than only clearing the prompt.
    await use(a).sync.getState().pull(a.client)
    expect(names(a)).toEqual(['Bob'])
  })
})

describe('the compare-and-set, from both sides', () => {
  let server: FakeServer

  beforeEach(() => {
    server = newServer()
  })

  /** Both devices unlocked and in sync at rev 1. */
  async function twoUnlockedDevices() {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)
    const b = await boot(server)
    await use(b).sync.getState().unlock(b.client, USER, PASS, true)
    return { a, b }
  }

  it('the device that pushes second is told, not silently overwritten', async () => {
    const { a, b } = await twoUnlockedDevices()

    await seed(a, ['Ada', 'Alan'])
    await use(a).sync.getState().push(a.client)
    expect(use(a).sync.getState().status).toBe('saved')
    expect(server.row!.rev).toBe(2)

    // B still believes rev 1 — it has been offline since the unlock.
    await seed(b, ['Ada', 'Barbara'])
    await use(b).sync.getState().push(b.client)

    // ⚠️ THE POINT OF THE WHOLE FEATURE. A blind write here loses Alan with no
    // trace: the vault is a whole-book blob, so "last write wins" means "last
    // writer deletes everyone else's work".
    expect(use(b).sync.getState().status).toBe('conflict')
    expect(server.row!.rev).toBe(2)

    // The server still holds A's book, not B's.
    await use(a).sync.getState().pull(a.client)
    expect(names(a)).toEqual(['Ada', 'Alan'])
  })

  it('a forced push wins, deliberately, and the loser can pull it back', async () => {
    const { a, b } = await twoUnlockedDevices()

    await seed(a, ['Ada', 'Alan'])
    await use(a).sync.getState().push(a.client)

    await seed(b, ['Ada', 'Barbara'])
    await use(b).sync.getState().push(b.client)
    expect(use(b).sync.getState().status).toBe('conflict')

    // "Keep this device's copy" — the only path that may overwrite, and it
    // re-reads the server's rev rather than trusting its own stale one.
    await use(b).sync.getState().push(b.client, true)
    expect(use(b).sync.getState().status).toBe('saved')
    expect(server.row!.rev).toBe(3)

    await use(a).sync.getState().pull(a.client)
    expect(names(a)).toEqual(['Ada', 'Barbara'])
  })

  it('a conflict does not advance this device’s rev, so the retry is still a conflict', async () => {
    const { a, b } = await twoUnlockedDevices()
    await seed(a, ['Ada', 'Alan'])
    await use(a).sync.getState().push(a.client)

    await seed(b, ['Bob'])
    await use(b).sync.getState().push(b.client)
    expect(use(b).sync.getState().rev).toBe(1)

    // Pressing save again must not quietly succeed by having moved the rev on
    // failure — the user has to actually choose.
    await use(b).sync.getState().push(b.client)
    expect(use(b).sync.getState().status).toBe('conflict')
    expect(server.row!.rev).toBe(2)
  })

  it('two devices racing to CREATE: the loser is told to unlock, not to overwrite', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    const b = await boot(server)
    await seed(b, ['Bob'])

    await use(a).sync.getState().enable(a.client, USER, PASS, true)
    await use(b).sync.getState().enable(b.client, USER, PASS, true)

    expect(use(a).sync.getState().state).toBe('on')
    expect(use(b).sync.getState().status).toBe('error')
    expect(use(b).sync.getState().message).toMatch(/unlock it instead/i)
    // B's book is untouched and the server still holds A's vault at rev 1.
    expect(names(b)).toEqual(['Bob'])
    expect(server.row!.rev).toBe(1)
  })
})

describe('the remembered key, across a reload', () => {
  let server: FakeServer

  beforeEach(() => {
    server = newServer()
  })

  it('a remembered device comes back unlocked, with no passphrase', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    // Same disk, new module graph: a reload, not a new device.
    const reloaded = await reload(server, a)
    await use(reloaded).sync.getState().hydrate(reloaded.client, USER)

    expect(use(reloaded).sync.getState().state).toBe('on')
    expect(use(reloaded).sync.getState().remembered).toBe(true)
  })

  it('a device that did NOT remember comes back locked', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, false)

    const reloaded = await reload(server, a)
    await use(reloaded).sync.getState().hydrate(reloaded.client, USER)
    expect(use(reloaded).sync.getState().state).toBe('locked')
  })

  it('a reload BEHIND the server adopts what the server has', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    // Another device moves the server on.
    const b = await boot(server)
    await use(b).sync.getState().unlock(b.client, USER, PASS, true)
    await seed(b, ['Ada', 'Grace'])
    await use(b).sync.getState().push(b.client)

    // A reloads. Its own edits were pushed as they happened, so anything newer
    // on the server came from a device that already had them — adopting is
    // right, and it is why this needs no prompt.
    const reloaded = await reload(server, a)
    await use(reloaded).sync.getState().hydrate(reloaded.client, USER)
    expect(use(reloaded).sync.getState().state).toBe('on')
    expect(names(reloaded)).toEqual(['Ada', 'Grace'])
  })

  it('signing in as somebody ELSE on the same browser does not try the stored key', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    // Same disk and a vault on the server, but a different Universal ID. The
    // stored key belongs to USER and would fail the GCM tag anyway — the point
    // is that "wrong passphrase" is a misleading thing to tell someone who has
    // never typed one, so the state must be 'locked' by identity, not by
    // decryption failure.
    const other = await reload(server, a)
    await use(other).sync.getState().hydrate(other.client, 'user-2')
    expect(use(other).sync.getState().state).toBe('locked')
    expect(use(other).sync.getState().status).not.toBe('error')
  })

  it('forgetting the device keeps the contacts and loses only the key', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    await use(a).sync.getState().forgetDevice()
    expect(use(a).sync.getState().state).toBe('locked')
    expect(use(a).sync.getState().remembered).toBe(false)
    expect(names(a)).toEqual(['Ada'])
    // The online copy is untouched — "forget this device" is not "delete".
    expect(server.row).not.toBeNull()

    const reloaded = await reload(server, a)
    await use(reloaded).sync.getState().hydrate(reloaded.client, USER)
    expect(use(reloaded).sync.getState().state).toBe('locked')
  })
})

describe('turning it off', () => {
  let server: FakeServer

  beforeEach(() => {
    server = newServer()
  })

  it('disable deletes the online copy and keeps the local book', async () => {
    const a = await boot(server)
    await seed(a, ['Ada', 'Grace'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    await use(a).sync.getState().disable(a.client)
    expect(use(a).sync.getState().state).toBe('off')
    expect(server.row).toBeNull()
    expect(names(a)).toEqual(['Ada', 'Grace'])
  })

  it('another device that was syncing finds the vault gone and goes off, not broken', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)
    const b = await boot(server)
    await use(b).sync.getState().unlock(b.client, USER, PASS, true)

    await use(a).sync.getState().disable(a.client)
    await use(b).sync.getState().pull(b.client)

    expect(use(b).sync.getState().state).toBe('off')
    // Its contacts survive — deleting the online copy is not deleting the book.
    expect(names(b)).toEqual(['Ada'])
  })

  it('a server that cannot be reached is an error, not a data change', async () => {
    const a = await boot(server)
    await seed(a, ['Ada'])
    await use(a).sync.getState().enable(a.client, USER, PASS, true)

    await seed(a, ['Ada', 'Grace'])
    server.failNext = 'network unreachable'
    await use(a).sync.getState().push(a.client)

    expect(use(a).sync.getState().status).toBe('error')
    expect(use(a).sync.getState().rev).toBe(1)
    expect(names(a)).toEqual(['Ada', 'Grace'])
  })
})

// A property of the dependency, not of our code — but the whole file rests on
// it, so it is asserted rather than assumed. The remembered key is created
// non-extractable on purpose: it can decrypt the vault and can never be read
// back out, not by us and not by anything else with access to the database.
describe('fake-indexeddb round-trips a non-extractable CryptoKey', () => {
  it('stores and returns a key that still decrypts, and still refuses export', async () => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
    const { saveVaultKey, loadVaultKey } = await import('../lib/store')
    const { deriveKey, encryptJson, decryptJson, newSalt } = await import('../lib/vault')

    const key = await deriveKey(PASS, newSalt(), 1_000)
    await saveVaultKey(key)
    const back = await loadVaultKey()
    expect(back).not.toBeNull()

    const cipher = await encryptJson({ hello: 'world' }, key)
    expect(await decryptJson<{ hello: string }>(cipher, back!)).toEqual({ hello: 'world' })
    await expect(crypto.subtle.exportKey('raw', back!)).rejects.toThrow()
  })
})
