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
    expect(store.getState().query).toEqual({ text: '', tagIds: [], hiddenTagIds: [], sort: 'name' })
    expect(store.getState().defaultView).toEqual({ tagIds: [], hiddenTagIds: [], sort: 'name' })
  })

  it('opens on what was saved, on the NEXT launch', async () => {
    const first = await reopen()
    const [people] = first.getState().tags
    first.getState().setQuery({ sort: 'birthday', tagIds: [people.id], text: 'sam' })
    await first.getState().saveDefaultView()

    const second = await reopen()
    // The tags and the order come back; the search box never does.
    expect(second.getState().query).toEqual({ text: '', tagIds: [people.id], hiddenTagIds: [], sort: 'birthday' })
  })

  it('puts the list back to it without touching what is saved', async () => {
    const store = await reopen()
    store.getState().setQuery({ sort: 'recent' })
    await store.getState().saveDefaultView()

    store.getState().setQuery({ sort: 'name-desc', text: 'sam' })
    store.getState().applyDefaultView()
    expect(store.getState().query).toEqual({ text: '', tagIds: [], hiddenTagIds: [], sort: 'recent' })
    expect(store.getState().defaultView).toEqual({ tagIds: [], hiddenTagIds: [], sort: 'recent' })
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
    first.getState().setQuery({ tagIds: ['ghost'], hiddenTagIds: [], sort: 'recent' })
    await first.getState().saveDefaultView()

    const second = await reopen()
    expect(second.getState().query).toEqual({ text: '', tagIds: [], hiddenTagIds: [], sort: 'recent' })
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

describe('a new contact with tags', () => {
  const draft = (tagIds: string[], over = {}) => ({ name: 'Ada', email: '', phone: '', notes: '', tagIds, ...over })

  it('lands the list on exactly those tags, search cleared', async () => {
    const store = await reopen()
    const [a, b] = store.getState().tags
    store.getState().setQuery({ text: 'zzz', tagIds: [], hiddenTagIds: [a.id] })
    await store.getState().saveContact(draft([a.id, b.id]))
    const q = store.getState().query
    expect(q.tagIds).toEqual([a.id, b.id])
    expect(q.text).toBe('')
    expect(q.hiddenTagIds).toEqual([])
  })

  it('leaves the view alone when untagged and already visible, or when editing', async () => {
    const store = await reopen()
    const [a] = store.getState().tags
    store.getState().setQuery({ text: 'x' })
    await store.getState().saveContact(draft([]))
    expect(store.getState().query.text).toBe('x')
    const id = store.getState().contacts[0].id
    await store.getState().saveContact(draft([a.id], { id }))
    expect(store.getState().query.tagIds).toEqual([])
  })

  it('untagged, drops a tag filter that would hide them', async () => {
    const store = await reopen()
    const [a] = store.getState().tags
    await store.getState().saveContact(draft([a.id]))
    expect(store.getState().query.tagIds).toEqual([a.id])
    await store.getState().saveContact(draft([], { name: 'Cy' }))
    expect(store.getState().query.tagIds).toEqual([])
  })

  it('ignores lists — they are not tags', async () => {
    const store = await reopen()
    const list = await store.getState().addTag('Book club', 'list')
    await store.getState().saveContact(draft([list!.id]))
    expect(store.getState().query.tagIds).toEqual([])
  })

  it('leaves the birthdays view when they have no birthday', async () => {
    const store = await reopen()
    const [a] = store.getState().tags
    store.getState().setQuery({ sort: 'birthday' })
    await store.getState().saveContact(draft([a.id]))
    expect(store.getState().query.sort).toBe('name')
  })
})

describe('the bulk actions', () => {
  it('delete several at once, and for good', async () => {
    await seedDisk({ contacts: [someone({ id: 'a' }), someone({ id: 'b' }), someone({ id: 'c' })] })
    const store = await reopen()
    store.getState().view('a')
    await store.getState().removeContacts(['a', 'b'])
    expect(store.getState().contacts.map((c) => c.id)).toEqual(['c'])
    expect(store.getState().viewing).toBeNull()
    const again = await reopen()
    expect(again.getState().contacts.map((c) => c.id)).toEqual(['c'])
  })

  it('hide and show several from the list', async () => {
    await seedDisk({ contacts: [someone({ id: 'a' }), someone({ id: 'b' })] })
    const store = await reopen()
    await store.getState().setListHiddenMany(['a', 'b'], true)
    expect(store.getState().contacts.every((c) => c.hideFromList)).toBe(true)
    await store.getState().setListHiddenMany(['a'], false)
    const again = await reopen()
    const byId = new Map(again.getState().contacts.map((c) => [c.id, c]))
    expect(byId.get('a')?.hideFromList).toBeUndefined()
    expect(byId.get('b')?.hideFromList).toBe(true)
  })

  it('add tags without duplicating or dropping any', async () => {
    await seedDisk({ contacts: [someone({ id: 'a', tagIds: ['t1'] }), someone({ id: 'b' })] })
    const store = await reopen()
    await store.getState().addTagsTo(['a', 'b'], ['t1', 't2'])
    const byId = new Map(store.getState().contacts.map((c) => [c.id, c]))
    expect(byId.get('a')?.tagIds).toEqual(['t1', 't2'])
    expect(byId.get('b')?.tagIds).toEqual(['t1', 't2'])
  })
})

describe('a saved contact', () => {
  it('keeps its address across a reopen', async () => {
    // Regression: lib/store.ts toContact read every field but `address`, so
    // each address was on disk and dropped from memory on the next launch
    // (fixed 2026-10-20).
    await seedDisk({ contacts: [someone({ address: '1 Lovelace Row\nLondon', company: 'Analytical Engines' })] })
    const store = await reopen()
    const c = store.getState().contacts.find((x) => x.id === 'c1')
    expect(c?.address).toBe('1 Lovelace Row\nLondon')
    expect(c?.company).toBe('Analytical Engines')
  })
})

describe('New contact goes straight to its view (2026-10-25)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  it('opens the new person, typed into their view, and keeps them once named', async () => {
    const store = await reopen()
    const id = await store.getState().newContact()
    expect(store.getState().viewing).toBe(id)
    expect(store.getState().fresh).toBe(id)
    await store.getState().patchContact(id, { name: 'Zoe Quinn' })
    store.getState().view(null)
    const again = await reopen()
    expect(again.getState().contacts.map((c) => c.name)).toContain('Zoe Quinn')
  })

  it('drops a new contact closed with nothing in it, and never wrote it', async () => {
    const store = await reopen()
    const before = store.getState().contacts.length
    await store.getState().newContact()
    store.getState().view(null)
    await new Promise((r) => setTimeout(r, 10))
    expect(store.getState().contacts.length).toBe(before)
    const again = await reopen()
    expect(again.getState().contacts.length).toBe(before)
  })

  it('keeps a contact’s reminders on disk, and through a save from the form', async () => {
    const store = await reopen()
    const id = await store.getState().newContact({ name: 'Ann' })
    const rem = { id: 'r1', label: 'Anniversary', at: '2026-06-03T09:00', repeat: 'yearly' as const, createdAt: 5 }
    await store.getState().patchContact(id, { reminders: [rem] })
    const c = store.getState().contacts.find((x) => x.id === id)!
    await store.getState().saveContact({ id, name: 'Ann B', email: '', phone: '', tagIds: [], notes: '' })
    const again = await reopen()
    const back = again.getState().contacts.find((x) => x.id === id)!
    expect(back.name).toBe('Ann B')
    expect(back.reminders).toEqual([rem])
    expect(c.reminders).toEqual([rem])
  })

  it('a seed from search or the phone fills the fields', async () => {
    const store = await reopen()
    const id = await store.getState().newContact({ phone: '07700 900123', name: 'Ann' })
    const c = store.getState().contacts.find((x) => x.id === id)!
    expect(c.phone).toBe('07700 900123')
    expect(c.name).toBe('Ann')
  })
})

describe('notes: pin, delete several, undo (2026-10-25)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  it('pins, deletes and puts back, on disk', async () => {
    vi.resetModules()
    const { useNoteStore } = await import('./noteStore')
    const s = useNoteStore.getState()
    await s.init()
    await useNoteStore.getState().addMany([{ title: 'One', details: '' }, { title: 'Two', details: '' }])
    const [one, two] = useNoteStore.getState().notes
    await useNoteStore.getState().setPinned([two.id], true)
    expect(useNoteStore.getState().notes.find((n) => n.id === two.id)!.pinnedAt).toBeTypeOf('number')
    const gone = useNoteStore.getState().notes.filter((n) => n.id === one.id || n.id === two.id)
    await useNoteStore.getState().removeMany([one.id, two.id])
    expect(useNoteStore.getState().notes.some((n) => n.id === one.id)).toBe(false)
    await useNoteStore.getState().restoreMany(gone)
    vi.resetModules()
    const again = (await import('./noteStore')).useNoteStore
    await again.getState().init()
    const back = again.getState().notes.find((n) => n.id === two.id)!
    expect(back.pinnedAt).toBeTypeOf('number')
    expect(again.getState().notes.some((n) => n.id === one.id)).toBe(true)
  })
})
