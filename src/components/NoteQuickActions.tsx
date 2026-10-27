import { useEffect, useRef, useState } from 'react'
import { hiddenQuickActions, moveQuickAction, QUICK_SLOTS, type QuickAction } from '../lib/quickActions'
import { useSettingsStore } from '../stores/settingsStore'
import { useT } from '../i18n'
import { usePhoneKit } from '../native/kit'
import { IconBin } from '../native/icons'

export interface QuickButton {
  label: string
  emoji: string
  /** Two glyphs (Copy and delete's 📋🗑️): drawn smaller to fit the place. */
  small?: boolean
  onClick: () => void
}

/**
 * The buttons across the top of a note, in the order Tune keeps
 * (`noteActions`, lib/quickActions.ts). On the phone, hold one and drag it to
 * a new place, or onto the bin that rises in the middle of the screen to take it
 * off (the tabs' gesture, James 2026-10-26); an empty place shows "+", which
 * picks one of the rest from a list.
 */
export function NoteQuickActions({ buttons, status }: { buttons: Record<QuickAction, QuickButton>; status?: string | null }) {
  const t = useT()
  const kit = usePhoneKit()
  const saved = useSettingsStore((s) => s.noteActions)
  const setSettings = useSettingsStore((s) => s.set)
  const [drag, setDrag] = useState<{ key: QuickAction; order: QuickAction[]; bin?: boolean } | null>(null)
  const shown = drag?.order ?? saved
  const hidden = hiddenQuickActions(saved)
  const empty = Math.max(0, QUICK_SLOTS - shown.length)

  const rowRef = useRef<HTMLDivElement>(null)
  const binRef = useRef<HTMLDivElement>(null)
  const hold = useRef<{ key: QuickAction; x0: number; y0: number; active: boolean; timer: ReturnType<typeof setTimeout> } | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag
  const savedRef = useRef(saved)
  savedRef.current = saved

  const startHold = (key: QuickAction) => (e: React.TouchEvent) => {
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
        setDrag({ key, order: savedRef.current })
      }, 450),
    }
    if (hold.current) clearTimeout(hold.current.timer)
    hold.current = h
  }

  useEffect(() => {
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
      const b = binRef.current?.getBoundingClientRect()
      const pad = 18
      const overBin = Boolean(
        b && t0.clientX >= b.left - pad && t0.clientX <= b.right + pad && t0.clientY >= b.top - pad && t0.clientY <= b.bottom + pad,
      )
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
      if (d.bin) setSettings({ noteActions: savedRef.current.filter((k) => k !== d.key) })
      else if (d.order.join() !== savedRef.current.join()) setSettings({ noteActions: d.order })
    }
    document.addEventListener('touchmove', move, { passive: false, capture: true })
    document.addEventListener('touchend', end, true)
    document.addEventListener('touchcancel', end, true)
    return () => {
      document.removeEventListener('touchmove', move, { capture: true })
      document.removeEventListener('touchend', end, true)
      document.removeEventListener('touchcancel', end, true)
    }
  }, [setSettings])

  const box =
    'flex min-h-[56px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 leading-none transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'

  return (
    <>
      {/* data-swipe-x: a drag that starts here is a button being moved, so
          the page's own pull down (the SDK's phone kit) leaves it alone —
          without it the whole page slid down after the finger. */}
      <div ref={rowRef} className="mb-5 grid grid-cols-5 gap-2" role="group" aria-label={t('nlink.actions')} data-swipe-x>
        {shown.map((key) => {
          const b = buttons[key]
          return (
            <button
              key={key}
              type="button"
              data-qa={key}
              aria-label={b.label}
              title={b.label}
              onClick={b.onClick}
              onTouchStart={startHold(key)}
              onContextMenu={(e) => kit && e.preventDefault()}
              style={{ WebkitTouchCallout: 'none' }}
              className={`${box} select-none ${b.small ? 'text-[19px]' : 'text-[28px]'} ${drag?.key === key ? 'scale-110 border-orange-500 shadow-lg' : ''}`}
            >
              <span aria-hidden>{b.emoji}</span>
            </button>
          )
        })}
        {Array.from({ length: empty }, (_, i) =>
          hidden.length > 0 && !drag ? (
            // A real <select> over the "+": the phone's own list to pick from.
            <label key={`add-${i}`} className={`${box} relative cursor-pointer border-dashed text-[26px] text-slate-500`}>
              <span aria-hidden>+</span>
              <select
                aria-label={t('qa.add')}
                value=""
                onChange={(e) => {
                  const key = e.target.value as QuickAction
                  if (key) setSettings({ noteActions: [...saved, key] })
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
