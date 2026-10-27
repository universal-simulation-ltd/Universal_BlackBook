import { useEffect, useRef, useState } from 'react'
import { hiddenActions, moveQuickAction, QUICK_SLOTS } from '../lib/quickActions'
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
 * (lib/quickActions.ts). On the phone, hold one and drag it to a new place;
 * drag it onto a "+" (or the bin that rises in the middle of the screen) to
 * put it back among the rest, and its place becomes a "+". A "+" picks one of
 * the rest from a list.
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
  order: K[]
  onChange: (order: K[]) => void
  /** The row's accessible name. */
  label: string
  status?: string | null
}) {
  const t = useT()
  const kit = usePhoneKit()
  const [drag, setDrag] = useState<{ key: K; order: K[]; bin?: boolean } | null>(null)
  const shown = drag?.order ?? order
  const hidden = hiddenActions(all, order)
  const empty = Math.max(0, QUICK_SLOTS - shown.length)

  const rowRef = useRef<HTMLDivElement>(null)
  const binRef = useRef<HTMLDivElement>(null)
  const hold = useRef<{ key: K; x0: number; y0: number; active: boolean; timer: ReturnType<typeof setTimeout> } | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag
  const orderRef = useRef(order)
  orderRef.current = order
  const changeRef = useRef(onChange)
  changeRef.current = onChange

  const startHold = (key: K) => (e: React.TouchEvent) => {
    if (!kit || e.touches.length !== 1) return
    const t0 = e.touches[0]
    const h = {
      key,
      x0: t0.clientX,
      y0: t0.clientY,
      active: false,
      timer: setTimeout(() => {
        h.active = true
        navigator.vibrate?.(12)
        setDrag({ key, order: orderRef.current })
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
      // Back among the rest: dropped on the bin, or on a "+" in the row.
      const pluses = [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-qa-plus]') ?? [])]
      const overBin =
        within(binRef.current?.getBoundingClientRect(), t0.clientX, t0.clientY, 18) ||
        pluses.some((el) => within(el.getBoundingClientRect(), t0.clientX, t0.clientY, 0))
      if (overBin !== Boolean(d.bin)) {
        navigator.vibrate?.(8)
        setDrag({ ...d, bin: overBin })
      }
      if (overBin) return
      const slots = [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-qa]') ?? [])]
      const at = slots.findIndex((el) => {
        const r = el.getBoundingClientRect()
        return t0.clientX >= r.left && t0.clientX <= r.right
      })
      if (at < 0) return
      const next = moveQuickAction(d.order, d.key, at)
      if (next.join() !== d.order.join()) setDrag({ ...d, order: next })
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
      if (!d) return
      if (d.bin) changeRef.current(orderRef.current.filter((k) => k !== d.key))
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
        {shown.map((key) => {
          const b = buttons[key]
          return (
            <button
              key={key}
              type="button"
              data-qa={key}
              aria-label={b.label}
              aria-pressed={b.pressed}
              title={b.label}
              onClick={b.onClick}
              onTouchStart={startHold(key)}
              onContextMenu={(e) => kit && e.preventDefault()}
              style={{ WebkitTouchCallout: 'none' }}
              className={`${box} select-none ${b.small ? 'text-[19px]' : 'text-[28px]'} ${b.muted ? 'opacity-40' : ''} ${
                b.pressed ? 'border-orange-500/70' : ''
              } ${drag?.key === key ? 'scale-110 border-orange-500 shadow-lg' : ''}`}
            >
              <span aria-hidden>{b.emoji}</span>
            </button>
          )
        })}
        {Array.from({ length: empty }, (_, i) =>
          drag ? (
            // While a button is held, a "+" is where it goes back.
            <span
              key={`drop-${i}`}
              data-qa-plus
              aria-hidden
              className={`${plus} ${drag.bin ? 'border-solid border-rose-500 bg-rose-600 text-white' : ''}`}
            >
              +
            </span>
          ) : hidden.length > 0 ? (
            // A real <select> over the "+": the phone's own list to pick from.
            <label key={`add-${i}`} className={`${plus} cursor-pointer`}>
              <span aria-hidden>+</span>
              <select
                aria-label={t('qa.add')}
                value=""
                onChange={(e) => {
                  const key = e.target.value as K
                  if (key) onChange([...order, key])
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
            </label>
          ) : (
            <span key={`gap-${i}`} aria-hidden />
          ),
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {status ?? ''}
        </span>
      </div>
      {drag && kit && (
        <div ref={binRef} className={`bb-tabbin${drag.bin ? ' hot' : ''}`} aria-hidden>
          <IconBin />
          <span>{kit.t(drag.bin ? 'tab_bin_drop' : 'tab_bin_hint')}</span>
        </div>
      )}
    </>
  )
}
