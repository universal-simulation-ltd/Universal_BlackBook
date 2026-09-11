import { useEffect } from 'react'

/**
 * Stop the page behind a dialog from scrolling.
 *
 * ⚠️ **`showModal()` does not do this for you.** It makes the page inert — no
 * clicks, no focus, no screen-reader access — but a wheel, a trackpad or a
 * thumb still scrolls the document underneath in every engine this app runs
 * in. On a phone that is the whole problem: the contact list slides about
 * behind a full-screen view that is supposed to BE the screen, and closing it
 * puts you somewhere else in the list than where you opened it.
 *
 * ⚠️ **`overflow: hidden` on <body> alone is not enough on iOS**, which is the
 * platform this app is built for. WebKit ignores it for the document scroller
 * often enough that it cannot be relied on, so the body is taken out of the
 * flow instead — `position: fixed`, offset upwards by exactly the distance the
 * page was scrolled — which pins it in every engine. The offset is what makes
 * it invisible: without it, opening a dialog would jump the list back to the
 * top, and closing it would leave it there.
 *
 * ⚠️ **Ref-counted, because the dialogs STACK.** The contact view opens the
 * edit form on top of itself, and the form opens the full-screen note on top of
 * that. Three locks and three releases in a nested order: only the first lock
 * touches the body and only the last release restores it, or an inner dialog
 * closing would hand the scroll back while two are still open.
 */
let depth = 0
let release: (() => void) | null = null

/** Lock now; call the returned function to give this holder's lock back. */
export function lockPageScroll(): () => void {
  depth += 1
  if (depth === 1) release = freezeBody()
  let held = true
  return () => {
    // Guarded so a double release — a component unmounting twice under
    // StrictMode, say — cannot drive the count negative and unlock the page
    // while another dialog is still open.
    if (!held) return
    held = false
    depth -= 1
    if (depth === 0) {
      release?.()
      release = null
    }
  }
}

function freezeBody(): () => void {
  const body = document.body
  const y = window.scrollY
  const before = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
  }

  body.style.position = 'fixed'
  body.style.top = `-${y}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'

  return () => {
    body.style.position = before.position
    body.style.top = before.top
    body.style.left = before.left
    body.style.right = before.right
    body.style.width = before.width
    body.style.overflow = before.overflow
    // Instant, never smooth: this is undoing a lock, not a navigation, and a
    // smooth scroll here is a visible slide back to where you already were.
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
  }
}

/** The hook form: locked for as long as the component is mounted. */
export function usePageScrollLock(): void {
  useEffect(() => lockPageScroll(), [])
}
