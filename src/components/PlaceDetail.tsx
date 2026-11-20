import { useEffect, useId, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { GrowingTextarea } from '@unisim/sdk'
import { mapsUrl } from '../lib/notes'
import { hasLocation, locationLines } from '../lib/geo'
import { isList } from '../lib/lists'
import { newestComments, websiteUrl, type Place, type PlaceComment } from '../lib/places'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { usePlaceStore } from '../stores/placeStore'
import { useT } from '../i18n'
import { Modal } from './Modal'
import { usePhoneKit } from '../native/kit'
import { PlaceLinks } from './PlaceLinks'
import { TagChip } from './TagChip'
import { btnGhost, btnPrimary, btnSubtle, label, textareaCls } from './ui'

/**
 * A place's page (James, 2026-11-20: "you put a place in and then you make
 * comments around that place and then link it to people that are associated
 * with that place as well as notes"). Tapping a place opens this, not its
 * form: Directions / Call / Website, the address, its notes and tags, then
 * its comments (newest first, with a box to add one) and the people and
 * notes linked to it. Fine-tune opens the form for the fields.
 */
export function PlaceDetail({ id }: { id: string }) {
  const t = useT()
  const place = usePlaceStore((s) => s.places.find((p) => p.id === id))
  const view = usePlaceStore((s) => s.view)
  const edit = usePlaceStore((s) => s.edit)
  const tags = useBookStore((s) => s.tags)
  // The phone app's page has Back and Fine-tune in its bar already.
  const kit = usePhoneKit()
  // Deleted (here or by another device's sync): nothing to show.
  useEffect(() => {
    if (!place) view(null)
  }, [place, view])
  if (!place) return null
  const byId = new Map(tags.map((x) => [x.id, x]))
  const chips = place.tagIds.map((x) => byId.get(x)).filter((x): x is Tag => Boolean(x) && !isList(x!))
  const address = place.location && hasLocation(place.location) ? locationLines(place.location, t.locale) : []
  const name = place.name || t('c.unnamed')
  const close = () => view(null)
  const fineTune = (
    <button type="button" className={btnGhost} onClick={() => edit(place.id)}>
      {t('place.edit')}
    </button>
  )

  return (
    <Modal title={name} onClose={close} backLabel={t('tab_places')} phoneActions={fineTune}>
      <div className="space-y-5">
        <PlaceActions place={place} />
        {(address.length > 0 || chips.length > 0 || place.details.trim()) && (
          <div className="space-y-2">
            {address.length > 0 && (
              <address className="text-sm not-italic text-slate-300">
                {address.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </address>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <TagChip key={c.id} name={c.name} colour={c.colour} pattern={c.pattern} />
                ))}
              </div>
            )}
            {place.details.trim() && <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{place.details}</p>}
          </div>
        )}

        <PlaceComments place={place} />

        <PlaceLinks place={place} onLeave={close} />

        {!kit && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {fineTune}
            <button type="button" className={btnPrimary} onClick={close}>
              {t('c.close')}
            </button>
          </div>
        )}
      </div>
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
