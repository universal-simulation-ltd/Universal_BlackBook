import { useMemo } from 'react'
import { AddTyped, ListSearch } from './ListSearch'
import { compareNotes, matchesNote, preview, type Note } from '../lib/notes'
import { useNoteStore } from '../stores/noteStore'
import { btnPrimary } from './ui'
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
  const edit = useNoteStore((s) => s.edit)
  const view = useNoteStore((s) => s.view)
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
              <NoteRow note={n} onOpen={() => view(n.id)} />
            </li>
          ))}
        </ul>
      )}

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
