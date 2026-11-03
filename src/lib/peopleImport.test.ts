import { describe, expect, it } from 'vitest'
import type { ImportedNote } from './noteImport'
import { fileTagName, knownNames, planPeopleImport } from './peopleImport'
import type { Contact } from './types'

const page = (title: string, details: string, file = 'People - KyJam.docx', createdAt?: number): ImportedNote => ({ title, details, file, ...(createdAt ? { createdAt } : {}) })
const person = (name: string, notes = '', extra: Partial<Contact> = {}): Contact => ({
  id: `id-${name}`,
  name,
  email: '',
  phone: '',
  tagIds: [],
  notes,
  createdAt: 1,
  updatedAt: 1,
  ...extra,
})

describe('planPeopleImport', () => {
  it('makes a person of each page: title as name, text as notes, page date as added', () => {
    const r = planPeopleImport([page('Frank Webster', 'Met at the FCDO do.', 'a.docx', 1_700_000_000_000)], [], undefined, 5)
    expect(r.added).toHaveLength(1)
    expect(r.added[0]).toMatchObject({ name: 'Frank Webster', notes: 'Met at the FCDO do.', createdAt: 1_700_000_000_000, updatedAt: 5, tagIds: [] })
    expect(r.updated).toEqual([])
  })

  it('adds a page under somebody already in the book, by name, ignoring case and spacing', () => {
    const r = planPeopleImport([page('  isaac   BIRCHALL ', 'Plays bass.')], [person('Isaac Birchall', 'Old friend.')])
    expect(r.added).toEqual([])
    expect(r.updated[0].notes).toBe('Old friend.\n\nPlays bass.')
    expect(r.updated[0].id).toBe('id-Isaac Birchall')
  })

  it('changes nothing the second time', () => {
    const r = planPeopleImport([page('Jude', 'Likes jazz.')], [person('Jude', 'Old.\n\nLikes jazz.')])
    expect(r).toMatchObject({ added: [], updated: [], already: 1 })
  })

  it('two pages with one name make one person with both texts', () => {
    const r = planPeopleImport([page('Jane', 'One.'), page('jane', 'Two.')], [])
    expect(r.added).toHaveLength(1)
    expect(r.added[0].notes).toBe('One.\n\nTwo.')
  })

  it('tags by file when asked, and only once', () => {
    const tags: Record<string, string> = { 'People - HRV.docx': 'tag-hrv' }
    const r = planPeopleImport(
      [page('Guy Monsarrat', 'DBT', 'People - HRV.docx'), page('Jude', '', 'People - HRV.docx')],
      [person('Jude', '', { tagIds: ['tag-hrv'] })],
      (f) => tags[f],
    )
    expect(r.added[0].tagIds).toEqual(['tag-hrv'])
    expect(r.already).toBe(1)
  })

  it('brings somebody only on an Email list into People', () => {
    const r = planPeopleImport([page('Josie Morris', '')], [person('Josie Morris', '', { listOnly: true })])
    expect(r.updated[0].listOnly).toBeUndefined()
  })

  it('skips a page with no title', () => {
    expect(planPeopleImport([page('  ', 'text')], []).added).toEqual([])
  })
})

describe('fileTagName / knownNames', () => {
  it('names a tag after the section file', () => {
    expect(fileTagName('People - KyJam.docx')).toBe('People - KyJam')
    expect(fileTagName('People_HRV.mht')).toBe('People HRV')
  })
  it('knows who is in the book', () => {
    const known = knownNames([person('Julia McShane (?)')])
    expect(known('julia mcshane (?)')).toBe(true)
    expect(known('Julia')).toBe(false)
  })
})
