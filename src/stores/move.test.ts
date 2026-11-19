// Move with the Places tab (2026-11-19): a place becomes a person and back,
// and Undo puts it all as it was. Same fresh-store trick as todo.test.ts.

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  vi.resetModules()
})

async function stores() {
  const { useBookStore } = await import('./bookStore')
  const { usePlaceStore } = await import('./placeStore')
  const { useNoteStore } = await import('./noteStore')
  const { moveItems, undoMove } = await import('./move')
  const { makeTranslator } = await import('../i18n')
  await useBookStore.getState().init()
  await usePlaceStore.getState().init()
  await useNoteStore.getState().init()
  return { useBookStore, usePlaceStore, useNoteStore, moveItems, undoMove, t: makeTranslator('en') }
}

describe('Move and the Places tab', () => {
  it('a place becomes a person with its phone and address, and Undo brings it back', async () => {
    const { useBookStore, usePlaceStore, moveItems, undoMove, t } = await stores()
    await usePlaceStore.getState().save({ name: 'The Crown', location: { city: 'Leeds', country: 'GB' }, phone: '0113 000', website: 'crown.example', details: 'Quiz night', tagIds: [] })
    const id = usePlaceStore.getState().places[0].id
    const done = await moveItems('places', 'contacts', [id], t)
    expect(usePlaceStore.getState().places).toEqual([])
    const person = useBookStore.getState().contacts.find((c) => c.name === 'The Crown')!
    expect(person).toMatchObject({ phone: '0113 000', location: { city: 'Leeds', country: 'GB' } })
    expect(person.notes).toBe('crown.example\n\nQuiz night')
    await undoMove(done!)
    expect(usePlaceStore.getState().places.map((p) => p.id)).toEqual([id])
    expect(useBookStore.getState().contacts.some((c) => c.name === 'The Crown')).toBe(false)
  })

  it('a note becomes a place named by its title, its address kept', async () => {
    const { usePlaceStore, useNoteStore, moveItems, t } = await stores()
    const now = Date.now()
    await useNoteStore.getState().restoreMany([{ id: 'n1', title: 'Gran’s', details: 'Green door', location: { place: 'Gran’s', street: '2 Elm Rd', city: 'York', country: 'GB' }, createdAt: now, updatedAt: now }])
    await moveItems('notes', 'places', ['n1'], t)
    expect(usePlaceStore.getState().places).toEqual([
      expect.objectContaining({ name: 'Gran’s', details: 'Green door', location: { street: '2 Elm Rd', city: 'York', country: 'GB' } }),
    ])
    expect(useNoteStore.getState().notes.some((n) => n.id === 'n1')).toBe(false)
  })
})
