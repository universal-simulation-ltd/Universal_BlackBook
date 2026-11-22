// The To-do store across a reload — same fresh-module-graph trick as
// book.test.ts: a new store over the same fake IndexedDB is a relaunch.

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function reopen() {
  vi.resetModules()
  const { useTodoStore } = await import('./todoStore')
  await useTodoStore.getState().init()
  return useTodoStore
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  vi.resetModules()
})

const draft = (over = {}) => ({ title: 'Renew passport', details: '', tagIds: [] as string[], ...over })

describe('the to-do list', () => {
  it('survives a reload, done and all', async () => {
    const store = await reopen()
    await store.getState().save(draft({ due: '2026-10-01' }))
    const id = store.getState().todos[0].id
    await store.getState().setDone(id, true)
    const again = await reopen()
    expect(again.getState().todos).toEqual([expect.objectContaining({ id, due: '2026-10-01', doneAt: expect.any(Number) })])
  })

  it('a new tagged one filters the tab to its tags; an untagged one clears it', async () => {
    const store = await reopen()
    await store.getState().save(draft({ tagIds: ['a', 'b'] }))
    expect(store.getState().tagFilter).toEqual(['a', 'b'])
    await store.getState().save(draft({ title: 'Plain' }))
    expect(store.getState().tagFilter).toEqual([])
  })

  it('clears done ones and forgets a deleted tag', async () => {
    const store = await reopen()
    await store.getState().save(draft({ tagIds: ['x'] }))
    await store.getState().save(draft({ title: 'Done one' }))
    await store.getState().setDone(store.getState().todos[1].id, true)
    await store.getState().clearDone()
    await store.getState().dropTag('x')
    const again = await reopen()
    expect(again.getState().todos.map((t) => [t.title, t.tagIds])).toEqual([['Renew passport', []]])
  })

  it('deleting a tag in the book strips it from to-dos', async () => {
    vi.resetModules()
    const { useBookStore } = await import('./bookStore')
    const { useTodoStore } = await import('./todoStore')
    await useBookStore.getState().init()
    await useTodoStore.getState().init()
    const tag = useBookStore.getState().tags[0]
    await useTodoStore.getState().save(draft({ tagIds: [tag.id] }))
    await useBookStore.getState().removeTag(tag.id)
    expect(useTodoStore.getState().todos[0].tagIds).toEqual([])
  })

  it('snoozes and wakes, across a reload; a group with nothing in it is an ordinary to-do', async () => {
    const store = await reopen()
    await store.getState().save(draft({ items: [{ id: 'i', title: '  ' }] }))
    const id = store.getState().todos[0].id
    expect(store.getState().todos[0]).not.toHaveProperty('items')
    await store.getState().snooze([id], '2099-01-01')
    let again = await reopen()
    expect(again.getState().todos[0].snoozedUntil).toBe('2099-01-01')
    await again.getState().snooze([id], undefined)
    again = await reopen()
    expect(again.getState().todos[0]).not.toHaveProperty('snoozedUntil')
  })
})

describe('adding an item from the list (2026-11-22)', () => {
  it('goes on the end, unticked, survives a reload and reopens a done group', async () => {
    const store = await reopen()
    await store.getState().save(draft({ title: 'Shopping', items: [{ id: 'a', title: 'Bread' }] }))
    const id = store.getState().todos[0].id
    await store.getState().setDone(id, true)
    expect(store.getState().todos[0].doneAt).toEqual(expect.any(Number))
    await store.getState().addItem(id, ' Milk ')
    const again = await reopen()
    const group = again.getState().todos[0]
    expect(group.doneAt).toBeUndefined()
    expect(group.items).toEqual([
      { id: 'a', title: 'Bread', doneAt: expect.any(Number) },
      { id: expect.any(String), title: 'Milk' },
    ])
  })

  it('does nothing for blank text, an ordinary to-do or a missing one', async () => {
    const store = await reopen()
    await store.getState().save(draft({ title: 'Group', items: [] }))
    await store.getState().save(draft({ title: 'Plain' }))
    const before = store.getState().todos
    await store.getState().addItem(before[0].id, '   ')
    await store.getState().addItem(before[1].id, 'Nope')
    await store.getState().addItem('gone', 'Nope')
    expect(store.getState().todos).toBe(before)
  })
})
