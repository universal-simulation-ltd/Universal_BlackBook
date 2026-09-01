import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import {
  ACTION_WIDTH,
  decideAxis,
  dragOffset,
  restingOffset,
  settles,
  type Axis,
  type Side,
  type Widths,
} from '../lib/swipe'

/** One of the buttons hidden behind a row. */
export interface SwipeAction {
  /** The word on the button. */
  text: string
  /** Names the target for a screen reader — "Delete Sam Okonkwo". */
  label: string
  icon: ReactNode
  onAction: () => void
  /** Background and text colour. The action's meaning, not its geometry. */
  tone: string
}

/**
 * Swipe a row sideways to uncover an action. Touch only.
 *
 * ⚠️ Actions are named by the EDGE they sit on, not by the finger. `right` is
 * uncovered by swiping LEFT, and `left` by swiping RIGHT — the two are
 * opposites, and every bug in a component like this comes from writing one and
 * meaning the other. `lib/swipe.ts` uses the same convention.
 *
 * ⚠️ **`onTouchStart` and friends, and nothing for the mouse.** This is the
 * phone gesture people already know from Mail and Messages, and it has no
 * pointer equivalent worth inventing — a horizontal drag with a mouse is a
 * text selection everywhere else on the web. On a desktop the way to delete
 * somebody is the Delete button inside their own form, and the way to hide a
 * birthday is the button on the card itself; both are untouched by this file.
 *
 * ⚠️ Which is also why every swipe is an ADDITION and never the only route.
 * Nothing about a gesture is discoverable, and nothing about it is reachable
 * with a keyboard or a screen reader — so each action here exists somewhere a
 * finger is not required.
 *
 * ⚠️ `touch-action: pan-y` on the sliding layer is load-bearing. It tells the
 * browser that vertical scrolling is still its business but horizontal panning
 * is ours, which is the ONLY way to get a horizontal gesture without fighting
 * the scroller: React registers `touchmove` as a passive listener, so
 * `preventDefault()` inside the handler below does nothing at all.
 *
 * The swipe only ever REVEALS a button; it never fires one. A flick that
 * removes a contact outright is one thumb away from an irreversible loss of
 * something the app holds the only copy of — and while hiding a birthday is
 * reversible, a gesture that did one thing on its own and merely offered the
 * other would be teaching two rules where one will do.
 */
export function SwipeRow({
  open,
  onOpenChange,
  left,
  right,
  children,
}: {
  /** Which edge's action is showing, if any. */
  open: Side | null
  /** Rows are exclusive: opening one closes whichever was open. Owned by the list. */
  onOpenChange: (side: Side | null) => void
  /** Uncovered by swiping RIGHT. Absent makes that direction a wall. */
  left?: SwipeAction
  /** Uncovered by swiping LEFT. */
  right?: SwipeAction
  children: ReactNode
}) {
  const widths: Widths = { left: left ? ACTION_WIDTH : 0, right: right ? ACTION_WIDTH : 0 }
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, y: 0, base: 0 })
  const axis = useRef<Axis>('none')
  // Set when a drag actually moved the row, and read by the click that the
  // browser fires afterwards on whatever was under the finger. Without it,
  // swiping a card open also opens the contact.
  const swiped = useRef(false)

  // Follow the list's idea of which row is open — including "some other row
  // was opened, so close". Skipped mid-drag, where the finger is the truth.
  useEffect(() => {
    if (!dragging) setOffset(restingOffset(open, widths))
    // `widths` is rebuilt every render, so it is spread rather than depended on:
    // the two numbers are what matter and they only change when the actions do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dragging, widths.left, widths.right])

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, base: restingOffset(open, widths) }
    axis.current = 'none'
    swiped.current = false
    setDragging(true)
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!dragging) return
    const t = e.touches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    if (axis.current === 'none') axis.current = decideAxis(dx, dy)
    if (axis.current !== 'x') return
    swiped.current = true
    setOffset(dragOffset(start.current.base, dx, widths))
  }

  const end = () => {
    if (!dragging) return
    setDragging(false)
    if (axis.current !== 'x') return
    const next = settles(offset, widths)
    setOffset(restingOffset(next, widths))
    if (next !== open) onOpenChange(next)
  }

  return (
    // `h-full` all the way down the wrapper chain: the cards sit in a grid
    // whose rows stretch, and a percentage height only resolves through
    // ancestors that have one. Without it the cards in a row stop matching.
    <div className="relative h-full overflow-hidden rounded-xl">
      {left && <ActionButton action={left} side="left" open={open === 'left'} />}
      {right && <ActionButton action={right} side="right" open={open === 'right'} />}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={end}
        onTouchCancel={end}
        onClickCapture={(e) => {
          // Two clicks to swallow, both of them the same accident: the one the
          // browser fires at the end of a drag, and the one that lands on a
          // row somebody was aiming to close. Neither should open a contact.
          if (swiped.current || open) {
            e.preventDefault()
            e.stopPropagation()
            swiped.current = false
            if (open) onOpenChange(null)
          }
        }}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        className={`h-full ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * One revealed action.
 *
 * `inset-y-0` so the button is the full height of whatever card it belongs to
 * — the cards in a grid row are not all the same height — and it is REVEALED
 * rather than moved: it sits still underneath while the card slides off it.
 */
function ActionButton({ action, side, open }: { action: SwipeAction; side: Side; open: boolean }) {
  return (
    <div className={`absolute inset-y-0 flex ${side === 'left' ? 'left-0' : 'right-0'}`}>
      <button
        type="button"
        onClick={action.onAction}
        aria-label={action.label}
        // Off-screen behind the card when closed, so it is not a tab stop and
        // not announced. `aria-hidden` alone would leave it focusable.
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className={`flex w-24 flex-col items-center justify-center gap-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${action.tone}`}
      >
        {action.icon}
        {action.text}
      </button>
    </div>
  )
}
