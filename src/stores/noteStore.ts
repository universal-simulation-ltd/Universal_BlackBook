import { create } from 'zustand'
import { newId } from '../lib/id'
import type { Note } from '../lib/notes'
import { loadPages, savePages } from '../lib/store'

/** What the note page hands back. */
export interface NoteDraft {
  id?: string
  title: string
  details: string
}

/**
 * The Notes tab's notes — see lib/notes.ts. Its own store, like todoStore;
 * the vault carries it (syncStore) and so does a backup file (lib/backup.ts).
 * Every change rewrites the whole list to disk (lib/store.ts 'pages').
 */
interface NoteState {
  notes: Note[]
  loaded: boolean
  /** 'new', a note's id, or null — the note page is open on it. */
  editing: string | null
  /** What the Notes tab's search box holds. Never remembered. */
  query: string
  /** A new note's title, typed into the search first ("Add “…”"). */
  prefillTitle: string | null
  init: () => Promise<void>
  edit: (id: string | null) => void
  /** A new note, its title already in it. */
  startNote: (title: string) => void
  setQuery: (query: string) => void
  save: (draft: NoteDraft) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Change some fields of one note (its reminders, links, place) without the page. */
  patch: (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  /** The vault's or a backup file's copy (or a merge of it) becomes this device's. */
  replace: (notes: Note[]) => Promise<void>
}

export const useNoteStore = create<NoteState>((set, get) => {
  const commit = async (notes: Note[]) => {
    set({ notes })
    await savePages(notes)
  }

  return {
    notes: [],
    loaded: false,
    editing: null,
    query: '',
    prefillTitle: null,

    init: async () => {
      if (get().loaded) return
      const notes = await loadPages()
      // A vault adopted while that read was in flight is newer than it.
      if (get().loaded) return
      set({ notes, loaded: true })
    },

    edit: (editing) => set({ editing, prefillTitle: null }),
    startNote: (title) => set({ editing: 'new', prefillTitle: title }),
    setQuery: (query) => set({ query }),

    save: async (draft) => {
      const now = Date.now()
      const existing = draft.id ? get().notes.find((n) => n.id === draft.id) : undefined
      const title = draft.title.trim()
      const details = draft.details.replace(/\s+$/, '')
      set({ editing: null })
      // Nothing changed: no new "edited" time, so the order stays put.
      if (existing && existing.title === title && existing.details === details) return
      // `...existing` first: what the page does not edit (reminders, links,
      // place) stays as it was.
      const note: Note = {
        ...existing,
        id: existing?.id ?? newId(),
        title,
        details,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await commit(existing ? get().notes.map((n) => (n.id === note.id ? note : n)) : [...get().notes, note])
    },

    patch: async (id, patch) => {
      const existing = get().notes.find((n) => n.id === id)
      if (!existing) return
      const note: Note = { ...existing, ...patch, updatedAt: Date.now() }
      await commit(get().notes.map((n) => (n.id === id ? note : n)))
    },

    remove: async (id) => {
      set((s) => ({ editing: s.editing === id ? null : s.editing }))
      await commit(get().notes.filter((n) => n.id !== id))
    },

    replace: async (notes) => {
      set({ editing: null, loaded: true })
      await commit(notes)
    },
  }
})
