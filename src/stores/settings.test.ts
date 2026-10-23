import { afterEach, describe, expect, it, vi } from 'vitest'

// To-do and Notes on by default, Email lists off (2026-10-23), and what a
// device stored before then: version 1 wrote every switch whenever any one
// changed, so its `false` is the old default and reads as unset (on).

function withStored(value: unknown) {
  const store = new Map<string, string>()
  if (value !== undefined) store.set('blackbook.settings', JSON.stringify(value))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  return store
}

async function fresh() {
  vi.resetModules()
  return (await import('./settingsStore')).useSettingsStore
}

afterEach(() => vi.unstubAllGlobals())

describe('settings defaults', () => {
  it('a new device: To-do and Notes on, Email lists off', async () => {
    withStored(undefined)
    const s = (await fresh()).getState()
    expect([s.emailLists, s.todos, s.notes]).toEqual([false, true, true])
  })

  it('version 1: a stored false was the old default, so it reads as on; true stays on', async () => {
    withStored({ emailLists: true, todos: false, shownFields: [] })
    const s = (await fresh()).getState()
    expect([s.emailLists, s.todos, s.notes]).toEqual([true, true, true])
  })

  it('version 2 keeps a switch turned off, and Reset puts the defaults back', async () => {
    const store = withStored({ v: 2, emailLists: false, todos: false, notes: false, shownFields: [] })
    const use = await fresh()
    expect([use.getState().todos, use.getState().notes]).toEqual([false, false])
    use.getState().set({ notes: true })
    expect(JSON.parse(store.get('blackbook.settings')!)).toMatchObject({ v: 2, todos: false, notes: true })
    use.getState().reset()
    expect([use.getState().emailLists, use.getState().todos, use.getState().notes]).toEqual([false, true, true])
  })
})
