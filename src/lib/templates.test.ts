import { describe, expect, it } from 'vitest'
import { bookTemplate, convertNote, mergeTemplates, retireFields, showValue, toFieldValues, toTemplates, type NoteTemplate } from './templates'
import { matchesNote, matchesNoteTags, mergeNotes, toNote, type Note } from './notes'
import { openBackup, packBackup, parseBackup } from './backup'

const book = bookTemplate({ name: 'Book', title: 'Title', author: 'Author', read: 'Date read' }, 10)
const note = (p: Partial<Note> = {}): Note => ({ id: 'n1', title: 'Middlemarch', details: 'Loved it.', createdAt: 1, updatedAt: 1, ...p })

describe('note templates (2026-10-25)', () => {
  it('reads templates tolerantly: no name, bad ids and unknown kinds are dealt with', () => {
    const out = toTemplates([
      { id: 't1', name: 'Wine', fields: [{ id: 'f1', label: 'Grape', type: 'text' }, { id: 'f1', label: 'dup' }, { id: 'f2', label: 'Score', type: 'stars' }] },
      { id: 't2', name: '  ' },
      { id: 'bad id', name: 'X' },
      'junk',
    ])
    expect(out).toHaveLength(1)
    expect(out[0].fields).toEqual([
      { id: 'f1', label: 'Grape', type: 'text' },
      { id: 'f2', label: 'Score', type: 'text' },
    ])
  })

  it('keeps only real field values', () => {
    expect(toFieldValues({ 'f-title': 'Emma', 'f-x': '  ', 'bad id': 'y', n: 7 })).toEqual({ 'f-title': 'Emma' })
    expect(toFieldValues(['a'])).toBeUndefined()
  })

  it('merges by id, the newer edit winning, so two seeded Books are one', () => {
    const renamed = { ...book, name: 'Books', updatedAt: 20 }
    expect(mergeTemplates([book], [renamed])).toEqual([renamed])
    expect(mergeTemplates([renamed], [book])).toEqual([renamed])
  })

  it('moves values into the text when a field or the template goes', () => {
    const n = note({ templateId: book.id, fields: { 'f-title': 'Middlemarch', 'f-author': 'George Eliot' } })
    const [one] = retireFields([n], book, ['f-author'], false, 99)
    expect(one.details).toBe('Loved it.\n\nAuthor: George Eliot')
    expect(one.fields).toEqual({ 'f-title': 'Middlemarch' })
    expect(one.templateId).toBe(book.id)
    const [gone] = retireFields([n], book, book.fields.map((f) => f.id), true, 99)
    expect(gone.templateId).toBeUndefined()
    expect(gone.fields).toBeUndefined()
    expect(gone.details).toBe('Loved it.\n\nTitle: Middlemarch\nAuthor: George Eliot')
    expect(retireFields([note()], book, ['f-author'], false)).toEqual([])
  })

  it('search finds a note by a field value', () => {
    expect(matchesNote(note({ templateId: book.id, fields: { 'f-author': 'George Eliot' } }), 'eliot')).toBe(true)
  })

  it('shows a date field in the language on screen', () => {
    expect(showValue('date', '2026-03-04', 'en-GB')).toBe('4 March 2026')
    expect(showValue('number', '12', 'en-GB')).toBe('12')
  })

  it('travels in a backup file; an older file says nothing about templates', async () => {
    const src = {
      contacts: [],
      tags: [],
      todos: [],
      pages: [note({ templateId: book.id, fields: { 'f-read': '2026-03-04' } })],
      templates: [book],
      settings: { emailLists: false, todos: true, notes: true, shownFields: [] },
      view: { tagIds: [], hiddenTagIds: [], sort: 'name' as const },
    }
    const opened = await openBackup((await packBackup(src)).text)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.data.templates).toEqual([book])
    expect(opened.data.pages[0].fields).toEqual({ 'f-read': '2026-03-04' })
    expect(opened.data.pages[0].templateId).toBe(book.id)
    expect(parseBackup({ contacts: [] })!.templates).toBeNull()
  })
})

