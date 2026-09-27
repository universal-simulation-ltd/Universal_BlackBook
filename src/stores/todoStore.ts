import { create } from 'zustand'
import { newId } from '../lib/id'
import { loadTodos, saveTodos } from '../lib/store'
import type { Todo } from '../lib/todos'

/** What the To-do form hands back. */
export interface TodoDraft {
  id?: string
  title: string
  details: string
  due?: string
  tagIds: string[]
}

/**
 * The To-do tab's list — see lib/todos.ts. Its own store rather than more of
 * bookStore, which is about people; the vault carries both (syncStore).
 *
 * Every change rewrites the whole list to disk: it is one record (lib/store.ts
 * 'todos'), which is what kept this feature from needing a DB_VERSION bump.
 */
interface TodoState {
  todos: Todo[]
  loaded: boolean
  /** Which tags the To-do tab is filtered to. OR, like the contact list. */
  tagFilter: string[]
  /** 'new', a to-do's id, or null — the form is open on it. */
  editing: string | null
  init: () => Promise<void>
  setTagFilter: (tagIds: string[]) => void
  edit: (id: string | null) => void
  save: (draft: TodoDraft) => Promise<void>
  setDone: (id: string, done: boolean) => Promise<void>
  remove: (id: string) => Promise<void>
  clearDone: () => Promise<void>
  /** A tag was deleted: nothing may go on pointing at it. */
  dropTag: (tagId: string) => Promise<void>
  /** The vault's copy (or a merge of it) becomes this device's. */
  replace: (todos: Todo[]) => Promise<void>
}

export const useTodoStore = create<TodoState>((set, get) => {
  const commit = async (todos: Todo[]) => {
    set({ todos })
    await saveTodos(todos)
  }

  return {
    todos: [],
    loaded: false,
    tagFilter: [],
    editing: null,

    init: async () => {
      if (get().loaded) return
      const todos = await loadTodos()
      // A vault adopted while that read was in flight (`replace`) is newer
      // than what it read. Checked again AFTER the await for that reason.
      if (get().loaded) return
      set({ todos, loaded: true })
    },

    setTagFilter: (tagFilter) => set({ tagFilter }),
    edit: (editing) => set({ editing }),

    save: async (draft) => {
      const now = Date.now()
      const existing = draft.id ? get().todos.find((t) => t.id === draft.id) : undefined
      const todo: Todo = {
        id: existing?.id ?? newId(),
        title: draft.title.trim(),
        details: draft.details.trim(),
        due: draft.due || undefined,
        tagIds: draft.tagIds,
        doneAt: existing?.doneAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const todos = existing ? get().todos.map((t) => (t.id === todo.id ? todo : t)) : [...get().todos, todo]
      // Same rule as a new contact (bookStore.saveContact): a new to-do with
      // tags lands the tab on those tags, and an untagged one clears a filter
      // that would hide it.
      if (!existing && (todo.tagIds.length > 0 || get().tagFilter.length > 0)) set({ tagFilter: todo.tagIds })
      set({ editing: null })
      await commit(todos)
    },

    setDone: async (id, done) => {
      const now = Date.now()
      await commit(
        get().todos.map((t) => (t.id === id ? { ...t, doneAt: done ? now : undefined, updatedAt: now } : t)),
      )
    },

    remove: async (id) => {
      set((s) => ({ editing: s.editing === id ? null : s.editing }))
      await commit(get().todos.filter((t) => t.id !== id))
    },

    clearDone: async () => {
      await commit(get().todos.filter((t) => t.doneAt === undefined))
    },

    dropTag: async (tagId) => {
      set((s) => ({ tagFilter: s.tagFilter.filter((x) => x !== tagId) }))
      if (!get().todos.some((t) => t.tagIds.includes(tagId))) return
      const now = Date.now()
      await commit(
        get().todos.map((t) =>
          t.tagIds.includes(tagId) ? { ...t, tagIds: t.tagIds.filter((x) => x !== tagId), updatedAt: now } : t,
        ),
      )
    },

    replace: async (todos) => {
      set({ editing: null, loaded: true })
      await commit(todos)
    },
  }
})
