import { useState } from 'react'
import { UNTAGGED, type SortKey } from '../lib/filter'
import { useBookStore } from '../stores/bookStore'
import { TagChip } from './TagChip'
import { btnSubtle, inputCls, selectCls } from './ui'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'recent', label: 'Recently added' },
]

/**
 * Search, sort, the tag filter, and the birthdays switch.
 *
 * The tag chips are collapsed behind a toggle by default. On a phone the
 * expanded set is taller than the first screen of results, which puts the
 * thing you came for below the fold on every visit — and most visits are a
 * search, not a filter.
 *
 * ⚠️ **Birthdays is a sort that also filters**, which is why it is a button of
 * its own rather than a fourth entry in the sort menu. Choosing it drops
 * everyone with no birthday recorded (see `runQuery`), and a "sort" that
 * removes half the list without saying so is a nasty surprise. As a switch you
 * can see is on, it is a different view — which is what it actually is.
 */
export function FilterBar() {
  const tags = useBookStore((s) => s.tags)
  const query = useBookStore((s) => s.query)
  const setQuery = useBookStore((s) => s.setQuery)
  const resetQuery = useBookStore((s) => s.resetQuery)
  const [open, setOpen] = useState(false)

  const birthdays = query.sort === 'birthday'
  const activeFilters = query.tagIds.length
  const dirty = activeFilters > 0 || query.text.trim() !== '' || birthdays

  const toggleTag = (id: string) =>
    setQuery({
      tagIds: query.tagIds.includes(id) ? query.tagIds.filter((x) => x !== id) : [...query.tagIds, id],
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

        <button
          type="button"
          aria-pressed={birthdays}
          // Back to Name A–Z when switched off, not to whatever it was before:
          // remembering the previous sort means the list can land somewhere the
          // user did not choose and cannot see the reason for.
          onClick={() => setQuery({ sort: birthdays ? 'name' : 'birthday' })}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
            birthdays
              ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
              : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
          }`}
        >
          <span aria-hidden>🎂</span> Birthdays
        </button>

        {/* The sort menu is meaningless while the birthdays view is on — that
            view IS an order — so it is hidden rather than left there showing a
            value that is not what the list is doing. */}
        {!birthdays && (
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
        )}

        <button
          type="button"
          className={`${btnSubtle} px-3 py-2`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Tags{activeFilters > 0 && <span className="ml-1 text-orange-400">({activeFilters})</span>}
        </button>
        {dirty && (
          <button type="button" className={`${btnSubtle} px-3 py-2`} onClick={resetQuery}>
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          {tags.length === 0 ? (
            <p className="text-sm text-slate-500">
              No tags yet. Add one while you're filling in a contact — they're entirely yours.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <TagChip
                  key={t.id}
                  name={t.name}
                  colour={t.colour}
                  selected={query.tagIds.includes(t.id)}
                  onClick={() => toggleTag(t.id)}
                />
              ))}
              <TagChip
                name="Untagged"
                colour="slate"
                selected={query.tagIds.includes(UNTAGGED)}
                onClick={() => toggleTag(UNTAGGED)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
