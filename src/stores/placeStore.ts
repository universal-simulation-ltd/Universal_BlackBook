import { create } from 'zustand'
import { newId } from '../lib/id'
import { hasLocation, type Location } from '../lib/geo'
import { loadPlaces, savePlaces } from '../lib/store'
import { PLACE_LIMITS, type Place, type PlaceComment } from '../lib/places'
import { useGoTab } from './searchStore'
import { useNoteStore } from './noteStore'

/** What the Places form hands back. */
export interface PlaceDraft {
  id?: string
  name: string
  location?: Location
  phone: string
  website: string
  details: string
  tagIds: string[]
}

/**
 * The Places tab's list (lib/places.ts), its own store as the To-do tab's is.
 * Every change rewrites the whole list to disk: one record (lib/store.ts
 * 'places'), so no DB_VERSION bump.
 */
interface PlaceState {
  places: Place[]
  loaded: boolean
  /** Which tags the tab is filtered to. OR, like the contact list. */
  tagFilter: string[]
  /** 'new', a place's id, or null — the form is open on it. */
  editing: string | null
  /**
   * A place's id, or null — its page is open (2026-11-20): what it is, its
   * comments, and the people and notes linked to it. Fine-tune opens the
   * form over it; saving or closing the form comes back to it.
   */
  viewing: string | null
  /**
   * The place just added, while its page is still open (2026-11-20, "more
   * like the people form"): the page shows its name box and notes, and a new
   * place left empty is not kept when the page closes.
   */
  fresh: string | null
  /** A new place's name, typed into the tab's search first ("Add “…”"). */
  prefillName: string | null
  init: () => Promise<void>
  setTagFilter: (tagIds: string[]) => void
  edit: (id: string | null) => void
  view: (id: string | null) => void
  startPlace: (name: string) => void
  /** Add a place now and open its page, as a new person is (Add new, the phone's +). */
  create: (name?: string) => Promise<string>
  /** Change some of a place's fields from its page. Saves at once. */
  patch: (id: string, fields: Partial<Pick<Place, 'name' | 'location' | 'phone' | 'website' | 'details'>>) => Promise<void>
  /** Close a place's page. A new place left empty goes. */
  closePage: () => Promise<void>
  save: (draft: PlaceDraft) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Undo a delete: the place as it was. */
  restore: (place: Place) => Promise<void>
  setPinned: (id: string, pinned: boolean) => Promise<void>
  /** Link or unlink a person (2026-11-19). Saves at once, as a note's links do. */
  setContact: (id: string, contactId: string, on: boolean) => Promise<void>
  /** Add a comment (2026-11-20). Saves at once. Returns it, or null for an empty one. */
  addComment: (id: string, text: string) => Promise<PlaceComment | null>
  /** Delete a comment. Saves at once. */
  removeComment: (id: string, commentId: string) => Promise<void>
  /** Undo a comment's delete: it goes back as it was. */
  restoreComment: (id: string, comment: PlaceComment) => Promise<void>
  /** A tag was deleted: nothing may go on pointing at it. */
  dropTag: (tagId: string) => Promise<void>
  /** Undo a tag's delete: it goes back on these places. */
  addTag: (ids: string[], tagId: string) => Promise<void>
  /** The vault's or a backup file's copy (or a merge of it) becomes this device's. */
  replace: (places: Place[]) => Promise<void>
}

