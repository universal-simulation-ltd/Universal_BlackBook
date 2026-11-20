/* eslint-disable react-refresh/only-export-components -- the swipe actions, the undo hook and the bar that shows it belong together */
import { useEffect, useState, type ReactNode } from 'react'
import { SwipeRow, useHoldSelect as useSdkHoldSelect, type HoldSelect, type SwipeAction } from '@unisim/sdk'
import { btnDanger, btnGhost, btnSubtle } from './ui'
import { Modal } from './Modal'
import { usePhoneKit } from '../native/kit'
import { useNativeNav } from '../native/nav'
import { currentT, useT } from '../i18n'

// The row that swipes, the hold that selects, its way out and the Undo are the
// SDK phone kit's since @unisim/sdk 0.229.0 (moved there from this file and
// SwipeRow.tsx / lib/swipe.ts). What stays here is this app's look: the
// actions' colours and icons, the selection overlay, the bars and the toast.
export { SwipeGroup, useHold, useLeaveSelection, useUndo } from '@unisim/sdk'
export type { HoldSelect } from '@unisim/sdk'

/** An action's colours on this app's cards (Tailwind; they win over the SDK's tone). */
const ORANGE = 'bg-orange-600 text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-200'
const ROSE = 'bg-rose-600 text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-200'

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
    tone: 'accent',
    className: ORANGE,
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
    tone: 'danger',
    className: ROSE,
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
  wake: (
    <svg {...g}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
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
  return { text, label, icon: ICONS[icon], tone: 'accent', className: ORANGE, onAction }
}

/** A deleting action other than Delete itself: Unlink, Remove, Leave out. */
export function removeSwipe(icon: keyof typeof ICONS, text: string, label: string, onAction: () => void): SwipeAction {
  return { text, label, icon: ICONS[icon], tone: 'danger', className: ROSE, onAction }
}

/**
 * A row that swipes (the SDK's SwipeRow, inside a SwipeGroup: one open at a
 * time): `right` is uncovered by swiping LEFT (Delete), `left` by swiping
 * RIGHT (the second action). Each action closes the row as it runs. Touch
 * only; `focus` lists the same jobs as buttons.
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
    <SwipeRow id={id} left={left} right={right} focusActions={false} className="h-full rounded-xl">
      <div className="relative h-full">
        {children}
        {focusAll && <FocusActions actions={focusAll} />}
      </div>
    </SwipeRow>
    </div>
  )
}

/**
 * Hold to select (James, 2026-10-25: "a tap and hold should select the item";
 * BRANDING.md ▸ "A deletable row swipes"): the SDK's useHoldSelect. A still
 * finger for 0.45 s selects the row and starts selection mode; then taps tick
 * and untick, Shift-click ticks a run on the website, and Done, Android's
 * back or a swipe in from the left edge leaves (on the phone). The hold never
 * fires the row's own tap, and the lifting finger never presses what slides
 * in under it (the selection bar).
 */
export function useHoldSelect(ids: string[], phone: boolean): HoldSelect {
  return useSdkHoldSelect(ids, { gestures: phone })
}

/**
 * The frame every list's select bar is drawn in, so Contacts, Notes, To-do and
 * the rest cannot drift apart again. Two rows (James, 2026-11-19: "feels a bit
 * clunky"): how many and Select all, with Done at the far end, then the list's
 * own actions on a line of their own. All on one wrapping line, the actions
 * broke wherever the width ran out and Select all sat among Pin and Delete as
 * if it were one of them.
 *
 * Sticky, so it stays in reach while ticking (below the phone's fixed top
 * bar: native.css ▸ `.bb-selectbar`).
 */
export function SelectFrame({
  count,
  allPicked,
  onAll,
  onDone,
  className = 'mb-2',
  children,
}: {
  count: number
  allPicked: boolean
  onAll: () => void
  onDone: () => void
  className?: string
  /** The actions: buttons styled with `selectAct`. */
  children?: ReactNode
}) {
  const t = useT()
  return (
    <div className={`bb-selectbar sticky top-0 z-30 -mx-1 rounded-xl border border-slate-800 bg-slate-900 px-2 py-1.5 ${className}`}>
      <div className="flex items-center gap-1">
        <p className="px-1 text-sm font-medium tabular-nums text-slate-200" aria-live="polite">
          {t('sel.count', { count })}
        </p>
        <button type="button" className={selectAct} onClick={onAll}>
          {allPicked ? t('sel.none') : t('sel.all')}
        </button>
        <button type="button" className={`${selectAct} ml-auto text-orange-300`} onClick={onDone}>
          {t('c.done')}
        </button>
      </div>
      {children && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 border-t border-slate-800 pt-1.5 [&>button]:flex-1 sm:[&>button]:flex-none">
          {children}
        </div>
      )}
    </div>
  )
}

