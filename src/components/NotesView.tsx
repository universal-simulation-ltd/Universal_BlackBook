import { useCallback, useId, useMemo, useRef, useState, type RefObject } from 'react'
import {
  PullDrawer,
  TOUCH_PHONE_QUERY,
  insideScrolledChild,
  modalIsOpen,
  openThenFocus,
  useMediaQuery,
  useSearchRequests,
} from '@unisim/sdk'
import { compareNotes, matchesNote, preview, type Note } from '../lib/notes'
import { useNoteStore } from '../stores/noteStore'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls, label, textareaCls } from './ui'
import { autoFocusOK } from '../native/kit'
import { phoneScreens } from '../native/shell'

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
  const notes = useNoteStore((s) => s.notes)
  const loaded = useNoteStore((s) => s.loaded)
  const editing = useNoteStore((s) => s.editing)
  const edit = useNoteStore((s) => s.edit)
  const query = useNoteStore((s) => s.query)
  const phone = useMediaQuery(TOUCH_PHONE_QUERY)

  const sorted = useMemo(() => [...notes].sort(compareNotes), [notes])
  const shown = useMemo(() => sorted.filter((n) => matchesNote(n, query)), [sorted, query])
  const searching = query.trim() !== ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">Notes</h1>
          <p className="text-sm text-slate-500">Notes of your own, newest first.</p>
        </div>
        {/* On the phone the top bar's + does this. */}
        {!phoneScreens() && (
          <button type="button" className={btnPrimary} onClick={() => edit('new')}>
            Add new
          </button>
        )}
      </div>

      {phone ? <PhoneNoteSearch /> : notes.length > 0 && <NoteSearchBox />}

      {loaded && notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">
            {phoneScreens() ? 'No notes yet. Tap + to write the first.' : 'No notes yet. Write the first with Add new.'}
          </p>
        </div>
      ) : shown.length === 0 && searching ? (
        <p className="rounded-2xl border border-dashed border-slate-800 px-6 py-8 text-center text-sm text-slate-400">
          No note has that in it.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

function NoteSearchBox({ input }: { input?: RefObject<HTMLInputElement> }) {
  const query = useNoteStore((s) => s.query)
  const setQuery = useNoteStore((s) => s.setQuery)
  return (
    <div className="relative">
      <input
        ref={input}
        type="search"
        enterKeyHint="search"
        className={`${inputCls} pl-9`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search notes"
        aria-label="Search notes"
      />
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13.5 13.5 3 3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

const notAPull = (e: TouchEvent) => modalIsOpen() || insideScrolledChild(e.target)

/** The phone's way in: pull down for the box, again for the keyboard (BRANDING.md). */
function PhoneNoteSearch() {
  const query = useNoteStore((s) => s.query)
  const [pulled, setPulled] = useState(false)
  const searching = query.trim() !== ''
  const input = useRef<HTMLInputElement>(null)
  const open = useCallback(() => setPulled(true), [])
  const close = useCallback(() => setPulled(false), [])
  const focus = useCallback(() => input.current?.focus({ preventScroll: true }), [])
  useSearchRequests({
    onOpen: () => openThenFocus(() => setPulled(true), input, {}),
    onShut: () => {
      if (searching) return
      input.current?.blur()
      setPulled(false)
    },
  })
  return (
    <PullDrawer
      shown={pulled || searching}
      onOpen={open}
      onScrolledAway={searching ? undefined : close}
      onPullAgain={focus}
      ignoreTouch={notAPull}
      containOverscroll
      innerClassName="pb-1"
    >
      <NoteSearchBox input={input} />
    </PullDrawer>
  )
}

function NoteRow({ note, onOpen }: { note: Note; onOpen: () => void }) {
  const line = preview(note)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <p className="truncate font-semibold text-slate-100">{note.title || 'Untitled'}</p>
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
function NotePage({ id }: { id: string }) {
  const existing = useNoteStore((s) => (id === 'new' ? undefined : s.notes.find((n) => n.id === id)))
  const save = useNoteStore((s) => s.save)
  const remove = useNoteStore((s) => s.remove)
  const close = useNoteStore((s) => s.edit)
  const [title, setTitle] = useState(existing?.title ?? '')
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
    <Modal title={existing ? existing.title || 'Note' : 'New note'} onClose={done} backLabel="Notes">
      <div className="space-y-4">
        <div>
          <label htmlFor={titleId} className={label}>
            Title
          </label>
          <input
            id={titleId}
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What it is about"
            autoFocus={autoFocusOK() && !existing}
          />
        </div>
        <div>
          <label htmlFor={detailsId} className={label}>
            Details
          </label>
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
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={btnPrimary} onClick={done} disabled={empty && !existing}>
            Done
          </button>
        </div>
      </div>
      {confirming && existing && (
        <Modal phone="sheet" title="Delete note" onClose={() => setConfirming(false)}>
          <p className="text-sm text-slate-300">
            Delete <span className="font-semibold text-slate-100">{existing.title || 'Untitled'}</span>?
          </p>
          <p className="mt-2 text-sm text-slate-500">There is no undo.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(false)} autoFocus={autoFocusOK()}>
              Keep
            </button>
            <button type="button" className={btnDanger} onClick={() => void remove(existing.id)}>
              Delete
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
