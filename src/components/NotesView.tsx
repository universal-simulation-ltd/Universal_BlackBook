import { useId, useMemo, useRef, useState } from 'react'
import { SwipeRow } from './SwipeRow'
import { deleteSwipe, FocusActions, pinSwipe, UndoBar, useHold, useLeaveSelection, useUndo } from './SwipeActions'
import type { Side } from '../lib/swipe'
import { Modal } from './Modal'
import { copyText } from '../lib/clipboard'
import { usePhoneKit } from '../native/kit'
import { useNativeNav } from '../native/nav'
import { useScrollHint } from '@unisim/sdk'
import { showValue, type NoteTemplate } from '../lib/templates'
import { AddTyped, ListSearch } from './ListSearch'
import { compareNotes, matchesNote, noteText, preview, type Note } from '../lib/notes'
import { useNoteStore } from '../stores/noteStore'
import { btnDanger, btnGhost, btnPrimary, btnSubtle } from './ui'
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

  // Swipe right to pin, left to delete with Undo — To-do's swipes
  // (SwipeActions), James 2026-10-25.
  const setPinned = useNoteStore((s) => s.setPinned)
  const removeMany = useNoteStore((s) => s.removeMany)
  const restoreMany = useNoteStore((s) => s.restoreMany)
  const [openRow, setOpenRow] = useState<{ id: string; side: Side } | null>(null)
  const undo = useUndo<Note[]>(restoreMany)
  const removeWithUndo = (list: Note[]) => {
    if (!list.length) return
    undo.deleted(list)
    void removeMany(list.map((n) => n.id))
  }
  const hintId = useId()

  // Selection (James, 2026-10-25: "notes on long tap select the note"): hold
  // a note to select it, then taps add or remove; Select above the list does
  // the same without a hold, and on the website Shift-click selects a run.
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const selecting = selected !== null
  const picked = useMemo(() => (selected ? shown.filter((n) => selected.has(n.id)) : []), [selected, shown])
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const lastIndex = useRef<number | null>(null)
  const toggle = (id: string, index: number, range: boolean) => {
    setSelected((s) => {
      const next = new Set(s)
      if (range && lastIndex.current !== null) {
        const [a, b] = [lastIndex.current, index].sort((x, y) => x - y)
        for (const n of shown.slice(a, b + 1)) next.add(n.id)
      } else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    lastIndex.current = index
  }
  const kit = usePhoneKit()
  const say = useNativeNav((s) => s.say)
  const copyPicked = async () => {
    const ok = await copyText(picked.map((n) => noteText(n.title, n.details)).join('\n\n'))
    if (kit) say(ok ? t('notes.copied') : t('export.copy_failed'))
    setCopied(ok)
    setTimeout(() => setCopied(false), 2000)
  }

  // A hold selects (SwipeActions ▸ useHold), and the phone's ways out.
  const holdStart = useHold((id) => {
    setOpenRow(null)
    setSelected((s) => new Set([...(s ?? []), id]))
  })
  useLeaveSelection(selecting, Boolean(kit), () => setSelected(null))

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
        <>
          {!selecting && shown.length > 0 && (
            <div className="-mb-2 flex justify-end">
              <button type="button" className={btnSubtle} onClick={() => setSelected(new Set())}>
                {t('nsel.select')}
              </button>
            </div>
          )}
          {selecting && (
            <NoteSelectBar
              count={picked.length}
              allPicked={picked.length === shown.length && shown.length > 0}
              allPinned={picked.length > 0 && picked.every((n) => n.pinnedAt)}
              onAll={() => setSelected(picked.length === shown.length ? new Set() : new Set(shown.map((n) => n.id)))}
              onPin={(pin) => {
                void setPinned(picked.map((n) => n.id), pin)
                setSelected(null)
              }}
              onCopy={() => void copyPicked()}
              onDelete={() => setConfirming(true)}
              onDone={() => setSelected(null)}
              copied={copied}
            />
          )}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-describedby={hintId}>
            {shown.map((n, i) => {
              const tpl = n.templateId ? byTemplate.get(n.templateId) : undefined
              return (
                <li key={n.id} className="bb-todo relative" onTouchStart={holdStart(n.id)}>
                  {selecting ? (
                    <NoteRow
                      note={n}
                      template={tpl}
                      selected={selected.has(n.id)}
                      onOpen={(e) => toggle(n.id, i, e?.shiftKey === true)}
                    />
                  ) : (
                    <SwipeRow
                      open={openRow?.id === n.id ? openRow.side : null}
                      onOpenChange={(side) => setOpenRow(side ? { id: n.id, side } : null)}
                      left={pinSwipe(Boolean(n.pinnedAt), n.title, () => {
                        setOpenRow(null)
                        void setPinned([n.id], !n.pinnedAt)
                      })}
                      right={deleteSwipe(n.title, () => {
                        setOpenRow(null)
                        removeWithUndo([n])
                      })}
                    >
                      <div className="relative h-full">
                        <NoteRow note={n} template={tpl} onOpen={() => view(n.id)} />
                        <FocusActions
                          actions={[
                            { label: t('nsel.select_label', { title: n.title || t('c.untitled') }), onClick: () => setSelected(new Set([n.id])) },
                            {
                              label: n.pinnedAt ? t('todo.unpin_label', { title: n.title }) : t('todo.pin_label', { title: n.title }),
                              onClick: () => void setPinned([n.id], !n.pinnedAt),
                            },
                            { label: t('todo.delete_label', { title: n.title }), onClick: () => removeWithUndo([n]) },
                          ]}
                        />
                      </div>
                    </SwipeRow>
                  )}
                </li>
              )
            })}
          </ul>
          <p id={hintId} className="sr-only">
            {t('nsel.hint')}
          </p>
        </>
      )}
      {undo.item && (
        <UndoBar
          title={undo.item.length === 1 ? undo.item[0].title : ''}
          text={undo.item.length === 1 ? undefined : t.plural('nsel.deleted', undo.item.length)}
          onUndo={() => void undo.undo()}
        />
      )}
      {confirming && (
        <Modal phone="sheet" title={t('nsel.delete_title')} onClose={() => setConfirming(false)}>
          <p className="text-sm text-slate-300">{t.plural('nsel.delete_body', picked.length)}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(false)}>
              {t('c.keep')}
            </button>
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                setConfirming(false)
                removeWithUndo(picked)
                setSelected(null)
              }}
            >
              {t('c.delete')}
            </button>
          </div>
        </Modal>
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

