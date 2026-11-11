import { describe, expect, it } from 'vitest'
import { baseOf, diffEntries, mergeList, mergeVault, resolve, signature } from './syncMerge'

const n = (id: string, title: string, updatedAt = 1, extra: Record<string, unknown> = {}) => ({ id, title, details: '', createdAt: 1, updatedAt, ...extra })
const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('signature', () => {
  it('ignores key order and undefined fields', () => {
    expect(signature({ a: 1, b: 'x' })).toBe(signature({ b: 'x', a: 1, c: undefined }))
    expect(signature({ a: 1 })).not.toBe(signature({ a: 2 }))
  })
})

describe('mergeList, with a base', () => {
  const A = n('a', 'Alpha')
  const B = n('b', 'Beta')
  const base = baseOf({ contacts: [], tags: [], pages: [A, B] }).pages!

  it('takes a change made on one side only, without asking', () => {
    const r = mergeList('pages', base, [n('a', 'Alpha here', 5), B], [A, n('b', 'Beta there', 6)])
    expect(r.conflicts).toEqual([])
    expect(r.merged.map((x) => x.title)).toEqual(['Alpha here', 'Beta there'])
  })

  it('keeps what either side added', () => {
    const r = mergeList('pages', base, [A, B, n('c', 'New here')], [A, B, n('d', 'New there')])
    expect(ids(r.merged).sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(r.conflicts).toEqual([])
  })

  it('honours a deletion on either side when the other did not touch it', () => {
    expect(ids(mergeList('pages', base, [B], [A, B]).merged)).toEqual(['b'])
    expect(ids(mergeList('pages', base, [A, B], [B]).merged)).toEqual(['b'])
  })

  it('keeps an edit over a deletion', () => {
    expect(mergeList('pages', base, [B], [n('a', 'Edited there', 9), B]).merged.map((x) => x.title)).toEqual(['Edited there', 'Beta'])
    expect(mergeList('pages', base, [n('a', 'Edited here', 9), B], [B]).merged.map((x) => x.title)).toEqual(['Beta', 'Edited here'])
  })

  it('asks only when both sides edited the same entry differently', () => {
    const r = mergeList('pages', base, [n('a', 'Mine', 5), B], [n('a', 'Theirs', 7), B])
    expect(r.conflicts).toHaveLength(1)
    expect(r.merged[0].title).toBe('Theirs')
    // The same edit on both sides is not a conflict.
    expect(mergeList('pages', base, [n('a', 'Same', 5), B], [n('a', 'Same', 5), B]).conflicts).toEqual([])
  })
})

describe('mergeList, no base', () => {
  it('unions, the newer edit winning, and never asks', () => {
    const r = mergeList('pages', null, [n('a', 'Old', 1), n('c', 'Mine')], [n('a', 'New', 2), n('b', 'Theirs')])
    expect(r.conflicts).toEqual([])
    expect(r.merged.map((x) => x.title)).toEqual(['New', 'Theirs', 'Mine'])
  })
})

describe('mergeVault', () => {
  it('leaves a collection the online copy says nothing about as this device has it', () => {
    const r = mergeVault(null, { contacts: [], tags: [], todos: [n('t', 'Todo') as never] }, { contacts: [], tags: [] })
    expect(r.merged.todos).toHaveLength(1)
  })

  it('merges tags, which carry no edit time, by their content', () => {
    const tag = { id: 'g', name: 'Work', colour: 'blue' }
    const base = baseOf({ contacts: [], tags: [tag] })
    const r = mergeVault(base, { contacts: [], tags: [{ ...tag, name: 'Office' }] }, { contacts: [], tags: [tag] })
    expect(r.merged.tags[0].name).toBe('Office')
    expect(r.conflicts).toEqual([])
  })

  it('applies the chosen side of each conflict', () => {
    const A = n('a', 'Alpha')
    const base = baseOf({ contacts: [], tags: [], pages: [A] })
    const r = mergeVault(base, { contacts: [], tags: [], pages: [n('a', 'Mine', 5)] }, { contacts: [], tags: [], pages: [n('a', 'Theirs', 7)] })
    expect(resolve(r, () => true).pages![0].title).toBe('Mine')
    expect(resolve(r, () => false).pages![0].title).toBe('Theirs')
  })
})

describe('diffEntries', () => {
  it('lists only the fields a person would see that differ', () => {
    const d = diffEntries(n('a', 'Mine', 5, { tagIds: ['x'] }), n('a', 'Theirs', 7, { tagIds: ['x'] }))
    expect(d).toEqual([{ field: 'title', local: 'Mine', online: 'Theirs' }])
  })
})

describe('bookkeeping-only differences', () => {
  it('are not asked about', () => {
    const A = n('a', 'Alpha')
    const base = baseOf({ contacts: [], tags: [], pages: [A] }).pages!
    const r = mergeList('pages', base, [n('a', 'Alpha', 5)], [n('a', 'Alpha', 7)])
    expect(r.conflicts).toEqual([])
    expect(r.merged[0].updatedAt).toBe(7)
  })
})