describe('convert a note to another template (2026-11-03)', () => {
  const movies: NoteTemplate = {
    id: 'tpl-movies',
    name: 'Movies',
    fields: [
      { id: 'm-title', label: 'Title', type: 'text' },
      { id: 'm-director', label: 'Director', type: 'text' },
      { id: 'm-seen', label: 'Date watched', type: 'date' },
    ],
    createdAt: 1,
    updatedAt: 1,
  }
  const book = bookTemplate({ name: 'Book', title: 'Title', author: 'Author', read: 'Date read' }, 1)
  const note = (over: Partial<Note>): Note => ({ id: 'n', title: 'Inception', details: '', createdAt: 1, updatedAt: 1, ...over })

  it('a plain note joins the template, its text kept', () => {
    const out = convertNote(note({ details: 'Loved it', tagIds: ['t1'], pinnedAt: 5 }), undefined, movies, 9)
    expect(out).toMatchObject({ templateId: 'tpl-movies', title: 'Inception', details: 'Loved it', tagIds: ['t1'], pinnedAt: 5, updatedAt: 9 })
    expect(out.fields).toBeUndefined()
  })

  it('"Label: value" lines in the text fill the matching fields and leave the text', () => {
    const out = convertNote(note({ details: 'director: Christopher Nolan\nDate watched: 2026-10-01\n\nLoved it' }), undefined, movies)
    expect(out.fields).toEqual({ 'm-director': 'Christopher Nolan', 'm-seen': '2026-10-01' })
    expect(out.details).toBe('Loved it')
  })

  it('a date line that is not a date stays in the text', () => {
    const out = convertNote(note({ details: 'Date watched: last week' }), undefined, movies)
    expect(out.fields).toBeUndefined()
    expect(out.details).toBe('Date watched: last week')
  })

  it('same-named fields move across; the rest are written into the text', () => {
    const out = convertNote(
      note({ templateId: book.id, details: 'Good', fields: { 'f-title': 'Dune', 'f-author': 'Frank Herbert' } }),
      book,
      movies,
    )
    expect(out.templateId).toBe('tpl-movies')
    expect(out.fields).toEqual({ 'm-title': 'Dune' })
    expect(out.details).toBe('Good\n\nAuthor: Frank Herbert')
  })

  it('to plain and back again loses nothing', () => {
    const start = note({ templateId: movies.id, details: 'Loved it', fields: { 'm-director': 'Nolan', 'm-seen': '2026-10-01' } })
    const plain = convertNote(start, movies, null)
    expect(plain.templateId).toBeUndefined()
    expect(plain.fields).toBeUndefined()
    expect(plain.details).toBe('Loved it\n\nDirector: Nolan\nDate watched: 2026-10-01')
    const back = convertNote(plain, undefined, movies)
    expect(back.fields).toEqual(start.fields)
    expect(back.details).toBe('Loved it')
  })

  it('already on that template: unchanged', () => {
    const n = note({ templateId: movies.id })
    expect(convertNote(n, movies, movies)).toBe(n)
    const p = note({})
    expect(convertNote(p, undefined, null)).toBe(p)
  })
})

describe('notes carry tags (2026-11-03)', () => {
  it('reads tagIds from storage, unique, dropping junk', () => {
    expect(toNote({ id: 'n', title: 'x', tagIds: ['a', 'a', 3, 'b'] })?.tagIds).toEqual(['a', 'b'])
    expect(toNote({ id: 'n', title: 'x' })?.tagIds).toBeUndefined()
  })
  it('filters OR across tags', () => {
    const n = { id: 'n', title: 'x', details: '', tagIds: ['a'], createdAt: 1, updatedAt: 1 }
    expect(matchesNoteTags(n, [])).toBe(true)
    expect(matchesNoteTags(n, ['b', 'a'])).toBe(true)
    expect(matchesNoteTags({ ...n, tagIds: undefined }, ['a'])).toBe(false)
  })
  it('travel in a backup file; an id for no tag (or a list) is dropped', async () => {
    const n = { id: 'n', title: 'x', details: '', tagIds: ['fam', 'gone', 'club'], createdAt: 1, updatedAt: 1 }
    const src = {
      contacts: [],
      tags: [
        { id: 'fam', name: 'Family', colour: 'sky' },
        { id: 'club', name: 'Book club', colour: 'rose', kind: 'list' as const },
      ],
      todos: [],
      pages: [n],
      templates: [],
      settings: { emailLists: false, todos: true, notes: true, shownFields: [] },
      view: { tagIds: [], hiddenTagIds: [], sort: 'name' as const },
    }
    const opened = await openBackup((await packBackup(src as Parameters<typeof packBackup>[0])).text)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.data.pages[0].tagIds).toEqual(['fam'])
  })
  it('a merge points a local note at the tag its contacts now point at', () => {
    const local = { id: 'n', title: 'x', details: '', tagIds: ['local-fam'], createdAt: 1, updatedAt: 1 }
    expect(mergeNotes([], [local], new Map([['local-fam', 'online-fam']]))[0].tagIds).toEqual(['online-fam'])
  })
})
