import { create } from 'zustand'
import type { Contact, Tag } from '../lib/types'
import { DEFAULT_VIEW, EMPTY_QUERY, UNTAGGED, viewOf, type Query, type View } from '../lib/filter'
import { newId } from '../lib/id'
import { nextSwatch, SWATCHES } from '../lib/palette'
import {
  clearDefaultView as dbClearDefaultView,
  deleteTag as dbDeleteTag,
  deleteContact as dbDeleteContact,
  loadDefaultView,
  loadSeeded,
  loadTags,
  loadContacts,
  markSeeded,
  putTag,
  putContact,
  replaceAll,
  saveDefaultView as dbSaveDefaultView,
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
  /**
   * The filters and order the app opened on, and will open on again.
   *
   * Device-local (lib/store.ts, the 'view' key) and never part of the vault.
   * Held in state as well as on disk so the filter panel can say what it is and
   * tell whether what is on screen differs from it.
   */
  defaultView: View
  /** Contact whose full-screen view is open, if any. */
  viewing: string | null
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
  /** Everything off — the search box included. "Clear everything". */
  resetQuery: () => void
  /** Back to the view this app opens on, whatever that has been set to. */
  applyDefaultView: () => void
  /** Remember what is on screen as the view the app opens on. */
  saveDefaultView: () => Promise<void>
  /** Forget a saved view: back to opening on Name A–Z with no tag filter. */
  forgetDefaultView: () => Promise<void>
  /** Open this contact's full-screen view, or close it with null. */
  view: (id: string | null) => void
  edit: (id: string | null) => void
  /** Open the blank form with these values already in it. */
  startWith: (draft: ContactDraft) => void
  stashDraft: (draft: ContactDraft) => void
  clearStash: () => void
  saveContact: (draft: ContactDraft) => Promise<void>
  /** Show or hide this person in the birthdays view. Their date is untouched. */
  setBirthdayHidden: (id: string, hidden: boolean) => Promise<void>
  /** Show or hide this person in the main list. Search still finds them. */
  setListHidden: (id: string, hidden: boolean) => Promise<void>
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

/**
 * The two tags a brand new book starts with (owner's request, 2026-09-11).
 *
 * ⚠️ This app used to seed NOTHING, deliberately, and the reasoning against
 * seeding still holds for a long list: six invented starters are an app telling
 * somebody how it thinks they should file their friends, and every one of them
 * has to be read and dismissed before the first real tag can be made. Two is a
 * different proposition — they are the two this book is for ("the people who
 * matter" and "the things worth remembering"), they demonstrate what a tag IS,
 * and an empty tag list is its own kind of unhelpful: the filter panel has
 * nothing in it and the contact form's picker looks broken.
 *
 * They are ordinary tags from the moment they exist: rename them, recolour
 * them, delete them. Nothing in the app treats them specially and nothing
 * brings them back — see `loadSeeded` for the marker that guarantees that.
 */
const SEED_TAGS = ['Important People', 'Important Notes'] as const

/** The starting tags, as records. Fixed swatches so the pair always contrast. */
function seedTags(): Tag[] {
  return SEED_TAGS.map((name, i) => ({ id: newId(), name, colour: SWATCHES[i].key }))
}

export const useBookStore = create<BookState>((set, get) => ({
  contacts: [],
  tags: [],
  loaded: false,
  query: EMPTY_QUERY,
  defaultView: DEFAULT_VIEW,
  viewing: null,
  editing: null,
  stashed: null,
  prefill: null,
  notice: null,

  init: async () => {
    if (get().loaded) return
    const [contacts, loadedTags, saved, seeded] = await Promise.all([
      loadContacts(),
      loadTags(),
      loadDefaultView(),
      loadSeeded(),
    ])

    // The starting tags, once per device and only into a book with nothing in
    // it at all. A book that already holds contacts or tags is somebody's, and
    // dropping two tags into it — on an upgrade, or after a vault was adopted
    // — would be the app adding to their data uninvited.
    let tags = loadedTags
    if (!seeded) {
      await markSeeded()
      if (contacts.length === 0 && loadedTags.length === 0) {
        tags = seedTags()
        await Promise.all(tags.map(putTag))
      }
    }

    // A saved view can name a tag that has since been deleted. Dropping the
    // dangling ids is what stops the app opening on a filter that matches
    // nobody, with no lit chip in the panel to explain why.
    const known = new Set(tags.map((t) => t.id))
    const defaultView: View = saved
      ? { sort: saved.sort, tagIds: saved.tagIds.filter((id) => id === UNTAGGED || known.has(id)) }
      : DEFAULT_VIEW

    set({ contacts, tags, defaultView, query: { ...EMPTY_QUERY, ...defaultView }, loaded: true })
  },

  setQuery: (patch) => set((s) => ({ query: { ...s.query, ...patch } })),
  resetQuery: () => set({ query: EMPTY_QUERY }),
  applyDefaultView: () => set((s) => ({ query: { ...EMPTY_QUERY, ...s.defaultView } })),

  saveDefaultView: async () => {
    const defaultView = viewOf(get().query)
    set({ defaultView })
    await dbSaveDefaultView(defaultView)
  },

  forgetDefaultView: async () => {
    set({ defaultView: DEFAULT_VIEW })
    await dbClearDefaultView()
  },

  // Opening somebody's card closes any form that was open on somebody else —
  // two dialogs about two different people, with the one underneath holding
  // unsaved edits, is a state nothing good comes of.
  view: (id) => set((s) => ({ viewing: id, editing: id === null ? s.editing : null })),
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
      hideFromList: existing?.hideFromList,
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

  setListHidden: async (id, hidden) => {
    const existing = get().contacts.find((c) => c.id === id)
    if (!existing) return
    const next: Contact = { ...existing, hideFromList: hidden ? true : undefined, updatedAt: Date.now() }
    set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? next : c)) }))
    await putContact(next)
  },

  removeContact: async (id) => {
    set((s) => ({
      contacts: s.contacts.filter((c) => c.id !== id),
      editing: s.editing === id ? null : s.editing,
      // The full-screen view goes with them. Deleting somebody from the form
      // that opened on top of their own card must not leave that card on
      // screen showing a person the book no longer holds.
      viewing: s.viewing === id ? null : s.viewing,
    }))
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
    // The saved opening view is stripped of it too, and on disk — otherwise
    // the app would go on opening on a tag that no longer exists, with nothing
    // in the panel lit to say what it was filtering by.
    const defaultView = get().defaultView
    const inDefault = defaultView.tagIds.includes(id)
    const nextDefault: View = inDefault
      ? { ...defaultView, tagIds: defaultView.tagIds.filter((x) => x !== id) }
      : defaultView
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      contacts,
      query: { ...s.query, tagIds: s.query.tagIds.filter((x) => x !== id) },
      defaultView: nextDefault,
    }))
    if (inDefault) await dbSaveDefaultView(nextDefault)
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
      // `viewing: null` — the card on screen belongs to a book that has just
      // been thrown away, and the person on it may not be in the new one.
      set({ contacts, tags, notice, query: EMPTY_QUERY, viewing: null })
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
