/* eslint-disable react-refresh/only-export-components -- the swipe actions, the undo hook and the bar that shows it belong together */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react'
import { usePhoneLayer } from '@unisim/sdk'
import { btnSubtle } from './ui'
import type { Side } from '../lib/swipe'
import { SwipeRow } from './SwipeRow'
import { usePhoneKit } from '../native/kit'
import { currentT, useT } from '../i18n'
import type { SwipeAction } from './SwipeRow'

// The swipes every deletable list shares (James, 2026-10-25; BRANDING.md ▸ "A
// deletable row swipes: delete one way, a second action the other"): swipe
// LEFT to delete, with Undo for six seconds; swipe RIGHT for the list's own
// second action (Pin, Edit, Not done…); the same jobs as buttons shown on
// focus for VoiceOver, TalkBack and the keyboard. One copy, used by every list
// in the app: To-do, Notes, Contacts, Lists, Tags, Note templates and their
// fields, reminders, linked notes and contacts, the import preview.

const PinIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 3h6l-1 6 3 3H7l3-3-1-6ZM12 12v9" />
  </svg>
)
const BinIcon = (
  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M6.5 1a1 1 0 0 0-1 1v.5H2.75a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H10.5V2a1 1 0 0 0-1-1h-3ZM4.5 5.5h7l-.6 8.1a1.5 1.5 0 0 1-1.5 1.4H6.6a1.5 1.5 0 0 1-1.5-1.4L4.5 5.5Z" />
  </svg>
)

/** The left edge's action: uncovered by swiping RIGHT. */
export function pinSwipe(pinned: boolean, title: string, onAction: () => void): SwipeAction {
  const t = currentT()
  return {
    text: pinned ? t('todo.unpin') : t('todo.pin'),
    label: pinned ? t('todo.unpin_label', { title }) : t('todo.pin_label', { title }),
    icon: PinIcon,
    tone: 'bg-orange-600 text-white focus-visible:ring-orange-200',
    onAction,
  }
}

/** The right edge's action: uncovered by swiping LEFT. */
export function deleteSwipe(title: string, onAction: () => void): SwipeAction {
  const t = currentT()
  return {
    text: t('c.delete'),
    label: t('todo.delete_label', { title }),
    icon: BinIcon,
    tone: 'bg-rose-600 text-white focus-visible:ring-rose-200',
    onAction,
  }
}

