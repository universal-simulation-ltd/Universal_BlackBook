import { create } from 'zustand'
import { newId } from '../lib/id'
import { loadTodos, saveTodos } from '../lib/store'
import { moveTodo, renewDaily, withItemAdded, withItemDone, type Todo, type TodoItem } from '../lib/todos'

/** What the To-do form hands back. */
export interface TodoDraft {
  id?: string
  title: string
  details: string
  due?: string
  tagIds: string[]
  /** Present (even empty) makes it a group — see `Todo.items`. */
  items?: TodoItem[]
  /** `YYYY-MM-DD` — see `Todo.snoozedUntil`. */
  snoozedUntil?: string
  /** Renews every day — see `Todo.daily`. */
  daily?: boolean
}

/**
 * The To-do tab's list — see lib/todos.ts. Its own store rather than more of
 * bookStore, which is about people; the vault carries both (syncStore), and so
 * does a backup file (lib/backup.ts).
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
  /** A new to-do's title, typed into the tab's search first ("Add “…”"). */
  prefillTitle: string | null
  /** A new to-do, its title already in it. */
  startTodo: (title: string) => void
  init: () => Promise<void>
  setTagFilter: (tagIds: string[]) => void
  edit: (id: string | null) => void
  save: (draft: TodoDraft) => Promise<void>
  setDone: (id: string, done: boolean) => Promise<void>
  /** Tick one item of a group (lib/todos.ts ▸ withItemDone). */
  setItemDone: (id: string, itemId: string, done: boolean) => Promise<void>
  /** One more item on the end of a group, from the list (lib/todos.ts ▸ withItemAdded). */
  addItem: (id: string, title: string) => Promise<void>
  remove: (id: string) => Promise<void>
  clearDone: () => Promise<void>
  /** Snooze until a day (`YYYY-MM-DD`), or wake (undefined). */
  snooze: (ids: string[], until: string | undefined) => Promise<void>
  /** Pin to the top, or unpin. */
  setPinned: (id: string, pinned: boolean) => Promise<void>
  /** Drag (or Move up / down): put it just before or after another. */
  move: (id: string, targetId: string, after: boolean) => Promise<void>
  /** Undo a delete: the to-do as it was. */
  restore: (todo: Todo) => Promise<void>
  /** Several new ones at once (Import ▸ To-dos, Move). Resolves to how many. */
  addMany: (drafts: { title: string; details: string; due?: string; done?: boolean }[]) => Promise<number>
  /** A tag was deleted: nothing may go on pointing at it. */
  dropTag: (tagId: string) => Promise<void>
  /** The vault's or a backup file's copy (or a merge of it) becomes this device's. */
  replace: (todos: Todo[]) => Promise<void>
  /** A new day: untick yesterday's daily to-dos (lib/todos.ts ▸ renewDaily). */
  renew: () => Promise<void>
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
    prefillTitle: null,

    init: async () => {
      if (get().loaded) return
      // Yesterday's daily ones come back unticked (not saved until the next change).
      const todos = renewDaily(await loadTodos())
      // A vault adopted while that read was in flight (`replace`) is newer
      // than what it read. Checked again AFTER the await for that reason.
      if (get().loaded) return
      set({ todos, loaded: true })
    },

    setTagFilter: (tagFilter) => set({ tagFilter }),
    edit: (editing) => set({ editing, prefillTitle: null }),
    startTodo: (title) => set({ editing: 'new', prefillTitle: title }),

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
        ...(existing?.pinnedAt ? { pinnedAt: existing.pinnedAt } : {}),
        ...(existing?.rank !== undefined ? { rank: existing.rank } : {}),
        // A group only while something is in it (the form's tick boxes, 2026-11-19).
        ...(draft.items?.some((i) => i.title.trim())
          ? { items: draft.items.map((i) => ({ ...i, title: i.title.trim() })).filter((i) => i.title) }
          : {}),
        ...(draft.snoozedUntil ? { snoozedUntil: draft.snoozedUntil } : {}),
        ...(draft.daily ? { daily: true } : {}),
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
        get().todos.map((t) => {
          if (t.id !== id) return t
          // A group ticked off whole ticks off what is in it, too.
          const items = done && t.items ? t.items.map((i) => (i.doneAt ? i : { ...i, doneAt: now })) : t.items
          return { ...t, ...(items ? { items } : {}), doneAt: done ? now : undefined, updatedAt: now }
        }),
      )
    },

    setItemDone: async (id, itemId, done) => {
      await commit(get().todos.map((t) => (t.id === id ? withItemDone(t, itemId, done) : t)))
    },

    addItem: async (id, title) => {
      const was = get().todos.find((t) => t.id === id)
      // Only a group takes items; a blank one is no change, so no write.
      if (!was?.items) return
      const now = withItemAdded(was, title, newId())
      if (now !== was) await commit(get().todos.map((t) => (t.id === id ? now : t)))
    },

    remove: async (id) => {
      set((s) => ({ editing: s.editing === id ? null : s.editing }))
      await commit(get().todos.filter((t) => t.id !== id))
    },

    snooze: async (ids, until) => {
      const now = Date.now()
      const pick = new Set(ids)
      await commit(
        get().todos.map((t) => {
          if (!pick.has(t.id)) return t
          const { snoozedUntil: _s, ...rest } = t
          void _s
          return { ...rest, ...(until ? { snoozedUntil: until } : {}), updatedAt: now }
        }),
      )
    },

    setPinned: async (id, pinned) => {
      const now = Date.now()
      await commit(
        get().todos.map((t) => {
          if (t.id !== id) return t
          // A rank belongs to the group it was made in; changing group starts afresh.
          const { rank: _rank, pinnedAt: _p, ...rest } = t
          void _rank
          void _p
          return { ...rest, ...(pinned ? { pinnedAt: now } : {}), updatedAt: now }
        }),
      )
    },

    move: async (id, targetId, after) => {
      const changed = new Map(moveTodo(get().todos, id, targetId, after).map((t) => [t.id, t]))
      if (changed.size) await commit(get().todos.map((t) => changed.get(t.id) ?? t))
    },

    restore: async (todo) => {
      if (get().todos.some((t) => t.id === todo.id)) return
      await commit([...get().todos, { ...todo, updatedAt: Date.now() }])
    },

    addMany: async (drafts) => {
      await get().init()
      const now = Date.now()
      const added: Todo[] = drafts.map((d, i) => ({
        id: newId(),
        title: d.title.trim(),
        details: d.details.trim(),
        due: d.due || undefined,
        tagIds: [],
        doneAt: d.done ? now : undefined,
        createdAt: now,
        updatedAt: now + i,
      }))
      await commit([...get().todos, ...added])
      return added.length
    },

    // Daily ones are never cleared: they come back tomorrow.
    clearDone: async () => {
      await commit(get().todos.filter((t) => t.doneAt === undefined || t.daily))
    },

    renew: async () => {
      const todos = get().todos
      const next = renewDaily(todos)
      if (next !== todos) await commit(next)
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
      await commit(renewDaily(todos))
    },
  }
})
