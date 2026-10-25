import { describe, expect, it } from 'vitest'
import { mergeBackup, openBackup, packBackup, parseBackup, type BackupSource } from './backup'
import type { Contact, Tag } from './types'
import type { Todo } from './todos'

const T0 = Date.UTC(2026, 0, 1)

const contact = (id: string, name: string, patch: Partial<Contact> = {}): Contact => ({
  id,
  name,
  email: `${name.toLowerCase()}@example.com`,
  phone: '',
  tagIds: [],
  notes: '',
  createdAt: T0,
  updatedAt: T0,
  ...patch,
})
const todo = (id: string, title: string, patch: Partial<Todo> = {}): Todo => ({
  id,
  title,
  details: '',
  tagIds: [],
  createdAt: T0,
  updatedAt: T0,
  ...patch,
})
const tag = (id: string, name: string, patch: Partial<Tag> = {}): Tag => ({ id, name, colour: 'amber', ...patch })

const source = (): BackupSource => ({
  contacts: [
    contact('c1', 'Ada', {
      phone: '+44 7700 900123',
      company: 'Analytical Engines',
      address: '1 Lovelace Row\nLondon',
      birthdate: '--12-10',
      hideBirthday: true,
      pinnedAt: T0 + 5,
      tagIds: ['t1'],
      notes: 'Likes <b>tea</b>',
    }),
    contact('c2', 'Bob', { listOnly: true, tagIds: ['l1'] }),
  ],
  tags: [tag('t1', 'Work'), tag('l1', 'Book club', { kind: 'list', tagIds: ['t1'] })],
  todos: [todo('d1', 'Ring Ada', { due: '2026-02-03', tagIds: ['t1'] }), todo('d2', 'Done one', { doneAt: T0 + 9 })],
  pages: [
    { id: 'n1', title: 'Gift ideas', details: 'Ada: a fountain pen\nBob: tea', createdAt: T0, updatedAt: T0 + 3 },
  ],
  settings: { emailLists: true, todos: true, notes: true, shownFields: ['phone', 'email'] },
  view: { tagIds: ['t1'], hiddenTagIds: [], sort: 'recent' },
})

describe('backup file', () => {
  it('round-trips every field, to-dos, lists, settings and the view', async () => {
    const packed = await packBackup(source())
    expect(packed.fileName).toMatch(/^blackbook-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const opened = await openBackup(packed.text)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.data.contacts).toEqual(source().contacts)
    expect(opened.data.todos).toEqual(source().todos)
    expect(opened.data.tags).toEqual(source().tags)
    expect(opened.data.pages).toEqual(source().pages)
    expect(opened.data.settings).toEqual({ emailLists: true, todos: true, notes: true, shownFields: ['email', 'phone'] })
    expect(opened.data.view).toEqual(source().view)
  })

  it('with a password: refuses none and a wrong one, opens with the right one', async () => {
    const packed = await packBackup(source(), { password: 'correct horse' })
    expect(packed.text).not.toContain('Ada')
    expect(await openBackup(packed.text)).toEqual({ ok: false, reason: 'needs-password' })
    expect(await openBackup(packed.text, 'wrong')).toEqual({ ok: false, reason: 'wrong-password' })
    const opened = await openBackup(packed.text, 'correct horse')
    expect(opened.ok && opened.data.contacts.length).toBe(2)
  }, 20_000)

  it('opens a schema-1 file (from before Notes) with no notes, and writes schema 3', async () => {
    const old = JSON.stringify({
      format: 'unisim-transfer',
      version: 1,
      product: 'blackbook',
      kind: 'backup',
      schema: 1,
      data: { contacts: [contact('c1', 'Ada')], tags: [], todos: [], settings: { emailLists: false, todos: false, shownFields: [] } },
    })
    const opened = await openBackup(old)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.data.contacts).toHaveLength(1)
    expect(opened.data.pages).toEqual([])
    // Schema 1's To-do switch was opt-in; on is the default now, and Notes is new.
    expect(opened.data.settings).toMatchObject({ todos: true, notes: true })
    expect(JSON.parse((await packBackup(source())).text).schema).toBe(3)
  })

  it('drops a note with no id or with nothing in it', () => {
    const data = parseBackup({
      contacts: [],
      pages: [{ id: 'n1', title: 'Fine' }, { id: 'n2', title: ' ', details: '' }, { title: 'No id' }, { id: 'n3', details: 'Text only' }],
    })!
    expect(data.pages.map((n) => n.id)).toEqual(['n1', 'n3'])
  })

  it('refuses files that are not BlackBook backups', async () => {
    expect(await openBackup('not json')).toEqual({ ok: false, reason: 'not-a-transfer-file' })
    expect(await openBackup('{"format":"unisim-transfer","version":1,"product":"pdf","kind":"backup","schema":1,"data":{}}')).toMatchObject({
      ok: false,
      reason: 'wrong-product',
    })
    expect(await openBackup('{"format":"unisim-transfer","version":1,"product":"blackbook","kind":"backup","schema":1,"data":{"contacts":"no"}}')).toEqual({
      ok: false,
      reason: 'damaged',
    })
  })
})

