import { useEffect, useId, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { GrowingTextarea } from '@unisim/sdk'
import { mapsUrl } from '../lib/notes'
import { hasLocation, locationLines, type Location } from '../lib/geo'
import { isList } from '../lib/lists'
import { newestComments, websiteUrl, type Place, type PlaceComment } from '../lib/places'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { usePlaceStore } from '../stores/placeStore'
import { useT } from '../i18n'
import { Modal } from './Modal'
import { autoFocusOK, usePhoneKit } from '../native/kit'
import { PlaceLinks } from './PlaceLinks'
import { TagChip } from './TagChip'
import { btnGhost, btnPrimary, btnSubtle, inputCls, label, textareaCls } from './ui'
import { LocationFields } from './LocationFields'
import { currentTown, newLocation } from './currentLocation'

/**
 * A place's page (James, 2026-11-20: "you put a place in and then you make
 * comments around that place and then link it to people that are associated
 * with that place as well as notes"). Tapping a place opens this, not its
 * form: the quick actions (📍 📞 🌐 📌), the address, its notes and tags,
 * then its comments (newest first, with a box to add one) and the people and
 * notes linked to it. Fine-tune opens the form for the rest.
 *
 * A new place opens here too, the way a new person does ("more like the
 * people form", 2026-11-20): a name box and a notes box on the page, and 📍
 * fills in roughly where you are (the nearest town, worked out on the
 * device), which you can still change. Left empty, it is not kept.
 */
export function PlaceDetail({ id }: { id: string }) {
  const t = useT()
  const place = usePlaceStore((s) => s.places.find((p) => p.id === id))
  const fresh = usePlaceStore((s) => s.fresh === id)
  const closePage = usePlaceStore((s) => s.closePage)
  const view = usePlaceStore((s) => s.view)
  const edit = usePlaceStore((s) => s.edit)
  const patch = usePlaceStore((s) => s.patch)
  const tags = useBookStore((s) => s.tags)
  const nameId = useId()
  const detailsId = useId()
  const [locating, setLocating] = useState<Location | null>(null)
  // The phone app's page has Back and Fine-tune in its bar already.
  const kit = usePhoneKit()
  // Deleted (here or by another device's sync): nothing to show.
  useEffect(() => {
    if (!place) view(null)
  }, [place, view])
  if (!place) return null
  const byId = new Map(tags.map((x) => [x.id, x]))
  const chips = place.tagIds.map((x) => byId.get(x)).filter((x): x is Tag => Boolean(x) && !isList(x!))
  const located = hasLocation(place.location)
  const address = located ? locationLines(place.location!, t.locale) : []
  const title = fresh && !place.name.trim() ? t('place.new_title') : place.name || t('c.unnamed')
  const close = () => void closePage()
  const fineTune = (
    <button type="button" className={btnGhost} onClick={() => edit(place.id)}>
      {t('place.edit')}
    </button>
  )

  return (
    <Modal title={title} onClose={close} backLabel={t('tab_places')} phoneActions={fineTune}>
      <div className="space-y-5">
        {fresh && (
          <div>
            <label htmlFor={nameId} className={label}>
              {t('form.name')}
            </label>
            <input
              id={nameId}
              className={`${inputCls} text-lg font-semibold`}
              value={place.name}
              placeholder={t('place.name_where')}
              autoComplete="off"
              autoFocus={autoFocusOK()}
              onChange={(e) => void patch(place.id, { name: e.target.value })}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v !== e.target.value) void patch(place.id, { name: v })
              }}
            />
          </div>
        )}

        <PlaceQuickActions place={place} onLocate={() => setLocating(place.location ?? newLocation())} />

        {located && (
          <div className="flex items-start justify-between gap-3">
            <address className="text-sm not-italic text-slate-300">
              {address.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </address>
            <button type="button" className={btnSubtle} onClick={() => setLocating(place.location ?? newLocation())}>
              {t('place.change_location')}
            </button>
          </div>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <TagChip key={c.id} name={c.name} colour={c.colour} pattern={c.pattern} />
            ))}
          </div>
        )}
        {fresh ? (
          <div>
            <label htmlFor={detailsId} className={label}>
              {t('place.details')}
            </label>
            <GrowingTextarea
              id={detailsId}
              className={textareaCls}
              rows={2}
              value={place.details}
              placeholder={t('place.details_placeholder')}
              onChange={(e) => void patch(place.id, { details: e.target.value })}
            />
            <p className="mt-2 text-sm text-slate-500">{t('place.fresh_hint')}</p>
          </div>
        ) : (
          place.details.trim() && <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{place.details}</p>
        )}

        <PlaceComments place={place} />

        <PlaceLinks place={place} onLeave={close} />

        {!kit && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {fineTune}
            <button type="button" className={btnPrimary} onClick={close}>
              {fresh ? t('c.done') : t('c.close')}
            </button>
          </div>
        )}
      </div>
      {locating && (
        <LocationSheet
          start={locating}
          ask={!located}
          hasOne={located}
          onSave={(location) => void patch(place.id, { location })}
          onClose={() => setLocating(null)}
        />
      )}
    </Modal>
  )
}

