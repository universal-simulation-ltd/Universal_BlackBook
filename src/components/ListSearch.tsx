import { useCallback, useRef, useState, type RefObject } from 'react'
import {
  PullDrawer,
  TOUCH_PHONE_QUERY,
  insideScrolledChild,
  modalIsOpen,
  openThenFocus,
  useMediaQuery,
  useSearchRequests,
} from '@unisim/sdk'
import { inputCls } from './ui'
import { useT } from '../i18n'

// Search for the Notes, To-do and Lists tabs, the way Contacts has it
// (SearchDrawer): on a phone folded away above the list, pulled down to show
// it and pulled again for the keyboard (BRANDING.md); a tap on the tab you are
// already on opens it too. Everywhere else the box is on show.

const notAPull = (e: TouchEvent) => modalIsOpen() || insideScrolledChild(e.target)

export function ListSearch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const phone = useMediaQuery(TOUCH_PHONE_QUERY)
  return phone ? <PhoneSearch value={value} onChange={onChange} label={label} /> : <SearchBox value={value} onChange={onChange} label={label} />
}

function SearchBox({
  value,
  onChange,
  label,
  input,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  input?: RefObject<HTMLInputElement>
}) {
  return (
    <div className="relative">
      <input
        ref={input}
        type="search"
        enterKeyHint="search"
        className={`${inputCls} pl-9`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
      />
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13.5 13.5 3 3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function PhoneSearch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [pulled, setPulled] = useState(false)
  const searching = value.trim() !== ''
  const input = useRef<HTMLInputElement>(null)
  const open = useCallback(() => setPulled(true), [])
  const close = useCallback(() => setPulled(false), [])
  const focus = useCallback(() => input.current?.focus({ preventScroll: true }), [])
  useSearchRequests({
    onOpen: () => openThenFocus(() => setPulled(true), input, {}),
    onShut: () => {
      if (searching) return
      input.current?.blur()
      setPulled(false)
    },
  })
  return (
    <PullDrawer
      shown={pulled || searching}
      onOpen={open}
      onScrolledAway={searching ? undefined : close}
      onPullAgain={focus}
      ignoreTouch={notAPull}
      containOverscroll
      innerClassName="pb-1"
    >
      <SearchBox value={value} onChange={onChange} label={label} input={input} />
    </PullDrawer>
  )
}

/**
 * "Add “…”" — the first thing over what a search found, found or not (James,
 * 2026-10-23, after the contact list's): one tap makes the thing this list
 * holds, with what was typed already in it.
 */
export function AddTyped({ text, onAdd, className = '' }: { text: string; onAdd: (text: string) => void; className?: string }) {
  const t = useT()
  const value = text.trim().replace(/\s+/g, ' ')
  if (!value) return null
  return (
    <button
      type="button"
      onClick={() => onAdd(value)}
      className={`flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-700 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${className}`}
    >
      <span aria-hidden className="text-lg leading-none text-orange-400">＋</span>
      <span className="min-w-0 truncate">
        {t('add_quoted_before')}
        <span className="font-semibold text-slate-100">“{value}”</span>
        {t('add_quoted_after')}
      </span>
    </button>
  )
}
