import { useEffect, useRef, useState } from 'react'
import { hiddenActions, moveSlot, type Slots } from '../lib/quickActions'
import { useT } from '../i18n'
import { usePhoneKit } from '../native/kit'
import { IconBin } from '../native/icons'

export interface QuickButton {
  label: string
  emoji: string
  /** Two glyphs (Copy and delete's 📋🗑️): drawn smaller to fit the place. */
  small?: boolean
  /** Drawn fainter but still tappable: Call with no number offers to add one. */
  muted?: boolean
  /** A switch that is on (a pinned contact). */
  pressed?: boolean
  onClick: () => void
}

/**
 * The row of emoji buttons across the top of a note and of a contact (James,
 * 2026-10-27: "match up the quick actions style for contacts and notes, use
 * four buttons but only show the emojis"), in the order the person keeps
 * (lib/quickActions.ts). Four places, each a button or a "+". On the phone,
 * hold a button or a "+" and drag it to a new place: onto a "+" the two
 * swap, onto a button it slides in (James, 2026-10-27: "change position of the
 * + as well as opposed to a + hiding another action if dropped", "tap and
 * hold to drag a + also"). The bin that rises in the middle of the screen puts
 * a button back among the rest, leaving a "+" where it was. A tap on a "+"
 * picks one of the rest from a list.
 */
