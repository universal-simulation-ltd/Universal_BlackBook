import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { LinkifiedText } from '@unisim/sdk'
import { copyText } from '../lib/clipboard'
import { fold } from '../lib/filter'
import { mapsUrl, noteText, type Note } from '../lib/notes'
import { hasLocation, locationLines, type Location } from '../lib/geo'
import { LocationFields } from './LocationFields'
import { newLocation, useCurrentLocation } from './currentLocation'
import { formatWhen, nextOccurrence } from '../lib/reminders'
import { showValue, type NoteTemplate, type TemplateField } from '../lib/templates'
import { usePageScrollLock } from '../lib/scrollLock'
import { useBookStore } from '../stores/bookStore'
import { useNoteStore } from '../stores/noteStore'
import { useEffectiveTheme } from '../stores/themeStore'
import { autoFocusOK, usePhoneKit } from '../native/kit'
import { useNativeNav } from '../native/nav'
import { askForNotifications } from '../native/notify'
import { phoneScreens } from '../native/shell'
import { useT } from '../i18n'
import { CloseGlyph, Modal } from './Modal'
import { actionSwipe, pinSwipe, removeSwipe, SelectBar, SwipeGroup, SwipeItem, UndoBar, useHoldSelect, useUndo } from './SwipeActions'
import type { Contact } from '../lib/types'
import { ReminderEditor, ReminderList } from './Reminders'
import { QuickActions, type QuickButton } from './QuickActions'
import { NOTE_ACTIONS, type QuickAction } from '../lib/quickActions'
import { shareText } from '../lib/share'
import { useSettingsStore } from '../stores/settingsStore'
import { growToFit, useTypingRoom } from '../lib/typingRoom'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls, label, textareaCls } from './ui'

/**
 * A note's clean view and its form, drawn over whichever tab is showing (so a
 * contact's "Linked notes" can open one). NativeApp and App render this.
 */
export function NoteLayers() {
  const t = useT()
  const viewing = useNoteStore((s) => s.viewing)
  const editing = useNoteStore((s) => s.editing)
  const choosing = useNoteStore((s) => s.choosing)
  // Copy and delete (a note's quick button): the view has gone by the time
  // anyone wants it back, so the Undo is here, under every view.
  const restoreMany = useNoteStore((s) => s.restoreMany)
  const binned = useUndo<Note[]>(restoreMany)
  return (
    <>
      {viewing && <NoteView key={`nv-${viewing}`} id={viewing} onBinned={(n) => binned.deleted([n])} />}
      {editing && <NoteForm key={`nf-${editing}`} id={editing} />}
      {choosing && <TemplateChooser />}
      {binned.item && (
        <UndoBar
          title=""
          text={t('qa.copied_deleted', { title: binned.item[0].title || t('c.untitled') })}
          onUndo={() => void binned.undo()}
        />
      )}
    </>
  )
}