/** A select bar's action button; add `selectDanger` for Delete and the like. */
export const selectAct = `${btnSubtle} disabled:cursor-not-allowed disabled:opacity-40`
export const selectDanger = 'text-rose-300 hover:bg-rose-950 hover:text-rose-200'

/** The select bar for a list whose actions are all "do this to the picked ids". */
export function SelectBar({
  select,
  total,
  actions,
}: {
  select: HoldSelect
  total: number
  actions: { label: string; onClick: (ids: string[]) => void; danger?: boolean }[]
}) {
  if (!select.selecting) return null
  const count = select.picked.length
  return (
    <SelectFrame count={count} allPicked={count === total && total > 0} onAll={select.all} onDone={select.done}>
      {actions.length > 0 &&
        actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`${selectAct} ${a.danger ? selectDanger : ''}`}
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
    </SelectFrame>
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

/** "Deleted “Book dentist”. Undo" — at the foot of the screen. */
export function UndoBar({ title, text, onUndo }: { title: string; text?: string; onUndo: () => void }) {
  const t = useT()
  const kit = usePhoneKit()
  // The phone's toast ("Copied") sits in exactly this spot and is drawn over
  // it: Copy then Delete in Notes put "Copied" on top of Undo, and a tap on
  // Undo only closed the toast (James, 2026-11-11: "Undo link didn't work").
  // The newer message wins, so the toast goes when an Undo arrives.
  useEffect(() => {
    if (kit) useNativeNav.getState().say(null)
  }, [kit])
  return (
    <div
      role="status"
      className={
        kit
          ? 'bb-toast bb-undo flex items-center gap-3 text-left'
          : // Above the website's docked tabs on a phone width (--u-dock-space, SDK 0.222; 0 elsewhere).
            'fixed bottom-[calc(1.25rem+var(--u-dock-space,0px))] left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-950 shadow-xl'
      }
    >
      <span className="min-w-0 truncate">{text ?? t('todo.deleted', { title: title || t('c.untitled') })}</span>
      <button type="button" onClick={onUndo} className="shrink-0 font-semibold text-orange-600 underline-offset-2 hover:underline">
        {t('todo.undo')}
      </button>
    </div>
  )
}

/**
 * The website's Delete selected, asking first in our own words (the
 * SelectionBar's `confirm`): the SDK's own confirm says it can't be undone,
 * and here a bulk delete has Undo for six seconds, as a swipe's Delete does.
 * `ask` is what the bar waits on; `ui` is the sheet, rendered by the list.
 */
export function useAskDelete(title: string, body: (count: number) => string) {
  const t = useT()
  const [asking, setAsking] = useState<{ count: number; answer: (ok: boolean) => void } | null>(null)
  const ask = (_message: string, count: number) => new Promise<boolean>((answer) => setAsking({ count, answer }))
  const close = (ok: boolean) => {
    asking?.answer(ok)
    setAsking(null)
  }
  const ui = asking && (
    <Modal phone="sheet" title={title} onClose={() => close(false)}>
      <p className="text-sm text-slate-300">{body(asking.count)}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={() => close(false)} autoFocus>
          {t('c.keep')}
        </button>
        <button type="button" className={btnDanger} onClick={() => close(true)}>
          {t('c.delete')}
        </button>
      </div>
    </Modal>
  )
  return { ask, ui }
}

/**
 * The website's tick-box selection bar (SDK SelectionBar), sticky once
 * something is ticked so Delete selected stays in reach down a long list, as
 * Contacts' is.
 */
export const webSelBarWrap = (count: number) => (count > 0 ? 'sticky top-0 z-30 -mx-1 mb-2 bg-slate-950 px-1 py-1' : 'mb-2')
