import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { planBulkImport } from '../lib/deviceContacts'
import { useBookStore } from '../stores/bookStore'
import { TagPicker } from './TagPicker'
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
 * The tags apply to EVERY row — the point of the feature is filing a whole
 * list under one tag. Saving goes through `planBulkImport`, the same rules the
 * phone-contacts import uses: somebody already in the book (name + email) is
 * skipped rather than added twice, and a row with only an email uses the email
 * as its name.
 */
export function EmailListForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const contacts = useBookStore((s) => s.contacts)
  const importBook = useBookStore((s) => s.importBook)
  const [rows, setRows] = useState<Row[]>(() => [blankRow()])
  const [tagIds, setTagIds] = useState<string[]>([])
  const grid = useRef<HTMLDivElement>(null)

  const people = rows.filter(filled)

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
    if (people.length === 0) return
    const picked = people.map((r) => ({
      name: r.name.trim(),
      email: r.email.trim(),
      phone: '',
      tagIds: [],
      notes: '',
      birthdate: undefined,
    }))
    const { contacts: fresh, duplicates } = planBulkImport(picked, contacts)
    const added = fresh.map((c) => ({ ...c, tagIds }))
    const bits = [`Added ${added.length} ${added.length === 1 ? 'contact' : 'contacts'}`]
    if (duplicates > 0) bits.push(`${duplicates} already in your book`)
    // The book's tags as they are NOW — the picker may have just created one.
    await importBook(added, useBookStore.getState().tags, 'merge', `${bits.join(', ')}.`)
    onSaved()
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
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
              autoFocus={i === 0}
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

      <div>
        <span className={label}>Tag everyone as</span>
        <TagPicker value={tagIds} onChange={setTagIds} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-4">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary} disabled={people.length === 0}>
          {people.length === 0 ? 'Save' : `Save ${people.length} ${people.length === 1 ? 'contact' : 'contacts'}`}
        </button>
      </div>
    </form>
  )
}
