import { useMemo } from 'react'
import { useScrollHint } from '@unisim/sdk'
import { showValue, type NoteTemplate } from '../lib/templates'
import { AddTyped, ListSearch } from './ListSearch'
import { compareNotes, matchesNote, preview, type Note } from '../lib/notes'
import { useNoteStore } from '../stores/noteStore'
import { btnPrimary } from './ui'
import { NoteImportButton } from './NoteImport'
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
  const newNote = useNoteStore((s) => s.newNote)
  const templates = useNoteStore((s) => s.templates)
  const filter = useNoteStore((s) => s.templateFilter)
  const setFilter = useNoteStore((s) => s.setTemplateFilter)
  const view = useNoteStore((s) => s.view)
  const query = useNoteStore((s) => s.query)
  const setQuery = useNoteStore((s) => s.setQuery)
  const startNote = useNoteStore((s) => s.startNote)

  const sorted = useMemo(() => [...notes].sort(compareNotes), [notes])
  // A filter for a template since deleted shows everything.
  const active = templates.some((x) => x.id === filter) ? filter : null
  const shown = useMemo(
    () => sorted.filter((n) => (!active || n.templateId === active) && matchesNote(n, query)),
    [sorted, query, active],
  )
  const byTemplate = useMemo(() => new Map(templates.map((x) => [x.id, x])), [templates])
  const searching = query.trim() !== ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">{t('tab_notes')}</h1>
          <p className="text-sm text-slate-500">{t('notes.intro')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Notes ▸ Import: OneNote and other files (NoteImport). */}
          <NoteImportButton />
          {/* On the phone the top bar's + does this. */}
          {!phoneScreens() && (
            <button type="button" className={btnPrimary} onClick={() => newNote()}>
              {t('c.add_new')}
            </button>
          )}
        </div>
      </div>

      <ListSearch value={query} onChange={setQuery} label={t('notes.search')} />
      {/* What was typed, as a new note's title (James, 2026-10-23). */}
      <AddTyped text={query} onAdd={(title) => startNote(title)} />

      {templates.length > 0 && notes.length > 0 && (
        <TemplateFilter templates={templates} active={active} onPick={setFilter} />
      )}

      {loaded && notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">
            {phoneScreens() ? t('notes.none_phone') : t('notes.none')}
          </p>
        </div>
      ) : shown.length === 0 && (searching || active) ? (
        <p className="rounded-2xl border border-dashed border-slate-800 px-6 py-8 text-center text-sm text-slate-400">
          {searching ? t('notes.no_match') : t('tpl.filter_none')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((n) => (
            <li key={n.id}>
              <NoteRow note={n} template={n.templateId ? byTemplate.get(n.templateId) : undefined} onOpen={() => view(n.id)} />
            </li>
          ))}
        </ul>
      )}

    </div>
  )
}

/**
 * All · Book · …: the Notes tab by template (James, 2026-10-25). A row that
 * scrolls sideways when there are many, and shows it (BRANDING.md ▸ "A row
 * that scrolls shows it scrolls": the SDK's useScrollHint fades the edge with
 * more beyond it, and the chips are sized so one is cut off there).
 */
function TemplateFilter({ templates, active, onPick }: { templates: NoteTemplate[]; active: string | null; onPick: (id: string | null) => void }) {
  const t = useT()
  const hint = useScrollHint<HTMLDivElement>()
  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
      on ? 'border-orange-500 bg-orange-500/15 text-orange-300' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
    }`
  return (
    <div
      ref={hint.ref}
      role="group"
      aria-label={t('tpl.filter')}
      className={`-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 ${hint.className}`}
      style={hint.style}
    >
      <button type="button" aria-pressed={active === null} className={chip(active === null)} onClick={() => onPick(null)}>
        {t('tpl.all')}
      </button>
      {templates.map((x) => (
        <button key={x.id} type="button" aria-pressed={active === x.id} className={chip(active === x.id)} onClick={() => onPick(active === x.id ? null : x.id)}>
          {x.name}
        </button>
      ))}
    </div>
  )
}

function NoteRow({ note, template, onOpen }: { note: Note; template?: NoteTemplate; onOpen: () => void }) {
  const t = useT()
  // A templated note shows its fields' values ("Middlemarch · George Eliot")
  // where a plain one shows its first line.
  const values = template
    ? template.fields.map((f) => (note.fields?.[f.id] ? showValue(f.type, note.fields[f.id], t.locale) : '')).filter(Boolean).join(' · ')
    : ''
  const line = values || preview(note)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <p className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate font-semibold text-slate-100">{note.title || t('c.untitled')}</span>
        {template && (
          <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-400">{template.name}</span>
        )}
      </p>
      {line && <p className="truncate text-sm text-slate-400">{line}</p>}
    </button>
  )
}
