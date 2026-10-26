import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
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
import { useSearchReset } from '../stores/searchStore'

// Search for the Notes, To-do and Lists tabs, the way Contacts has it
// (SearchDrawer): on a phone folded away above the list, pulled down to show
// it and pulled again for the keyboard (BRANDING.md); a tap on the tab you are
// already on opens it too. Everywhere else the box is on show.
//
// `children` are the tab's filters (Notes' All · Book chips, To-do's tags):
// on the phone they fold away in the same space as the search (James,
// 2026-10-26: "hide the chips … in the reveal space with search"), and stay
// out while one is on, so a filtered list is never filtered by something out
// of sight. Contacts does the same with its FilterBar (SearchDrawer).

const notAPull = (e: TouchEvent) => modalIsOpen() || insideScrolledChild(e.target)

interface ListSearchProps {
  value: string
  onChange: (v: string) => void
  label: string
  children?: ReactNode
  /** A filter in `children` is on: the drawer stays out. */
  filtering?: boolean
  /**
   * Return in the box (To-do: add what was typed, James 2026-10-26). Without
   * it the keyboard's key says Search and only puts the keyboard away.
   */
  onEnter?: () => void
}

export function ListSearch({ value, onChange, label, children, filtering = false, onEnter }: ListSearchProps) {
  const phone = useMediaQuery(TOUCH_PHONE_QUERY)
  // Another tab chosen: this search empties (searchStore). Not on the first
  // render, which is not a change of tab.
  const epoch = useSearchReset((s) => s.epoch)
  const seen = useRef(epoch)
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  useEffect(() => {
    if (seen.current === epoch) return
    seen.current = epoch
    changeRef.current('')
  }, [epoch])
  if (phone) {
    return (
      <PhoneSearch value={value} onChange={onChange} label={label} filtering={filtering} onEnter={onEnter}>
        {children}
      </PhoneSearch>
    )
  }
  return (
    <>
      <SearchBox value={value} onChange={onChange} label={label} onEnter={onEnter} />
      {children}
    </>
  )
}

function SearchBox({
  value,
  onChange,
  label,
  input,
  onEnter,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  input?: RefObject<HTMLInputElement>
  onEnter?: () => void
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (onEnter) onEnter()
    else (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.blur()
  }
  return (
    <form className="relative" role="search" onSubmit={submit}>
      <input
        ref={input}
        type="search"
        enterKeyHint={onEnter ? 'done' : 'search'}
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
    </form>
  )
}

function PhoneSearch({ value, onChange, label, children, filtering, onEnter }: ListSearchProps) {
  const [pulled, setPulled] = useState(false)
  const searching = value.trim() !== '' || Boolean(filtering)
  const input = useRef<HTMLInputElement>(null)
  const open = useCallback(() => setPulled(true), [])
  const close = useCallback(() => setPulled(false), [])
  const focus = useCallback(() => input.current?.focus({ preventScroll: true }), [])
  // Another tab chosen: fold away as well as empty (ListSearch empties it).
  const epoch = useSearchReset((s) => s.epoch)
  useEffect(() => {
    setPulled(false)
  }, [epoch])
  useSearchRequests({
    // The tab tapped again: the box, keyboard up, with what was searched last
    // selected, so typing starts a new search (James, 2026-10-26).
    onOpen: () => {
      openThenFocus(() => setPulled(true), input, {})
      input.current?.select()
    },
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
      <SearchBox value={value} onChange={onChange} label={label} input={input} onEnter={onEnter} />
      {children && <div className="mt-3">{children}</div>}
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
