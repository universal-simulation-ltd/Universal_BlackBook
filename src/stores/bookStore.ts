import { create } from 'zustand'
import type { Category, Contact, Frequency } from '../lib/types'
import { DEFAULT_FREQUENCY } from '../lib/frequency'
import { EMPTY_QUERY, type Query } from '../lib/filter'
import { newId } from '../lib/id'
import { nextSwatch } from '../lib/palette'
import { seedCategories } from '../lib/seed'
import {
  deleteCategory as dbDeleteCategory,
  deleteContact as dbDeleteContact,
  loadCategories,
  loadContacts,
  putCategory,
  putContact,
  replaceAll,
} from '../lib/store'

/**
 * The whole app's state.
 *
 * Every mutator writes to IndexedDB and to memory. The order is deliberate and
 * consistent: **memory first, disk second**. A save that fails must not leave
 * the screen showing an edit that isn't there, so the UI is optimistic and the
 * write is awaited afterwards — but nothing rolls back, because the only
 * plausible failure (quota, private-mode eviction) is not one a rollback
 * helps with and a silently reverted form is worse than a stale one.
 */
interface BookState {
  contacts: Contact[]
  categories: Category[]
  loaded: boolean
  query: Query
  /** Contact being edited, `'new'` for the blank form, null for neither. */
  editing: string | null
  /** Transient banner — import results, mostly. Cleared by the user. */
  notice: string | null

  init: () => Promise<void>
  setQuery: (patch: Partial<Query>) => void
  resetQuery: () => void
  edit: (id: string | null) => void
  saveContact: (draft: ContactDraft) => Promise<void>
  removeContact: (id: string) => Promise<void>
  addCategory: (name: string) => Promise<Category | null>
  renameCategory: (id: string, name: string) => Promise<void>
  recolourCategory: (id: string, colour: string) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  importBook: (contacts: Contact[], categories: Category[], mode: 'merge' | 'replace', notice: string | null) => Promise<void>
  setNotice: (notice: string | null) => void
}

export interface ContactDraft {
  id?: string
  name: string
  email: string
  categoryIds: string[]
  frequency: Frequency
  notes: string
}

export const useBookStore = create<BookState>((set, get) => ({
  contacts: [],
  categories: [],
  loaded: false,
  query: EMPTY_QUERY,
  editing: null,
  notice: null,

  init: async () => {
    if (get().loaded) return
    const [contacts, categories] = await Promise.all([loadContacts(), loadCategories()])
    // First run — no contacts AND no categories. Checking both matters: a user
    // who deleted every starter category but kept their contacts must not be
    // re-seeded, and one who deleted every contact must not be either.
    if (contacts.length === 0 && categories.length === 0) {
      const seeded = seedCategories()
      await Promise.all(seeded.map(putCategory))
      set({ contacts, categories: seeded, loaded: true })
      return
    }
    set({ contacts, categories, loaded: true })
  },

  setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),
  resetQuery: () => set({ query: EMPTY_QUERY }),
  edit: (id) => set({ editing: id }),

  saveContact: async (draft) => {
    const now = Date.now()
    const existing = draft.id ? get().contacts.find((c) => c.id === draft.id) : undefined
    const contact: Contact = {
      id: existing?.id ?? newId(),
      name: draft.name.trim(),
      email: draft.email.trim(),
      categoryIds: draft.categoryIds,
      frequency: draft.frequency,
      notes: draft.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    set((s) => ({
      contacts: existing ? s.contacts.map((c) => (c.id === contact.id ? contact : c)) : [...s.contacts, contact],
      editing: null,
    }))
    await putContact(contact)
  },

  removeContact: async (id) => {
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id), editing: s.editing === id ? null : s.editing }))
    await dbDeleteContact(id)
  },

  addCategory: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    // Case-insensitive duplicate check. Two categories differing only in case
    // are indistinguishable in the list and impossible to tell apart in a
    // filter, so the existing one is returned instead of a second being made.
    const clash = get().categories.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (clash) return clash
    const category: Category = {
      id: newId(),
      name: trimmed,
      colour: nextSwatch(get().categories.map((c) => c.colour)),
    }
    set((s) => ({ categories: [...s.categories, category] }))
    await putCategory(category)
    return category
  },

  renameCategory: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const next = get().categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
    set({ categories: next })
    const changed = next.find((c) => c.id === id)
    if (changed) await putCategory(changed)
  },

  recolourCategory: async (id, colour) => {
    const next = get().categories.map((c) => (c.id === id ? { ...c, colour } : c))
    set({ categories: next })
    const changed = next.find((c) => c.id === id)
    if (changed) await putCategory(changed)
  },

  removeCategory: async (id) => {
    // Deleting a category must not delete the people in it. Every contact is
    // stripped of the id, and each stripped contact is rewritten — a dangling
    // id would render as nothing anyway, but it would come back to life the
    // day some other category happened to be created with a matching id, and
    // it would travel into every CSV export as a phantom empty cell.
    const touched = get().contacts.filter((c) => c.categoryIds.includes(id))
    const contacts = get().contacts.map((c) =>
      c.categoryIds.includes(id) ? { ...c, categoryIds: c.categoryIds.filter((x) => x !== id), updatedAt: Date.now() } : c,
    )
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      contacts,
      query: { ...s.query, categoryIds: s.query.categoryIds.filter((x) => x !== id) },
    }))
    await dbDeleteCategory(id)
    await Promise.all(
      touched.map((t) => {
        const updated = contacts.find((c) => c.id === t.id)
        return updated ? putContact(updated) : Promise.resolve()
      }),
    )
  },

  importBook: async (contacts, categories, mode, notice) => {
    if (mode === 'replace') {
      set({ contacts, categories, notice, query: EMPTY_QUERY })
      await replaceAll(contacts, categories)
      return
    }
    const merged = [...get().contacts, ...contacts]
    set({ contacts: merged, categories, notice })
    await replaceAll(merged, categories)
  },

  setNotice: (notice) => set({ notice }),
}))

export const blankDraft = (): ContactDraft => ({
  name: '',
  email: '',
  categoryIds: [],
  frequency: DEFAULT_FREQUENCY,
  notes: '',
})