/**
 * The row of emoji buttons across the top of a place, in the people form's
 * style (QuickActions): 📍 directions, or — with no address yet — roughly
 * where you are, to change if you like; 📞 call; 🌐 website; 📌 pin. Call and
 * Website with nothing to use are drawn fainter and open Fine-tune.
 */
function PlaceQuickActions({ place, onLocate }: { place: Place; onLocate: () => void }) {
  const t = useT()
  const edit = usePlaceStore((s) => s.edit)
  const setPinned = usePlaceStore((s) => s.setPinned)
  const native = Capacitor.isNativePlatform()
  const located = hasLocation(place.location)
  const maps = located ? mapsUrl({ ...place.location!, place: place.name }, Capacitor.getPlatform(), t.locale) : null
  const tel = place.phone.replace(/[^\d+]/g, '')
  const web = websiteUrl(place.website)
  const go = (url: string, newTab: boolean) => {
    // Inside the app the web view hands the link to the phone.
    if (native || !newTab) window.location.href = url
    else window.open(url, '_blank', 'noopener,noreferrer')
  }
  const box =
    'flex min-h-[56px] select-none items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-[28px] leading-none transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
  const buttons = [
    { key: 'place', emoji: '\u{1F4CD}', label: located ? t('place.directions') : t('place.add_location'), muted: !located, onClick: () => (maps ? go(maps, true) : onLocate()) },
    { key: 'call', emoji: '\u{1F4DE}', label: t('place.call'), muted: !tel, onClick: () => (tel ? go(`tel:${tel}`, false) : edit(place.id)) },
    { key: 'web', emoji: '\u{1F310}', label: t('place.website_open'), muted: !web, onClick: () => (web ? go(web, true) : edit(place.id)) },
    {
      key: 'pin',
      emoji: '\u{1F4CC}',
      label: place.pinnedAt ? t('todo.unpin') : t('todo.pin'),
      pressed: Boolean(place.pinnedAt),
      onClick: () => void setPinned(place.id, !place.pinnedAt),
    },
  ]
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('actions_label')}>
      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          data-qa={b.key}
          aria-label={b.label}
          aria-pressed={b.pressed}
          title={b.label}
          onClick={b.onClick}
          className={`${box} ${b.muted ? 'opacity-40' : ''} ${b.pressed ? 'border-orange-500/70' : ''}`}
        >
          <span aria-hidden>{b.emoji}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * A place's address: Street, City, County, Country, with the towns
 * suggested (LocationFields). With none yet, it asks the device where it is
 * and fills in the nearest town, county and country — roughly where you are,
 * worked out on the device, nothing sent — and every box stays editable.
 */
