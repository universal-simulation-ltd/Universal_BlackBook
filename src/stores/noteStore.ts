import { create } from 'zustand'
import { newId } from '../lib/id'
import type { Note } from '../lib/notes'
import { loadPages, loadTemplates, loadTemplatesSeeded, markTemplatesSeeded, savePages, saveTemplates } from '../lib/store'
import { bookTemplate, retireFields, type NoteTemplate } from '../lib/templates'
import { currentT } from '../i18n'

/** What the note page hands back. */
export interface NoteDraft {
  id?: string
  title: string
  details: string
  /** A new note's template; an existing note keeps its own. */
  templateId?: string
  fields?: Record<string, string>
}

/**
 * The Notes tab's notes — see lib/notes.ts. Its own store, like todoStore;
 * the vault carries it (syncStore) and so does a backup file (lib/backup.ts).
 * Every change rewrites the whole list to disk (lib/store.ts 'pages').
 */
interface NoteState {
  notes: Note[]
  loaded: boolean
  /** A note's id, or null — its clean view is open (2026-10-25). */
  viewing: string | null
  /** 'new', a note's id, or null — the note's form (Fine-tune) is open on it. */
  editing: string | null
  /** What the Notes tab's search box holds. Never remembered. */
  query: string
  /** A new note's title, typed into the search first ("Add “…”"). */
  prefillTitle: string | null
  init: () => Promise<void>
  edit: (id: string | null) => void
  /** Open a note's view, or close it with null. */
  view: (id: string | null) => void
  /** A new note, its title already in it. */
  startNote: (title: string) => void
  setQuery: (query: string) => void
  save: (draft: NoteDraft) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Pin these notes to the top of the list, or unpin them. */
  setPinned: (ids: string[], pinned: boolean) => Promise<void>
  /** Delete several at once (selection, swipe). */
  removeMany: (ids: string[]) => Promise<void>
  /** Undo a delete: the notes as they were. */
  restoreMany: (notes: Note[]) => Promise<void>
  /** Change some fields of one note (its reminders, links, place) without the page. */
  patch: (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  /** The vault's or a backup file's copy (or a merge of it) becomes this device's. */
  replace: (notes: Note[]) => Promise<void>
  /** Notes → Import: these become new notes. `createdAt` is kept when the file said. */
  addMany: (drafts: { title: string; details: string; createdAt?: number }[]) => Promise<number>
  /** Note templates (lib/templates.ts) — the book's, synced and in backups. */
  templates: NoteTemplate[]
  /** The Notes tab's filter: a template id, or null for all. Never remembered. */
  templateFilter: string | null
  setTemplateFilter: (id: string | null) => void
  /** A new note from a template ('new' with this template). */
  newTemplate: string | null
  startFrom: (templateId: string | null) => void
  /** + / Add new on the Notes tab: the choice of template first when there are any. */
  choosing: boolean
  newNote: () => void
  stopChoosing: () => void
  saveTemplate: (template: NoteTemplate) => Promise<void>
  /** Delete a template; resolves to what Undo needs (the template and the notes as they were). */
  removeTemplate: (id: string) => Promise<{ template: NoteTemplate; notes: Note[] } | null>
  restoreTemplate: (undo: { template: NoteTemplate; notes: Note[] }) => Promise<void>
  replaceTemplates: (templates: NoteTemplate[]) => Promise<void>
}

export const useNoteStore = create<NoteState>((set, get) => {
  const commit = async (notes: Note[]) => {
    set({ notes })
    await savePages(notes)
  }

  return {
    notes: [],
    loaded: false,
    viewing: null,
    editing: null,
    templates: [],
    templateFilter: null,
    newTemplate: null,
    choosing: false,
    query: '',
    prefillTitle: null,

    init: async () => {
      if (get().loaded) return
      const [notes, stored, seeded] = await Promise.all([loadPages(), loadTemplates(), loadTemplatesSeeded()])
      // A vault adopted while that read was in flight is newer than it.
      if (get().loaded) return
      // The example "Book" template, once per device (James, 2026-10-25:
      // "ship one example template the user can delete"). Its id is fixed,
      // so two devices that each made it end up with one.
      let templates = stored
      if (!seeded) {
        await markTemplatesSeeded()
        if (!templates.some((t) => t.id === 'tpl-book')) {
          const t = currentT()
          templates = [...templates, bookTemplate({ name: t('tpl.book'), title: t('tpl.book_title'), author: t('tpl.book_author'), read: t('tpl.book_read') })]
          await saveTemplates(templates)
        }
      }
      set({ notes, templates, loaded: true })
    },

    edit: (editing) => set({ editing, prefillTitle: null, newTemplate: null }),
    startFrom: (newTemplate) => set({ editing: 'new', prefillTitle: null, newTemplate, choosing: false }),
    newNote: () => (get().templates.length ? set({ choosing: true }) : get().edit('new')),
    stopChoosing: () => set({ choosing: false }),
    setTemplateFilter: (templateFilter) => set({ templateFilter }),
    view: (viewing) => set((s) => ({ viewing, editing: viewing === null ? s.editing : s.editing === 'new' ? null : s.editing })),
    startNote: (title) => set({ editing: 'new', prefillTitle: title }),
    setQuery: (query) => set({ query }),

    save: async (draft) => {
      const now = Date.now()
      const existing = draft.id ? get().notes.find((n) => n.id === draft.id) : undefined
      const title = draft.title.trim()
      const details = draft.details.replace(/\s+$/, '')
      const fields = Object.fromEntries(Object.entries(draft.fields ?? {}).filter(([, v]) => v.trim()))
      const sameFields = JSON.stringify(existing?.fields ?? {}) === JSON.stringify(fields)
      // A new note lands on its own view, as a new contact does; an edited
      // one goes back to the view it was fine-tuned from.
      set({ editing: null })
      // Nothing changed: no new "edited" time, so the order stays put.
      if (existing && existing.title === title && existing.details === details && sameFields) return
      // `...existing` first: what the page does not edit (reminders, links,
      // place) stays as it was.
      const note: Note = {
        ...existing,
        id: existing?.id ?? newId(),
        title,
        details,
        ...((existing?.templateId ?? draft.templateId) ? { templateId: existing?.templateId ?? draft.templateId } : {}),
        fields: Object.keys(fields).length ? fields : undefined,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await commit(existing ? get().notes.map((n) => (n.id === note.id ? note : n)) : [...get().notes, note])
      if (!existing) set({ viewing: note.id })
    },

    setPinned: async (ids, pinned) => {
      const now = Date.now()
      const pick = new Set(ids)
      await commit(
        get().notes.map((n) => {
          if (!pick.has(n.id) || Boolean(n.pinnedAt) === pinned) return n
          const { pinnedAt: _p, ...rest } = n
          void _p
          return { ...rest, ...(pinned ? { pinnedAt: now } : {}), updatedAt: now }
        }),
      )
    },

    removeMany: async (ids) => {
      const gone = new Set(ids)
      set((s) => ({
        editing: s.editing && gone.has(s.editing) ? null : s.editing,
        viewing: s.viewing && gone.has(s.viewing) ? null : s.viewing,
      }))
      await commit(get().notes.filter((n) => !gone.has(n.id)))
    },

    restoreMany: async (notes) => {
      const here = new Set(get().notes.map((n) => n.id))
      // As they were, edit time and all, so each goes back to its place.
      const back = notes.filter((n) => !here.has(n.id))
      if (back.length) await commit([...get().notes, ...back])
    },

    patch: async (id, patch) => {
      const existing = get().notes.find((n) => n.id === id)
      if (!existing) return
      const note: Note = { ...existing, ...patch, updatedAt: Date.now() }
      await commit(get().notes.map((n) => (n.id === id ? note : n)))
    },

    remove: async (id) => {
      set((s) => ({ editing: s.editing === id ? null : s.editing, viewing: s.viewing === id ? null : s.viewing }))
      await commit(get().notes.filter((n) => n.id !== id))
    },

    saveTemplate: async (template) => {
      const before = get().templates.find((t) => t.id === template.id)
      // Fields taken out of a template take their values into the notes' text.
      if (before) {
        const gone = before.fields.filter((f) => !template.fields.some((x) => x.id === f.id)).map((f) => f.id)
        if (gone.length) {
          const changed = new Map(retireFields(get().notes, before, gone, false).map((n) => [n.id, n]))
          if (changed.size) await commit(get().notes.map((n) => changed.get(n.id) ?? n))
        }
      }
      const next = { ...template, updatedAt: Date.now() }
      const templates = before ? get().templates.map((t) => (t.id === next.id ? next : t)) : [...get().templates, next]
      set({ templates })
      await saveTemplates(templates)
    },

    removeTemplate: async (id) => {
      const tpl = get().templates.find((t) => t.id === id)
      if (!tpl) return null
      const changed = new Map(retireFields(get().notes, tpl, tpl.fields.map((f) => f.id), true).map((n) => [n.id, n]))
      const before = get().notes.filter((n) => changed.has(n.id))
      if (changed.size) await commit(get().notes.map((n) => changed.get(n.id) ?? n))
      const templates = get().templates.filter((t) => t.id !== id)
      set((s) => ({ templates, templateFilter: s.templateFilter === id ? null : s.templateFilter }))
      await saveTemplates(templates)
      return { template: tpl, notes: before }
    },

    restoreTemplate: async ({ template, notes }) => {
      if (!get().templates.some((t) => t.id === template.id)) {
        const templates = [...get().templates, template]
        set({ templates })
        await saveTemplates(templates)
      }
      // The notes as they were before their fields were moved into their text.
      const back = new Map(notes.map((n) => [n.id, { ...n, updatedAt: Date.now() }]))
      if (back.size) await commit(get().notes.map((n) => back.get(n.id) ?? n))
    },

    replaceTemplates: async (templates) => {
      set((s) => ({ templates, templateFilter: templates.some((t) => t.id === s.templateFilter) ? s.templateFilter : null }))
      await saveTemplates(templates)
    },

    addMany: async (drafts) => {
      // From Tune ▸ Import the Notes tab may never have been opened.
      await get().init()
      const now = Date.now()
      // `updatedAt` is NOW, whatever the page's own date: it is what tells the
      // online copy (and signing out) that these are new here.
      const added: Note[] = drafts.map((d, i) => ({
        id: newId(),
        title: d.title,
        details: d.details,
        createdAt: d.createdAt && d.createdAt < now ? d.createdAt : now,
        updatedAt: now + i,
      }))
      await commit([...get().notes, ...added])
      return added.length
    },

    replace: async (notes) => {
      set({ editing: null, viewing: null, loaded: true })
      await commit(notes)
    },
  }
})
