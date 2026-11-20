import { useId, useMemo, useState, type FormEvent } from 'react'
import { Button, GrowingTextarea, SelectCheckbox, SelectionBar, useSelection } from '@unisim/sdk'
import { deleteSwipe, pinSwipe, SelectBar, SwipeGroup, SwipeItem, UndoBar, useAskDelete, useHold, useHoldSelect, useUndo, webSelBarWrap } from './SwipeActions'
import { useMove } from './MoveTo'
import { usePhoneKit } from '../native/kit'
import { isList } from '../lib/lists'
import { comparePlaces, matchesPlace, matchesPlaceTags, newestComments, placeWhere, type Place } from '../lib/places'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { usePlaceStore, type PlaceDraft } from '../stores/placeStore'
import { Modal } from './Modal'
import { TagChip, TagDot } from './TagChip'
import { TagPicker } from './TagPicker'
import { TagCombo } from './TagCombo'
import { AddTyped, ListSearch } from './ListSearch'
import { LocationFields } from './LocationFields'
import { Elsewhere } from './Elsewhere'
import { PlaceActions, PlaceDetail } from './PlaceDetail'
import { useNoteStore } from '../stores/noteStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { Contact } from '../lib/types'
import { newLocation } from './currentLocation'
import { useT } from '../i18n'
import { btnDanger, emptyBox, btnGhost, btnPrimary, btnSubtle, BtnKey, inputCls, label, MapGlyph, PlusIcon, tabHeading, textareaCls } from './ui'
import { usePanelStore } from '../stores/panelStore'
import { autoFocusOK } from '../native/kit'
import { phoneScreens } from '../native/shell'
import { saveKeyLabel } from '../lib/saveKey'

/**
 * The Places tab (James, 2026-11-19: "Add a 'Places' tab as well similar to
 * people"): the places you keep, A to Z with the pinned ones first, each with
 * its town and its tags' dots. Tap one to see and change it; swipe right to
 * pin, left to delete (with Undo); hold one to select, then Pin, Move (to
 * People, Notes or To-dos) or Delete. Search covers names, addresses, phone
 * numbers, websites, notes and tags. See lib/places.ts for what a place is.
 */
