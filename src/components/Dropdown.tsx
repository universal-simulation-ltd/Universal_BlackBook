import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

/**
 * A dropdown the PAGE draws, used in place of `<select>` inside the modal.
 *
 * ⚠️ **A native `<select>` popup opened from inside a `<dialog>` renders
 * blank.** That is the bug this component exists to kill. The popup is the
 * browser's own surface, not part of the page, and Chromium composites it
 * badly against the top layer that `showModal()` puts the dialog in: the list
 * opens in the right place, at the right size, and paints nothing — then fills
 * in a moment later, or on a second click, once something else forces a
 * repaint. It is per-tab, so a fresh tab looks innocent while the tab you were
 * working in stays broken. No CSS reaches any of it, because none of it is
 * ours to style. The only reliable fix is to stop asking for a native popup
 * where the top layer is involved.
 *
 * So the list here is ordinary DOM, inside the dialog's own subtree, painted in
 * the same top layer as the dialog itself. It cannot lose a compositing race
 * with a surface it is part of.
 *
 * The main page's `<select>` elements are FINE and are deliberately left
 * native — outside the top layer the browser's own popup beats anything we
 * would write, and it is what the platform's assistive tech and mobile pickers
 * expect. This is the modal exception, not a house style.
 *
 * ⚠️ The panel is `position: fixed`, which is what lets it escape the modal
 * body's `overflow-y: auto` clip instead of being sliced off at the bottom of
 * the scroll box. The cost is that it can land OUTSIDE the dialog's rectangle,
 * where Modal's backdrop hit-test would read a click on it as a click on the
 * backdrop and throw the half-typed contact away — see the target check in
 * Modal.tsx.
 *
 * Focus never leaves the trigger. The active option is advertised with
 * `aria-activedescendant`, which is the combobox pattern and means there is no
 * second focus trap fighting the dialog's own.
 */

export interface DropdownOption {
  value: string
  label: string
}

/** Roughly nine rows. With less room than this below, a flip upwards wins. */
const MIN_ROOM = 180
const MAX_PANEL = 288
const GAP = 4
const EDGE = 8

export function Dropdown({
  value,
  options,
  placeholder,
  ariaLabel,
  onChange,
  className = '',
}: {
  /** '' when nothing is chosen. */
  value: string
  options: DropdownOption[]
  /** Shown when `value` is '' — and offered as the first row, so it can be undone. */
  placeholder: string
  ariaLabel: string
  onChange: (next: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [box, setBox] = useState<{ left: number; width: number; maxHeight: number; top?: number; bottom?: number }>()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const listId = useId()

  // The placeholder is a real row, not just the empty label: a birthday can be
  // cleared back to "no month", and a list you can only add to is a trap.
  const rows: DropdownOption[] = [{ value: '', label: placeholder }, ...options]
  const selected = Math.max(0, rows.findIndex((o) => o.value === value))
  const current = rows[selected]

  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    const flip = below < MIN_ROOM && above > below
    const maxHeight = Math.max(120, Math.min(MAX_PANEL, flip ? above : below))
    // Anchored by its BOTTOM edge when flipped, so a short list sits against
    // the trigger instead of floating `maxHeight` above it.
    setBox({
      left: r.left,
      width: r.width,
      maxHeight,
      ...(flip ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    const onMove = () => place()
    // Capture, so the modal body's own scrolling moves the panel with it.
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  useEffect(() => {
    if (!open || active < 0) return
    const row = panelRef.current?.children[active] as HTMLElement | undefined
    row?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openAt = (i: number) => {
    setActive(i)
    setOpen(true)
  }

  const commit = (i: number) => {
    setOpen(false)
    triggerRef.current?.focus()
    if (rows[i]) onChange(rows[i].value)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openAt(selected)
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        // ⚠️ Both halves matter. Without preventDefault the browser fires the
        // dialog's `cancel` and the whole contact form closes behind the list.
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        return
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(rows.length - 1, i + 1))
        return
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        return
      case 'Home':
        e.preventDefault()
        setActive(0)
        return
      case 'End':
        e.preventDefault()
        setActive(rows.length - 1)
        return
      case 'Enter':
      case ' ':
        e.preventDefault()
        commit(active)
        return
      case 'Tab':
        setOpen(false)
        return
    }
    // Typeahead, because a native select has it and losing it would be a
    // regression: "s" reaches September, and "12" reaches the 12th rather than
    // stopping at the 1st. The 800ms window is the platform's own.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = e.timeStamp
      typed.current = { text: now - typed.current.at > 800 ? e.key : typed.current.text + e.key, at: now }
      const q = typed.current.text.toLowerCase()
      const hit = rows.findIndex((o, i) => i > 0 && o.label.toLowerCase().startsWith(q))
      if (hit >= 0) {
        e.preventDefault()
        setActive(hit)
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openAt(selected))}
        onKeyDown={onKeyDown}
        className={`flex w-full min-w-0 items-center justify-between gap-1 rounded-lg border bg-slate-950 px-2 py-2 text-left text-sm text-slate-100 focus:outline-none ${
          open
            ? 'border-orange-500 ring-1 ring-orange-500'
            : 'border-slate-700 focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500'
        }`}
      >
        <span className={`truncate ${value ? '' : 'text-slate-500'}`}>{current.label}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400">
          <path
            d="M5.5 7.5 10 12l4.5-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && box && (
        <ul
          ref={panelRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            left: box.left,
            width: box.width,
            maxHeight: box.maxHeight,
            top: box.top,
            bottom: box.bottom,
          }}
          className="z-50 overflow-y-auto overscroll-contain rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl shadow-black/60"
        >
          {rows.map((o, i) => (
            <li
              key={o.value || '_none'}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === selected}
              // The trigger keeps focus: without this the mousedown blurs it
              // and the ring drops out mid-click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(i)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 text-sm ${i === active ? 'bg-slate-800' : ''} ${
                i === 0 ? 'text-slate-500' : i === selected ? 'font-semibold text-orange-400' : 'text-slate-200'
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