function LocationSheet({
  start,
  ask,
  hasOne,
  onSave,
  onClose,
}: {
  start: Location
  ask: boolean
  hasOne: boolean
  onSave: (location: Location | undefined) => void
  onClose: () => void
}) {
  const t = useT()
  const [loc, setLoc] = useState<Location>(start)
  const [status, setStatus] = useState<'finding' | 'found' | 'failed' | null>(ask ? 'finding' : null)
  useEffect(() => {
    if (!ask) return
    let live = true
    void currentTown().then((here) => {
      if (!live) return
      if (here) {
        // What was already typed wins; the town fills the empty boxes.
        setLoc((l) => ({ ...here, ...Object.fromEntries(Object.entries(l).filter(([k, v]) => v && k !== 'country')) }))
        setStatus('found')
      } else setStatus('failed')
    })
    return () => {
      live = false
    }
  }, [ask])
  const ok = hasLocation(loc)
  return (
    <Modal phone="sheet" title={t('place.address')} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(ok ? loc : undefined)
          onClose()
        }}
      >
        {status && (
          <p role="status" className="text-sm text-slate-400">
            {status === 'finding' ? t('place.locating') : status === 'found' ? t('place.located_rough') : t('place.locate_failed')}
          </p>
        )}
        <LocationFields withPlace={false} value={loc} onChange={setLoc} />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {hasOne ? (
            <button
              type="button"
              className={btnSubtle}
              onClick={() => {
                onSave(undefined)
                onClose()
              }}
            >
              {t('place.remove')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>
              {t('c.cancel')}
            </button>
            <button type="submit" className={btnPrimary} disabled={!ok}>
              {t('c.save')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/** "20 Nov 2026, 15:02" in the app's language. */
function when(at: number, locale: string): string {
  try {
    return new Date(at).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return new Date(at).toLocaleString()
  }
}

/** A place's comments: a box to add one, then the comments, newest first. */
function PlaceComments({ place }: { place: Place }) {
  const t = useT()
  const addComment = usePlaceStore((s) => s.addComment)
  const removeComment = usePlaceStore((s) => s.removeComment)
  const restoreComment = usePlaceStore((s) => s.restoreComment)
  const [text, setText] = useState('')
  const [gone, setGone] = useState<PlaceComment | null>(null)
  const boxId = useId()
  const comments = newestComments(place)

  // The Undo for a deleted comment lasts six seconds, as a deleted row's does.
  useEffect(() => {
    if (!gone) return
    const timer = setTimeout(() => setGone(null), 6000)
    return () => clearTimeout(timer)
  }, [gone])

  const post = () => {
    if (!text.trim()) return
    void addComment(place.id, text)
    setText('')
  }

  return (
    <section aria-labelledby={`${boxId}-h`} className="space-y-3">
      <h3 id={`${boxId}-h`} className={label}>
        {t('place.comments')}
      </h3>
      <div className="space-y-2">
        <label htmlFor={boxId} className="sr-only">
          {t('place.comment_add')}
        </label>
        <GrowingTextarea
          id={boxId}
          className={textareaCls}
          rows={2}
          value={text}
          placeholder={t('place.comment_placeholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/⌘+Enter adds it; Enter alone is a new line.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              e.stopPropagation()
              post()
            }
          }}
        />
        <div className="flex justify-end">
          <button type="button" className={btnGhost} disabled={!text.trim()} onClick={post}>
            {t('place.comment_post')}
          </button>
        </div>
      </div>
      {gone && (
        <p role="status" className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-300">
          {t('place.comment_deleted')}
          <button
            type="button"
            className={btnSubtle}
            onClick={() => {
              void restoreComment(place.id, gone)
              setGone(null)
            }}
          >
            {t('todo.undo')}
          </button>
        </p>
      )}
      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">{t('place.no_comments')}</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-800 px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{c.text}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{c.at ? when(c.at, t.locale) : ''}</span>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label={t('place.comment_delete_label', { when: c.at ? when(c.at, t.locale) : '' })}
                  onClick={() => {
                    setGone(c)
                    void removeComment(place.id, c.id)
                  }}
                >
                  {t('c.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * A place's Directions, Call and Website, as buttons across the top of its
 * page and form — the ones it has the details for. Directions opens the
 * device's own maps app (Apple Maps, Android's geo: handler, OpenStreetMap on
 * the website), as a note's location does.
 */
export function PlaceActions({ place }: { place: Place }) {
  const t = useT()
  const native = Capacitor.isNativePlatform()
  const maps = place.location && hasLocation(place.location) ? mapsUrl({ ...place.location, place: place.name }, Capacitor.getPlatform(), t.locale) : null
  const tel = place.phone.replace(/[^\d+]/g, '')
  const web = websiteUrl(place.website)
  if (!maps && !tel && !web) return null
  const cls = `${btnGhost} flex-1 justify-center`
  return (
    <div className="flex flex-wrap gap-2">
      {maps && (
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className={cls}
          onClick={(e) => {
            // Inside the app the web view hands the address to the phone.
            if (native) {
              e.preventDefault()
              window.location.href = maps
            }
          }}
        >
          <span aria-hidden>🧭</span>
          {t('place.directions')}
        </a>
      )}
      {tel && (
        <a href={`tel:${tel}`} className={cls}>
          <span aria-hidden>📞</span>
          {t('place.call')}
        </a>
      )}
      {web && (
        <a href={web} target="_blank" rel="noreferrer" className={cls}>
          <span aria-hidden>🌐</span>
          {t('place.website_open')}
        </a>
      )}
    </div>
  )
}