export function PlacesView() {
  const t = useT()
  const places = usePlaceStore((s) => s.places)
  const loaded = usePlaceStore((s) => s.loaded)
  const editing = usePlaceStore((s) => s.editing)
  const viewing = usePlaceStore((s) => s.viewing)
  const edit = usePlaceStore((s) => s.edit)
  const view = usePlaceStore((s) => s.view)
  const startPlace = usePlaceStore((s) => s.startPlace)
  const tagFilter = usePlaceStore((s) => s.tagFilter)
  const setTagFilter = usePlaceStore((s) => s.setTagFilter)
  const setPinned = usePlaceStore((s) => s.setPinned)
  const remove = usePlaceStore((s) => s.remove)
  const restore = usePlaceStore((s) => s.restore)
  const tags = useBookStore((s) => s.tags)
  const contacts = useBookStore((s) => s.contacts)
  const notes = useNoteStore((s) => s.notes)
  const notesOn = useSettingsStore((s) => s.notes)
  // What each row shows beside its name (2026-11-20): its people, and how
  // many notes are linked to it.
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])
  const noteCounts = useMemo(() => {
    const m = new Map<string, number>()
    if (!notesOn) return m
    for (const n of notes) for (const id of n.placeIds ?? []) m.set(id, (m.get(id) ?? 0) + 1)
    return m
  }, [notes, notesOn])
  const [query, setQuery] = useState('')
  const hintId = useId()
  const undo = useUndo<Place[]>(async (xs) => {
    for (const x of xs) await restore(x)
  })
  const removeManyWithUndo = (xs: Place[]) => {
    if (!xs.length) return
    undo.deleted(xs)
    for (const x of xs) void remove(x.id)
  }
  const removeWithUndo = (x: Place) => removeManyWithUndo([x])
  const kit = usePhoneKit()
  // Select ▸ Move: to People, Notes or To-dos (MoveTo).
  const moveTo = useMove('places')
  // What was typed in the search becomes a new place's name, in the form: a
  // place is worth its address, so the form opens rather than saving a name alone.
  const addTyped = (text: string) => {
    const name = text.trim().replace(/\s+/g, ' ')
    if (!name) return
    startPlace(name)
    setQuery('')
  }

  const byId = useMemo(() => new Map(tags.map((x) => [x.id, x])), [tags])
  // Only tags some place carries: a chip that can only empty the list is not a filter.
  const usedTags = useMemo(() => {
    const used = new Set(places.flatMap((p) => p.tagIds))
    return tags.filter((x) => !isList(x) && used.has(x.id))
  }, [places, tags])
  const activeFilter = tagFilter.filter((id) => usedTags.some((x) => x.id === id))
  const shown = useMemo(
    () =>
      places
        .filter((p) => matchesPlaceTags(p, activeFilter) && matchesPlace(p, query, byId, t.locale))
        .sort((a, b) => comparePlaces(a, b, t.locale)),
    [places, activeFilter, query, byId, t.locale],
  )
  // The phone app's selection: hold a place, then the select bar (the
  // suite's phone rule). The website has tick boxes instead (below).
  const sel = useHoldSelect(shown.map((p) => p.id), Boolean(kit))
  /**
   * The website's way to pick several (the suite rule, "Every list: select
   * several, then act"; @unisim/sdk 0.227), as on Contacts: a tick box on every
   * place, Select all over the list, and once something is ticked the count,
   * Delete selected (asks, then Undo for six seconds), Pin, Move and Clear.
   * Holding a place on a touch screen ticks it.
   */
  const web = !phoneScreens()
  const wsel = useSelection(web ? shown.map((p) => p.id) : [])
  const ticked = web ? shown.filter((p) => wsel.has(p.id)) : []
  const holdTick = useHold((id) => wsel.setMany([id], true))
  const askDelete = useAskDelete(t('psel.delete_title'), (n) => t.plural('psel.delete_body', n))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={phoneScreens() ? 'bb-h1' : tabHeading}>{t('tab_places')}</h1>
          {!phoneScreens() && <p className="text-sm text-slate-500">{t('place.intro')}</p>}
        </div>
        {/* In the phone app the top bar's map and + do these. */}
        {!phoneScreens() && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`${btnGhost} !px-2.5`} onClick={() => usePanelStore.getState().open('map')} aria-label={t('map.title')} title={t('map.title')}>
              <MapGlyph />
            </button>
            <button type="button" className={btnPrimary} onClick={() => edit('new')}>
              <BtnKey>
                <PlusIcon />
              </BtnKey>
              {t('c.add_new')}
            </button>
          </div>
        )}
      </div>

      <ListSearch value={query} onChange={setQuery} label={t('place.search')} filtering={activeFilter.length > 0} onEnter={() => addTyped(query)}>
        {usedTags.length > 0 && (
          <div role="group" aria-label={t('tags.filter_by')}>
            <TagCombo
              options={usedTags}
              isOn={(id) => activeFilter.includes(id)}
              chip={(x) => (
                <TagChip
                  name={x.name}
                  colour={x.colour}
                  pattern={x.pattern}
                  selected={activeFilter.includes(x.id)}
                  onClick={() => setTagFilter(activeFilter.includes(x.id) ? activeFilter.filter((y) => y !== x.id) : [...activeFilter, x.id])}
                />
              )}
              suggestion={(x) => <TagChip name={x.name} colour={x.colour} pattern={x.pattern} />}
              onPick={(id) => setTagFilter([...activeFilter, id])}
              placeholder={t('tags.filter_by')}
              fullLabel={t('tags.show_all')}
            />
            {activeFilter.length > 0 && (
              <button type="button" className={`${btnSubtle} mt-1.5`} onClick={() => setTagFilter([])}>
                {t('c.clear')}
              </button>
            )}
          </div>
        )}
      </ListSearch>
      <AddTyped text={query} onAdd={addTyped} />

      {loaded && places.length === 0 ? (
        <div className={`${emptyBox} px-6 py-14 text-center`}>
          <p className="text-sm text-slate-400">{phoneScreens() ? t('place.none_phone') : t('place.none')}</p>
        </div>
      ) : shown.length === 0 ? (
        <p className={`${emptyBox} px-6 py-8 text-center text-sm text-slate-400`}>
          {query.trim() ? t('place.no_match') : t('place.none_tagged')}
        </p>
      ) : (
        <>
          {web ? (
            <div className={webSelBarWrap(wsel.count)}>
              <SelectionBar
                sel={wsel}
                confirm={askDelete.ask}
                onDelete={(ids) => removeManyWithUndo(shown.filter((p) => ids.includes(p.id)))}
                extra={
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        const pin = !ticked.every((p) => p.pinnedAt)
                        for (const p of ticked) void setPinned(p.id, pin)
                        wsel.clear()
                      }}
                    >
                      {ticked.length > 0 && ticked.every((p) => p.pinnedAt) ? t('todo.unpin') : t('todo.pin')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        moveTo.start(ticked.map((p) => p.id))
                        wsel.clear()
                      }}
                    >
                      {t('sel.move')}
                    </Button>
                  </>
                }
              />
            </div>
          ) : (
          <SelectBar
            select={sel}
            total={shown.length}
            actions={[
              { label: t('todo.pin'), onClick: (ids) => ids.forEach((id) => void setPinned(id, true)) },
              { label: t('sel.move'), onClick: moveTo.start },
              { label: t('c.delete'), danger: true, onClick: (ids) => removeManyWithUndo(shown.filter((p) => ids.includes(p.id))) },
            ]}
          />
          )}
          <SwipeGroup>
            <ul className="max-w-4xl" aria-describedby={hintId}>
              {shown.map((p) => (
                <li
                  key={p.id}
                  className={`border-b border-slate-800/70 ${web ? 'flex items-center gap-1' : ''}`}
                  onTouchStart={web ? holdTick(p.id) : undefined}
                >
                  {web && (
                    <SelectCheckbox
                      checked={wsel.has(p.id)}
                      onChange={() => wsel.toggle(p.id)}
                      label={t('nsel.select_label', { title: p.name || t('c.unnamed') })}
                      className="ml-2 shrink-0"
                    />
                  )}
                  <div className={web ? 'min-w-0 flex-1' : 'contents'}>
                  <SwipeItem
                    id={p.id}
                    name={p.name}
                    select={web ? undefined : sel}
                    left={pinSwipe(Boolean(p.pinnedAt), p.name, () => void setPinned(p.id, !p.pinnedAt))}
                    right={deleteSwipe(p.name, () => removeWithUndo(p))}
                    focus={[
                      { label: p.pinnedAt ? t('todo.unpin_label', { title: p.name }) : t('todo.pin_label', { title: p.name }), onClick: () => void setPinned(p.id, !p.pinnedAt) },
                      { label: t('todo.delete_label', { title: p.name }), onClick: () => removeWithUndo(p) },
                    ]}
                  >
                    <PlaceRow place={p} byId={byId} contactsById={contactsById} noteCount={noteCounts.get(p.id) ?? 0} onOpen={() => view(p.id)} />
                  </SwipeItem>
                  </div>
                </li>
              ))}
            </ul>
          </SwipeGroup>
        </>
      )}
      <p id={hintId} className="sr-only">
        {t('place.hint')}
      </p>
      {moveTo.ui}
      {askDelete.ui}
      {undo.item && (
        <UndoBar
          title={undo.item.length === 1 ? undo.item[0].name : ''}
          text={undo.item.length === 1 ? undefined : t.plural('sel.deleted', undo.item.length)}
          onUndo={() => void undo.undo()}
        />
      )}

      {/* Then what the same search finds on the other tabs. */}
      {!sel.selecting && <Elsewhere here="places" query={query} />}

      {/* The form over the page: closing or saving it comes back to the page. */}
      {editing ? <PlaceForm key={editing} id={editing} /> : viewing ? <PlaceDetail key={viewing} id={viewing} /> : null}
    </div>
  )
}

