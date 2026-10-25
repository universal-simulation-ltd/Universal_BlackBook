/* eslint-disable react-refresh/only-export-components -- the swipe actions, the undo hook and the bar that shows it belong together */
import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
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
  children,
}: {
  id: string
  left?: SwipeAction
  right?: SwipeAction
  /** The same jobs as buttons on focus (VoiceOver, TalkBack, keyboard). */
  focus?: { label: string; onClick: () => void }[]
  children: ReactNode
}) {
  const own = useState<{ id: string; side: Side } | null>(null)
  const group = useContext(Group) ?? { open: own[0], set: own[1] }
  const close = (a?: SwipeAction) => a && { ...a, onAction: () => (group.set(null), a.onAction()) }
  return (
    <SwipeRow
      open={group.open?.id === id ? group.open.side : null}
      onOpenChange={(side) => group.set(side ? { id, side } : null)}
      left={close(left)}
      right={close(right)}
    >
      <div className="relative h-full">
        {children}
        {focus && <FocusActions actions={focus} />}
      </div>
    </SwipeRow>
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
