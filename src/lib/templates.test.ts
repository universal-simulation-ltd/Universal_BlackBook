import { describe, expect, it } from 'vitest'
import { bookTemplate, mergeTemplates, retireFields, showValue, toFieldValues, toTemplates } from './templates'
import { matchesNote, type Note } from './notes'
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