/**
 * One place in the list: its name (pinned ones marked), its town, its tags'
 * dots, and (2026-11-20) what it gathers: the people linked to it, how many
 * notes and comments, and the latest comment.
 */
function PlaceRow({
  place,
  byId,
  contactsById,
  noteCount,
  onOpen,
}: {
  place: Place
  byId: Map<string, Tag>
  contactsById: Map<string, Contact>
  noteCount: number
  onOpen: () => void
}) {
  const t = useT()
  const chips = place.tagIds.map((id) => byId.get(id)).filter((x): x is Tag => Boolean(x) && !isList(x!))
  const where = placeWhere(place, t.locale)
  const people = (place.contactIds ?? []).map((id) => contactsById.get(id)).filter((c): c is Contact => Boolean(c))
  const names = people.slice(0, 2).map((c) => c.name || t('c.unnamed'))
  const peopleText = names.length ? `${names.join(', ')}${people.length > 2 ? ` +${people.length - 2}` : ''}` : ''
  const commentCount = place.comments?.length ?? 0
  const latest = commentCount ? newestComments(place)[0] : undefined
  const counts = [noteCount ? t.plural('place.notes', noteCount) : '', commentCount ? t.plural('place.comment_count', commentCount) : ''].filter(Boolean)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full bg-slate-800 text-orange-400">
        <PinGlyph />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold text-slate-100">
          {place.pinnedAt && <span className="sr-only">{t('todo.pinned')}, </span>}
          {place.pinnedAt && (
            <span aria-hidden className="mr-1 text-orange-400">
              📌
            </span>
          )}
          {place.name || t('c.unnamed')}
        </span>
        {where && <span className="block truncate text-sm text-slate-400">{where}</span>}
        {(peopleText || counts.length > 0) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
            {peopleText && (
              <span className="min-w-0 truncate">
                <span aria-hidden>👤 </span>
                <span className="sr-only">{t('nlink.contacts_label')}: </span>
                {peopleText}
              </span>
            )}
            {counts.map((c) => (
              <span key={c} className="shrink-0">
                {c}
              </span>
            ))}
          </span>
        )}
        {latest && (
          <span className="mt-0.5 block truncate text-xs italic text-slate-500">
            <span aria-hidden>💬 </span>
            <span className="sr-only">{t('place.latest_comment')}: </span>
            {latest.text.replace(/\s+/g, ' ')}
          </span>
        )}
      </span>
      {chips.length > 0 && (
        <span className="flex shrink-0 flex-wrap items-center justify-end self-start">
          {chips.map((c) => (
            <TagDot key={c.id} name={c.name} colour={c.colour} pattern={c.pattern} />
          ))}
        </span>
      )}
    </button>
  )
}

