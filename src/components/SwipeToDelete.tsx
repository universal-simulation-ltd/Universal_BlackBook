import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { ACTION_WIDTH, decideAxis, dragOffset, settlesOpen, type Axis } from '../lib/swipe'

/**
 * Swipe a row left to uncover Delete. Touch only.
 *
 * ⚠️ **`onTouchStart` and friends, and nothing for the mouse.** This is the
 * phone gesture people already know from Mail and Messages, and it has no
 * pointer equivalent worth inventing — a horizontal drag with a mouse is a
 * text selection everywhere else on the web. On a desktop the way to delete
 * somebody is the Delete button inside their own form, which is where it has
 * always been and which is untouched by this file.
 *
 * ⚠️ Which is also why the swipe is an ADDITION and never the only route.
 * Nothing about a gesture is discoverable, and nothing about it is reachable
 * with a keyboard or a screen reader — so the form's Delete stays exactly as
 * it was, and this is a shortcut for the case it was asked for: clearing out
 * somebody you added by mistake, without opening them first.
 *
 * ⚠️ `touch-action: pan-y` on the sliding layer is load-bearing. It tells the
 * browser that vertical scrolling is still its business but horizontal panning
 * is ours, which is the ONLY way to get a horizontal gesture without fighting
 * the scroller: React registers `touchmove` as a passive listener, so
 * `preventDefault()` inside the handler below does nothing at all.
 *
 * The swipe only ever REVEALS the button; it never deletes. A flick that
 * removes a contact outright is one thumb away from an irreversible loss of
 * something the app holds the only copy of. Tapping the button then asks.
 */
export function SwipeToDelete({
  open,
  onOpenChange,
  onDelete,
  label,
  children,
}: {
  open: boolean
  /** Rows are exclusive: opening one closes whichever was open. Owned by the list. */
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  /** Names the target for a screen reader — "Delete Sam Okonkwo". */
  label: string
  children: ReactNode
}) {
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
    if (!dragging) setOffset(open ? -ACTION_WIDTH : 0)
  }, [open, dragging])

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, base: open ? -ACTION_WIDTH : 0 }
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
    setOffset(dragOffset(start.current.base, dx))
  }

  const end = () => {
    if (!dragging) return
    setDragging(false)
    if (axis.current !== 'x') return
    const next = settlesOpen(offset)
    setOffset(next ? -ACTION_WIDTH : 0)
    if (next !== open) onOpenChange(next)
  }

  return (
    // `h-full` all the way down the wrapper chain: the cards sit in a grid
    // whose rows stretch, and a percentage height only resolves through
    // ancestors that have one. Without it the cards in a row stop matching.
    <div className="relative h-full overflow-hidden rounded-xl">
      {/* Underneath the card, revealed rather than moved. `inset-y-0` so the
          button is the full height of whatever card it belongs to — the cards
          in a grid row are not all the same height. */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={onDelete}
          aria-label={label}
          // Off-screen behind the card when closed, so it is not a tab stop
          // and not announced. `aria-hidden` alone would leave it focusable.
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          className="flex w-24 flex-col items-center justify-center gap-1 bg-rose-600 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-200"
        >
          {/* An SVG bin, not 🗑 — the codepoint is one of the ones with no
              glyph in iOS's system font (see Modal's CloseGlyph). */}
          <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M6.5 1a1 1 0 0 0-1 1v.5H2.75a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H10.5V2a1 1 0 0 0-1-1h-3ZM4.5 5.5h7l-.6 8.1a1.5 1.5 0 0 1-1.5 1.4H6.6a1.5 1.5 0 0 1-1.5-1.4L4.5 5.5Z" />
          </svg>
          Delete
        </button>
      </div>

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
            if (open) onOpenChange(false)
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
