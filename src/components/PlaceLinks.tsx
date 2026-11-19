import { useState } from 'react'
import { placeWhere, type Place } from '../lib/places'
import { preview, type Note } from '../lib/notes'
import { useBookStore } from '../stores/bookStore'
import { useNoteStore } from '../stores/noteStore'
import { openPlace, usePlaceStore } from '../stores/placeStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useT } from '../i18n'
import { IconNote, IconPerson, IconPlace } from '../native/icons'
import { LinkedRows, LinkPicker } from './Links'
import { btnGhost } from './ui'

/**
 * Places linked to people and notes, both ways (James, 2026-11-19: "Both
 * ways, like notes"). A place keeps the people linked to it
 * (`Place.contactIds`); a note keeps the places it is about
 * (`Note.placeIds`). Each side shows the other: a place's form its people and
 * notes, a person's view their places, a note its places.
 */

function setNotePlace(noteId: string, placeId: string, on: boolean) {
  const n = useNoteStore.getState().notes.find((x) => x.id === noteId)
  if (!n) return
  const ids = new Set(n.placeIds ?? [])
  if (on === ids.has(placeId)) return
  if (on) ids.add(placeId)
  else ids.delete(placeId)
  void useNoteStore.getState().patch(noteId, { placeIds: ids.size ? [...ids] : undefined })
}

const noteTitle = (n: Note, untitled: string) => n.title || preview(n) || untitled

/**
 * On a place's form: the people and the notes linked to it, and a button to
 * link more of each. `onLeave` closes the form before a person or note opens
 * over it.
 */
export function PlaceLinks({ place, onLeave }: { place: Place; onLeave: () => void }) {
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const notes = useNoteStore((s) => s.notes)
  const notesOn = useSettingsStore((s) => s.notes)
  const setContact = usePlaceStore((s) => s.setContact)
  const [picking, setPicking] = useState<'people' | 'notes' | null>(null)
  const byId = new Map(contacts.map((c) => [c.id, c]))
  const people = (place.contactIds ?? []).map((id) => byId.get(id)).filter((c) => c !== undefined)
  const linkedNotes = notes.filter((n) => n.placeIds?.includes(place.id))
  const name = place.name || t('c.unnamed')
  return (
    <div className="space-y-4">
      <LinkedRows
        heading={t('nlink.contacts_label')}
        icon={<IconPerson />}
        items={people.map((c) => ({ id: c.id, title: c.name || t('c.unnamed'), sub: c.company || c.email || c.phone }))}
        onOpen={(id) => {
          onLeave()
          useBookStore.getState().view(id)
        }}
        onLink={(id, on) => void setContact(place.id, id, on)}
      />
      {notesOn && (
        <LinkedRows
          heading={t('nlink.linked_notes')}
          icon={<IconNote />}
          items={linkedNotes.map((n) => ({ id: n.id, title: noteTitle(n, t('c.untitled')) }))}
          onOpen={(id) => {
            onLeave()
            useNoteStore.getState().view(id)
          }}
          onLink={(id, on) => setNotePlace(id, place.id, on)}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnGhost} onClick={() => setPicking('people')}>
          {t('nlink.contact')}
        </button>
        {notesOn && (
          <button type="button" className={btnGhost} onClick={() => setPicking('notes')}>
            {t('plink.note')}
          </button>
        )}
      </div>
      {picking === 'people' && (
        <LinkPicker
          title={t('nlink.contact')}
          backLabel={name}
          items={contacts
            .filter((c) => !c.listOnly || place.contactIds?.includes(c.id))
            .map((c) => ({ id: c.id, title: c.name || t('c.unnamed'), sub: c.company || c.email }))}
          linked={new Set(place.contactIds ?? [])}
          onToggle={(id, on) => void setContact(place.id, id, on)}
          onClose={() => setPicking(null)}
          searchLabel={t('nlink.search')}
          emptyText={t('nlink.none')}
        />
      )}
      {picking === 'notes' && (
        <LinkPicker
          title={t('plink.note')}
          backLabel={name}
          items={notes.map((n) => ({ id: n.id, title: noteTitle(n, t('c.untitled')) }))}
          linked={new Set(linkedNotes.map((n) => n.id))}
          onToggle={(id, on) => setNotePlace(id, place.id, on)}
          onClose={() => setPicking(null)}
          searchLabel={t('plink.search_notes')}
          emptyText={t('plink.no_notes')}
        />
      )}
    </div>
  )
}

/** On a person's view: the places linked to them. Nothing when there are none, or the tab is off. */
export function LinkedPlaces({ contactId }: { contactId: string }) {
  const t = useT()
  const places = usePlaceStore((s) => s.places)
  const placesOn = useSettingsStore((s) => s.places)
  const setContact = usePlaceStore((s) => s.setContact)
  if (!placesOn) return null
  const linked = places.filter((p) => p.contactIds?.includes(contactId))
  return (
    <LinkedRows
      heading={t('plink.places_label')}
      icon={<IconPlace />}
      items={linked.map((p) => ({ id: p.id, title: p.name || t('c.unnamed'), sub: placeWhere(p, t.locale) }))}
      onOpen={(id) => {
        useBookStore.getState().view(null)
        openPlace(id)
      }}
      onLink={(id, on) => void setContact(id, contactId, on)}
    />
  )
}

/** On a note: the places it is linked to. `onLeave` closes the note before a place opens. */
export function NoteLinkedPlaces({ note, onLeave }: { note: Note; onLeave: () => void }) {
  const t = useT()
  const places = usePlaceStore((s) => s.places)
  const placesOn = useSettingsStore((s) => s.places)
  if (!placesOn) return null
  const byId = new Map(places.map((p) => [p.id, p]))
  const linked = (note.placeIds ?? []).map((id) => byId.get(id)).filter((p) => p !== undefined)
  return (
    <LinkedRows
      heading={t('plink.places_label')}
      icon={<IconPlace />}
      items={linked.map((p) => ({ id: p.id, title: p.name || t('c.unnamed'), sub: placeWhere(p, t.locale) }))}
      onOpen={(id) => {
        onLeave()
        openPlace(id)
      }}
      onLink={(id, on) => setNotePlace(note.id, id, on)}
    />
  )
}

/** A note's "Link to a place" sheet: tick the places it is about. */
export function NotePlacePicker({ note, onClose }: { note: Note; onClose: () => void }) {
  const t = useT()
  const places = usePlaceStore((s) => s.places)
  return (
    <LinkPicker
      title={t('plink.place')}
      backLabel={note.title || t('c.untitled')}
      items={places.map((p) => ({ id: p.id, title: p.name || t('c.unnamed'), sub: placeWhere(p, t.locale) }))}
      linked={new Set(note.placeIds ?? [])}
      onToggle={(id, on) => setNotePlace(note.id, id, on)}
      onClose={onClose}
      searchLabel={t('plink.search_places')}
      emptyText={places.length ? t('plink.no_places') : t('place.none')}
    />
  )
}