function NoteRow({
  note,
  template,
  onOpen,
  selected,
}: {
  note: Note
  template?: NoteTemplate
  onOpen: (e?: React.MouseEvent) => void
  /** In selection mode: whether it is ticked (the card is the tick box). */
  selected?: boolean
}) {
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
      onClick={(e) => onOpen(e)}
      {...(selected !== undefined ? { role: 'checkbox', 'aria-checked': selected } : {})}
      className={`relative flex h-full w-full flex-col gap-1 rounded-xl border bg-slate-900 p-3.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
        selected ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800'
      } ${selected !== undefined ? 'pl-11' : ''}`}
    >
      {selected !== undefined && (
        <span
          aria-hidden
          className={`absolute left-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-md border ${
            selected ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-500 bg-slate-950'
          }`}
        >
          {selected && (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      )}
      <p className="flex min-w-0 items-center gap-2">
        {note.pinnedAt && (
          <span className="shrink-0 text-orange-400" title={t('todo.pinned')}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 3h6l-1 6 3 3H7l3-3-1-6ZM12 12v9" />
            </svg>
            <span className="sr-only">{t('todo.pinned')}</span>
          </span>
        )}
        <span className="min-w-0 truncate font-semibold text-slate-100">{note.title || t('c.untitled')}</span>
        {template && (
          <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-400">{template.name}</span>
        )}
      </p>
      {line && <p className="truncate text-sm text-slate-400">{line}</p>}
    </button>
  )
}

/** Over the list while selecting: how many, then Pin / Unpin, Copy, Delete, Done. */
function NoteSelectBar({
  count,
  allPicked,
  allPinned,
  onAll,
  onPin,
  onCopy,
  onDelete,
  onDone,
  copied,
}: {
  count: number
  allPicked: boolean
  allPinned: boolean
  onAll: () => void
  onPin: (pin: boolean) => void
  onCopy: () => void
  onDelete: () => void
  onDone: () => void
  copied: boolean
}) {
  const t = useT()
  const none = count === 0
  const act = `${btnSubtle} disabled:cursor-not-allowed disabled:opacity-40`
  return (
    <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border border-slate-800 bg-slate-900 px-2 py-1.5">
      <p className="mr-auto px-1 text-sm font-medium tabular-nums text-slate-200" aria-live="polite">
        {t('sel.count', { count })}
      </p>
      <button type="button" className={act} onClick={onAll}>
        {allPicked ? t('sel.none') : t('sel.all')}
      </button>
      <button type="button" className={act} onClick={() => onPin(!allPinned)} disabled={none}>
        {allPinned ? t('todo.unpin') : t('todo.pin')}
      </button>
      <button type="button" className={act} onClick={onCopy} disabled={none}>
        {copied ? t('notes.copied') : t('notes.copy')}
      </button>
      <button type="button" className={`${act} text-rose-300 hover:bg-rose-950 hover:text-rose-200`} onClick={onDelete} disabled={none}>
        {t('c.delete')}
      </button>
      <button type="button" className={`${act} text-orange-300`} onClick={onDone}>
        {t('c.done')}
      </button>
    </div>
  )
}
