/* eslint-disable react-refresh/only-export-components -- the swipe actions, the undo hook and the bar that shows it belong together */
import { useRef, useState } from 'react'
import { usePhoneKit } from '../native/kit'
import { currentT, useT } from '../i18n'
import type { SwipeAction } from './SwipeRow'

// The swipes the To-do and Notes lists share (James, 2026-10-25): swipe right
// to Pin, left to Delete, with Undo for six seconds; the same jobs as buttons
// shown on focus for VoiceOver, TalkBack and the keyboard. One copy, used by
// TodoView and NotesView.

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
