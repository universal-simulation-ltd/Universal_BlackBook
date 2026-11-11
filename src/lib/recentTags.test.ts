import { beforeEach, describe, expect, it } from 'vitest'
import { noteRecentTag, quickTags, readRecentTags } from './recentTags'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

const opts = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, name: id.toUpperCase() }))

describe('recent tags', () => {
  it('keeps the newest first, once each', () => {
    noteRecentTag('b')
    noteRecentTag('c')
    noteRecentTag('b')
    expect(readRecentTags()).toEqual(['b', 'c'])
  })

  it('offers recent ones first, skips chosen and deleted, then tops up', () => {
    const on = (id: string) => id === 'c'
    expect(quickTags(opts, on, ['gone', 'f', 'c', 'b'], 4).map((o) => o.id)).toEqual(['f', 'b', 'a', 'd'])
  })

  it('reads junk storage as nothing', () => {
    store.set('bb.tags.recent', '{oops')
    expect(readRecentTags()).toEqual([])
  })
})
