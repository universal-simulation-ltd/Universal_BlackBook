import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { fold } from '../lib/filter'
import { useBookStore } from '../stores/bookStore'
import { NotesFullscreen } from './NotesFullscreen'
import { TagChip } from './TagChip'
import { btnGhost, btnPrimary, inputCls, label } from './ui'

// `label` minus its bottom margin: the grid's gap spaces the headings, and
// adding `mb-0` to `label` loses to its `mb-1.5` by CSS source order (ui.tsx).
const heading = 'block text-xs font-semibold uppercase tracking-wide text-slate-400'

interface Row {
  key: number
  name: string
  email: string
  notes: string
}

let nextKey = 0
const blankRow = (): Row => ({ key: nextKey++, name: '', email: '', notes: '' })
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
 * Each row ends in a ＋ that opens a note for that person, full screen — the
 * same editor as the contact form's. Once a row has a note the ＋ becomes a
 * paper-and-pencil. It is disabled on the empty last row: a note with nobody
 * to belong to would be dropped on save.
 *
 * ⚠️ **The list name IS a tag.** Saving makes a tag of that name — or finds
 * the one that already exists, case-insensitively — and puts everybody on it,
 * so the list is Filters ▸ that tag, and Copy emails / Export CSV from there.
 * The existing tags sit under the name field so a list can be added to again.
 * Somebody already in the book gains the tag rather than being added twice
 * (`planListImport`, via the store's `saveEmailList`).
 */
export function EmailListForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const tags = useBookStore((s) => s.tags)
  const saveEmailList = useBookStore((s) => s.saveEmailList)
  const [listName, setListName] = useState('')
  const [rows, setRows] = useState<Row[]>(() => [blankRow()])
  /** The row whose note is open full screen. */
  const [noting, setNoting] = useState<number | null>(null)
  const notingRow = rows.find((r) => r.key === noting)
  const grid = useRef<HTMLDivElement>(null)

  const people = rows.filter(filled)
  const existingList = tags.find((t) => fold(t.name) === fold(listName))
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
    await saveEmailList(listName, people)
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
          autoFocus
          autoComplete="off"
        />
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">Or add to:</span>
            {tags.map((t) => (
              <TagChip
                key={t.id}
                name={t.name}
                colour={t.colour}
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
            <button
              type="button"
              onClick={() => setNoting(r.key)}
              disabled={!filled(r)}
              aria-label={`${r.notes.trim() ? 'Edit note' : 'Add a note'}, row ${i + 1}`}
              title={r.notes.trim() ? 'Edit note' : 'Add a note'}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-30 ${
                r.notes.trim()
                  ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              {r.notes.trim() ? <NoteGlyph /> : <PlusGlyph />}
            </button>
          </div>
        ))}
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
