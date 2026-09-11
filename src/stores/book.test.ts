// The two things the book store now remembers ACROSS openings of the app: the
// starting tags, and the view it opens on.
//
// ⚠️ A "fresh opening of the app" is modelled as a fresh MODULE GRAPH — the
// same trick `lock.test.ts` and `sync.test.ts` use — so `vi.resetModules()`
// plus a dynamic import gives a brand new `useBookStore`, with a brand new
// empty in-memory state, over the SAME fake IndexedDB. That is exactly what a
// reload, a relaunch or a cold start of the iOS app is, and both features here
// are only interesting across one: a tag that comes back every launch is a tag
// nobody can delete, and a default view that is forgotten on reload is not a
// default at all.

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Contact, Tag } from '../lib/types'

/** Open the app again: same disk, no memory of this session. */
async function reopen() {
  vi.resetModules()
  const { useBookStore } = await import('./bookStore')
  await useBookStore.getState().init()
  return useBookStore
}

/** Write straight to the disk, as a build of this app before today would have. */
async function seedDisk({ contacts = [], tags = [] }: { contacts?: Contact[]; tags?: Tag[] }) {
  vi.resetModules()
  const { putContact, putTag } = await import('../lib/store')
  for (const c of contacts) await putContact(c)
  for (const t of tags) await putTag(t)
}

const someone = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Sam Okonkwo',
  email: '',
  phone: '',
  tagIds: [],
  notes: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

beforeEach(() => {
  // A fresh disk per test — a leftover record from the test above is a test
  // that passes for the wrong reason.
  globalThis.indexedDB = new IDBFactory()
  vi.resetModules()
})

describe('the two starting tags', () => {
  it('are there on a brand new book', async () => {
    const store = await reopen()
    expect(store.getState().tags.map((t) => t.name)).toEqual(['Important People', 'Important Notes'])
  })

  it('survive a reload without being duplicated', async () => {
    const first = await reopen()
    const ids = first.getState().tags.map((t) => t.id)

    // Compared as a SET, deliberately: tags come back off the disk in
    // IndexedDB key order, and the keys are random ids. What must hold is that
    // these are the same two records, not that they are read back in the order
    // they were written.
    const second = await reopen()
    expect(new Set(second.getState().tags.map((t) => t.id))).toEqual(new Set(ids))
    expect(second.getState().tags).toHaveLength(2)
  })

  it('STAY deleted — the whole reason the marker exists', async () => {
    const first = await reopen()
    for (const t of [...first.getState().tags]) await first.getState().removeTag(t.id)
    expect(first.getState().tags).toEqual([])

    const second = await reopen()
    expect(second.getState().tags).toEqual([])
  })

  it('are not dropped into a book that already holds people', async () => {
    // An existing user upgrading to this build. Their book is theirs; two tags
    // appearing in it uninvited is the app editing somebody's data.
    await seedDisk({ contacts: [someone()] })
    const store = await reopen()
    expect(store.getState().tags).toEqual([])
    expect(store.getState().contacts).toHaveLength(1)
  })

  it('are not dropped into a book that already holds tags', async () => {
    await seedDisk({ tags: [{ id: 't1', name: 'Cycling club', colour: 'sky' }] })
    const store = await reopen()
    expect(store.getState().tags.map((t) => t.name)).toEqual(['Cycling club'])
  })

  it('carry different colours, so the pair reads as two things', async () => {
    const store = await reopen()
    const [a, b] = store.getState().tags
    expect(a.colour).not.toBe(b.colour)
  })

  it('are ordinary tags — renaming one sticks', async () => {
    const first = await reopen()
    const [people] = first.getState().tags
    await first.getState().renameTag(people.id, 'My people')

    const second = await reopen()
    expect(new Set(second.getState().tags.map((t) => t.name))).toEqual(
      new Set(['My people', 'Important Notes']),
    )
  })
})

