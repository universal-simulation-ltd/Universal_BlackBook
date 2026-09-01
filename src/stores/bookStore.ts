import { create } from 'zustand'
import type { Contact, Tag } from '../lib/types'
import { EMPTY_QUERY, type Query } from '../lib/filter'
import { newId } from '../lib/id'
import { nextSwatch } from '../lib/palette'
import {
  deleteTag as dbDeleteTag,
  deleteContact as dbDeleteContact,
  loadTags,
  loadContacts,
  putTag,
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
  tags: Tag[]
  loaded: boolean
  query: Query
  /** Contact being edited, `'new'` for the blank form, null for neither. */
  editing: string | null
  /**
   * A half-typed NEW contact whose form was closed without saving.
   *
   * In memory only — never written to disk and never pushed to the vault. It
   * survives closing the dialog and nothing else: a reload is a fresh start.
   * See `stashDraft` for why it exists and why it is only for new contacts.
   */
  stashed: ContactDraft | null
  /**
   * A form to open ALREADY FILLED IN — today, only from the phone's own
   * contacts (lib/deviceContacts.ts).
   *
   * Separate from `stashed` although both prefill the same dialog, because
   * they mean opposite things to the person looking at it. A stash is
   * something of THEIRS being handed back, so the form asks before adopting
   * it. A prefill is something they just chose from a picker two taps ago,
   * so asking "did you mean this?" about it would be absurd.
   */
  prefill: ContactDraft | null
  /** Transient banner — import results, mostly. Cleared by the user. */
  notice: string | null

  init: () => Promise<void>
  setQuery: (patch: Partial<Query>) => void
  resetQuery: () => void
  edit: (id: string | null) => void
  /** Open the blank form with these values already in it. */
  startWith: (draft: ContactDraft) => void
  stashDraft: (draft: ContactDraft) => void
  clearStash: () => void
  saveContact: (draft: ContactDraft) => Promise<void>
  /** Show or hide this person in the birthdays view. Their date is untouched. */
  setBirthdayHidden: (id: string, hidden: boolean) => Promise<void>
  removeContact: (id: string) => Promise<void>
  addTag: (name: string) => Promise<Tag | null>
  renameTag: (id: string, name: string) => Promise<void>
  recolourTag: (id: string, colour: string) => Promise<void>
  removeTag: (id: string) => Promise<void>
  importBook: (contacts: Contact[], tags: Tag[], mode: 'merge' | 'replace', notice: string | null) => Promise<void>
  setNotice: (notice: string | null) => void
}

export interface ContactDraft {
  id?: string
  name: string
  email: string
  phone: string
  tagIds: string[]
  birthdate?: string
  notes: string
}

/** Is there anything in this draft worth offering back? */
export function draftIsEmpty(d: ContactDraft): boolean {
  return (
    !d.name.trim() &&
    !d.email.trim() &&
    !d.phone.trim() &&
    !d.notes.trim() &&
    d.tagIds.length === 0 &&
    !d.birthdate
  )
}

