import { useEffect, useId, useRef, useState } from 'react'
import { UNTAGGED, type SortKey } from '../lib/filter'
import { useBookStore } from '../stores/bookStore'
import { TagChip } from './TagChip'
import { btnSubtle, inputCls, label } from './ui'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'recent', label: 'Recently added' },
]

/**
 * The search box, and everything else behind one ⚙️ button.
 *
 * ⚠️ **The search box is the whole row and the only control always on screen**
 * (owner's call, 2026-08-30). It used to share the row with a Birthdays
 * toggle, a sort `<select>`, a Tags button and a Clear button, which on a
 * phone wrapped to three lines and left the field people actually came for as
 * a ~40% wide sliver. Sorting and filtering are things you do occasionally;
 * searching is what you open an address book to do.
 *
 * ⚠️ **`flex-col-reverse` below 40rem is load-bearing, not a flourish.** On a
 * phone this bar is DOCKED TO THE BOTTOM of the screen (`.filterdock` in
 * index.css), so a panel rendered after the row in the DOM would open off the
 * bottom edge. Reversing the visual order puts it above the row — growing up
 * from the dock, the way a bottom sheet does — while the DOM order stays
 * row-then-panel, which is the order a screen reader and the tab sequence
 * want. Above 40rem the bar is back in the page flow at the top and the panel
 * opens downwards, which is what a dropdown anchored under a button should do.
 *
 * ⚠️ **Birthdays is a sort that also filters**, which is why it is a switch of
 * its own under "View" rather than a fourth entry in the order list. Choosing
 * it drops everyone with no birthday recorded (see `runQuery`), and an "order"
 * that removes half the list without saying so is a nasty surprise. As a
 * switch you can see is on, it is a different view — which is what it is.
 */
export function FilterBar() {
  const tags = useBookStore((s) => s.tags)
  const query = useBookStore((s) => s.query)
  const setQuery = useBookStore((s) => s.setQuery)
  const resetQuery = useBookStore((s) => s.resetQuery)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const birthdays = query.sort === 'birthday'
  // What the ⚙️ badge counts. NOT the search text: that is legible in the box
  // beside it, and a badge for something already on screen is noise. Every
  // other part of the query is invisible while the panel is shut, which is
  // exactly what the badge is for — a list quietly filtered down to four
  // people with no visible reason is the failure this prevents.
  const active = query.tagIds.length + (birthdays ? 1 : 0) + (!birthdays && query.sort !== 'name' ? 1 : 0)
  const dirty = active > 0 || query.text.trim() !== ''

  // Escape and click-away, both only while the panel is open. On a phone the
  // dock overlays the list, so tapping a contact behind it has to shut the
  // panel rather than land on whatever is underneath.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const toggleTag = (id: string) =>
    setQuery({
      tagIds: query.tagIds.includes(id) ? query.tagIds.filter((x) => x !== id) : [...query.tagIds, id],
    })

  return (
    <div ref={rootRef} className="flex flex-col-reverse gap-2 sm:flex-col sm:gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            // `h-11` so the field and the ⚙️ beside it are the same 44px tap
            // target — `inputCls`'s own `py-2` leaves it 6px shorter, which is
            // visible as a step in a two-control row and is under the iOS
            // minimum on the control people use most.
            className={`${inputCls} h-11 pl-9`}
            type="search"
            value={query.text}
            onChange={(e) => setQuery({ text: e.target.value })}
            placeholder="Search names, emails, phones, notes…"
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
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          // 44px square: the iOS minimum tap target, and the same height as the
          // search field beside it so the row has one baseline.
          className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
            open || active > 0
              ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
              : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M10 6.5A3.5 3.5 0 1 0 10 13.5 3.5 3.5 0 0 0 10 6.5Zm0 5.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
            <path d="M8.94 1.5a1.2 1.2 0 0 0-1.19 1.02l-.16 1.06a6.5 6.5 0 0 0-1.2.7l-1-.4a1.2 1.2 0 0 0-1.44.52l-1.06 1.83a1.2 1.2 0 0 0 .25 1.5l.83.68a6.6 6.6 0 0 0 0 1.38l-.83.68a1.2 1.2 0 0 0-.25 1.5l1.06 1.83c.3.52.93.73 1.45.52l1-.4c.37.28.77.51 1.2.7l.15 1.06c.09.6.6 1.02 1.19 1.02h2.12c.6 0 1.1-.43 1.19-1.02l.16-1.06c.42-.19.82-.42 1.19-.7l1 .4c.53.21 1.15 0 1.45-.52l1.06-1.83a1.2 1.2 0 0 0-.25-1.5l-.83-.68a6.6 6.6 0 0 0 0-1.38l.83-.68a1.2 1.2 0 0 0 .25-1.5L16.2 4.4a1.2 1.2 0 0 0-1.45-.52l-1 .4a6.5 6.5 0 0 0-1.19-.7l-.16-1.06a1.2 1.2 0 0 0-1.19-1.02H8.94Zm.19 1.5h1.74l.21 1.44.5.19c.44.17.85.4 1.21.7l.41.33 1.35-.54.87 1.5-1.13.93.06.52a5.1 5.1 0 0 1 0 1.06l-.06.52 1.13.93-.87 1.5-1.35-.54-.41.33c-.36.3-.77.53-1.21.7l-.5.19-.21 1.44H9.13l-.21-1.44-.5-.19a5 5 0 0 1-1.21-.7l-.41-.33-1.35.54-.87-1.5 1.13-.93-.06-.52a5.1 5.1 0 0 1 0-1.06l.06-.52-1.13-.93.87-1.5 1.35.54.41-.33c.36-.3.77-.53 1.21-.7l.5-.19.21-1.44Z" />
          </svg>
          <span>Filters</span>
          {active > 0 && <span className="tabular-nums">({active})</span>}
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          // A cap and its own scroll: on a phone the tag list can be longer
          // than the screen, and a dock that grows past the top of the viewport
          // takes the search box off the bottom of it with nothing to scroll.
          className="max-h-[55vh] space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-lg shadow-black/40"
        >
          <section>
            <span className={label}>View</span>
            <button
              type="button"
              aria-pressed={birthdays}
              // Back to Name A–Z when switched off, not to whatever it was
              // before: remembering the previous order means the list can land
              // somewhere the user did not choose and cannot see the reason for.
              onClick={() => setQuery({ sort: birthdays ? 'name' : 'birthday' })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                birthdays
                  ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                  : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <span aria-hidden>🎂</span> Birthdays
            </button>
            {birthdays && (
              <p className="mt-1.5 text-xs text-slate-500">
                Soonest first, and only people whose birthday you have. Anyone you'd rather not be
                reminded about can be hidden from the list without losing their date.
              </p>
            )}
          </section>

          {/* The order buttons are meaningless while the birthdays view is on —
              that view IS an order — so they are hidden rather than left there
              showing a value that is not what the list is doing. */}
          {!birthdays && (
            <section>
              <span className={label}>Order</span>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={query.sort === s.value}
                    onClick={() => setQuery({ sort: s.value })}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      query.sort === s.value
                        ? 'border-orange-500/50 bg-orange-500/15 text-orange-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <span className={label}>Tags</span>
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
          </section>

          <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
            <button
              type="button"
              className={`${btnSubtle} px-2 py-1.5 disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={resetQuery}
              disabled={!dirty}
            >
              Clear everything
            </button>
            <button type="button" className={`${btnSubtle} px-2 py-1.5`} onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