/** A new note: plain, or from one of the templates (James, 2026-10-25). */
function TemplateChooser() {
  const t = useT()
  const kit = usePhoneKit()
  const templates = useNoteStore((s) => s.templates)
  const startFrom = useNoteStore((s) => s.startFrom)
  const stop = useNoteStore((s) => s.stopChoosing)
  const row = kit
    ? 'bb-sheetrow'
    : 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
  return (
    <Modal phone="sheet" title={t('tpl.new_note')} onClose={stop}>
      <div className="flex flex-col">
        <button type="button" className={row} onClick={() => startFrom(null)}>
          <span className={kit ? 'bb-sheetrow-icon' : 'text-orange-400'} aria-hidden>
            <NoteGlyph />
          </span>
          <span className="min-w-0 flex-1 text-left">{t('tpl.plain')}</span>
        </button>
        {templates.map((x) => (
          <button key={x.id} type="button" className={row} onClick={() => startFrom(x.id)}>
            <span className={kit ? 'bb-sheetrow-icon' : 'text-orange-400'} aria-hidden>
              <TemplateGlyph />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block">{x.name}</span>
              {x.fields.length > 0 && <span className="block truncate text-xs text-slate-500">{x.fields.map((f) => f.label).join(' · ')}</span>}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

/** A templated note's fields, as label and value, for the view. */
function FieldValues({ note, template }: { note: Note; template: NoteTemplate }) {
  const t = useT()
  const filled = template.fields.filter((f) => note.fields?.[f.id]?.trim())
  if (filled.length === 0) return null
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3">
      {filled.map((f) => (
        <div key={f.id} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</dt>
          <dd className="break-words text-base text-slate-100">
            {f.type === 'link' ? <Linked text={linkText(note.fields![f.id])} /> : showValue(f.type, note.fields![f.id], t.locale)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A link field as the linkifier wants it: a bare "example.com/x" becomes https://. */
function linkText(v: string): string {
  const s = v.trim()
  return /^(https?:\/\/|www\.)/i.test(s) || !/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) ? s : `https://${s}`
}

/** One field's box in the form, by its kind. */
function FieldInput({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const id = useId()
  const type = field.type === 'date' ? 'date' : field.type === 'link' ? 'url' : 'text'
  return (
    <div>
      <label htmlFor={id} className={label}>
        {field.label}
      </label>
      <input
        id={id}
        className={inputCls}
        type={type}
        inputMode={field.type === 'number' ? 'decimal' : field.type === 'link' ? 'url' : undefined}
        autoCapitalize={field.type === 'link' ? 'off' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/**
 * One note, the way a contact is shown (James, 2026-10-25: "notes follow the
 * contact view's template"): the title in the bar with Fine-tune, a row of
 * actions — Link to contact, Link to location, Add notification, Copy — and
 * then what it holds: the people, the place, the text (tap to type into it,
 * as on a contact) and its notifications.
 */
function NoteView({ id, onBinned }: { id: string; onBinned: (note: Note) => void }) {
  const t = useT()
  const kit = usePhoneKit()
  const note = useNoteStore((s) => s.notes.find((n) => n.id === id))
  const close = useNoteStore((s) => s.view)
  const edit = useNoteStore((s) => s.edit)
  const patch = useNoteStore((s) => s.patch)
  const contacts = useBookStore((s) => s.contacts)
  const viewContact = useBookStore((s) => s.view)
  const template = useNoteStore((s) => s.templates.find((x) => x.id === note?.templateId))
  const say = useNativeNav((s) => s.say)
  const actionOrder = useSettingsStore((s) => s.noteActions)
  const setSettings = useSettingsStore((s) => s.set)
  const [sheet, setSheet] = useState<'contacts' | 'place' | 'remind' | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  usePageScrollLock()

  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!el.open) el.showModal()
    const onCancel = (e: Event) => {
      e.preventDefault()
      closeRef.current(null)
    }
    el.addEventListener('cancel', onCancel)
    return () => {
      el.removeEventListener('cancel', onCancel)
      if (el.open) el.close()
    }
  }, [])

  // The text, typed straight into the view as on a contact: saved half a
  // second after typing stops, on blur, and as the view closes.
  const [draft, setDraft] = useState(note?.details ?? '')
  const [typing, setTyping] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const flush = () => {
    clearTimeout(timer.current)
    timer.current = undefined
    if (note && note.details !== draftRef.current.replace(/\s+$/, '')) void patch(id, { details: draftRef.current.replace(/\s+$/, '') })
  }
  const flushRef = useRef(flush)
  flushRef.current = flush
  const stored = note?.details ?? ''
  // Saved from Fine-tune or by a sync: take the new text — but not our own
  // save coming back. That is stored without trailing spaces, so taking it
  // ate the space just typed before a pause (James, 2026-10-26: "I keep
  // losing spaces as I type").
  useEffect(() => {
    if (timer.current === undefined && stored !== draftRef.current.replace(/\s+$/, '')) setDraft(stored)
  }, [stored])
  useEffect(() => () => {
    if (timer.current !== undefined) flushRef.current()
  }, [])
  const areaRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    if (areaRef.current) growToFit(areaRef.current)
  }, [draft, typing])
  useTypingRoom(areaRef, Boolean(kit))

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])
  if (!note) return null
  const people = (note.contactIds ?? []).map((cid) => byId.get(cid)).filter((c) => c !== undefined)

  const copy = async () => {
    const ok = await copyText(noteText(note.title, draftRef.current))
    const message = ok ? t('notes.copied') : t('export.copy_failed')
    if (kit) say(message)
    else {
      setCopied(message)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const share = async () => {
    flush()
    const done = await shareText(note.title || t('c.untitled'), noteText(note.title, draftRef.current))
    const message = done === 'copied' ? t('notes.copied') : done === 'failed' ? t('export.copy_failed') : null
    if (message && kit) say(message)
    else if (message) setCopied(message)
  }

  const back = () => {
    flush()
    close(null)
  }
  const fineTune = () => {
    flush()
    edit(note.id)
  }
  // Copy and delete (James, 2026-10-26: "useful for me when I write issues
  // down then copy them here then delete the note"): only deleted once the
  // copy worked, and Undo brings it back (NoteLayers).
  const copyAndDelete = async () => {
    flush()
    const latest = useNoteStore.getState().notes.find((n) => n.id === note.id) ?? note
    const ok = await copyText(noteText(latest.title, draftRef.current))
    if (!ok) {
      if (kit) say(t('export.copy_failed'))
      else setCopied(t('export.copy_failed'))
      return
    }
    close(null)
    onBinned(latest)
    void useNoteStore.getState().removeMany([latest.id])
  }

  // One large emoji each (James, 2026-10-25), the words as the accessible
  // name and the tooltip. All have a glyph in iOS's and Android's system
  // emoji fonts. Which show, and in what order, is the person's
  // (NoteQuickActions).
  const buttons: Record<QuickAction, QuickButton> = {
    contacts: { label: t('nlink.contact'), emoji: '\u{1F464}', onClick: () => setSheet('contacts') },
    place: { label: t('nlink.location'), emoji: '\u{1F4CD}', onClick: () => setSheet('place') },
    remind: { label: t('rem.add'), emoji: '\u{1F514}', onClick: () => setSheet('remind') },
    copy: { label: t('notes.copy'), emoji: '\u{1F4CB}', onClick: () => void copy() },
    copyDelete: { label: t('qa.copy_delete'), emoji: '\u{1F4CB}\u{1F5D1}\u{FE0F}', small: true, onClick: () => void copyAndDelete() },
    share: { label: t('action_share'), emoji: '\u{1F4E4}', onClick: () => void share() },
  }

  const actionRow = (
    <QuickActions
      buttons={buttons}
      all={NOTE_ACTIONS}
      order={actionOrder}
      onChange={(noteActions) => setSettings({ noteActions })}
      label={t('nlink.actions')}
      status={copied}
    />
  )

  const body = (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {actionRow}

      {template && (
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-400">{template.name}</span>
          <FieldValues note={note} template={template} />
        </div>
      )}

      <LinkedPeople
        note={note}
        people={people}
        onOpen={(cid) => {
          flush()
          viewContact(cid)
        }}
      />

      {note.location && hasLocation(note.location) && <LocationBlock loc={note.location} />}

      <div>
        <span className={label}>{t('todo.details')}</span>
        {typing ? (
          <textarea
            ref={areaRef}
            aria-label={t('todo.details')}
            rows={3}
            autoFocus
            value={draft}
            onFocus={(e) => {
              const end = e.currentTarget.value.length
              e.currentTarget.setSelectionRange(end, end)
            }}
            onChange={(e) => {
              setDraft(e.target.value)
              draftRef.current = e.target.value
              clearTimeout(timer.current)
              timer.current = setTimeout(() => flushRef.current(), 500)
            }}
            onBlur={() => {
              flush()
              setTyping(false)
            }}
            className="-mx-2 block w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg border-0 bg-slate-900 px-2 py-1 text-base leading-7 text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          />
        ) : (
          <div
            role="textbox"
            aria-multiline="true"
            aria-readonly="false"
            aria-label={t('todo.details')}
            tabIndex={0}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a, button')) return
              setTyping(true)
            }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setTyping(true)
              }
            }}
            className="-mx-2 cursor-text rounded-lg px-2 py-1 hover:bg-slate-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            {draft.trim() ? (
              <p className="whitespace-pre-wrap break-words text-base leading-7 text-slate-200">
                <Linked text={draft} />
              </p>
            ) : (
              <p className="text-base leading-7 text-slate-500">{t('view.nothing_yet')}</p>
            )}
          </div>
        )}
      </div>

      <ReminderList reminders={note.reminders} onChange={(next) => void patch(note.id, { reminders: next })} />
    </div>
  )

  const layers = (
    <>
      {sheet === 'contacts' && <ContactPicker note={note} onClose={() => setSheet(null)} />}
      {sheet === 'place' && <LocationEditor note={note} onClose={() => setSheet(null)} />}
      {sheet === 'remind' && (
        <ReminderEditor
          onClose={() => setSheet(null)}
          onSave={(r) => {
            setSheet(null)
            void patch(note.id, { reminders: [...(note.reminders ?? []), r] })
            if (kit) {
              void askForNotifications().then((ok) => {
                const next = nextOccurrence(r, Date.now())
                say(ok ? t('rem.set', { when: next ? formatWhen(next, t.locale) : '' }) : t('rem.denied'))
              })
            }
          }}
        />
      )}
    </>
  )

  if (kit) {
    return (
      <kit.Page
        title={note.title || t('c.untitled')}
        editTitle={{
          value: note.title,
          label: t('notes.title'),
          placeholder: t('notes.title_placeholder'),
          onSave: (title) => void patch(note.id, { title }),
        }}
        backLabel={kit.t('tab_notes')}
        onBack={back}
        actions={
          <button type="button" className="min-h-[44px] px-2 text-[16px] font-semibold text-orange-400" onClick={fineTune}>
            {kit.t('fine_tune')}
          </button>
        }
      >
        {body}
        {layers}
      </kit.Page>
    )
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-0 flex h-[100dvh] max-h-none w-screen max-w-none flex-col rounded-none border-0 bg-slate-950 p-0 text-slate-200 backdrop:bg-slate-950"
    >
      <div className="shrink-0 border-b border-slate-800 px-4 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold text-slate-100">
            {note.title || t('c.untitled')}
          </h2>
          <button type="button" className={`${btnPrimary} shrink-0`} onClick={fineTune}>
            {t('row.fine_tune')}
          </button>
          <button
            type="button"
            onClick={back}
            aria-label={t('c.close')}
            className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <CloseGlyph />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 py-5" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        {body}
      </div>
      {layers}
    </dialog>
  )
}

function Linked({ text }: { text: string }) {
  const theme = useEffectiveTheme()
  const kit = usePhoneKit()
  const linkClassName =
    'break-all text-orange-300 underline underline-offset-4 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
  if (kit) return <kit.Linkified text={text} linkClassName={linkClassName} />
  return <LinkifiedText text={text} theme={theme} linkClassName={linkClassName} />
}

/** The location, and Open in Maps: the phone's own maps app, OpenStreetMap on the website. */
function LocationBlock({ loc }: { loc: Location }) {
  const t = useT()
  const url = mapsUrl(loc, Capacitor.getPlatform(), t.locale)
  const native = Capacitor.isNativePlatform()
  return (
    <div>
      <span className={label}>{t('nlink.location_label')}</span>
      <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
        {loc.place && <p className="break-words text-base font-medium text-slate-100">{loc.place}</p>}
        {locationLines(loc, t.locale).map((l, i) => (
          <p key={i} className="break-words text-sm text-slate-300">
            {l}
          </p>
        ))}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            // Inside the app the web view hands the address to the phone
            // (Apple Maps, or Android's geo: handler) rather than opening it.
            if (native) {
              e.preventDefault()
              window.location.href = url
            }
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <PinMapGlyph small />
          {t('nlink.open_maps')}
        </a>
      </div>
    </div>
  )
}

/** Link to contact: tick the people in the book this note is about. Each tick saves. */
function ContactPicker({ note, onClose }: { note: Note; onClose: () => void }) {
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const patch = useNoteStore((s) => s.patch)
  const [q, setQ] = useState('')
  const linked = new Set(note.contactIds ?? [])
  const shown = useMemo(() => {
    const f = fold(q.trim())
    return contacts
      .filter((c) => !c.listOnly || linked.has(c.id))
      .filter((c) => !f || fold(`${c.name} ${c.email} ${c.company ?? ''}`).includes(f))
      .sort((a, b) => Number(linked.has(b.id)) - Number(linked.has(a.id)) || a.name.localeCompare(b.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, q, note.contactIds])
  const toggle = (cid: string) => {
    const next = linked.has(cid) ? [...linked].filter((x) => x !== cid) : [...linked, cid]
    void patch(note.id, { contactIds: next.length ? next : undefined })
  }
  return (
    <Modal title={t('nlink.contact')} onClose={onClose} backLabel={note.title || t('c.untitled')}>
      <input
        className={`${inputCls} mb-3`}
        type="search"
        value={q}
        aria-label={t('nlink.search')}
        placeholder={t('nlink.search')}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocusOK()}
      />
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{t('nlink.none')}</p>
      ) : (
        <ul className="space-y-1">
          {shown.map((c) => {
            const on = linked.has(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(c.id)}
                  className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      on ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-500 bg-slate-950'
                    }`}
                  >
                    {on && (
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
                        <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-slate-100">{c.name || t('c.unnamed')}</span>
                    {(c.company || c.email) && <span className="block truncate text-xs text-slate-500">{c.company || c.email}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!phoneScreens() && (
        <div className="mt-4 flex justify-end">
          <button type="button" className={btnPrimary} onClick={onClose}>
            {t('c.done')}
          </button>
        </div>
      )}
    </Modal>
  )
}

/**
 * Link to location: Place, Street, City, County, Country, with suggestions
 * from the offline lists (LocationFields). A new one starts in this device's
 * country, or — with Tune this app ▸ Fill in my current location — in the
 * nearest town.
 */
function LocationEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const t = useT()
  const patch = useNoteStore((s) => s.patch)
  const [loc, setLoc] = useState<Location>(() => note.location ?? newLocation())
  // A note made in the last hour counts as new for "Fill in my current location".
  const [isNew] = useState(() => !note.location && Date.now() - note.createdAt < 60 * 60_000)
  useCurrentLocation(isNew, (here) => setLoc((l) => ({ ...l, ...here })))
  const ok = hasLocation(loc)
  return (
    <Modal phone="sheet" title={t('nlink.location')} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void patch(note.id, { location: ok ? loc : undefined })
          onClose()
        }}
      >
        <LocationFields value={loc} onChange={setLoc} />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {note.location ? (
            <button
              type="button"
              className={btnSubtle}
              onClick={() => {
                void patch(note.id, { location: undefined })
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

/**
 * The note's form (Fine-tune, and a new note): its title and its text. It
 * saves itself as it closes — the back button, the left-edge swipe, Android's
 * back, Escape — and a new note left empty is not kept. A new note then opens
 * on its view.
 */
function NoteForm({ id }: { id: string }) {
  const t = useT()
  const kit = usePhoneKit()
  const existing = useNoteStore((s) => (id === 'new' ? undefined : s.notes.find((n) => n.id === id)))
  const save = useNoteStore((s) => s.save)
  const remove = useNoteStore((s) => s.remove)
  const close = useNoteStore((s) => s.edit)
  const [title, setTitle] = useState(() => existing?.title ?? useNoteStore.getState().prefillTitle ?? '')
  const [details, setDetails] = useState(existing?.details ?? '')
  const [templateId] = useState(() => existing?.templateId ?? useNoteStore.getState().newTemplate ?? undefined)
  const template = useNoteStore((s) => s.templates.find((x) => x.id === templateId))
  const [fields, setFields] = useState<Record<string, string>>(() => ({ ...(existing?.fields ?? {}) }))
  const [confirming, setConfirming] = useState(false)
  const titleId = useId()
  const detailsId = useId()
  const detailsRef = useRef<HTMLTextAreaElement>(null)
  useTypingRoom(detailsRef, Boolean(kit))
  const empty = !title.trim() && !details.trim() && !Object.values(fields).some((v) => v.trim())
  // Fine-tune on the phone leaves out what the note's page edits in place
  // (James, 2026-10-27): the title (typed into the page's bar) and the text.
  const onPage = Boolean(kit && existing)

  const done = () => {
    if (empty && !existing) close(null)
    else if (empty && existing) setConfirming(true)
    else {
      // A note from a template with no title of its own takes its first text
      // field's value ("Middlemarch" for a Book), so the list has a name for it.
      const first = template?.fields.find((f) => f.type === 'text' && fields[f.id]?.trim())
      void save({ id: existing?.id, title: title.trim() || (first ? fields[first.id].trim() : ''), details, templateId, fields })
    }
  }

  return (
    <Modal
      title={existing ? t('notes.fine_tune') : t('add_note')}
      onClose={done}
      backLabel={existing ? existing.title || t('c.untitled') : kit?.t('tab_notes')}
    >
      <div className="space-y-4">
        {!onPage && (
          <div>
            <label htmlFor={titleId} className={label}>
              {t('notes.title')}
            </label>
            <input
              id={titleId}
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('notes.title_placeholder')}
              autoFocus={autoFocusOK() && !existing}
            />
          </div>
        )}
        {template && template.fields.length > 0 && (
          <fieldset className="space-y-4 rounded-xl border border-slate-800 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-400">{template.name}</legend>
            {template.fields.map((f) => (
              <FieldInput key={f.id} field={f} value={fields[f.id] ?? ''} onChange={(v) => setFields((x) => ({ ...x, [f.id]: v }))} />
            ))}
          </fieldset>
        )}
        {!onPage && (
          <div>
            <label htmlFor={detailsId} className={label}>
              {t('todo.details')}
            </label>
            <textarea
              ref={detailsRef}
              id={detailsId}
              className={textareaCls}
              rows={template ? 6 : phoneScreens() ? 14 : 10}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {existing ? (
            <button type="button" className={btnSubtle} onClick={() => setConfirming(true)}>
              {t('c.delete')}
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={btnPrimary} onClick={done} disabled={empty && !existing}>
            {t('c.done')}
          </button>
        </div>
      </div>
      {confirming && existing && (
        <Modal phone="sheet" title={t('notes.delete_title')} onClose={() => setConfirming(false)}>
          <p className="text-sm text-slate-300">
            {t('del.ask_before')}
            <span className="font-semibold text-slate-100">{existing.title || t('c.untitled')}</span>
            {t('del.ask_after')}
          </p>
          <p className="mt-2 text-sm text-slate-500">{t('notes.no_undo')}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(false)} autoFocus={autoFocusOK()}>
              {t('c.keep')}
            </button>
            <button type="button" className={btnDanger} onClick={() => void remove(existing.id)}>
              {t('c.delete')}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

/**
 * On a contact's view: the notes linked to them. Swipe left to unlink (with
 * Undo), right to pin or unpin the note. Nothing when there are none.
 */
export function LinkedNotes({ contactId }: { contactId: string }) {
  const t = useT()
  const notes = useNoteStore((s) => s.notes)
  const view = useNoteStore((s) => s.view)
  const patch = useNoteStore((s) => s.patch)
  const setPinned = useNoteStore((s) => s.setPinned)
  const linked = notes.filter((n) => n.contactIds?.includes(contactId))
  const setLink = (noteId: string, on: boolean) => {
    const n = useNoteStore.getState().notes.find((x) => x.id === noteId)
    if (!n) return
    const ids = new Set(n.contactIds ?? [])
    if (on) ids.add(contactId)
    else ids.delete(contactId)
    void patch(noteId, { contactIds: ids.size ? [...ids] : undefined })
  }
  const undo = useUndo<Note[]>(async (ns) => ns.forEach((n) => setLink(n.id, true)))
  const kit = usePhoneKit()
  const sel = useHoldSelect(linked.map((n) => n.id), Boolean(kit))
  if (linked.length === 0 && !undo.item) return null
  return (
    <div>
      {linked.length > 0 && <span className={label}>{t('nlink.linked_notes')}</span>}
      <SelectBar
        select={sel}
        total={linked.length}
        actions={[
          { label: t('todo.pin'), onClick: (ids) => void setPinned(ids, true) },
          {
            label: t('nlink.unlink'),
            danger: true,
            onClick: (ids) => {
              const ns = linked.filter((n) => ids.includes(n.id))
              undo.deleted(ns)
              ns.forEach((n) => setLink(n.id, false))
            },
          },
        ]}
      />
      <SwipeGroup>
        <ul className="space-y-2">
          {linked.map((n) => {
            const name = n.title || t('c.untitled')
            const unlink = () => {
              undo.deleted([n])
              setLink(n.id, false)
            }
            const pin = () => void setPinned([n.id], !n.pinnedAt)
            return (
              <li key={n.id}>
                <SwipeItem
                  id={n.id}
                  select={sel}
                  name={name}
                  left={pinSwipe(Boolean(n.pinnedAt), name, pin)}
                  right={removeSwipe('unlink', t('nlink.unlink'), t('nlink.unlink_label', { name }), unlink)}
                  focus={[
                    { label: n.pinnedAt ? t('todo.unpin_label', { title: name }) : t('todo.pin_label', { title: name }), onClick: pin },
                    { label: t('nlink.unlink_label', { name }), onClick: unlink },
                  ]}
                >
                  <button
                    type="button"
                    onClick={() => view(n.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-left hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{name}</span>
                  </button>
                </SwipeItem>
              </li>
            )
          })}
        </ul>
      </SwipeGroup>
      {undo.item && (
        <UndoBar
          title=""
          text={undo.item.length === 1 ? t('nlink.unlinked', { name: undo.item[0].title || t('c.untitled') }) : t.plural('sel.unlinked', undo.item.length)}
          onUndo={() => void undo.undo()}
        />
      )}
    </div>
  )
}

/**
 * A note's linked people, as rows (they used to be chips): tap to open the
 * person; swipe left to unlink (with Undo), right to call them (or email them
 * when there is no number).
 */
function LinkedPeople({ note, people, onOpen }: { note: Note; people: Contact[]; onOpen: (id: string) => void }) {
  const t = useT()
  const patch = useNoteStore((s) => s.patch)
  const setLink = (cid: string, on: boolean) => {
    const n = useNoteStore.getState().notes.find((x) => x.id === note.id)
    if (!n) return
    const ids = new Set(n.contactIds ?? [])
    if (on) ids.add(cid)
    else ids.delete(cid)
    void patch(note.id, { contactIds: ids.size ? [...ids] : undefined })
  }
  const undo = useUndo<Contact[]>(async (cs) => cs.forEach((c) => setLink(c.id, true)))
  const kit = usePhoneKit()
  const sel = useHoldSelect(people.map((c) => c.id), Boolean(kit))
  if (people.length === 0 && !undo.item) return null
  return (
    <div>
      {people.length > 0 && <span className={label}>{t('nlink.contacts_label')}</span>}
      <SelectBar
        select={sel}
        total={people.length}
        actions={[
          {
            label: t('nlink.unlink'),
            danger: true,
            onClick: (ids) => {
              const cs = people.filter((c) => ids.includes(c.id))
              undo.deleted(cs)
              cs.forEach((c) => setLink(c.id, false))
            },
          },
        ]}
      />
      <SwipeGroup>
        <ul className="space-y-2">
          {people.map((c) => {
            const name = c.name || t('c.unnamed')
            const unlink = () => {
              undo.deleted([c])
              setLink(c.id, false)
            }
            const phone = c.phone.replace(/[^\d+]/g, '')
            const email = c.email.trim()
            const reach = phone
              ? actionSwipe('call', t('action_call'), t('nlink.call_label', { name }), () => (window.location.href = `tel:${phone}`))
              : email
                ? actionSwipe('mail', t('action_email'), t('nlink.email_label', { name }), () => (window.location.href = `mailto:${email}`))
                : undefined
            return (
              <li key={c.id}>
                <SwipeItem
                  id={c.id}
                  select={sel}
                  name={name}
                  left={reach}
                  right={removeSwipe('unlink', t('nlink.unlink'), t('nlink.unlink_person', { name }), unlink)}
                  focus={[{ label: t('nlink.unlink_person', { name }), onClick: unlink }]}
                >
                  <button
                    type="button"
                    onClick={() => onOpen(c.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-left hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <span className="text-orange-400">
                      <PersonGlyph />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-100">{name}</span>
                      {(c.company || c.email || c.phone) && <span className="block truncate text-xs text-slate-500">{c.company || c.phone || c.email}</span>}
                    </span>
                  </button>
                </SwipeItem>
              </li>
            )
          })}
        </ul>
      </SwipeGroup>
      {undo.item && (
        <UndoBar
          title=""
          text={undo.item.length === 1 ? t('nlink.unlinked', { name: undo.item[0].name || t('c.unnamed') }) : t.plural('sel.unlinked', undo.item.length)}
          onUndo={() => void undo.undo()}
        />
      )}
    </div>
  )
}

const g = (small?: boolean) => ({
  viewBox: '0 0 24 24',
  className: small ? 'h-4 w-4' : 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})
const PersonGlyph = ({ small }: { small?: boolean }) => (
  <svg {...g(small)}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
)
const PinMapGlyph = ({ small }: { small?: boolean }) => (
  <svg {...g(small)}>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
)
const NoteGlyph = () => (
  <svg {...g()}>
    <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />
  </svg>
)
const TemplateGlyph = () => (
  <svg {...g()}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
    <path d="M8 9h8M8 13h3M13 13h3M8 17h3M13 17h3" />
  </svg>
)
