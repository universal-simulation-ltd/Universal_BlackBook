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
})
