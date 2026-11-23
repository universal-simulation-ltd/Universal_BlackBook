import { beforeEach, describe, expect, it, vi } from 'vitest'
import { foldAllAction, withFolds } from './folds'

describe('Collapse all / Open all (2026-11-23)', () => {
  it('collapses while any group is open, opens once all are folded, hides with none', () => {
    expect(foldAllAction([], new Set(['a']))).toBeNull()
    expect(foldAllAction(['a', 'b'], new Set())).toBe('collapse')
    expect(foldAllAction(['a', 'b'], new Set(['a']))).toBe('collapse')
    expect(foldAllAction(['a', 'b'], new Set(['a', 'b', 'gone']))).toBe('open')
  })

  it('folds or opens just the groups asked for', () => {
    const set = new Set(['x'])
    expect([...withFolds(set, ['a', 'b'], true)].sort()).toEqual(['a', 'b', 'x'])
    expect([...withFolds(new Set(['a', 'b', 'x']), ['a', 'b'], false)]).toEqual(['x'])
    expect([...set]).toEqual(['x'])
  })
})

describe('the folds on this device', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    vi.resetModules()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    })
  })

  it('are kept across a reload, and a garbled copy reads as none', async () => {
    const one = await import('./folds')
    one.setFolds(['a', 'b'], true)
    one.setFolds(['b'], false)
    vi.resetModules()
    const two = await import('./folds')
    expect(foldAllAction(['a'], new Set(JSON.parse(store.get('bb.todo.folded')!)))).toBe('open')
    // The module reads storage once, on first use.
    two.setFolds([], true)
    expect(JSON.parse(store.get('bb.todo.folded')!)).toEqual(['a'])
    store.set('bb.todo.folded', '{not json')
    vi.resetModules()
    const three = await import('./folds')
    three.setFolds(['c'], true)
    expect(JSON.parse(store.get('bb.todo.folded')!)).toEqual(['c'])
  })
})
