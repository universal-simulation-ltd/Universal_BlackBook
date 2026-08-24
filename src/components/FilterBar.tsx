import { useState } from 'react'
import { FREQUENCIES } from '../lib/frequency'
import { UNCATEGORISED, type SortKey } from '../lib/filter'
import type { Frequency } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { CategoryChip } from './CategoryChip'
import { btnSubtle, inputCls, selectCls } from './ui'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'frequency', label: 'How often' },
  { value: 'recent', label: 'Recently added' },
]

/**
 * Search, sort, and the two filters.
 *
 * The filter chips are collapsed behind a toggle by default. On a phone the
 * expanded set is taller than the first screen of results, which puts the
 * thing you came for below the fold on every visit — and most visits are a
 * search, not a filter.
 */
export function FilterBar() {
  const categories = useBookStore((s) => s.categories)
  const query = useBookStore((s) => s.query)
  const setQuery = useBookStore((s) => s.setQuery)
  const resetQuery = useBookStore((s) => s.resetQuery)
  const [open, setOpen] = useState(false)

  const activeFilters = query.categoryIds.length + query.frequencies.length
  const dirty = activeFilters > 0 || query.text.trim() !== ''

  const toggleCategory = (id: string) =>
    setQuery({
      categoryIds: query.categoryIds.includes(id)
        ? query.categoryIds.filter((x) => x !== id)
        : [...query.categoryIds, id],
    })

  const toggleFrequency = (value: Frequency) =>
    setQuery({
      frequencies: query.frequencies.includes(value)
        ? query.frequencies.filter((x) => x !== value)
        : [...query.frequencies, value],
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <input
            className={`${inputCls} pl-9`}
            type="search"
            value={query.text}
            onChange={(e) => setQuery({ text: e.target.value })}
            placeholder="Search names, emails, notes and birthdays…"
            aria-label="Search contacts"
          />
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
          </svg>
        </div>
        <select
          className={selectCls}
          value={query.sort}
          onChange={(e) => setQuery({ sort: e.target.value as SortKey })}
          aria-label="Sort by"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`${btnSubtle} px-3 py-2`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Filters{activeFilters > 0 && <span className="ml-1 text-orange-400">({activeFilters})</span>}
        </button>
        {dirty && (
          <button type="button" className={`${btnSubtle} px-3 py-2`} onClick={resetQuery}>
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  name={c.name}
                  colour={c.colour}
                  selected={query.categoryIds.includes(c.id)}
                  onClick={() => toggleCategory(c.id)}
                />
              ))}
              <CategoryChip
                name="No category"
                colour="slate"
                selected={query.categoryIds.includes(UNCATEGORISED)}
                onClick={() => toggleCategory(UNCATEGORISED)}
              />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              How often
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map((f) => {
                const on = query.frequencies.includes(f.value)
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleFrequency(f.value)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      on
                        ? 'border-orange-500/50 bg-orange-500/15 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {f.short}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