export function QuickActions<K extends string>({
  buttons,
  all,
  order,
  onChange,
  label,
  status,
}: {
  buttons: Record<K, QuickButton>
  /** Every button this row can hold, in the order a "+" lists them. */
  all: readonly K[]
  order: Slots<K>
  onChange: (order: Slots<K>) => void
  /** The row's accessible name. */
  label: string
  status?: string | null
}) {
  const t = useT()
  const kit = usePhoneKit()
  /** The place held (`at`, where it is now in `order`) and the row as it is being rearranged. */
  const [drag, setDrag] = useState<{ at: number; order: Slots<K>; bin?: boolean } | null>(null)
  // Just let go: the lift's click must not open a "+"'s list.
  const [settling, setSettling] = useState(false)
  const shown = drag?.order ?? order
  const heldIsButton = drag !== null && drag.order[drag.at] !== null
  const hidden = hiddenActions(all, order)

  const rowRef = useRef<HTMLDivElement>(null)
  const binRef = useRef<HTMLDivElement>(null)
  const hold = useRef<{ x0: number; y0: number; active: boolean; timer: ReturnType<typeof setTimeout> } | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag
  const orderRef = useRef(order)
  orderRef.current = order
  const changeRef = useRef(onChange)
  changeRef.current = onChange

  const startHold = (at: number) => (e: React.TouchEvent) => {
    if (!kit || e.touches.length !== 1) return
    const t0 = e.touches[0]
    const h = {
      x0: t0.clientX,
      y0: t0.clientY,
      active: false,
      timer: setTimeout(() => {
        h.active = true
        navigator.vibrate?.(12)
        setDrag({ at, order: orderRef.current })
      }, 450),
    }
    if (hold.current) clearTimeout(hold.current.timer)
    hold.current = h
  }

  useEffect(() => {
    const within = (r: DOMRect | undefined, x: number, y: number, pad: number) =>
      Boolean(r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad)
    const move = (e: TouchEvent) => {
      const h = hold.current
      if (!h) return
      const t0 = e.touches[0]
      if (!h.active) {
        if (t0 && Math.hypot(t0.clientX - h.x0, t0.clientY - h.y0) > 10) {
          clearTimeout(h.timer)
          hold.current = null
        }
        return
      }
      e.preventDefault()
      const d = dragRef.current
      if (!d || !t0) return
      // Back among the rest: a button dropped on the bin (a "+" has no bin).
      const overBin = d.order[d.at] !== null && within(binRef.current?.getBoundingClientRect(), t0.clientX, t0.clientY, 18)
      if (overBin !== Boolean(d.bin)) {
        navigator.vibrate?.(8)
        setDrag({ ...d, bin: overBin })
      }
      if (overBin) return
      const slots = [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-slot]') ?? [])]
      const at = slots.findIndex((el) => {
        const r = el.getBoundingClientRect()
        return t0.clientX >= r.left && t0.clientX <= r.right
      })
      if (at < 0) return
      if (at === d.at) return
      const next = moveSlot(d.order, d.at, at)
      setDrag({ ...d, at, order: next })
    }
    const end = () => {
      const h = hold.current
      hold.current = null
      if (!h) return
      clearTimeout(h.timer)
      if (!h.active) return
      // The lift is not a tap: the click it ends with must not press the button.
      const swallow = (ev: Event) => {
        if (!rowRef.current?.contains(ev.target as Node)) return
        ev.preventDefault()
        ev.stopPropagation()
      }
      document.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 600)
      const d = dragRef.current
      setDrag(null)
      setSettling(true)
      setTimeout(() => setSettling(false), 500)
      if (!d) return
      if (d.bin) changeRef.current(d.order.map((k, i) => (i === d.at ? null : k)))
      else if (d.order.join() !== orderRef.current.join()) changeRef.current(d.order)
    }
    document.addEventListener('touchmove', move, { passive: false, capture: true })
    document.addEventListener('touchend', end, true)
    document.addEventListener('touchcancel', end, true)
    return () => {
      document.removeEventListener('touchmove', move, { capture: true })
      document.removeEventListener('touchend', end, true)
      document.removeEventListener('touchcancel', end, true)
    }
  }, [])

  const box =
    'flex min-h-[56px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 leading-none transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
  const plus = `${box} relative border-dashed text-[26px] text-slate-500`

  return (
    <>
      {/* data-swipe-x: a drag that starts here is a button being moved, so
          the page's own pull down (the SDK's phone kit) leaves it alone —
          without it the whole page slid down after the finger. */}
      <div ref={rowRef} className="mb-5 grid grid-cols-4 gap-2" role="group" aria-label={label} data-swipe-x>
        {shown.map((key, i) => {
          if (key === null) {
            const held = drag?.at === i
            // Keyed by which "+" it is, not by place: a held "+" is moved, never
            // remounted, or the finger's touch would be lost with the old node.
            const nth = shown.slice(0, i).filter((k) => k === null).length
            // A real <select> over the "+": the phone's own list to pick from.
            // Shut while anything is held, and for a moment after.
            const picking = hidden.length > 0 && !drag && !settling
            return (
              <label
                key={`plus-${nth}`}
                data-slot
                onTouchStart={startHold(i)}
                onContextMenu={(e) => kit && e.preventDefault()}
                style={{ WebkitTouchCallout: 'none' }}
                className={`${plus} select-none ${picking ? 'cursor-pointer' : ''} ${held ? 'scale-110 border-orange-500 shadow-lg' : ''}`}
              >
                <span aria-hidden>+</span>
                {hidden.length > 0 && (
                  <select
                    aria-label={t('qa.add')}
                    value=""
                    disabled={!picking}
                    onChange={(e) => {
                      const pick = e.target.value as K
                      if (pick) onChange(order.map((k, at) => (at === i ? pick : k)))
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  >
                    <option value="" disabled>
                      {t('qa.add')}
                    </option>
                    {hidden.map((k) => (
                      <option key={k} value={k}>
                        {buttons[k].label}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            )
          }
          const b = buttons[key]
          return (
            <button
              key={key}
              type="button"
              data-slot
              data-qa={key}
              aria-label={b.label}
              aria-pressed={b.pressed}
              title={b.label}
              onClick={b.onClick}
              onTouchStart={startHold(i)}
              onContextMenu={(e) => kit && e.preventDefault()}
              style={{ WebkitTouchCallout: 'none' }}
              className={`${box} select-none ${b.small ? 'text-[19px]' : 'text-[28px]'} ${b.muted ? 'opacity-40' : ''} ${
                b.pressed ? 'border-orange-500/70' : ''
              } ${drag?.at === i ? 'scale-110 border-orange-500 shadow-lg' : ''}`}
            >
              <span aria-hidden>{b.emoji}</span>
            </button>
          )
        })}
        <span className="sr-only" role="status" aria-live="polite">
          {status ?? ''}
        </span>
      </div>
      {heldIsButton && kit && (
        <div ref={binRef} className={`bb-tabbin${drag.bin ? ' hot' : ''}`} aria-hidden>
          <IconBin />
          <span>{kit.t(drag.bin ? 'tab_bin_drop' : 'tab_bin_hint')}</span>
        </div>
      )}
    </>
  )
}
