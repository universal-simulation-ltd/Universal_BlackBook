import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { columnStarts } from '../lib/columns'

/**
 * A `<ul>` whose CSS columns are split by us, not by the browser (owner,
 * 2026-11-26: To-do's card view "flickers and reshuffles" on a mouse move,
 * "Plan activities in calendar" jumping to the left column and back).
 *
 * Why: a multi-column box re-balances on EVERY layout pass. Any card that
 * changed height by a pixel — a tag's light opening out on hover and pushing
 * the name onto another line was the one caught — re-flowed every card after
 * it across the columns; the card then slid out from under the pointer, the
 * hover ended, it shrank, and the whole list flowed back. A loop, at the
 * mouse's pace.
 *
 * So the columns are worked out here, from the cards' measured heights, and
 * pinned with a forced column break before the first card of each column. A
 * forced break is a wall the browser's balancing cannot move a card across,
 * so a card that grows only pushes the cards under it in its own column. The
 * split is worked out again only when `signature` says the list itself
 * changed, the column count changes, or the list's width does (wrapping) —
 * never from a hover, and never mid-drag. The order still runs down the first
 * column, then the next, as before; one DOM list, so the keyboard's
 * Alt+↑ / ↓ and a screen reader see it whole.
 *
 * With one column (a narrow window, or a layout with no columns) it is a
 * plain list and nothing is measured.
 */
export function ColumnList({
  className,
  signature,
  children,
  ...rest
}: {
  className: string
  /** Changes when the list's content does: which items, in what order, and what is in them. */
  signature: string
  children: ReactNode
  id?: string
  'aria-describedby'?: string
  'data-across'?: string
}) {
  const ref = useRef<HTMLUListElement | null>(null)
  const done = useRef<{ key: string; starts: number[] }>({ key: '', starts: [] })
  // Bumped when the list's width changes, so the next pass measures again.
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const ul = ref.current
    if (!ul || typeof ResizeObserver === 'undefined') return
    let last = ul.clientWidth
    const ro = new ResizeObserver(() => {
      const w = ul.clientWidth
      if (w === last) return
      last = w
      setWidth(w)
    })
    ro.observe(ul)
    return () => ro.disconnect()
  }, [])

  // Every render: apply the split (React does not own `break-before`, but a
  // re-render must not lose it), and work it out again only when needed.
  useLayoutEffect(() => {
    const ul = ref.current
    if (!ul) return
    const items = [...ul.children].filter((c): c is HTMLElement => c instanceof HTMLElement)
    const cols = Number.parseInt(getComputedStyle(ul).columnCount, 10) || 1
    const key = `${cols}|${width}|${className}|${items.length}|${signature}`
    if (done.current.key !== key) {
      for (const el of items) el.style.breakBefore = ''
      const heights = items.map((el) => el.getBoundingClientRect().height + (Number.parseFloat(getComputedStyle(el).marginBottom) || 0))
      done.current = { key, starts: cols > 1 ? columnStarts(heights, cols) : [] }
    }
    const starts = new Set(done.current.starts)
    items.forEach((el, i) => {
      const want = starts.has(i) ? 'column' : ''
      if (el.style.breakBefore !== want) el.style.breakBefore = want
    })
  })

  return (
    <ul ref={ref} className={className} {...rest}>
      {children}
    </ul>
  )
}
