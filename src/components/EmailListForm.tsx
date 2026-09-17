import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { fold } from '../lib/filter'
import { useBookStore } from '../stores/bookStore'
import { TagChip } from './TagChip'
import { btnGhost, btnPrimary, inputCls, label } from './ui'

// `label` minus its bottom margin: the grid's gap spaces the headings, and
// adding `mb-0` to `label` loses to its `mb-1.5` by CSS source order (ui.tsx).
const heading = 'block text-xs font-semibold uppercase tracking-wide text-slate-400'

interface Row {
  key: number
  name: string
  email: string
}

let nextKey = 0
const blankRow = (): Row => ({ key: nextKey++, name: '', email: '' })
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

      <div ref={grid} className="grid grid-cols-2 gap-x-2 gap-y-2">
        <span className={heading}>Name</span>
        <span className={heading}>Email</span>
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
    </form>
  )
}
