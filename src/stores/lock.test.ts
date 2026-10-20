// The PIN lock, end to end through IndexedDB.
//
// ⚠️ **A "fresh opening of the app" is modelled as a fresh MODULE GRAPH**, the
// same trick `sync.test.ts` uses for a second device: `vi.resetModules()` plus
// a dynamic import gives a brand new `useLockStore` — with a brand new
// in-memory status — over the SAME fake IndexedDB. That is precisely what a
// reload, a relaunch, or a cold start of the iOS app is, and it is the one
// behaviour the whole feature was asked for: the PIN is wanted every time,
// not once ever.
//
// The real KDF cost is paid here rather than stubbed. It is only a few hundred
// milliseconds a go and it keeps the test honest about what the app does —
// lock.test.ts covers the arithmetic at a cheap iteration count.

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Open the app again: same disk, no memory of this session. */
async function reopen() {
  vi.resetModules()
  const { useLockStore } = await import('./lockStore')
  await useLockStore.getState().init()
  return useLockStore
}

beforeEach(() => {
  // A fresh disk per test — a leftover lock record from the test above is a
  // test that passes for the wrong reason.
  globalThis.indexedDB = new IDBFactory()
  vi.resetModules()
})

describe('the PIN lock', () => {
  it('starts off, on a device that has never set one', async () => {
    const store = await reopen()
    expect(store.getState().status).toBe('off')
    expect(store.getState().record).toBeNull()
  })

  it('leaves the app usable for the person who just set the PIN', async () => {
    const store = await reopen()
    expect(await store.getState().setPin('4821')).toBe('ok')
    // Not 'locked': they are looking at the app they have just locked. It
    // takes effect on the next opening, which is what the panel tells them.
    expect(store.getState().status).toBe('open')
  }, 20_000)

  it('refuses a PIN that is not four digits', async () => {
    const store = await reopen()
    expect(await store.getState().setPin('12')).toBe('bad')
    expect(store.getState().record).toBeNull()
  })

  it('asks again on the NEXT opening — the whole requirement', async () => {
    const first = await reopen()
    await first.getState().setPin('4821')

    const second = await reopen()
    expect(second.getState().status).toBe('locked')
    expect(await second.getState().unlock('9999')).toBe('wrong')
    expect(second.getState().status).toBe('locked')
    expect(await second.getState().unlock('4821')).toBe('ok')
    expect(second.getState().status).toBe('open')

    // And again after that. Unlocking is never remembered.
    const third = await reopen()
    expect(third.getState().status).toBe('locked')
  }, 30_000)

  it('needs the current PIN to turn the lock off', async () => {
    const first = await reopen()
    await first.getState().setPin('4821')

    const second = await reopen()
    expect(await second.getState().removePin('1111')).toBe('wrong')
    expect(second.getState().record).not.toBeNull()
    expect(await second.getState().removePin('4821')).toBe('ok')
    expect(second.getState().status).toBe('off')

    // Gone from the disk, not just from memory.
    const third = await reopen()
    expect(third.getState().status).toBe('off')
  }, 30_000)

  it('starts making you wait after five wrong tries', async () => {
    const first = await reopen()
    await first.getState().setPin('4821')

    const second = await reopen()
    for (let i = 0; i < 5; i++) expect(await second.getState().unlock('0000')).toBe('wrong')
    expect(second.getState().blockedUntil).toBe(0)
    expect(await second.getState().unlock('0000')).toBe('wrong')
    expect(second.getState().blockedUntil).toBeGreaterThan(Date.now())
    // Including the right one: the cooldown is on the keypad, not on the guess.
    expect(await second.getState().unlock('4821')).toBe('wait')
    expect(second.getState().status).toBe('locked')
  }, 30_000)

  it('leaves the book alone — the lock is a door, not encryption', async () => {
    const first = await reopen()
    await first.getState().setPin('4821')

    const { putContact, loadContacts } = await import('../lib/store')
    await putContact({
      id: 'c1',
      name: 'Sam Okonkwo',
      email: '',
      phone: '',
      tagIds: [],
      notes: 'still readable',
      createdAt: 1,
      updatedAt: 1,
    })
    expect((await loadContacts())[0].notes).toBe('still readable')
  }, 20_000)
})

// ── the way back in ──────────────────────────────────────────────────────────
//
// ⚠️ Every test here is really asking the same question: does the reset take
// the BOOK with it? A reset that only cleared the PIN would pass any test that
// merely checked the app opens afterwards, and it would be a bypass that any
// stranger holding the phone could use.
describe('forgetting the PIN', () => {
  async function seed() {
    const { putContact, putTag } = await import('../lib/store')
    await putContact({
      id: 'c1',
      name: 'Sam Okonkwo',
      email: '',
      phone: '',
      tagIds: [],
      notes: 'private',
      createdAt: 1,
      updatedAt: 1,
    })
    await putTag({ id: 't1', name: 'Work', colour: 'orange' })
  }

  it('erases the book, the tags and the lock', async () => {
    const store = await reopen()
    await seed()
    await store.getState().setPin('4821')

    await store.getState().resetDevice()

    const { loadContacts, loadTags } = await import('../lib/store')
    expect(await loadContacts()).toEqual([])
    expect(await loadTags()).toEqual([])
    expect(store.getState().status).toBe('off')
    expect(store.getState().record).toBeNull()
  }, 30_000)

  it('stays off after the app is opened again', async () => {
    const store = await reopen()
    await seed()
    await store.getState().setPin('4821')
    await store.getState().resetDevice()

    const again = await reopen()
    expect(again.getState().status).toBe('off')
  }, 30_000)
})
