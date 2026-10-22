// Gestures for the phone screens' sheets and pages, from Universal PDF's
// src/native/parts.tsx (useSheetPull, useSheetBodyPull, usePagePullToType) —
// the suite rule in Docs_UNI_SIM/BRANDING.md ▸ "A big swipe down closes a
// drawer; a short pull puts you in its box". (BlackBook's phone screens have
// no row that scrolls sideways — tag chips wrap — so PDF's useScrollHint is
// not copied; bring it with the first such row.) BlackBook is the second product to need them, so
// they are due a move into @unisim/sdk; until then keep the copies in step.

import { useEffect, useRef, type HTMLAttributes, type RefObject } from 'react'

export type GripProps = Pick<
  HTMLAttributes<HTMLDivElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
>

/**
 * A sheet that comes down with the finger from its grip, like any phone's
 * (James, 2026-10-19: "taking the drawer handle you should be able to drag it
 * down and it takes the drawer with it"). Let go past a third of its height —
 * or flick it — and it slides the rest of the way and closes; short of that it
 * settles back. The sheet's own transform is written straight to the element,
 * so a drag doesn't re-render the tools under it on every move.
 */
export function useSheetPull(ref: RefObject<HTMLElement | null>, onClose: () => void): GripProps {
  const drag = useRef<{ y: number; dy: number; t: number; v: number } | null>(null)
  const close = useRef(onClose)
  close.current = onClose

  function finish(cancelled: boolean) {
    const d = drag.current
    drag.current = null
    const el = ref.current
    if (!d || !el) return
    const away = !cancelled && (d.dy > Math.min(140, el.offsetHeight / 3) || (d.v > 0.5 && d.dy > 16))
    el.style.transition = 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'
    if (away) {
      el.style.transform = `translateY(${el.offsetHeight + 24}px)`
      window.setTimeout(() => close.current(), 160)
    } else {
      el.style.transform = ''
    }
  }

  return {
    onPointerDown(e) {
      const el = ref.current
      if (!el) return
      drag.current = { y: e.clientY, dy: 0, t: e.timeStamp, v: 0 }
      e.currentTarget.setPointerCapture(e.pointerId)
      // The rise-in (or Mark up's first-time dip) would otherwise hold the
      // transform while it runs.
      el.getAnimations?.().forEach((a) => a.cancel())
      el.style.animation = 'none'
      el.style.transition = 'none'
    },
    onPointerMove(e) {
      const d = drag.current
      const el = ref.current
      if (!d || !el) return
      // Down only: pulled up, it stays put.
      const dy = Math.max(0, e.clientY - d.y)
      const dt = e.timeStamp - d.t
      if (dt > 0) d.v = (dy - d.dy) / dt
      d.dy = dy
      d.t = e.timeStamp
      el.style.transform = dy ? `translateY(${dy}px)` : ''
    },
    onPointerUp: () => finish(false),
    onPointerCancel: () => finish(true),
  }
}

// Where a pull down must not be taken over: a box being typed in, a slider,
// a sideways swiper, and anything drawn on (the Sign page's pad is a canvas,
// and a downward stroke of a signature is not a pull).
const PULL_EXEMPT = 'input, textarea, select, canvas, [contenteditable="true"], [data-swipe-x], [data-sheet-grip]'
// The boxes a pull down puts the finger in: one-line text and the like.
const TYPE_BOX = 'input:not([type]), input[type="text"], input[type="search"], input[type="url"], input[type="email"], input[type="tel"], input[type="number"], input[type="password"], textarea'

/** The first visible, usable text box inside `root`, in reading order. */
export function firstTypeBox(root: HTMLElement | null): HTMLInputElement | HTMLTextAreaElement | null {
  if (!root) return null
  for (const el of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TYPE_BOX)) {
    if (el.disabled || el.readOnly) continue
    if (el.getClientRects().length === 0) continue
    return el
  }
  return null
}

/**
 * Two suite-wide rules for a pull down anywhere on a drawer (James,
 * 2026-10-22), not just on its grip:
 *
 *  • A big swipe down closes it ("allow a big swipe down to close drawers
 *    without having to use the handle"). The drawer follows the finger; let
 *    go far enough, or flick hard, and it goes.
 *  • A shorter pull puts the finger in its text box, keyboard up, when it has
 *    one ("on a swipe down, focus on the input"). The focus is made in the
 *    touch's release, the only place iOS raises the keyboard for it.
 *
 * Only from the top of the drawer's own scroll, only a mostly downward pull,
 * and not one that starts on a slider, a box being typed in or a swiper.
 * Touch events, not pointer ones, so the drawer's own scrolling is untouched
 * until the pull is decided.
 */
