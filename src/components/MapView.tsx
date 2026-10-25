import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MlMap, Marker } from 'maplibre-gl'
import { useScrollHint } from '@unisim/sdk'
import { countryName, divisionName, loadGeo } from '../lib/geo'
import { isList } from '../lib/lists'
import { bounds, mapGroups, type MapFilter, type MapGroup, type MapKind } from '../lib/mapGroups'
import { usePageScrollLock } from '../lib/scrollLock'
import { useBookStore } from '../stores/bookStore'
import { useNoteStore } from '../stores/noteStore'
import { useEffectiveTheme } from '../stores/themeStore'
import { usePhoneKit } from '../native/kit'
import { useT, type Key } from '../i18n'
import { CloseGlyph, Modal } from './Modal'
import { TagChip } from './TagChip'

/** OpenFreeMap (free, no key, no account): https://openfreemap.org. */
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

/**
 * Contacts and notes on a map (James, 2026-10-25: "view by location"), by
 * town: a pin per town that has anybody or anything in it, placed at the
 * town's position from the bundled list (no coordinates are stored anywhere).
 * Tap a pin for a sheet of who and what is there. Filter by people / notes,
 * tag and template.
 *
 * MapLibre GL JS with OpenFreeMap tiles. ⚠️ Both load only when this opens:
 * the library is its own chunk, and the tile server is contacted from then
 * on, not before (PRIVACY.md, About).
 */