function PinGlyph({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}

/**
 * Add or change one place: its name, address (Street, City, County, Country,
 * with the town suggested, as on a person), phone, website, notes and tags.
 * Delete lives here for an existing one, and asks.
 */
function PlaceForm({ id }: { id: string }) {
  const t = useT()
  const existing = usePlaceStore((s) => (id === 'new' ? undefined : s.places.find((p) => p.id === id)))
  const save = usePlaceStore((s) => s.save)
  const remove = usePlaceStore((s) => s.remove)
  const close = usePlaceStore((s) => s.edit)
  const [draft, setDraft] = useState<PlaceDraft>(() => ({
    id: existing?.id,
    name: existing?.name ?? usePlaceStore.getState().prefillName ?? '',
    location: existing?.location ?? newLocation(),
    phone: existing?.phone ?? '',
    website: existing?.website ?? '',
    details: existing?.details ?? '',
    tagIds: existing?.tagIds ?? [],
  }))
  const [confirming, setConfirming] = useState(false)
  const nameId = useId()
  const phoneId = useId()
  const webId = useId()
  const detailsId = useId()
  const patch = (p: Partial<PlaceDraft>) => setDraft((d) => ({ ...d, ...p }))
  const valid = draft.name.trim() !== ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) void save(draft)
  }

  return (
    <Modal title={existing ? t('place.fine_tune') : t('add_place')} onClose={() => close(null)}>
      <form onSubmit={submit} className="space-y-4">
        {existing && <PlaceActions place={existing} />}
        <div>
          <label htmlFor={nameId} className={label}>
            {t('form.name')}
          </label>
          <input
            id={nameId}
            className={inputCls}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={t('place.placeholder')}
            autoFocus={!existing && autoFocusOK()}
            required
          />
        </div>
        <fieldset>
          <legend className={label}>{t('place.address')}</legend>
          <LocationFields withPlace={false} value={draft.location ?? newLocation()} onChange={(location) => patch({ location })} />
        </fieldset>
        <div>
          <label htmlFor={phoneId} className={label}>
            {t('place.phone')}
          </label>
          <input id={phoneId} type="tel" autoComplete="off" className={inputCls} value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </div>
        <div>
          <label htmlFor={webId} className={label}>
            {t('place.website')}
          </label>
          <input
            id={webId}
            // Not type="url": the browser would refuse "example.com" without
            // its https://, which websiteUrl adds itself.
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoComplete="off"
            placeholder="example.com"
            className={inputCls}
            value={draft.website}
            onChange={(e) => patch({ website: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={detailsId} className={label}>
            {t('place.details')}
          </label>
          <GrowingTextarea id={detailsId} className={textareaCls} rows={3} value={draft.details} onChange={(e) => patch({ details: e.target.value })} />
        </div>
        <div>
          <span className={label}>{t('field.tags')}</span>
          <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
        </div>
        {/* People, notes and comments are on the place's page (PlaceDetail). */}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {existing ? (
            confirming ? (
              <button type="button" className={btnDanger} onClick={() => void remove(existing.id)}>
                {t('todo.really_delete')}
              </button>
            ) : (
              <button type="button" className={btnSubtle} onClick={() => setConfirming(true)}>
                {t('c.delete')}
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={() => close(null)}>
              {t('c.cancel')}
            </button>
            <button type="submit" className={btnPrimary} disabled={!valid} title={saveKeyLabel()}>
              {existing ? t('c.save') : t('place.add')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
