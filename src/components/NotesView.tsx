import { useId, useMemo, useRef, useState } from 'react'
import { AddTyped, ListSearch } from './ListSearch'
import { compareNotes, matchesNote, noteText, preview, type Note } from '../lib/notes'
import { useNoteStore } from '../stores/noteStore'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls, label, textareaCls } from './ui'
import { autoFocusOK, usePhoneKit } from '../native/kit'
import { useNativeNav } from '../native/nav'
import { copyText } from '../lib/clipboard'
import { phoneScreens } from '../native/shell'
import { useT } from '../i18n'

/**
 * The Notes tab (James, 2026-10-23), there only with Tune this app ▸ Notes
 * on. Built the way the To-do tab is (TodoView): a list, newest edited first,
 * each a title and its first line; a tap opens the note (a page on the
 * phone), and the note saves itself as it is closed.
 *
 * Search: on a phone it is folded away above the list and pulled down, like
 * the contact list's (SearchDrawer); a tap on the Notes tab while on it opens
 * it too. Everywhere else the box is on show.
 */
export function NotesView() {
  const t = useT()
  const notes = useNoteStore((s) => s.notes)
  const loaded = useNoteStore((s) => s.loaded)
  const editing = useNoteStore((s) => s.editing)
  const edit = useNoteStore((s) => s.edit)
  const query = useNoteStore((s) => s.query)
  const setQuery = useNoteStore((s) => s.setQuery)
  const startNote = useNoteStore((s) => s.startNote)

  const sorted = useMemo(() => [...notes].sort(compareNotes), [notes])
  const shown = useMemo(() => sorted.filter((n) => matchesNote(n, query)), [sorted, query])
  const searching = query.trim() !== ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">{t('tab_notes')}</h1>
          <p className="text-sm text-slate-500">{t('notes.intro')}</p>
        </div>
        {/* On the phone the top bar's + does this. */}
        {!phoneScreens() && (
          <button type="button" className={btnPrimary} onClick={() => edit('new')}>
            {t('c.add_new')}
          </button>
        )}
      </div>

      <ListSearch value={query} onChange={setQuery} label={t('notes.search')} />
      {/* What was typed, as a new note's title (James, 2026-10-23). */}
      <AddTyped text={query} onAdd={(title) => startNote(title)} />

      {loaded && notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">
            {phoneScreens() ? t('notes.none_phone') : t('notes.none')}
          </p>
        </div>
      ) : shown.length === 0 && searching ? (
        <p className="rounded-2xl border border-dashed border-slate-800 px-6 py-8 text-center text-sm text-slate-400">
          {t('notes.no_match')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((n) => (
            <li key={n.id}>
              <NoteRow note={n} onOpen={() => edit(n.id)} />
            </li>
          ))}
        </ul>
      )}

      {editing && <NotePage key={editing} id={editing} />}
    </div>
  )
}

function NoteRow({ note, onOpen }: { note: Note; onOpen: () => void }) {
  const t = useT()
  const line = preview(note)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <p className="truncate font-semibold text-slate-100">{note.title || t('c.untitled')}</p>
      {line && <p className="truncate text-sm text-slate-400">{line}</p>}
    </button>
  )
}

/**
 * One note, open: its title and its text, the whole of it. It saves itself as
 * it closes (the back button, the left-edge swipe, Android's back, Escape):
 * a note is somewhere you write, and asking "Save?" on the way out of one is
 * the app doubting what you just did. A new note left empty is not kept.
 */
/**
 * Copy the note to the clipboard. The phone says so in its toast (a status
 * line screen readers announce); the website turns the button to "Copied"
 * for a moment, with the same words in a live region.
 */
function CopyNote({ title, details }: { title: string; details: string }) {
  const t = useT()
  const kit = usePhoneKit()
  const say = useNativeNav((s) => s.say)
  const [said, setSaid] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const text = noteText(title, details)
  const copy = async () => {
    const ok = await copyText(text)
    const message = ok ? t('notes.copied') : t('export.copy_failed')
    if (kit) say(message)
    else {
      setSaid(message)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setSaid(null), 2000)
    }
  }
  return (
    <>
      <button
        type="button"
        className={`${btnSubtle} mb-1.5 flex items-center gap-1.5`}
        onClick={() => void copy()}
        disabled={!text}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
          <path d="M10.5 3.5V3a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" strokeLinecap="round" />
        </svg>
        {said ?? t('notes.copy')}
      </button>
      {!kit && (
        <span className="sr-only" role="status" aria-live="polite">
          {said ?? ''}
        </span>
      )}
    </>
  )
}

function NotePage({ id }: { id: string }) {
  const t = useT()
  const existing = useNoteStore((s) => (id === 'new' ? undefined : s.notes.find((n) => n.id === id)))
  const save = useNoteStore((s) => s.save)
  const remove = useNoteStore((s) => s.remove)
  const close = useNoteStore((s) => s.edit)
  const [title, setTitle] = useState(() => existing?.title ?? useNoteStore.getState().prefillTitle ?? '')
  const [details, setDetails] = useState(existing?.details ?? '')
  const [confirming, setConfirming] = useState(false)
  const titleId = useId()
  const detailsId = useId()
  const empty = !title.trim() && !details.trim()

  const done = () => {
    if (empty && !existing) close(null)
    else if (empty && existing) setConfirming(true)
    else void save({ id: existing?.id, title, details })
  }

  return (
    <Modal title={existing ? existing.title || t('notes.note') : t('add_note')} onClose={done} backLabel={t('tab_notes')}>
      <div className="space-y-4">
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
        <div>
          {/* Copy sits beside the note (James, 2026-10-25), as Full screen
              does on a contact's notes: the label and the button share a row. */}
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={detailsId} className={label}>
              {t('todo.details')}
            </label>
            <CopyNote title={title} details={details} />
          </div>
          <textarea
            id={detailsId}
            className={textareaCls}
            rows={phoneScreens() ? 14 : 10}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
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
