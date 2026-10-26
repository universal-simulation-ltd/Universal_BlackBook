import { newId } from '../lib/id'
import { formatBirthday } from '../lib/birthday'
import { fromContact, fromNote, fromTodo, tagsForTodo, withDue, type Moved, type MoveKind, type MoveWords } from '../lib/move'
import type { Contact } from '../lib/types'
import type { Note } from '../lib/notes'
import type { Todo } from '../lib/todos'
import type { Translator } from '../i18n'
import { useBookStore } from './bookStore'
import { useNoteStore } from './noteStore'
import { useSettingsStore } from './settingsStore'
import { useTodoStore } from './todoStore'

/**
 * Move picked contacts, notes or to-dos to another kind (lib/move.ts says how
 * each is read): the new ones are made, the originals deleted, and what comes
 * back is what Undo needs to put it all as it was.
 */
export interface MoveUndo {
  from: MoveKind
  to: MoveKind
  originals: Contact[] | Note[] | Todo[]
  created: string[]
}

function words(t: Translator): MoveWords {
  return {
    untitled: t('c.untitled'),
    birthday: (date) => t('move.birthday', { date }),
    due: (date) => t('move.due', { date }),
    formatBirthday: (v) => formatBirthday(v, t.locale),
    formatDay: (iso) => new Date(`${iso}T12:00`).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

export async function moveItems(from: MoveKind, to: MoveKind, ids: string[], t: Translator): Promise<MoveUndo | null> {
  if (from === to || ids.length === 0) return null
  await Promise.all([useBookStore.getState().init(), useTodoStore.getState().init(), useNoteStore.getState().init()])
  const w = words(t)
  const picked = new Set(ids)

  let originals: Contact[] | Note[] | Todo[]
  let moved: Moved[]
  if (from === 'contacts') {
    const xs = useBookStore.getState().contacts.filter((c) => picked.has(c.id))
    originals = xs
    moved = xs.map((c) => fromContact(c, w))
  } else if (from === 'notes') {
    const xs = useNoteStore.getState().notes.filter((n) => picked.has(n.id))
    const templates = new Map(useNoteStore.getState().templates.map((x) => [x.id, x]))
    originals = xs
    moved = xs.map((n) => fromNote(n, n.templateId ? templates.get(n.templateId) : undefined, w))
  } else {
    const xs = useTodoStore.getState().todos.filter((x) => picked.has(x.id))
    originals = xs
    moved = xs.map((x) => fromTodo(x, w))
  }
  if (moved.length === 0) return null

  const now = Date.now()
  let created: string[]
  if (to === 'contacts') {
    const contacts: Contact[] = moved.map((m, i) => ({
      id: newId(),
      name: m.title.trim(),
      email: '',
      phone: '',
      tagIds: m.tagIds,
      notes: withDue(m, w),
      createdAt: now,
      updatedAt: now + i,
    }))
    await useBookStore.getState().restoreContacts(contacts)
    created = contacts.map((c) => c.id)
  } else if (to === 'notes') {
    const notes: Note[] = moved.map((m, i) => ({
      id: newId(),
      title: m.title.trim(),
      details: withDue(m, w),
      ...(m.location ? { location: m.location } : {}),
      createdAt: now,
      updatedAt: now + i,
    }))
    await useNoteStore.getState().restoreMany(notes)
    useSettingsStore.getState().set({ notes: true })
    created = notes.map((n) => n.id)
  } else {
    const tags = useBookStore.getState().tags
    const todos: Todo[] = moved.map((m, i) => ({
      id: newId(),
      title: m.title.trim(),
      details: m.details,
      tagIds: tagsForTodo(m.tagIds, tags),
      createdAt: now,
      updatedAt: now + i,
    }))
    await useTodoStore.getState().replace([...useTodoStore.getState().todos, ...todos])
    useSettingsStore.getState().set({ todos: true })
    created = todos.map((x) => x.id)
  }

  await remove(from, ids)
  return { from, to, originals, created }
}

async function remove(kind: MoveKind, ids: string[]) {
  if (kind === 'contacts') await useBookStore.getState().removeContacts(ids)
  else if (kind === 'notes') await useNoteStore.getState().removeMany(ids)
  else {
    const gone = new Set(ids)
    await useTodoStore.getState().replace(useTodoStore.getState().todos.filter((x) => !gone.has(x.id)))
  }
}

/** Undo: the new ones gone, the originals back as they were. */
export async function undoMove(u: MoveUndo) {
  await remove(u.to, u.created)
  if (u.from === 'contacts') await useBookStore.getState().restoreContacts(u.originals as Contact[])
  else if (u.from === 'notes') await useNoteStore.getState().restoreMany(u.originals as Note[])
  else {
    const here = new Set(useTodoStore.getState().todos.map((x) => x.id))
    const back = (u.originals as Todo[]).filter((x) => !here.has(x.id))
    await useTodoStore.getState().replace([...useTodoStore.getState().todos, ...back])
  }
}
