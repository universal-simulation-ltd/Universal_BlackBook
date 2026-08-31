import { useEffect, useRef } from 'react'
import { btnPrimary } from './ui'

/**
 * The Notes field, on its own, filling the whole screen.
 *
 * The form's notes box is four rows inside a dialog that also has to hold a
 * name, two pickers and a Save button — which is fine for "two kids, allergic
 * to shellfish" and useless for the note that has grown into a page. On a
 * phone it is worse than useless: the visible window is four short lines near
 * the top of a scrolling form, so reading a long note means scrolling a box
 * inside a box. This is the way out — one tap, and the note is the only thing
 * on screen.
 *
 * ⚠️ **A second `<dialog>`, opened on top of the one the form is already in.**
 * That is deliberate and it is what the top layer is for: `showModal()` stacks,
 * so this lands above the form, the form goes inert underneath, and Escape is
 * delivered to THIS dialog because it is topmost. Reusing `Modal` was the
 * obvious alternative and is wrong — it hardcodes `id="modal-title"`, and two
 * of them open at once is a duplicate id and an `aria-labelledby` that points
 * at whichever the engine finds first.
 *
 * ⚠️ **It edits, it does not just display.** Same `value`/`onChange` as the
 * field it came from, so there is no copy to keep in step and no "save" of its
 * own — typing here IS typing in the form. Making it read-only would mean
 * discovering a typo in the one view large enough to spot it and having to
 * close it to fix it.
 *
 * ⚠️ **The textarea is NOT autofocused**, which is the entire point on a
 * phone. Focus it and iOS opens the keyboard, which takes back half the screen
 * the user just asked for. `showModal()` focuses the first focusable child
 * instead — the Done button in the header — so the note opens readable, and
 * tapping the text is what starts an edit.
 */
export function NotesFullscreen({
  value,
  onChange,
  onClose,
  name,
}: {
  value: string
  onChange: (v: string) => void
  onClose: () => void
  /** Whose notes these are, for the title. Blank on a new contact. */
  name: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // ⚠️ `onClose` is read through a ref so the effect below can have an EMPTY
  // dependency list, and that is not a tidiness preference — it is the bug.
  // The parent passes `onClose={() => setNotesFull(false)}`, a new function on
  // every render, and this component re-renders on every keystroke because it
  // owns the field. With `[onClose]` the effect therefore tore down and re-ran
  // per character: cleanup closed the dialog, the effect reopened it, focus
  // went back to the Done button, and typing into the full-screen note put a
  // character or two on screen and then stopped. Caught in WebKit, where the
  // text never reached the form's field at all.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // `.open` guard: StrictMode double-invokes this in development, and
    // showModal() on an already-open dialog throws. Same as Modal.
    if (!el.open) el.showModal()
    const onCancel = (e: Event) => {
      e.preventDefault()
      onCloseRef.current()
    }
    el.addEventListener('cancel', onCancel)
    return () => {
      el.removeEventListener('cancel', onCancel)
      // Closing before React drops the node is what hands focus back to the
      // button that opened this, rather than to the top of the form.
      if (el.open) el.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label="Notes, full screen"
      // Every default the UA puts on a modal dialog is in the way here:
      // `m-auto` centres a box, `max-width`/`max-height` cap it well short of
      // the screen, and the border and radius draw a card edge around
      // something that has no edge. h-[100dvh] and not vh — the dynamic unit
      // is the one that shrinks for the iOS keyboard, so the Done button
      // stays reachable while typing.
      className="m-0 flex h-[100dvh] max-h-none w-screen max-w-none flex-col rounded-none border-0 bg-slate-950 p-0 text-slate-200 backdrop:bg-slate-950"
    >
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4 py-3"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        }}
      >
        <h2 className="min-w-0 truncate text-base font-semibold text-slate-100">
          {name.trim() ? `Notes · ${name.trim()}` : 'Notes'}
        </h2>
        <button type="button" className={`${btnPrimary} shrink-0`} onClick={onClose}>
          Done
        </button>
      </div>

      {/* `flex-auto` and `min-h-0`, never `flex-1` — a zero flex-basis is what
          collapsed every dialog in this app on WebKit (see Modal). The
          textarea IS the flex child rather than sitting inside one, so the
          typing area and the scroll container are the same box: no scrollbar
          inside a scrollbar, which is what this view exists to get rid of. */}
      <textarea
        className="min-h-0 w-full flex-auto resize-none border-0 bg-slate-950 px-4 py-4 text-base leading-7 text-slate-100 placeholder:text-slate-600 focus:outline-none"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Met at the Leeds conference. Two kids. Allergic to shellfish."
      />
    </dialog>
  )
}

/**
 * The ⤢ on the Notes label.
 *
 * ⚠️ An SVG, not a codepoint. U+2921/U+2B0C and friends are missing from the
 * iOS system font exactly as ✕ was, and a missing-glyph box next to the label
 * is worse than no button at all — see Modal's CloseGlyph for the two this
 * codebase has already been bitten by.
 */
export function ExpandGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.5 2.5H13.5V6.5M6.5 13.5H2.5V9.5M13.5 2.5 9 7M2.5 13.5 7 9" />
    </svg>
  )
}
