import { useEffect, type RefObject } from 'react'

// Typing into a long text on the phone (James, 2026-10-26): "When creating a
// note if the field goes lower than the on screen keyboard then move it up so
// it doesn't go behind the keyboard", and "I keep losing spaces … when the text
// entry box gets big and after a second it refocuses higher".

/** The nearest ancestor that scrolls, or null for the page itself. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

/**
 * Grow a text box to its text. Measuring means collapsing it for a moment, and
 * a collapsed box makes the page shorter, so the browser pulled the scroll up
 * and the view jumped on every keystroke once the box was tall. The scroll is
 * put back where it was.
 */
export function growToFit(el: HTMLTextAreaElement) {
  const box = scrollParent(el)
  const top = box ? box.scrollTop : window.scrollY
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
  if (box) box.scrollTop = top
  else if (window.scrollY !== top) window.scrollTo(0, top)
}

const MIRRORED = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'wordSpacing',
  'textIndent',
  'tabSize',
] as const

/** How far below the box's visible top the caret's line ends, in pixels. */
function caretBottom(el: HTMLTextAreaElement): number {
  const cs = getComputedStyle(el)
  const mirror = document.createElement('div')
  for (const p of MIRRORED) mirror.style[p] = cs[p]
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' })
  mirror.textContent = el.value.slice(0, el.selectionEnd ?? el.value.length)
  const mark = document.createElement('span')
  mark.textContent = '​'
  mirror.appendChild(mark)
  document.body.appendChild(mirror)
  const y = mark.offsetTop + mark.offsetHeight
  mirror.remove()
  return y - el.scrollTop
}

/** Scroll just enough that the caret's line sits above the keyboard. */
function keepCaretInView(el: HTMLTextAreaElement) {
  if (document.activeElement !== el) return
  const vv = window.visualViewport
  const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
  const caret = el.getBoundingClientRect().top + caretBottom(el)
  const room = 28
  const over = caret + room - visibleBottom
  if (over <= 0) return
  const box = scrollParent(el)
  if (box) box.scrollTop += over
  else window.scrollBy(0, over)
}

/**
 * While this text box has the keyboard, keep the line being typed above it:
 * after each keystroke, when the caret moves, and when the keyboard opens.
 */
export function useTypingRoom(ref: RefObject<HTMLTextAreaElement>, on = true) {
  useEffect(() => {
    const el = ref.current
    if (!el || !on) return
    let frame = 0
    const check = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => keepCaretInView(el))
    }
    // The keyboard takes a moment to finish rising after focus.
    const onFocus = () => {
      check()
      setTimeout(check, 350)
    }
    el.addEventListener('input', check)
    el.addEventListener('click', check)
    el.addEventListener('keyup', check)
    el.addEventListener('focus', onFocus)
    window.visualViewport?.addEventListener('resize', check)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('input', check)
      el.removeEventListener('click', check)
      el.removeEventListener('keyup', check)
      el.removeEventListener('focus', onFocus)
      window.visualViewport?.removeEventListener('resize', check)
    }
  })
}