export const useBookStore = create<BookState>((set, get) => ({
  contacts: [],
  tags: [],
  loaded: false,
  query: EMPTY_QUERY,
  editing: null,
  stashed: null,
  prefill: null,
  notice: null,

  init: async () => {
    if (get().loaded) return
    const [contacts, tags] = await Promise.all([loadContacts(), loadTags()])
    // No seeding. A new book starts with no tags at all — six invented
    // starters are the app telling somebody how it thinks they should file
    // their friends, and every one of them has to be read and dismissed before
    // the first real tag can be made.
    set({ contacts, tags, loaded: true })
  },

  setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),
  resetQuery: () => set({ query: EMPTY_QUERY }),
  // Closing or opening the form clears any prefill: it belongs to ONE opening
  // of the dialog, and a leftover would silently fill the next person's form
  // with the last one's details.
  edit: (id) => set({ editing: id, prefill: null }),
  startWith: (draft) => set({ prefill: draft, editing: 'new' }),

  /**
   * Keep what was typed when a new-contact form is closed without saving.
   *
   * The failure this exists for: the form is a modal, a click anywhere outside
   * it closes it, and everything typed went in the bin with no warning. That is
   * an easy accident to have while reaching for something on the page behind.
   *
   * Only for NEW contacts, deliberately. An edit of an existing person already
   * has a copy of every field safely on disk, so the worst case there is
   * re-typing one change — whereas a new contact abandoned mid-form is gone
   * entirely. Offering "you were part way through editing Sam" as well would
   * mean deciding what happens when Sam is edited on another device, or
   * deleted, before the stash is picked up. This never has that problem: an
   * unsaved new contact refers to nothing.
   */
  stashDraft: (draft) => {
    if (draftIsEmpty(draft)) return
    set({ stashed: draft })
  },
  clearStash: () => set({ stashed: null }),

  saveContact: async (draft) => {
    const now = Date.now()
    const existing = draft.id ? get().contacts.find((c) => c.id === draft.id) : undefined
    const contact: Contact = {
      id: existing?.id ?? newId(),
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      tagIds: draft.tagIds,
      birthdate: draft.birthdate,
      // ⚠️ Carried from the existing record, never from the draft. The form has
      // no control for it — it is set from the birthdays list — so rebuilding
      // the contact from the draft alone would silently un-hide somebody every
      // time their phone number was corrected.
      hideBirthday: existing?.hideBirthday,
      notes: draft.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    set((s) => ({
      contacts: existing ? s.contacts.map((c) => (c.id === contact.id ? contact : c)) : [...s.contacts, contact],
      editing: null,
      // A saved draft is not an abandoned one. Without this, saving and then
      // reopening the form would offer to restore what was just filed.
      stashed: null,
      prefill: null,
    }))
    await putContact(contact)
  },

  setBirthdayHidden: async (id, hidden) => {
    const existing = get().contacts.find((c) => c.id === id)
    if (!existing) return
    // `undefined` rather than `false` for the shown case, so un-hiding leaves
    // the record exactly as it was before it was ever hidden rather than
    // growing a field that means "normal".
    const next: Contact = { ...existing, hideBirthday: hidden ? true : undefined, updatedAt: Date.now() }
    set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? next : c)) }))
    await putContact(next)
  },

  removeContact: async (id) => {
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id), editing: s.editing === id ? null : s.editing }))
    await dbDeleteContact(id)
  },

  addTag: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    // Case-insensitive duplicate check. Two tags differing only in case are
    // indistinguishable in the list and impossible to tell apart in a filter,
    // so the existing one is returned instead of a second being made.
    const clash = get().tags.find((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (clash) return clash
    const tag: Tag = {
      id: newId(),
      name: trimmed,
      colour: nextSwatch(get().tags.map((t) => t.colour)),
    }
    set((s) => ({ tags: [...s.tags, tag] }))
    await putTag(tag)
    return tag
  },

  renameTag: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const next = get().tags.map((t) => (t.id === id ? { ...t, name: trimmed } : t))
    set({ tags: next })
    const changed = next.find((t) => t.id === id)
    if (changed) await putTag(changed)
  },

  recolourTag: async (id, colour) => {
    const next = get().tags.map((t) => (t.id === id ? { ...t, colour } : t))
    set({ tags: next })
    const changed = next.find((t) => t.id === id)
    if (changed) await putTag(changed)
  },

  removeTag: async (id) => {
    // Deleting a tag must not delete the people carrying it. Every contact is
    // stripped of the id, and each stripped contact is rewritten — a dangling
    // id would render as nothing anyway, but it would come back to life the
    // day some other tag happened to be created with a matching id, and it
    // would travel into every CSV export as a phantom empty cell.
    const touched = get().contacts.filter((c) => c.tagIds.includes(id))
    const contacts = get().contacts.map((c) =>
      c.tagIds.includes(id) ? { ...c, tagIds: c.tagIds.filter((x) => x !== id), updatedAt: Date.now() } : c,
    )
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      contacts,
      query: { ...s.query, tagIds: s.query.tagIds.filter((x) => x !== id) },
    }))
    await dbDeleteTag(id)
    await Promise.all(
      touched.map((t) => {
        const updated = contacts.find((c) => c.id === t.id)
        return updated ? putContact(updated) : Promise.resolve()
      }),
    )
  },

  importBook: async (contacts, tags, mode, notice) => {
    if (mode === 'replace') {
      set({ contacts, tags, notice, query: EMPTY_QUERY })
      await replaceAll(contacts, tags)
      return
    }
    const merged = [...get().contacts, ...contacts]
    set({ contacts: merged, tags, notice })
    await replaceAll(merged, tags)
  },

  setNotice: (notice) => set({ notice }),
}))

export const blankDraft = (): ContactDraft => ({
  name: '',
  email: '',
  phone: '',
  tagIds: [],
  birthdate: undefined,
  notes: '',
})