export function MapView({ onClose }: { onClose: () => void }) {
  const t = useT()
  const kit = usePhoneKit()
  const theme = useEffectiveTheme()
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const notes = useNoteStore((s) => s.notes)
  const templates = useNoteStore((s) => s.templates)
  const [filter, setFilter] = useState<MapFilter>({ kind: 'all', tagIds: [], templateId: null })
  const [geo, setGeo] = useState(false)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<MapGroup | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const markers = useRef<Marker[]>([])
  const lib = useRef<typeof import('maplibre-gl') | null>(null)
  const [ready, setReady] = useState(false)
  usePageScrollLock()
  const hint = useScrollHint<HTMLDivElement>()

  useEffect(() => {
    let live = true
    loadGeo()
      .then(() => live && setGeo(true))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])

  const { groups, unplaced } = useMemo(() => (geo ? mapGroups(contacts, notes, filter) : { groups: [], unplaced: 0 }), [geo, contacts, notes, filter])

  // The map itself, made once; its style follows Light / Dark.
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [ml] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
        if (!live || !box.current) return
        lib.current = ml
        const m = new ml.Map({
          container: box.current,
          style: MAP_STYLES[theme],
          center: [0, 30],
          zoom: 1,
          attributionControl: { compact: true },
        })
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
        map.current = m
        m.on('load', () => live && setReady(true))
        m.on('error', () => {
          // A tile that would not load is not the map failing; a style is.
          if (!m.isStyleLoaded()) setFailed(true)
        })
      } catch {
        if (live) setFailed(true)
      }
    })()
    return () => {
      live = false
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (map.current && ready) map.current.setStyle(MAP_STYLES[theme])
  }, [theme, ready])

  // A pin per town: a round badge with how many are there.
  useEffect(() => {
    const m = map.current
    const ml = lib.current
    if (!m || !ml || !ready) return
    for (const mk of markers.current) mk.remove()
    markers.current = groups.map((g) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'bb-pin'
      const count = g.contacts.length + g.notes.length
      el.textContent = String(count)
      el.setAttribute('aria-label', `${g.town.name}: ${t.plural('map.things', count)}`)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setOpen(g)
      })
      return new ml.Marker({ element: el }).setLngLat([g.town.lng, g.town.lat]).addTo(m)
    })
    const b = bounds(groups)
    if (b) m.fitBounds(b, { padding: 48, maxZoom: 9, duration: 0 })
  }, [groups, ready, t])

  const plainTags = tags.filter((x) => !isList(x))
  const kinds: { k: MapKind; label: Key }[] = [
    { k: 'all', label: 'tpl.all' },
    { k: 'contacts', label: 'tab_contacts' },
    { k: 'notes', label: 'tab_notes' },
  ]
  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${on ? 'border-orange-500 bg-orange-500/15 text-orange-300' : 'border-slate-700 bg-slate-900 text-slate-300'}`

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* One row that scrolls sideways, and shows it (BRANDING.md). */}
      <div
        ref={hint.ref}
        style={hint.style}
        className={`flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-800 px-3 py-2 ${hint.className}`}
        role="group"
        aria-label={t('map.filter')}
      >
        {kinds.map(({ k, label }) => (
          <button key={k} type="button" aria-pressed={filter.kind === k} className={chip(filter.kind === k)} onClick={() => setFilter((f) => ({ ...f, kind: k }))}>
            {t(label)}
          </button>
        ))}
        {filter.kind !== 'notes' &&
          plainTags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              colour={tag.colour}
              pattern={tag.pattern}
              selected={filter.tagIds.includes(tag.id)}
              onClick={() =>
                setFilter((f) => ({ ...f, tagIds: f.tagIds.includes(tag.id) ? f.tagIds.filter((x) => x !== tag.id) : [...f.tagIds, tag.id] }))
              }
            />
          ))}
        {filter.kind !== 'contacts' &&
          templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              aria-pressed={filter.templateId === tpl.id}
              className={chip(filter.templateId === tpl.id)}
              onClick={() => setFilter((f) => ({ ...f, templateId: f.templateId === tpl.id ? null : tpl.id }))}
            >
              {tpl.name}
            </button>
          ))}
      </div>
      <div className="relative min-h-0 flex-1">
        {/* Inline: MapLibre's stylesheet sets .maplibregl-map to position: relative. */}
        <div ref={box} className="bb-map" style={{ position: 'absolute', inset: 0 }} data-ready={ready ? 'true' : undefined} />
        {(failed || (geo && ready && groups.length === 0)) && (
          <p className="absolute inset-x-3 top-3 rounded-xl border border-slate-800 bg-slate-900/95 px-3 py-2 text-sm text-slate-300">
            {failed ? t('map.failed') : t('map.empty')}
          </p>
        )}
        {unplaced > 0 && !failed && (
          <p className="absolute inset-x-3 bottom-3 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400">{t.plural('map.unplaced', unplaced)}</p>
        )}
      </div>
      {open && <PinSheet group={open} onClose={() => setOpen(null)} onLeave={onClose} />}
    </div>
  )

  if (kit) {
    return (
      <kit.Page title={t('map.title')} backLabel={kit.t('tab_contacts')} onBack={onClose} bare>
        {body}
      </kit.Page>
    )
  }
  return (
    <FullDialog title={t('map.title')} onClose={onClose}>
      {body}
    </FullDialog>
  )
}

/** Who and what is in one town; a tap opens them. */
function PinSheet({ group, onClose, onLeave }: { group: MapGroup; onClose: () => void; onLeave: () => void }) {
  const t = useT()
  const view = useBookStore((s) => s.view)
  const viewNote = useNoteStore((s) => s.view)
  const where = [divisionName(group.town.cc, group.town.div), countryName(group.town.cc, t.locale)].filter(Boolean).join(', ')
  const row = 'flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
  return (
    <Modal phone="sheet" title={group.town.name} onClose={onClose}>
      {where && <p className="-mt-1 mb-2 text-xs text-slate-500">{where}</p>}
      <ul>
        {group.contacts.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={row}
              onClick={() => {
                onClose()
                onLeave()
                view(c.id)
              }}
            >
              <span className="text-sm font-medium text-slate-100">{c.name || t('c.unnamed')}</span>
              <span className="text-xs text-slate-500">{t('map.contact')}</span>
            </button>
          </li>
        ))}
        {group.notes.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className={row}
              onClick={() => {
                onClose()
                onLeave()
                viewNote(n.id)
              }}
            >
              <span className="text-sm font-medium text-slate-100">{n.title || t('c.untitled')}</span>
              <span className="text-xs text-slate-500">{n.location?.place || t('map.note')}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

/** The website's full-screen dialog, as a contact's view is. */
function FullDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const t = useT()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!el.open) el.showModal()
    const onCancel = (e: Event) => {
      e.preventDefault()
      closeRef.current()
    }
    el.addEventListener('cancel', onCancel)
    return () => {
      el.removeEventListener('cancel', onCancel)
      if (el.open) el.close()
    }
  }, [])
  return (
    <dialog ref={ref} aria-label={title} className="m-0 flex h-[100dvh] max-h-none w-screen max-w-none flex-col rounded-none border-0 bg-slate-950 p-0 text-slate-200">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-100">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t('c.close')} className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
          <CloseGlyph />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </dialog>
  )
}
