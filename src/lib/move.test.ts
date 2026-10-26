import { describe, expect, it } from 'vitest'
import { fromContact, fromNote, fromTodo, tagsForTodo, withDue, type MoveWords } from './move'
import type { Contact, Tag } from './types'
import type { Note } from './notes'
import type { Todo } from './todos'

const w: MoveWords = {
  untitled: 'Untitled',
  birthday: (d) => `Birthday: ${d}`,
  due: (d) => `Due: ${d}`,
  formatBirthday: (v) => `[${v}]`,
  formatDay: (v) => `<${v}>`,
}
const contact = (over: Partial<Contact>): Contact => ({ id: 'c', name: '', email: '', phone: '', tagIds: [], notes: '', createdAt: 1, updatedAt: 1, ...over })

describe('moving between contacts, notes and to-dos', () => {
  it('a contact keeps every field as text, its tags and its place', () => {
    const m = fromContact(
      contact({ name: 'Grace Hopper', email: 'g@navy.mil', phone: '0113 496 0000', company: 'Navy', birthdate: '1906-12-09', notes: 'Met at the conference', tagIds: ['t1'], location: { street: 'x' } as Contact['location'] }),
      w,
    )
    expect(m.title).toBe('Grace Hopper')
    expect(m.details).toBe('Navy\ng@navy.mil\n0113 496 0000\nBirthday: [1906-12-09]\n\nMet at the conference')
    expect(m.tagIds).toEqual(['t1'])
    expect(m.location).toEqual({ street: 'x' })
  })

  it('a contact with no name is titled by its email', () => {
    expect(fromContact(contact({ email: 'a@b.c' }), w).title).toBe('a@b.c')
    expect(fromContact(contact({}), w).title).toBe('Untitled')
  })

  it('a note writes its template fields out above its text', () => {
    const note: Note = { id: 'n', title: 'Dune', details: 'Loved it', templateId: 'tpl', fields: { a: 'Frank Herbert', b: '' }, createdAt: 1, updatedAt: 1 }
    const tpl = { id: 'tpl', name: 'Book', fields: [{ id: 'a', label: 'Author', type: 'text' as const }, { id: 'b', label: 'Rating', type: 'text' as const }], createdAt: 1, updatedAt: 1 }
    expect(fromNote(note, tpl, w).details).toBe('Author: Frank Herbert\n\nLoved it')
  })

  it('a to-do’s deadline is written into whatever has no deadline of its own', () => {
    const todo: Todo = { id: 'x', title: 'Renew passport', details: 'Photos first', due: '2026-11-02', tagIds: ['t1'], createdAt: 1, updatedAt: 1 }
    const m = fromTodo(todo, w)
    expect(withDue(m, w)).toBe('Photos first\n\nDue: <2026-11-02>')
    expect(m.tagIds).toEqual(['t1'])
  })

  it('a to-do never gets a list as a tag', () => {
    const tags = [{ id: 't1', name: 'Family' }, { id: 'l1', name: 'Newsletter', kind: 'list' }] as Tag[]
    expect(tagsForTodo(['t1', 'l1'], tags)).toEqual(['t1'])
  })
})