const g = { viewBox: '0 0 24 24', className: 'h-5 w-5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const ICONS = {
  edit: (
    <svg {...g}>
      <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
    </svg>
  ),
  unlink: (
    <svg {...g}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1M4 4l16 16" />
    </svg>
  ),
  call: (
    <svg {...g}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  ),
  mail: (
    <svg {...g}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
  undone: (
    <svg {...g}>
      <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  ),
  up: (
    <svg {...g}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  ),
  copy: (
    <svg {...g}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2h-7.5a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </svg>
  ),
  leave: (
    <svg {...g}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
}

/** A second action (the right swipe) other than Pin: Edit, Unlink, Call… */
export function actionSwipe(icon: keyof typeof ICONS, text: string, label: string, onAction: () => void): SwipeAction {
  return { text, label, icon: ICONS[icon], tone: 'bg-orange-600 text-white focus-visible:ring-orange-200', onAction }
}

/** A deleting action other than Delete itself: Unlink, Remove, Leave out. */
export function removeSwipe(icon: keyof typeof ICONS, text: string, label: string, onAction: () => void): SwipeAction {
  return { text, label, icon: ICONS[icon], tone: 'bg-rose-600 text-white focus-visible:ring-rose-200', onAction }
}

/**
 * One list's rows: at most one swiped open at a time (opening one closes the
 * other). Wrap a list in a group and each row in a SwipeItem.
 */
const Group = createContext<{ open: { id: string; side: Side } | null; set: (o: { id: string; side: Side } | null) => void } | null>(null)

export function SwipeGroup({ children }: { children: ReactNode }) {
  const [open, set] = useState<{ id: string; side: Side } | null>(null)
  return <Group.Provider value={{ open, set }}>{children}</Group.Provider>
}

/**
 * A row that swipes: `right` is uncovered by swiping LEFT (Delete), `left` by
 * swiping RIGHT (the second action). Each action closes the row as it runs.
 * Touch only, as SwipeRow is; `focus` lists the same actions as buttons.
 */
export function SwipeItem({
  id,
  left,
  right,
  focus,
  select,
  name,
  children,
}: {
  id: string
  left?: SwipeAction
  right?: SwipeAction
  /** The same jobs as buttons on focus (VoiceOver, TalkBack, keyboard). */
  focus?: { label: string; onClick: () => void }[]
  /** The list's selection (useHoldSelect): hold to select, then taps tick. */
  select?: HoldSelect
  /** The row's name, for its tick box and its Select button. */
  name?: string
  children: ReactNode
}) {
  const t = useT()
  const own = useState<{ id: string; side: Side } | null>(null)
  const group = useContext(Group) ?? { open: own[0], set: own[1] }
  const close = (a?: SwipeAction) => a && { ...a, onAction: () => (group.set(null), a.onAction()) }
  if (select?.selecting) {
    const on = select.isSelected(id)
    return (
      <div className="relative h-full">
        {/* The row as it is, under one tick box the size of the row. */}
        <div aria-hidden className={`pointer-events-none h-full rounded-xl ${on ? 'ring-2 ring-orange-500' : ''}`} ref={(el) => el?.setAttribute('inert', '')}>
          {children}
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={name}
          onClick={(e) => select.toggle(id, e.shiftKey)}
          className={`absolute inset-0 z-10 flex items-start justify-end rounded-xl p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${on ? 'bg-orange-500/10' : ''}`}
        >
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-md border ${
              on ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-500 bg-slate-950'
            }`}
          >
            {on && (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </button>
      </div>
    )
  }
  const focusAll = select ? [{ label: t('nsel.select_label', { title: name ?? '' }), onClick: () => select.start(id) }, ...(focus ?? [])] : focus
  return (
    <div className="h-full" onTouchStart={select ? select.holdStart(id) : undefined}>
    <SwipeRow
      open={group.open?.id === id ? group.open.side : null}
      onOpenChange={(side) => group.set(side ? { id, side } : null)}
      left={close(left)}
      right={close(right)}
    >
      <div className="relative h-full">
        {children}
        {focusAll && <FocusActions actions={focusAll} />}
      </div>
    </SwipeRow>
    </div>
  )
}

export interface HoldSelect {
  selecting: boolean
  isSelected: (id: string) => boolean
  picked: string[]
  /** Into selection mode with this one ticked (the hold, or a Select button). */
  start: (id?: string) => void
  toggle: (id: string, range?: boolean) => void
  all: () => void
  done: () => void
  holdStart: (id: string) => (e: ReactTouchEvent) => void
}

/**
 * Hold to select (James, 2026-10-25: "a tap and hold should select the item";
 * BRANDING.md ▸ "A deletable row swipes"). A still finger for 0.45 s selects
 * the row and starts selection mode; any movement first is a swipe or a
 * scroll and cancels it. Then taps tick and untick, Shift-click ticks a run
 * on the website, and Done, Android's back or a swipe in from the left edge
 * leaves. The hold never fires the row's own tap, and the lifting finger
 * never presses what slides in under it (the selection bar): that click is
 * swallowed wherever it lands.
 */
/**
 * The hold itself: a still finger for 0.45 s calls `onHold(id)`. Movement
 * first (a swipe, a scroll) cancels it. The click the lifting finger makes is
 * swallowed wherever it lands, so neither the row's own tap nor whatever
 * slides in under the finger (a selection bar) is pressed.
 */
export function useHold(onHold: (id: string) => void) {
  const hold = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null)
  const held = useRef(false)
  const cb = useRef(onHold)
  cb.current = onHold
  useEffect(() => {
    const cancel = (e: TouchEvent) => {
      const h = hold.current
      if (!h) return
      const t0 = e.touches[0]
      if (e.type !== 'touchmove' || !t0 || Math.hypot(t0.clientX - h.x, t0.clientY - h.y) > 8) {
        clearTimeout(h.timer)
        hold.current = null
      }
    }
    const up = () => {
      if (held.current) setTimeout(() => (held.current = false), 400)
    }
    document.addEventListener('touchmove', cancel, { passive: true })
    document.addEventListener('touchend', cancel)
    document.addEventListener('touchcancel', cancel)
    document.addEventListener('pointerup', up, true)
    return () => {
      document.removeEventListener('touchmove', cancel)
      document.removeEventListener('touchend', cancel)
      document.removeEventListener('touchcancel', cancel)
      document.removeEventListener('pointerup', up, true)
    }
  }, [])
  return (id: string) => (e: ReactTouchEvent) => {
    if (e.touches.length !== 1) return
    const t0 = e.touches[0]
    if (hold.current) clearTimeout(hold.current.timer)
    hold.current = {
      x: t0.clientX,
      y: t0.clientY,
      timer: setTimeout(() => {
        hold.current = null
        held.current = true
        const swallow = (ev: Event) => {
          if (!held.current) return
          held.current = false
          ev.preventDefault()
          ev.stopPropagation()
        }
        document.addEventListener('click', swallow, { capture: true, once: true })
        setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 1500)
        navigator.vibrate?.(12)
        cb.current(id)
      }, 450),
    }
  }
}

/** Selection mode can be left the phone's ways: Android's back, and a swipe in from the left edge. */
export function useLeaveSelection(selecting: boolean, phone: boolean, leave: () => void) {
  const cb = useRef(leave)
  cb.current = leave
  usePhoneLayer('page', () => cb.current(), { open: selecting && phone, lockScroll: false })
  useEffect(() => {
    if (!selecting || !phone) return
    let from: { x: number; y: number } | null = null
    const down = (e: TouchEvent) => {
      const t0 = e.touches[0]
      from = t0 && t0.clientX < 24 ? { x: t0.clientX, y: t0.clientY } : null
    }
    const move = (e: TouchEvent) => {
      const t0 = e.touches[0]
      if (!from || !t0) return
      if (t0.clientX - from.x > 70 && Math.abs(t0.clientY - from.y) < 50) {
        from = null
        cb.current()
      }
    }
    document.addEventListener('touchstart', down, { passive: true })
    document.addEventListener('touchmove', move, { passive: true })
    return () => {
      document.removeEventListener('touchstart', down)
      document.removeEventListener('touchmove', move)
    }
  }, [selecting, phone])
}

export function useHoldSelect(ids: string[], phone: boolean): HoldSelect {
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const idsRef = useRef(ids)
  idsRef.current = ids
  const last = useRef<string | null>(null)
  const selecting = selected !== null
  useLeaveSelection(selecting, phone, () => setSelected(null))

  const holdStart = useHold((id) => start(id))
  function start(id?: string) {
    last.current = id ?? null
    setSelected((s) => {
      const next = new Set(s ?? [])
      if (id) next.add(id)
      return next
    })
  }

  return {
    selecting,
    isSelected: (id) => Boolean(selected?.has(id)),
    picked: selected ? idsRef.current.filter((id) => selected.has(id)) : [],
    start,
    toggle: (id, range = false) => {
      setSelected((s) => {
        const next = new Set(s ?? [])
        const order = idsRef.current
        if (range && last.current && order.includes(last.current)) {
          const [a, b] = [order.indexOf(last.current), order.indexOf(id)].sort((x, y) => x - y)
          for (const x of order.slice(a, b + 1)) next.add(x)
        } else if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      last.current = id
    },
    all: () => setSelected((s) => (s && s.size === idsRef.current.length ? new Set() : new Set(idsRef.current))),
    done: () => setSelected(null),
    holdStart,
  }
}

/**
 * Over a list while selecting: how many, Select all / none, the list's own
 * bulk actions, and Done. Sticky, so it stays in reach while ticking.
 */
export function SelectBar({
  select,
  total,
  actions,
}: {
  select: HoldSelect
  total: number
  actions: { label: string; onClick: (ids: string[]) => void; danger?: boolean }[]
}) {
  const t = useT()
  if (!select.selecting) return null
  const count = select.picked.length
  const act = `${btnSubtle} disabled:cursor-not-allowed disabled:opacity-40`
  return (
    <div className="sticky top-0 z-30 -mx-1 mb-2 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border border-slate-800 bg-slate-900 px-2 py-1.5">
      <p className="mr-auto px-1 text-sm font-medium tabular-nums text-slate-200" aria-live="polite">
        {t('sel.count', { count })}
      </p>
      <button type="button" className={act} onClick={select.all}>
        {count === total && total > 0 ? t('sel.none') : t('sel.all')}
      </button>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className={`${act} ${a.danger ? 'text-rose-300 hover:bg-rose-950 hover:text-rose-200' : ''}`}
          disabled={count === 0}
          onClick={() => {
            const ids = select.picked
            select.done()
            a.onClick(ids)
          }}
        >
          {a.label}
        </button>
      ))}
      <button type="button" className={`${act} text-orange-300`} onClick={select.done}>
        {t('c.done')}
      </button>
    </div>
  )
}

const FOCUS_ONLY =
  'sr-only focus:not-sr-only focus:absolute focus:bottom-1.5 focus:right-1.5 focus:z-10 focus:rounded-lg focus:bg-slate-800 focus:px-2.5 focus:py-1 focus:text-xs focus:font-semibold focus:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400'

/** The gestures' jobs as buttons, hidden until focused. */
export function FocusActions({ actions }: { actions: { label: string; onClick: () => void }[] }) {
  return (
    <>
      {actions.map((a) => (
        <button key={a.label} type="button" className={FOCUS_ONLY} onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </>
  )
}

/** Delete now, Undo for six seconds: what was deleted, and the way to put it back. */
export function useUndo<T>(restore: (item: T) => Promise<void>) {
  const [item, setItem] = useState<T | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  return {
    item,
    deleted: (x: T) => {
      setItem(x)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setItem(null), 6000)
    },
    undo: async () => {
      if (item === null) return
      clearTimeout(timer.current)
      await restore(item)
      setItem(null)
    },
  }
}

/** "Deleted “Book dentist”. Undo" — at the foot of the screen. */
export function UndoBar({ title, text, onUndo }: { title: string; text?: string; onUndo: () => void }) {
  const t = useT()
  const kit = usePhoneKit()
  return (
    <div
      role="status"
      className={
        kit
          ? 'bb-toast flex items-center gap-3 text-left'
          : 'fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-950 shadow-xl'
      }
    >
      <span className="min-w-0 truncate">{text ?? t('todo.deleted', { title: title || t('c.untitled') })}</span>
      <button type="button" onClick={onUndo} className="shrink-0 font-semibold text-orange-600 underline-offset-2 hover:underline">
        {t('todo.undo')}
      </button>
    </div>
  )
}