describe('the view the app opens on', () => {
  it('is Name A–Z with no filter until somebody says otherwise', async () => {
    const store = await reopen()
    expect(store.getState().query).toEqual({ text: '', tagIds: [], sort: 'name' })
    expect(store.getState().defaultView).toEqual({ tagIds: [], sort: 'name' })
  })

  it('opens on what was saved, on the NEXT launch', async () => {
    const first = await reopen()
    const [people] = first.getState().tags
    first.getState().setQuery({ sort: 'birthday', tagIds: [people.id], text: 'sam' })
    await first.getState().saveDefaultView()

    const second = await reopen()
    // The tags and the order come back; the search box never does.
    expect(second.getState().query).toEqual({ text: '', tagIds: [people.id], sort: 'birthday' })
  })

  it('puts the list back to it without touching what is saved', async () => {
    const store = await reopen()
    store.getState().setQuery({ sort: 'recent' })
    await store.getState().saveDefaultView()

    store.getState().setQuery({ sort: 'name-desc', text: 'sam' })
    store.getState().applyDefaultView()
    expect(store.getState().query).toEqual({ text: '', tagIds: [], sort: 'recent' })
    expect(store.getState().defaultView).toEqual({ tagIds: [], sort: 'recent' })
  })

  it('is not the same button as "clear everything"', async () => {
    const store = await reopen()
    store.getState().setQuery({ sort: 'birthday' })
    await store.getState().saveDefaultView()

    store.getState().resetQuery()
    expect(store.getState().query.sort).toBe('name')
    store.getState().applyDefaultView()
    expect(store.getState().query.sort).toBe('birthday')
  })

  it('can be forgotten, for good', async () => {
    const first = await reopen()
    first.getState().setQuery({ sort: 'recent' })
    await first.getState().saveDefaultView()
    await first.getState().forgetDefaultView()

    const second = await reopen()
    expect(second.getState().query.sort).toBe('name')
  })

  it('loses a tag that is deleted, rather than opening on a filter matching nobody', async () => {
    const first = await reopen()
    const [people] = first.getState().tags
    first.getState().setQuery({ tagIds: [people.id] })
    await first.getState().saveDefaultView()
    await first.getState().removeTag(people.id)
    expect(first.getState().defaultView.tagIds).toEqual([])

    const second = await reopen()
    expect(second.getState().query.tagIds).toEqual([])
  })

  it('ignores a saved tag that has vanished some other way', async () => {
    // Belt and braces for the same failure: a vault adopted from another
    // device replaces the whole tag list without going through removeTag.
    const first = await reopen()
    first.getState().setQuery({ tagIds: ['ghost'], sort: 'recent' })
    await first.getState().saveDefaultView()

    const second = await reopen()
    expect(second.getState().query).toEqual({ text: '', tagIds: [], sort: 'recent' })
  })
})

describe('the full-screen view', () => {
  it('opens and closes on one contact', async () => {
    const store = await reopen()
    store.getState().view('c1')
    expect(store.getState().viewing).toBe('c1')
    store.getState().view(null)
    expect(store.getState().viewing).toBeNull()
  })

  it('closes a form that was open on somebody ELSE', async () => {
    // Two dialogs about two different people — one of them holding unsaved
    // edits — is a state nothing good comes of.
    const store = await reopen()
    store.getState().edit('c9')
    store.getState().view('c1')
    expect(store.getState().editing).toBeNull()
  })

  it('stays open underneath the form its own Edit button opens', async () => {
    const store = await reopen()
    store.getState().view('c1')
    store.getState().edit('c1')
    expect(store.getState().viewing).toBe('c1')
    expect(store.getState().editing).toBe('c1')
  })

  it('goes when the person does', async () => {
    const store = await reopen()
    await store.getState().saveContact({ name: 'Sam', email: '', phone: '', tagIds: [], notes: '' })
    const [sam] = store.getState().contacts
    store.getState().view(sam.id)
    await store.getState().removeContact(sam.id)
    expect(store.getState().viewing).toBeNull()
  })
})
