import { useEffect, useRef, type ReactNode } from 'react'

/**
 * The app's one dialog.
 *
 * Built on the native `<dialog>` element via `showModal()`, which is what
 * gives us — for free, and correctly — the top layer, the inert background,
 * Escape-to-close, initial focus, and a focus trap that actually holds. Every
 * hand-rolled overlay in this suite has had to reimplement at least three of
 * those, usually badly.
 *
 * Two things `<dialog>` does NOT do for you, both handled below:
 *
 *  1. **A click on the backdrop is a click on the dialog itself.** There is no
 *     separate backdrop element, so the hit test is done against the dialog's
 *     own rectangle. ⚠️ The rectangle ALONE is not enough: a `position: fixed`
 *     child — the birthday Dropdown's panel — can legitimately be painted
 *     outside it, and closing on that discards a half-typed contact. So the
 *     event has to have been aimed at the dialog element itself as well.
 *  2. **`showModal()` throws if the dialog is already open**, which React's
 *     StrictMode double-invoked effects will absolutely do in development.
 *     Guarded with `.open`.
 *
 * The box is a capped flex COLUMN — pinned title row, scrolling body — and not
 * one scroll container. As a single scroll box a long form (Add new contact,
 * with the birthday fields and notes) takes its own title and Close button off
 * the top of the screen, so the way out of the dialog is the first thing to go.
 * `max-h-[calc(100dvh-2rem)]` caps it, mirroring the `100vw - 2rem` width so a
 * full form is inset by the same 1rem all round and its rounded corners are not
 * clipped off the screen edge. `dvh` and not `vh`: the dynamic unit is the one
 * that SHRINKS when the iOS keyboard opens, and with `vh` the bottom of the
 * dialog ends up behind the keyboard. The
 * paddings carry the safe-area insets; in landscape on a notched phone the 1rem
 * gutter is narrower than the notch, and the home indicator eats the bottom.
 */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!el.open) el.showModal()
    // Fires for Escape as well as for close(), so the parent's state and the
    // element's own idea of being open cannot drift apart.
    const onCancelOrClose = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el.addEventListener('cancel', onCancelOrClose)
    return () => el.removeEventListener('cancel', onCancelOrClose)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onMouseDown={(e) => {
        // Backdrop click. `mousedown` rather than `click`: with `click`, a drag
        // that starts inside a text field and releases outside it counts as a
        // click on the backdrop and throws the form away mid-selection.
        //
        // A press on any child element targets that child; only the backdrop
        // targets the dialog. That is what keeps the birthday dropdown's
        // fixed-position panel — which sits outside the rectangle below when
        // the list is taller than the room under the field — from reading as a
        // dismissal.
        if (e.target !== e.currentTarget) return
        const box = e.currentTarget.getBoundingClientRect()
        const outside =
          e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom
        if (outside) onClose()
      }}
      className={`m-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col rounded-2xl border border-slate-800 bg-slate-900 p-0 text-slate-200 shadow-2xl backdrop:bg-slate-950/80 ${
        wide ? 'max-w-2xl' : 'max-w-lg'
      }`}
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 sm:px-5">
        <h2 id="modal-title" className="text-base font-semibold text-slate-100">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <CloseGlyph />
        </button>
      </div>
      {/* ⚠️ `flex-auto` (flex: 1 1 AUTO), never `flex-1` (flex: 1 1 0%) — and
          this is the whole bug that made every dialog in the app a small box on
          an iPhone. The dialog's height is `auto`, so the browser has to work
          out an intrinsic height for it from its children. WebKit takes a
          zero-basis flex child at its word and contributes almost nothing for
          it, so the box collapsed to the title row plus about 70px of form,
          with the rest of the fields simply not there. Blink sizes the same
          child from its content, which is why this passed every check in a
          Chromium and shipped. An `auto` basis makes the content the starting
          size in both engines.

          min-h-0 stays, and is what still lets it SHRINK: the cap below is a
          max-height, and without this a flex child refuses to go below its
          content height, so a long form would grow the dialog past the cap
          instead of scrolling inside it. The bottom padding clears the home
          indicator on a phone. */}
      <div
        className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
    </dialog>
  )
}

/**
 * The ✕ on the title row.
 *
 * ⚠️ An SVG and not the character. This was `✕` (U+2715 MULTIPLICATION X),
 * which **has no glyph in iOS's system font** and rendered as a hollow ▯?▯ box
 * on the phone — so the only visible way out of every dialog in the app was a
 * missing-character marker. Photographed in an iPhone 17 simulator; invisible
 * in every desktop browser, because the desktop fonts do have it. Exactly the
 * failure that took 📇 out of the "From my contacts" button (see App.tsx), and
 * the second one found in this codebase: if you are about to put a
 * non-alphabetic codepoint in the UI, look at it on a phone first.
 */
function CloseGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  )
}