describe('parseBackup (untrusted data)', () => {
  it('drops junk records, bad ids, unknown tags, over-long fields and bad dates', () => {
    const data = parseBackup({
      contacts: [
        { id: 'ok', name: 'Real', email: 'x'.repeat(400), birthdate: '2026-02-31', tagIds: ['t1', 'ghost', 42], createdAt: 'yesterday' },
        { id: '../../etc', name: 'Bad id' },
        { id: 'empty' },
        { id: 'ok', name: 'Duplicate id' },
        'string',
        null,
      ],
      tags: [{ id: 't1', name: 'Work', colour: 'javascript:alert(1)' }, { id: 't2', name: '' }],
      todos: [{ id: 'd1', title: 'x', due: '2026-13-01', doneAt: Infinity }, { id: 'd2', title: '' }],
      settings: { emailLists: 'yes', todos: true, shownFields: ['phone', '__proto__'] },
      view: { sort: 'evil' },
    })!
    expect(data.contacts).toHaveLength(1)
    expect(data.contacts[0]).toMatchObject({ id: 'ok', name: 'Real', email: '', tagIds: ['t1'], createdAt: Date.UTC(2000, 0, 1) })
    expect(data.contacts[0].birthdate).toBeUndefined()
    expect(data.tags).toEqual([{ id: 't1', name: 'Work', colour: expect.not.stringContaining('javascript') }])
    expect(data.todos).toHaveLength(1)
    expect(data.todos[0].due).toBeUndefined()
    expect(data.todos[0].doneAt).toBeUndefined()
    expect(data.settings).toEqual({ emailLists: false, todos: true, notes: true, shownFields: ['phone'] })
    expect(data.view).toBeNull()
  })

  it('refuses a book far bigger than any real one', () => {
    expect(parseBackup({ contacts: new Array(20_001).fill({}) })).toBeNull()
    expect(parseBackup([])).toBeNull()
  })
})

describe('mergeBackup (Add to what is here)', () => {
  it('opening the same backup twice adds nothing', () => {
    const src = source()
    const file = parseBackup(JSON.parse(JSON.stringify({ ...src })))!
    const once = mergeBackup({ contacts: [], tags: [], todos: [], pages: [] }, file)
    const twice = mergeBackup(once, file)
    expect(twice.contacts).toHaveLength(2)
    expect(twice.todos).toHaveLength(2)
    expect(twice.pages).toHaveLength(1)
    expect(twice.tags).toHaveLength(2)
    expect(twice.added).toBe(0)
  })

  it('keeps the newer edit by id, and the same person or to-do under a new id once', () => {
    const here = {
      contacts: [contact('c1', 'Ada', { notes: 'old' }), contact('x9', 'Bob')],
      tags: [tag('mine', 'Work')],
      todos: [todo('d1', 'Ring Ada', { due: '2026-02-03' }), todo('other-id', 'Done one')],
      pages: [{ id: 'n1', title: 'Gift ideas', details: 'old', createdAt: T0, updatedAt: T0 }],
    }
    const file = parseBackup({
      ...source(),
      contacts: [contact('c1', 'Ada', { notes: 'new', updatedAt: T0 + 1, tagIds: ['t1'] }), contact('c2', 'Bob')],
    })!
    const m = mergeBackup(here, file)
    expect(m.contacts.find((c) => c.id === 'c1')).toMatchObject({ notes: 'new', tagIds: ['mine'] })
    expect(m.contacts.filter((c) => c.name === 'Bob')).toHaveLength(1)
    expect(m.todos.map((t) => t.title).sort()).toEqual(['Done one', 'Ring Ada'])
    expect(m.tags.filter((t) => t.name === 'Work')).toHaveLength(1)
    expect(m.tags.find((t) => t.kind === 'list')?.tagIds).toEqual(['mine'])
    expect(m.pages).toEqual([source().pages[0]])
  })

  it('opens a schema-2 file (from before reminders) as it is', async () => {
    const old = JSON.stringify({
      format: 'unisim-transfer',
      version: 1,
      product: 'blackbook',
      kind: 'backup',
      schema: 2,
      data: { contacts: [contact('c1', 'Ada')], tags: [], todos: [], pages: [{ id: 'n1', title: 'Hi', details: '' }], settings: { emailLists: false, todos: false, notes: true, shownFields: [] } },
    })
    const opened = await openBackup(old)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.data.contacts[0].reminders).toBeUndefined()
    expect(opened.data.pages).toHaveLength(1)
    // Schema 2's switches are read as written (the 1→2 migration is not run).
    expect(opened.data.settings).toMatchObject({ todos: false, notes: true })
  })

  it('carries reminders on contacts and notes through a file, and tames bad ones', async () => {
    const good = { id: 'r1', label: 'Anniversary', at: '2026-06-03T09:00', repeat: 'yearly', createdAt: T0 }
    const src = source()
    src.contacts[0] = { ...src.contacts[0], reminders: [good as never] }
    src.pages = [{ id: 'n1', title: 'Note', details: '', reminders: [good as never], createdAt: T0, updatedAt: T0 }]
    const opened = await openBackup((await packBackup(src)).text)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.data.contacts.find((c) => c.id === 'c1')!.reminders).toEqual([good])
    expect(opened.data.pages[0].reminders).toEqual([good])
    const hostile = parseBackup({
      contacts: [
        contact('c9', 'Eve', {
          reminders: [
            { id: 'ok', label: 'x'.repeat(5000), at: '2026-02-29T09:00', repeat: 'once', createdAt: 1 },
            { id: 'bad id!', label: '', at: '2026-01-01T09:00', repeat: 'once', createdAt: 1 },
            { id: 'r2', label: '', at: '2026-02-28T25:00', repeat: 'weekly', createdAt: 1 },
            { id: 'r3', label: 'Kept', at: '2028-02-29T09:00', repeat: 'hourly', createdAt: 1 },
          ] as never,
        }),
      ],
    })!
    const rs = hostile.contacts[0].reminders!
    expect(rs.map((r) => r.id)).toEqual(['r3'])
    expect(rs[0].repeat).toBe('once')
  })
})