export const usePlaceStore = create<PlaceState>((set, get) => {
  const commit = async (places: Place[]) => {
    set({ places })
    await savePlaces(places)
  }

  return {
    places: [],
    loaded: false,
    tagFilter: [],
    editing: null,
    viewing: null,
    fresh: null,
    prefillName: null,

    init: async () => {
      if (get().loaded) return
      const places = await loadPlaces()
      // A vault adopted while that read was in flight is newer than what it read.
      if (get().loaded) return
      set({ places, loaded: true })
    },

    setTagFilter: (tagFilter) => set({ tagFilter }),
    edit: (editing) => set({ editing, prefillName: null }),
    view: (viewing) => set({ viewing }),
    startPlace: (name) => void get().create(name),

    create: async (name = '') => {
      const now = Date.now()
      const filter = get().tagFilter
      const place: Place = { id: newId(), name: name.trim(), phone: '', website: '', details: '', tagIds: [...filter], createdAt: now, updatedAt: now }
      set({ editing: null, viewing: place.id, fresh: place.id, prefillName: null })
      await commit([...get().places, place])
      return place.id
    },

    patch: async (id, fields) => {
      const now = Date.now()
      await commit(
        get().places.map((p) => {
          if (p.id !== id) return p
          const next: Place = { ...p, ...fields, updatedAt: now }
          if ('location' in fields) {
            // Only a town or finer is worth keeping (lib/geo.ts), as in save().
            const loc = hasLocation(fields.location) ? { ...fields.location } : undefined
            if (loc) delete loc.place
            if (loc) next.location = loc
            else delete next.location
          }
          return next
        }),
      )
    },

    closePage: async () => {
      const { viewing, fresh } = get()
      set({ viewing: null, fresh: null })
      if (!viewing || viewing !== fresh) return
      const p = get().places.find((x) => x.id === viewing)
      if (p && isEmptyPlace(p)) await commit(get().places.filter((x) => x.id !== viewing))
    },

    save: async (draft) => {
      const now = Date.now()
      const existing = draft.id ? get().places.find((p) => p.id === draft.id) : undefined
      // Only a town or finer is worth keeping, as on a contact (lib/geo.ts).
      const location = hasLocation(draft.location) ? { ...draft.location } : undefined
      if (location) delete location.place
      const place: Place = {
        id: existing?.id ?? newId(),
        name: draft.name.trim(),
        ...(location ? { location } : {}),
        phone: draft.phone.trim(),
        website: draft.website.trim(),
        details: draft.details.trim(),
        tagIds: draft.tagIds,
        ...(existing?.pinnedAt ? { pinnedAt: existing.pinnedAt } : {}),
        // Links are made and broken on their own (setContact), never by the form.
        ...(existing?.contactIds?.length ? { contactIds: existing.contactIds } : {}),
        // Comments too (addComment / removeComment).
        ...(existing?.comments?.length ? { comments: existing.comments } : {}),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const places = existing ? get().places.map((p) => (p.id === place.id ? place : p)) : [...get().places, place]
      // As a new contact: a tagged one lands the tab on its tags, an untagged
      // one clears a filter that would hide it.
      if (!existing && (place.tagIds.length > 0 || get().tagFilter.length > 0)) set({ tagFilter: place.tagIds })
      // A new place opens on its page, ready for a comment and its people.
      set({ editing: null, ...(existing ? {} : { viewing: place.id }) })
      await commit(places)
    },

    remove: async (id) => {
      set((s) => ({ editing: s.editing === id ? null : s.editing, viewing: s.viewing === id ? null : s.viewing, fresh: s.fresh === id ? null : s.fresh }))
      await commit(get().places.filter((p) => p.id !== id))
    },

    restore: async (place) => {
      if (get().places.some((p) => p.id === place.id)) return
      await commit([...get().places, { ...place, updatedAt: Date.now() }])
    },

    setPinned: async (id, pinned) => {
      const now = Date.now()
      await commit(
        get().places.map((p) => {
          if (p.id !== id) return p
          const { pinnedAt: _p, ...rest } = p
          void _p
          return { ...rest, ...(pinned ? { pinnedAt: now } : {}), updatedAt: now }
        }),
      )
    },

    setContact: async (id, contactId, on) => {
      const now = Date.now()
      await commit(
        get().places.map((p) => {
          if (p.id !== id) return p
          const ids = new Set(p.contactIds ?? [])
          if (on === ids.has(contactId)) return p
          if (on) ids.add(contactId)
          else ids.delete(contactId)
          const { contactIds: _c, ...rest } = p
          void _c
          return { ...rest, ...(ids.size ? { contactIds: [...ids] } : {}), updatedAt: now }
        }),
      )
    },

    addComment: async (id, text) => {
      const body = text.trim().slice(0, PLACE_LIMITS.comment)
      const place = get().places.find((p) => p.id === id)
      if (!body || !place) return null
      const now = Date.now()
      const comment: PlaceComment = { id: newId(), text: body, at: now }
      const comments = [...(place.comments ?? []), comment].slice(-PLACE_LIMITS.comments)
      await commit(get().places.map((p) => (p.id === id ? { ...p, comments, updatedAt: now } : p)))
      return comment
    },

    removeComment: async (id, commentId) => {
      const now = Date.now()
      await commit(
        get().places.map((p) => {
          if (p.id !== id || !p.comments?.some((c) => c.id === commentId)) return p
          const left = p.comments.filter((c) => c.id !== commentId)
          const { comments: _c, ...rest } = p
          void _c
          return { ...rest, ...(left.length ? { comments: left } : {}), updatedAt: now }
        }),
      )
    },

    restoreComment: async (id, comment) => {
      const place = get().places.find((p) => p.id === id)
      if (!place || place.comments?.some((c) => c.id === comment.id)) return
      const comments = [...(place.comments ?? []), comment].sort((a, b) => a.at - b.at)
      await commit(get().places.map((p) => (p.id === id ? { ...p, comments, updatedAt: Date.now() } : p)))
    },

    dropTag: async (tagId) => {
      set((s) => ({ tagFilter: s.tagFilter.filter((x) => x !== tagId) }))
      if (!get().places.some((p) => p.tagIds.includes(tagId))) return
      const now = Date.now()
      await commit(get().places.map((p) => (p.tagIds.includes(tagId) ? { ...p, tagIds: p.tagIds.filter((x) => x !== tagId), updatedAt: now } : p)))
    },

    addTag: async (ids, tagId) => {
      const on = new Set(ids)
      const now = Date.now()
      await commit(get().places.map((p) => (on.has(p.id) && !p.tagIds.includes(tagId) ? { ...p, tagIds: [...p.tagIds, tagId], updatedAt: now } : p)))
    },

    replace: async (places) => {
      set((s) => ({ editing: null, loaded: true, viewing: s.viewing && places.some((p) => p.id === s.viewing) ? s.viewing : null }))
      await commit(places)
    },
  }
})

/**
 * Nothing typed, picked or linked: a new place like this is not kept. Notes
 * link to places from their side, so a place a note points at stays.
 */
export function isEmptyPlace(p: Place): boolean {
  return (
    !p.name.trim() &&
    !hasLocation(p.location) &&
    !p.phone.trim() &&
    !p.website.trim() &&
    !p.details.trim() &&
    !p.comments?.length &&
    !p.contactIds?.length &&
    !useNoteStore.getState().notes.some((n) => n.placeIds?.includes(p.id))
  )
}

/** Open a place's page from anywhere: it lives on the Places tab, so go there first. */
export function openPlace(id: string) {
  useGoTab.getState().go('places')
  usePlaceStore.getState().view(id)
}
