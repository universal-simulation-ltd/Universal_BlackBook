import { create } from 'zustand'
import { newId } from '../lib/id'
import { hasLocation, type Location } from '../lib/geo'
import { loadPlaces, savePlaces } from '../lib/store'
import type { Place } from '../lib/places'
import { useGoTab } from './searchStore'

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
  /** A new place's name, typed into the tab's search first ("Add “…”"). */
  prefillName: string | null
  init: () => Promise<void>
  setTagFilter: (tagIds: string[]) => void
  edit: (id: string | null) => void
  startPlace: (name: string) => void
  save: (draft: PlaceDraft) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Undo a delete: the place as it was. */
  restore: (place: Place) => Promise<void>
  setPinned: (id: string, pinned: boolean) => Promise<void>
  /** Link or unlink a person (2026-11-19). Saves at once, as a note's links do. */
  setContact: (id: string, contactId: string, on: boolean) => Promise<void>
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
    startPlace: (name) => set({ editing: 'new', prefillName: name }),

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
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const places = existing ? get().places.map((p) => (p.id === place.id ? place : p)) : [...get().places, place]
      // As a new contact: a tagged one lands the tab on its tags, an untagged
      // one clears a filter that would hide it.
      if (!existing && (place.tagIds.length > 0 || get().tagFilter.length > 0)) set({ tagFilter: place.tagIds })
      set({ editing: null })
      await commit(places)
    },

    remove: async (id) => {
      set((s) => ({ editing: s.editing === id ? null : s.editing }))
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
      set({ editing: null, loaded: true })
      await commit(places)
    },
  }
})

/** Open a place from anywhere: its form lives on the Places tab, so go there first. */
export function openPlace(id: string) {
  useGoTab.getState().go('places')
  usePlaceStore.getState().edit(id)
}
