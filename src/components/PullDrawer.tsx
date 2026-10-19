// PullDrawer.tsx — the search box and the ⚙️ Filters, folded away above the
// contact list on a phone until you pull down from the top of the page, and
// pulled down AGAIN to type into the box (James, 2026-10-19: "swipe down to
// reveal search bar and swipe again to open keyboard. As we do in jukebox").
//
// Ported from Universal Jukebox's phone app (`src/native/PullDrawer.tsx`,
// itself the native twin of Jukebox's `components/PhoneSearch.tsx`), and kept
// to the same thresholds and feel so the gesture is one gesture across the
// suite (BRANDING.md ▸ "Pull down for search, pull again for the keyboard"):
//
//  - Only from the very top of the page, one finger, a mostly vertical pull
//    downwards, and not one that starts on a sideways swiper (`data-swipe-x`).
//    The first 10px of a touch decide it: across, or up, and it is not a pull
//    for the rest of that touch.
//  - It follows the finger at RESIST of its speed — a rubber band, not a drag —
//    opens if let go past PULL_TO_OPEN, and springs shut otherwise.
//  - Pulled again while open, it asks the parent for the keyboard. That call is
//    made from the touch's own release, because iOS only raises the keyboard
//    for a focus made inside a user gesture; a focus on the next render is a
//    focused field with no keyboard.
//  - Scrolled out of sight under the top of the screen, it folds itself away
//    again, holding the list below still on screen. The parent decides whether
//    to let it: with a search typed in, the box stays.
//
// BlackBook's own additions, because unlike Jukebox's pages the contact list
// has modal dialogs over it and a scrolling Filters panel inside the drawer:
// a touch made while a dialog is open is never a pull (it would peek a drawer
// behind the dialog and focus a box nobody can see), and neither is one that
// starts inside something already scrolled down (dragging the Filters panel
// back up is scrolling it, not asking for the keyboard).
//
// ⚠️ THE HEIGHT IS DRIVEN HERE, ON THE ELEMENT, NOT THROUGH REACT. A pull moves
// it sixty times a second, and routing that through state would re-render the
// whole contact list under the finger.

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

/** How far the finger has to travel, in px, before letting go opens it. */
export const PULL_TO_OPEN = 64
/** The drawer moves this much per pixel of finger: a pull, not a drag. */
export const RESIST = 0.6

/** Where the suite navbar ends, in the viewport — 0 when it has scrolled off. */
function navBarBottom(): number {
  const bar = document.querySelector('header')
  return bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** A touch that should never be read as a pull, whatever it does next. */
function notAPull(target: EventTarget | null): boolean {
  if (document.querySelector('dialog[open], [aria-modal="true"]')) return true
  if (!(target instanceof Element)) return false
  if (target.closest('[data-swipe-x]')) return true
  // Something between the finger and the page is scrolled down: the touch
  // scrolls that, and pulling down is it scrolling back up.
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) return true
  }
  return false
}

export function PullDrawer({
  shown,
  onOpen,
  onScrolledAway,
  onPullAgain,
  children,
}: {
  shown: boolean
  onOpen(): void
  /** It has scrolled out of sight. Left out while it must stay (a search is
   *  typed in), and then it never folds itself. */
  onScrolledAway?: () => void
  /** Pulled down again while open. Called inside the touch's release, so a
   *  focus() made here brings the keyboard up on iOS. */
  onPullAgain?: () => void
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const full = () => inner.current?.offsetHeight ?? 60

  const settle = useCallback((to: number) => {
    const el = box.current
    if (!el) return
    const reduced = reducedMotion()
    el.style.transition = reduced ? 'none' : 'height 240ms cubic-bezier(.2,.8,.2,1), opacity 240ms ease-out'
    el.style.height = `${to}px`
    el.style.opacity = to > 0 ? '1' : '0'
    // Open, it takes the height of what is in it, so the Filters panel can
    // open inside it without being cut off.
    if (to > 0) {
      const done = () => {
        if (box.current && box.current.style.height !== '0px') box.current.style.height = 'auto'
      }
      if (reduced) done()
      else window.setTimeout(done, 260)
    }
  }, [])

  // Open from the start (a search carried over from another tab, or the
  // keyboard path opening it before it was ever drawn): simply open, with no
  // slide that pushes the list down on arrival (Jukebox, 2026-10-11).
  const mounted = useRef(false)
  useLayoutEffect(() => {
    const el = box.current
    if (!mounted.current) {
      mounted.current = true
      if (el) {
        el.style.transition = 'none'
        el.style.height = shown ? 'auto' : '0px'
        el.style.opacity = shown ? '1' : '0'
      }
      return
    }
    settle(shown ? full() : 0)
  }, [shown, settle])

  // Open: fold away once it is scrolled out of sight.
  useEffect(() => {
    if (!shown || !onScrolledAway) return
    let frame = 0
    const check = () => {
      frame = 0
      const el = box.current
      if (!el || el.offsetHeight === 0) return
      if (el.getBoundingClientRect().bottom > navBarBottom()) return
      // Keep what's below exactly where it is on screen. Measured rather than
      // assumed: Chromium (Android) moves the page itself when content above
      // the view goes (scroll anchoring) and WebKit (iOS) doesn't, so a fixed
      // scrollBy(-height) jumps twice the height on an Android WebView.
      const below = el.nextElementSibling
      const before = below?.getBoundingClientRect().top ?? 0
      el.style.transition = 'none'
      el.style.height = '0px'
      el.style.opacity = '0'
      const after = below?.getBoundingClientRect().top ?? 0
      if (after !== before) window.scrollBy(0, after - before)
      onScrolledAway()
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [shown, onScrolledAway])

  useEffect(() => {
    if (shown && !onPullAgain) return
    let startY: number | null = null
    let startX = 0
    let pulled = 0
    let decided = false
    const start = (e: TouchEvent) => {
      startY = window.scrollY <= 0 && e.touches.length === 1 && !notAPull(e.target) ? e.touches[0].clientY : null
      startX = e.touches[0]?.clientX ?? 0
      pulled = 0
      decided = false
    }
    const move = (e: TouchEvent) => {
      const el = box.current
      if (startY === null || e.touches.length !== 1 || !el) return
      const dy = e.touches[0].clientY - startY
      const dx = e.touches[0].clientX - startX
      if (!decided) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        decided = true
        if (dy <= 0 || Math.abs(dx) >= Math.abs(dy) * 0.75) {
          startY = null
          return
        }
      }
      pulled = dy
      // Already open, the drawer stays put; the pull only asks for the keyboard.
      if (shown) return
      const peek = Math.max(0, Math.min(full(), pulled * RESIST))
      el.style.transition = 'none'
      el.style.height = `${peek}px`
      el.style.opacity = String(Math.min(1, peek / full()))
    }
    const end = () => {
      if (startY === null) return
      startY = null
      if (shown) {
        if (pulled > PULL_TO_OPEN) onPullAgain?.()
        return
      }
      if (pulled > PULL_TO_OPEN) onOpen()
      else settle(0)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [shown, onOpen, onPullAgain, settle])

  return (
    <div
      ref={box}
      className="overflow-hidden"
      aria-hidden={!shown}
      data-pull-drawer={shown ? 'open' : 'shut'}
      // Shut, nothing in it can take focus. (React 18's types predate `inert`.)
      {...({ inert: shown ? undefined : '' } as Record<string, string | undefined>)}
    >
      <div ref={inner} className="pb-4">
        {children}
      </div>
    </div>
  )
}