export function useSheetBodyPull(
  sheetRef: RefObject<HTMLElement | null>,
  bodyRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const sheet = sheetRef.current
    const body = bodyRef.current
    if (!sheet || !body) return
    let g: { x: number; y: number; dy: number; t: number; v: number; pull: boolean | null } | null = null
    const onStart = (e: TouchEvent) => {
      g = null
      if (e.touches.length !== 1) return
      const target = e.target as Element | null
      if (target?.closest?.(PULL_EXEMPT)) return
      if (body.scrollTop > 0) return
      const tt = e.touches[0]
      g = { x: tt.clientX, y: tt.clientY, dy: 0, t: e.timeStamp, v: 0, pull: null }
    }
    const onMove = (e: TouchEvent) => {
      if (!g) return
      const tt = e.touches[0]
      const dx = tt.clientX - g.x
      const dy = tt.clientY - g.y
      if (g.pull === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        g.pull = dy > 0 && dy > Math.abs(dx) * 1.2 && body.scrollTop <= 0
        if (!g.pull) { g = null; return }
        sheet.getAnimations?.().forEach((a) => a.cancel())
        sheet.style.animation = 'none'
        sheet.style.transition = 'none'
      }
      e.preventDefault()
      const d = Math.max(0, dy)
      const dt = e.timeStamp - g.t
      if (dt > 0) g.v = (d - g.dy) / dt
      g.dy = d
      g.t = e.timeStamp
      sheet.style.transform = d ? `translateY(${d}px)` : ''
    }
    const onEnd = () => {
      const d = g
      g = null
      if (!d?.pull) return
      const big = d.dy > Math.min(180, sheet.offsetHeight * 0.4) || (d.v > 0.8 && d.dy > 90)
      sheet.style.transition = 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      if (big) {
        sheet.style.transform = `translateY(${sheet.offsetHeight + 24}px)`
        window.setTimeout(() => close.current(), 160)
        return
      }
      sheet.style.transform = ''
      if (d.dy > 36) firstTypeBox(body)?.focus()
    }
    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: false })
    sheet.addEventListener('touchend', onEnd)
    sheet.addEventListener('touchcancel', onEnd)
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, [sheetRef, bodyRef])
}

/** The nearest scrolling box between `el` and `root`, or `root`. */
function scrollerOf(el: Element | null, root: HTMLElement): HTMLElement {
  for (let n = el as HTMLElement | null; n && n !== root; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n
  }
  return root
}

/**
 * A pull down on a page (QR, Sign's Type, the knowledge base…) puts the finger
 * in its text box, keyboard up (James, 2026-10-22: "on the QR pop-up … if you
 * scroll down, it should focus on the input and allow you to use the
 * keyboard"). The page never focuses it on arrival, so the keyboard comes up
 * only when asked for. Only from the top of the page's scroll, only a mostly
 * downward pull, and only on a page that has a box; the page gives a little
 * with the finger so the pull is felt.
 */
export function usePagePullToType(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const page = ref.current
    if (!page || !enabled) return
    let g: { x: number; y: number; dy: number; scroller: HTMLElement; pull: boolean | null } | null = null
    const onStart = (e: TouchEvent) => {
      g = null
      if (e.touches.length !== 1) return
      const target = e.target as Element | null
      if (target?.closest?.(PULL_EXEMPT)) return
      if (!firstTypeBox(page)) return
      const scroller = scrollerOf(target, page)
      if (scroller.scrollTop > 0) return
      const tt = e.touches[0]
      g = { x: tt.clientX, y: tt.clientY, dy: 0, scroller, pull: null }
    }
    const onMove = (e: TouchEvent) => {
      if (!g) return
      const tt = e.touches[0]
      const dx = tt.clientX - g.x
      const dy = tt.clientY - g.y
      if (g.pull === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        g.pull = dy > 0 && dy > Math.abs(dx) * 1.2 && g.scroller.scrollTop <= 0
        if (!g.pull) { g = null; return }
        page.style.transition = 'none'
      }
      e.preventDefault()
      g.dy = Math.max(0, dy)
      page.style.transform = `translateY(${Math.min(48, g.dy * 0.35)}px)`
    }
    const onEnd = () => {
      const d = g
      g = null
      if (!d?.pull) return
      page.style.transition = 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      page.style.transform = ''
      if (d.dy > 50) firstTypeBox(page)?.focus()
    }
    page.addEventListener('touchstart', onStart, { passive: true })
    page.addEventListener('touchmove', onMove, { passive: false })
    page.addEventListener('touchend', onEnd)
    page.addEventListener('touchcancel', onEnd)
    return () => {
      page.removeEventListener('touchstart', onStart)
      page.removeEventListener('touchmove', onMove)
      page.removeEventListener('touchend', onEnd)
      page.removeEventListener('touchcancel', onEnd)
    }
  }, [ref, enabled])
}
