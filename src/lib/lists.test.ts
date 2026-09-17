import { describe, expect, it } from 'vitest'
import { EMPTY_QUERY, runQuery } from './filter'
import { keptOffContacts, listIdsOf } from './lists'
import type { Contact, Tag } from './types'

const TODAY = { year: 2026, month: 9, day: 17 }
const person = (id: string, tagIds: string[], listOnly?: boolean): Contact => ({
  id,
  name: id,
  email: `${id}@example.com`,
  phone: '',
  tagIds,
  listOnly,
  notes: '',
  createdAt: 1,
  updatedAt: 1,
})
const tags: Tag[] = [
  { id: 'work', name: 'Work', colour: 'blue' },
  { id: 'club', name: 'Book club', colour: 'amber', kind: 'list', tagIds: [] },
]

describe('people only on a list', () => {
  const lists = listIdsOf(tags)
  const onlyList = person('only', ['club'], true)
  const both = person('both', ['club'])
  const dropped = person('dropped', [], true)
  const ids = (q = EMPTY_QUERY) => runQuery([onlyList, both, dropped], q, TODAY, lists).map((c) => c.id)

  it('are kept off Contacts, unless a list they are on is the filter', () => {
    expect(ids()).toEqual(['both', 'dropped'])
    expect(ids({ ...EMPTY_QUERY, tagIds: ['club'] })).toEqual(['both', 'only'])
  })

  it('are still found by search', () => {
    expect(ids({ ...EMPTY_QUERY, text: 'only' })).toEqual(['only'])
  })

  it('come back once they are on no list at all', () => {
    expect(keptOffContacts(dropped, lists, [])).toBe(false)
  })
})
