import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { fold } from '../lib/filter'
import { inputCls } from './ui'

/**
 * Tags, collapsed (James, 2026-10-23): wherever tags are chosen, the chosen
 * ones as chips, then a box to find the rest. Typing lists the tags that
 * match — and "Add new tag “x”" when none matches exactly and the caller can
 * make one — and the chevron beside the box opens the whole list, shut until
 * asked for. A book with forty tags no longer puts forty chips on the form.
 *
 * The suggestions are inline under the box, not a popup: on the phone every
 * popup is a page or a sheet, and a list that pushes the form down is neither.
 * On the website the box is a combobox: ↓/↑ move through the suggestions,
 * Enter takes one (or makes the tag when nothing matches), Escape clears.
 *
 * What a chip looks like and what a tap on it does are the caller's (`chip`):
 * the contact form toggles, the Filters panel cycles show / hide / off.
 */
export interface ComboOption {
  id: string
  name: string
}

export function TagCombo<T extends ComboOption>({
  options,
  isOn,
  chip,
  suggestion,
  onPick,
  onCreate,
  placeholder,
  createLabel,
  noneYet,
  fullLabel,
  extraFull,
  belowInput,
}: {
  /** Every tag that can be chosen here, in the order the full list shows them. */
  options: T[]
  /** Is this one chosen (shown above the box, left out of the suggestions)? */
  isOn: (id: string) => boolean
  /** One tag as a chip: above the box when chosen, and in the full list. */
  chip: (option: T) => ReactNode
  /** One tag as a suggestion under the box: not a control of its own. */
  suggestion: (option: T) => ReactNode
  /** A suggestion was taken. */
  onPick: (id: string) => void
  /** Make a tag with this name and choose it. Left out, nothing is created here. */
  onCreate?: (name: string) => void | Promise<void>
  placeholder: string
  /** "Add new tag “{name}”" — `{name}` is filled in. */
  createLabel?: string
  /** Said when there is nothing to choose and nothing can be made. */
  noneYet?: ReactNode
  /** The chevron's name, for screen readers: "Show all tags". */
  fullLabel: string
  /** Shown at the end of the full list (the Filters panel's "Untagged"). */
  extraFull?: ReactNode
  /** Under the box while something is typed (the new tag's colour). */
  belowInput?: (draft: string, willCreate: boolean) => ReactNode
}) {
  const [draft, setDraft] = useState('')
  const [full, setFull] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const fullId = useId()

  const text = draft.trim()
  const matches = useMemo(() => {
    if (!text) return []
    const q = fold(text)
    return options.filter((o) => !isOn(o.id) && fold(o.name).includes(q)).slice(0, 8)
  }, [options, isOn, text])
  const exact = text !== '' && options.some((o) => fold(o.name) === fold(text))
  const willCreate = Boolean(onCreate) && text !== '' && !exact
  const items = matches.length + (willCreate ? 1 : 0)
  const current = Math.min(active, Math.max(0, items - 1))
  const chosen = options.filter((o) => isOn(o.id))

  const take = async (index: number) => {
    if (index < matches.length) {
      onPick(matches[index].id)
      setDraft('')
    } else if (willCreate && onCreate) {
      await onCreate(text)
      setDraft('')
    }
    setActive(0)
    input.current?.focus({ preventScroll: true })
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items > 0) {
      e.preventDefault()
      setActive((current + 1) % items)
    } else if (e.key === 'ArrowUp' && items > 0) {
      e.preventDefault()
      setActive((current - 1 + items) % items)
    } else if (e.key === 'Enter') {
      // Inside the contact <form>: Enter must take the tag, never submit.
      e.preventDefault()
      if (items > 0) void take(current)
    } else if (e.key === 'Escape' && draft) {
      // Clear the box; a second Escape is the page's (closes the dialog).
      e.preventDefault()
      e.stopPropagation()
      setDraft('')
    }
  }

  const optionId = (i: number) => `${listId}-${i}`

  return (
    <div>
      {chosen.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{chosen.map((o) => <span key={o.id}>{chip(o)}</span>)}</div>}
      {options.length === 0 && !onCreate ? (
        noneYet && <p className="text-sm text-slate-500">{noneYet}</p>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              ref={input}
              className={inputCls}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKey}
              placeholder={placeholder}
              aria-label={placeholder}
              role="combobox"
              aria-expanded={items > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={items > 0 ? optionId(current) : undefined}
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="done"
            />
            {options.length > 0 && (
              <button
                type="button"
                onClick={() => setFull((v) => !v)}
                aria-expanded={full}
                aria-controls={fullId}
                aria-label={fullLabel}
                title={fullLabel}
                className="inline-flex h-auto min-h-[40px] w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <svg viewBox="0 0 16 16" className={`h-4 w-4 transition-transform ${full ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          {items > 0 && (
            <ul id={listId} role="listbox" aria-label={placeholder} className="mt-1.5 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
              {matches.map((o, i) => (
                <li
                  key={o.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === current}
                  // mousedown, not click: the box keeps focus, so a keyboard
                  // user's next keystroke still goes into it.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void take(i)}
                  className={`flex min-h-[40px] cursor-pointer items-center px-2 py-1 ${i === current ? 'bg-slate-800' : ''}`}
                >
                  {suggestion(o)}
                </li>
              ))}
              {willCreate && (
                <li
                  id={optionId(matches.length)}
                  role="option"
                  aria-selected={current === matches.length}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void take(matches.length)}
                  className={`flex min-h-[40px] cursor-pointer items-center gap-2 px-3 py-2 text-sm text-orange-300 ${
                    current === matches.length ? 'bg-slate-800' : ''
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">＋</span>
                  <span className="min-w-0 truncate">{(createLabel ?? '{name}').replace('{name}', text)}</span>
                </li>
              )}
            </ul>
          )}
          {text !== '' && belowInput?.(draft, willCreate)}
          {full && (
            <div id={fullId} className="mt-2.5 flex flex-wrap gap-1.5">
              {options.map((o) => (
                <span key={o.id}>{chip(o)}</span>
              ))}
              {extraFull}
            </div>
          )}
        </>
      )}
    </div>
  )
}
