import { useState } from 'react'
import { useBookStore } from '../stores/bookStore'
import { CategoryChip } from './CategoryChip'
import { btnGhost, inputCls } from './ui'

/**
 * The multi-select on the contact form. Tap a chip to toggle it; type a name
 * and press Enter to create one that doesn't exist yet.
 *
 * Chips rather than a `<select multiple>`: a native multi-select needs
 * ctrl-click to add a second value, which is undiscoverable on a desktop and
 * literally impossible on a phone — and "multiple categories" is the field
 * this app exists for.
 *
 * Creating from here writes the category to the book IMMEDIATELY, before the
 * contact is saved. That is deliberate: a category invented mid-form and then
 * abandoned along with the form is a stray, but the alternative — holding it
 * pending until save — means two half-built objects and a merge on submit, and
 * the stray costs one tap in the category manager to remove.
 */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const categories = useBookStore((s) => s.categories)
  const addCategory = useBookStore((s) => s.addCategory)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  const create = async () => {
    const name = draft.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      const created = await addCategory(name)
      // `addCategory` returns the EXISTING category when the name already
      // exists, so typing a duplicate selects it rather than doing nothing —
      // which is what the person meant either way.
      if (created && !value.includes(created.id)) onChange([...value, created.id])
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {categories.length === 0 && (
          <p className="text-sm text-slate-500">No categories yet — make one below.</p>
        )}
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            name={c.name}
            colour={c.colour}
            selected={value.includes(c.id)}
            onClick={() => toggle(c.id)}
          />
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <input
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New category…"
          aria-label="New category name"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            // The picker lives inside the contact <form>. Without this, Enter
            // submits the whole form and saves a half-filled contact instead
            // of creating the category the person was clearly in the middle of.
            e.preventDefault()
            void create()
          }}
        />
        <button type="button" className={btnGhost} onClick={() => void create()} disabled={!draft.trim() || busy}>
          Add
        </button>
      </div>
    </div>
  )
}
