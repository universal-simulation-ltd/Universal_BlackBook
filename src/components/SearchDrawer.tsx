import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { DEFAULT_VIEW, describeView, sameView, viewOf } from '../lib/filter'
import { useBookStore } from '../stores/bookStore'
import { FilterBar } from './FilterBar'
import { PullDrawer } from './PullDrawer'

/** Sent by the tab bar (App's tabs) when Contacts is tapped while already on it. */
export const OPEN_SEARCH = 'blackbook:open-search'
/** …and by the second tap of a double tap, which makes the tab the default instead. */
export const SHUT_SEARCH = 'blackbook:shut-search'

/**
 * A phone: narrow AND touch. Only there is the search folded away, because the
 * way in is a pull with a finger — a narrow desktop window, where nothing can
 * pull, keeps the bar on screen as it is at every width above this one.
 * The width is `sm`, the breakpoint the rest of the layout switches at.
 */
const PHONE = '(max-width: 39.999rem) and (hover: none) and (pointer: coarse)'

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const isPhone = () => window.matchMedia(PHONE).matches

/** Gone for good the first time the drawer opens, by any way in. */
const LEARNT_KEY = 'blackbook.pullSearchLearnt'
function readLearnt(): boolean {
  try {
    return localStorage.getItem(LEARNT_KEY) === '1'
  } catch {
    return false
  }
}
function writeLearnt(): void {
  try {
    localStorage.setItem(LEARNT_KEY, '1')
  } catch {
    // Blocked storage: the hint just comes back next time.
  }
}

/**
 * The contact list's search box and ⚙️ Filters.
 *
 * On a phone they are folded away above the list until you pull down from the
 * top (James, 2026-10-19: "swipe down to reveal search bar and swipe again to
 * open keyboard. As we do in jukebox"), and a second pull while it is open
 * puts the cursor in the box with the keyboard up. They fold away again once
 * scrolled out of sight, unless a search is typed in. The gesture itself is
 * `PullDrawer`, ported from Universal Jukebox.
 *
 * ⚠️ Until then this bar was docked to the BOTTOM of a phone's screen, under
 * the thumb (owner's call, 2026-08-30). The suite rule now is the Jukebox
 * pull (BRANDING.md ▸ "Pull down for search, pull again for the keyboard"),
 * which puts it above the list — and takes the visual-viewport sums that kept
 * a fixed dock above the iOS keyboard with it.
 *
 * Other ways in, so nobody needs the gesture:
 *  - tapping the Contacts tab while already on it (when the tab bar shows,
 *    i.e. with Lists or To-do on) — Jukebox's tab tap, 2026-10-17;
 *  - a "Search contacts" button that is invisible until it takes keyboard
 *    focus, and that VoiceOver and TalkBack read in its place;
 *  - the first-run hint, which is itself a button.
 * The tab and the hidden button focus the box as they open it, inside the
 * tap, so the keyboard comes up — the same iOS rule as the second pull.
 *
 * With the drawer shut, a filtered or reordered list says so under the title
 * (and opens the drawer on a tap), so a list narrowed to four people never
 * looks like a book that lost the rest.
 */
export function SearchDrawer({ onContacts }: { onContacts: boolean }) {
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  if (!phone) {
    return (
      <div className="mb-4">
        <FilterBar />
      </div>
    )
  }
  return <PhoneSearch onContacts={onContacts} />
}

function PhoneSearch({ onContacts }: { onContacts: boolean }) {
  const query = useBookStore((s) => s.query)
  const setQuery = useBookStore((s) => s.setQuery)
  const hasContacts = useBookStore((s) => s.contacts.length > 0)
  const allTags = useBookStore((s) => s.tags)
  const tagNames = useMemo(() => new Map(allTags.map((t) => [t.id, t.name])), [allTags])
  const [pulled, setPulled] = useState(false)
  const [learnt, setLearnt] = useState(readLearnt)
  const searching = query.text.trim() !== ''
  const shown = pulled || searching
  const input = useRef<HTMLInputElement>(null)

  const learn = useCallback(() => {
    if (!readLearnt()) writeLearnt()
    setLearnt(true)
  }, [])

  const openDrawer = useCallback(() => {
    setPulled(true)
    learn()
  }, [learn])
  const closeDrawer = useCallback(() => setPulled(false), [])
  // A second pull while open: straight into the box, keyboard up. Called from
  // inside the touch's release (PullDrawer), which is what iOS needs.
  const typeIntoSearch = useCallback(() => input.current?.focus({ preventScroll: true }), [])

  // Open AND focus in the same tap. `flushSync` first, so the drawer has lost
  // `inert` before focus() is called — focusing an inert field does nothing,
  // and waiting for the next render would be outside the tap.
  const openAndFocus = useCallback(() => {
    flushSync(() => setPulled(true))
    learn()
    input.current?.focus()
  }, [learn])

  // The ✕ and Escape: empty the box and fold it away.
  const clearAndClose = useCallback(() => {
    setQuery({ text: '' })
    setPulled(false)
    input.current?.blur()
  }, [setQuery])

  const searchingNow = useRef(searching)
  searchingNow.current = searching
  useEffect(() => {
    if (!onContacts) return
    const open = () => openAndFocus()
    const shut = () => {
      if (searchingNow.current) return
      input.current?.blur()
      setPulled(false)
    }
    window.addEventListener(OPEN_SEARCH, open)
    window.addEventListener(SHUT_SEARCH, shut)
    return () => {
      window.removeEventListener(OPEN_SEARCH, open)
      window.removeEventListener(SHUT_SEARCH, shut)
    }
  }, [onContacts, openAndFocus])

  const view = viewOf(query)
  const filtered = !sameView(view, DEFAULT_VIEW)

  return (
    <>
      {/* The keyboard and screen-reader way in: no room is taken on screen
          until it is focused, and it is the first thing after the title. */}
      {!shown && (
        <button
          type="button"
          onClick={openAndFocus}
          className="sr-only rounded-lg border-slate-700 bg-slate-900 text-sm font-medium text-slate-200 focus:not-sr-only focus:mb-3 focus:inline-flex focus:border focus:px-3 focus:py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          Search contacts
        </button>
      )}

      {!shown && !learnt && hasContacts && onContacts && <PullHint onOpen={openDrawer} />}

      {!shown && filtered && (
        <button
          type="button"
          onClick={openDrawer}
          className="-mt-2 mb-3 flex max-w-full items-baseline gap-1.5 rounded text-left text-xs text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <span className="min-w-0 truncate">Showing {describeView(view, (id) => tagNames.get(id) ?? null)}</span>
          <span className="shrink-0 font-medium text-orange-400">Change</span>
        </button>
      )}

      <PullDrawer
        shown={shown}
        onOpen={openDrawer}
        onScrolledAway={searching ? undefined : closeDrawer}
        onPullAgain={typeIntoSearch}
      >
        <FilterBar input={input} onClose={clearAndClose} />
      </PullDrawer>
    </>
  )
}

/**
 * The first-run hint that the search is folded away above the list — on a
 * phone nothing else on screen says it exists (Jukebox's PullHint, 2026-10-13).
 * A tap opens the drawer too. It bobs, unless reduced motion is asked for.
 */
function PullHint({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex justify-center pb-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-orange-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-md shadow-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 motion-safe:animate-[bb-tip-bob_1.6s_ease-in-out_infinite]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 8l5 5 5-5" />
        </svg>
        Pull down to search
      </button>
    </div>
  )
}
