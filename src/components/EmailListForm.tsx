import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { fold, matchesText } from '../lib/filter'
import { isList } from '../lib/lists'
import type { Contact, Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { Modal } from './Modal'
import { NotesFullscreen } from './NotesFullscreen'
import { ListChip } from './ListChip'
import { TagPicker } from './TagPicker'
import { btnGhost, btnPrimary, inputCls, label } from './ui'

// `label` minus its bottom margin: the grid's gap spaces the headings, and
// adding `mb-0` to `label` loses to its `mb-1.5` by CSS source order (ui.tsx).
const heading = 'block text-xs font-semibold uppercase tracking-wide text-slate-400'

interface Row {
  key: number
  name: string
  email: string
  notes: string
  company: string
  /** ＋ ▸ Add company was chosen: the row shows a Company field. */
  withCompany?: boolean
  /** Linked to this existing contact (＋ ▸ Link to a contact). */
  contactId?: string
}

let nextKey = 0
const blankRow = (): Row => ({ key: nextKey++, name: '', email: '', notes: '', company: '' })
const filled = (r: Row) => r.name.trim() !== '' || r.email.trim() !== ''

/**
 * "Add new" ▸ Email list — many people at once, a name and an email each
 * (owner's request, 2026-09-17, for keeping mailing lists in the book).
 *
 * ⚠️ **There is always ONE empty row at the bottom.** Typing into it is what
 * makes the next one, so there is no "Add row" button to find and the list is
 * as long as the typing. Empty rows are ignored on save, including that last
 * one.
 *
 * Enter moves down a field (name → email → next row's name) rather than
 * submitting: in a grid people fill in at speed, Enter-submits would save a
 * half-typed list on the first slip.
 *
 * Each row ends in a ＋ with three things behind it: a note for that person,
 * full screen (the contact form's editor), **Add company** (owner's request,
 * 2026-09-18), which opens a Company field under the row, and **Link to a
 * contact** — pick
 * somebody already in the book, see which lists they are on, and the row is
 * them. Once a row has a note the ＋ becomes a paper-and-pencil; linked, a
 * chain. It is disabled on the empty last row: a note with nobody to belong
 * to would be dropped on save.
 *
 * ⚠️ **A list is a tag with `kind: 'list'`** (lib/lists.ts). Saving makes the
 * list — or finds the one of that name — and puts everybody on it. Existing
 * lists sit under the name field so one can be added to again, and "Tags for
 * this list" are the list's OWN tags, not its members'. Somebody already in
 * the book joins the list rather than being added twice; new people are
 * list-only and stay off Contacts (`planListImport`, via `saveEmailList`).
 */
export function EmailListForm({
  initialName = '',
  onCancel,
  onSaved,
}: {
  /** Opened from a list's own page: that list, already chosen. */
  initialName?: string
  onCancel: () => void
  onSaved: () => void
}) {
  const all = useBookStore((s) => s.tags)
  const lists = useMemo(() => all.filter(isList), [all])
  const saveEmailList = useBookStore((s) => s.saveEmailList)
  const [listName, setListName] = useState(initialName)
  const [listTagIds, setListTagIds] = useState<string[]>([])
  /** The row whose ＋ menu is open, and the row being linked. */
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [linking, setLinking] = useState<number | null>(null)
  const [rows, setRows] = useState<Row[]>(() => [blankRow()])
  /** The row whose note is open full screen. */
  const [noting, setNoting] = useState<number | null>(null)
  const notingRow = rows.find((r) => r.key === noting)
  const grid = useRef<HTMLDivElement>(null)

  const people = rows.filter(filled)
  const existingList = lists.find((t) => fold(t.name) === fold(listName))
  // Choosing an existing list brings its own tags into the picker, so saving
  // does not quietly wipe them.
  const existingId = existingList?.id
  useEffect(() => {
    if (existingId) setListTagIds(lists.find((t) => t.id === existingId)?.tagIds ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingId])
  const valid = listName.trim() !== '' && people.length > 0

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => {
      const next = rs.map((r) => (r.key === key ? { ...r, ...patch } : r))
      return filled(next[next.length - 1]) ? [...next, blankRow()] : next
    })

  // Enter → the next input in the grid, in reading order.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const inputs = Array.from(grid.current?.querySelectorAll('input') ?? [])
    const at = inputs.indexOf(e.currentTarget)
    // The row a keystroke just created renders on the next frame.
    requestAnimationFrame(() => {
      const fresh = Array.from(grid.current?.querySelectorAll('input') ?? [])
      fresh[at + 1]?.focus()
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    await saveEmailList(listName, people, listTagIds)
    onSaved()
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div>
        <label className={label} htmlFor="el-name">
          List name
        </label>
        <input
          id="el-name"
          className={inputCls}
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            grid.current?.querySelector('input')?.focus()
          }}
          placeholder="Book club"
          autoFocus={!initialName}
          autoComplete="off"
        />
        {lists.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">Or add to:</span>
            {lists.map((t) => (
              <ListChip
                key={t.id}
                name={t.name}
                selected={existingList?.id === t.id}
                onClick={() => setListName(existingList?.id === t.id ? '' : t.name)}
              />
            ))}
          </div>
        )}
      </div>

      <div ref={grid} className="grid grid-cols-[1fr_1fr_auto] items-center gap-x-2 gap-y-2">
        <span className={heading}>Name</span>
        <span className={heading}>Email</span>
        {/* An empty cell over the note buttons, not an `sr-only` heading: that is
            absolutely positioned, takes no grid cell, and shifts every row one
            column along. The buttons carry their own labels. */}
        <span aria-hidden />
        {rows.map((r, i) => (
          <div key={r.key} className="contents">
            <input
              className={inputCls}
              value={r.name}
              onChange={(e) => update(r.key, { name: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={i === 0 ? 'Sam Okonkwo' : ''}
              aria-label={`Name, row ${i + 1}`}
              autoComplete="off"
            />
            <input
              className={inputCls}
              // Text with an email keyboard, not `type="email"` — see the note
              // on the Email field in ContactForm.
              type="text"
              inputMode="email"
              value={r.email}
              onChange={(e) => update(r.key, { email: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={i === 0 ? 'sam@example.com' : ''}
              aria-label={`Email, row ${i + 1}`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuFor(menuFor === r.key ? null : r.key)}
                aria-expanded={menuFor === r.key}
                aria-haspopup="menu"
                aria-label={`More for row ${i + 1}${r.notes.trim() ? ', has a note' : ''}${r.contactId ? ', linked to a contact' : ''}`}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-30 ${
                  r.notes.trim() || r.contactId
                    ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {r.notes.trim() ? <NoteGlyph /> : r.contactId ? <LinkGlyph /> : <PlusGlyph />}
              </button>
              {menuFor === r.key && (
                <RowMenu
                  hasNote={r.notes.trim() !== ''}
                  hasCompany={Boolean(r.withCompany)}
                  onCompany={() => {
                    update(r.key, { withCompany: true })
                    // The field renders on the next frame.
                    requestAnimationFrame(() =>
                      grid.current?.querySelector<HTMLInputElement>(`[data-company="${r.key}"]`)?.focus(),
                    )
                  }}
                  linked={Boolean(r.contactId)}
                  onClose={() => setMenuFor(null)}
                  onNote={() => setNoting(r.key)}
                  onLink={() => setLinking(r.key)}
                  onUnlink={() => update(r.key, { contactId: undefined })}
                />
              )}
            </div>
            {r.withCompany && (
              <input
                data-company={r.key}
                className={`${inputCls} col-span-2`}
                value={r.company}
                onChange={(e) => update(r.key, { company: e.target.value })}
                onKeyDown={onKeyDown}
                placeholder="Company"
                aria-label={`Company, row ${i + 1}`}
                autoComplete="off"
              />
            )}
            {r.withCompany && <span aria-hidden />}
            {r.contactId && (
              <p className="col-span-3 -mt-1 text-xs text-slate-500">
                <span aria-hidden>🔗</span> Linked to an existing contact
              </p>
            )}
          </div>
        ))}
      </div>

      <div>
        <span className={label}>Tags for this list</span>
        <TagPicker value={listTagIds} onChange={setListTagIds} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-4">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary} disabled={!valid}>
          {people.length === 0 ? 'Save' : `Save ${people.length} ${people.length === 1 ? 'person' : 'people'}`}
        </button>
      </div>
      {people.length > 0 && !listName.trim() && <p className="text-xs text-slate-500">Give the list a name first.</p>}

      {notingRow && (
        <NotesFullscreen
          value={notingRow.notes}
          onChange={(notes) => update(notingRow.key, { notes })}
          onClose={() => setNoting(null)}
          name={notingRow.name || notingRow.email}
        />
      )}

      {linking !== null && (
        <LinkPicker
          tags={all}
          onClose={() => setLinking(null)}
          onPick={(c) => {
            const row = rows.find((x) => x.key === linking)
            update(linking, { contactId: c.id, name: c.name, email: c.email || row?.email || '' })
            // Their card's company, shown so the row says who this is. Saving
            // never overwrites it — see planListImport.
            if (c.company && !row?.company.trim()) update(linking, { company: c.company, withCompany: true })
            setLinking(null)
          }}
        />
      )}
    </form>
  )
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  )
}

/** Paper and pencil: this row has a note. */
function NoteGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.5 2.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" />
      <path d="M5.5 7.5h3M5.5 10h4" />
      <path d="m12.2 1.8 2 2L9.5 8.5l-2.4.4.4-2.4 4.7-4.7Z" />
    </svg>
  )
}

/** Behind a row's ＋: the note, and linking the row to an existing contact. */
function RowMenu({
  hasNote,
  hasCompany,
  linked,
  onClose,
  onNote,
  onCompany,
  onLink,
  onUnlink,
}: {
  hasNote: boolean
  hasCompany: boolean
  linked: boolean
  onClose: () => void
  onNote: () => void
  onCompany: () => void
  onLink: () => void
  onUnlink: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [onClose])

  const item =
    'block w-full whitespace-nowrap px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800'
  const run = (fn: () => void) => () => {
    onClose()
    fn()
  }
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40"
    >
      <button type="button" role="menuitem" className={item} onClick={run(onNote)}>
        {hasNote ? 'Edit note' : 'Add a note'}
      </button>
      {!hasCompany && (
        <button type="button" role="menuitem" className={item} onClick={run(onCompany)}>
          Add company
        </button>
      )}
      <button type="button" role="menuitem" className={item} onClick={run(onLink)}>
        {linked ? 'Link to a different contact' : 'Link to a contact'}
      </button>
      {linked && (
        <button type="button" role="menuitem" className={item} onClick={run(onUnlink)}>
          Unlink
        </button>
      )}
    </div>
  )
}

/**
 * Pick an existing contact for a row. Each person shows the lists they are
 * already on — which is how you can tell, before saving, whether somebody is
 * already on this one.
 */
function LinkPicker({ tags, onClose, onPick }: { tags: Tag[]; onClose: () => void; onPick: (c: Contact) => void }) {
  const contacts = useBookStore((s) => s.contacts)
  const [text, setText] = useState('')
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const found = useMemo(
    () =>
      contacts
        .filter((c) => matchesText(c, text))
        .sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }))
        .slice(0, 50),
    [contacts, text],
  )

  return (
    <Modal title="Link to a contact" onClose={onClose}>
      <div className="space-y-3">
        <input
          className={inputCls}
          value={text}
          onChange={(e) => setText(e.target.value)}
          // Inside the Email list <form>: Enter must not save the list.
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          placeholder="Search names and emails…"
          aria-label="Search contacts"
          autoFocus
          autoComplete="off"
        />
        {found.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Nobody matches that.</p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-slate-800 overflow-y-auto">
            {found.map((c) => {
              const onLists = c.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => Boolean(t && isList(t)))
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onPick(c)}
                    className="w-full space-y-1 px-1 py-2.5 text-left hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <span className="block text-sm font-medium text-slate-100">{c.name || c.email}</span>
                    {c.email && <span className="block text-xs text-slate-400">{c.email}</span>}
                    {onLists.length > 0 && (
                      <span className="flex flex-wrap gap-1 pt-0.5">
                        {onLists.map((t) => (
                          <ListChip key={t.id} name={t.name} />
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M7 4.5 8.2 3.3a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L5.5 8" />
    </svg>
  )
}
