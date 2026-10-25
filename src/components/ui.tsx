// Shared class strings — one visual language across the app.
//
// ⚠️ NOT A SINGLE `dark:` VARIANT IN THIS FILE, and none is wanted. These are
// written in the dark palette the app was designed in, and index.css repaints
// that palette for Light (and for the phone app's own look) by redefining the
// colour variables the classes compile to. So one class string serves every
// theme, and a new component cannot forget its light half.
//
// The roles: page slate-950, panels slate-900, hairlines slate-800, body text
// slate-200, secondary slate-400, the accent orange (the suite's #fe8c01 in
// Dark, #e05504 in Light, the ribbon red on the phone).

export const btnPrimary =
  'rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-40'

export const btnGhost =
  'rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40'

export const btnDanger =
  'rounded-lg border border-rose-900 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400'

export const btnSubtle =
  'rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'

// `min-w-0` on every control is load-bearing on a phone: without it a field's
// intrinsic width forces its grid or flex track wider than the screen. Touch
// devices also get a 16px font floor (index.css) so focusing a field cannot
// make iOS zoom the page and leave the right-hand edge unreachable.
//
// ⚠️ `inputBase` carries NO WIDTH, and that is the whole reason it exists.
// `inputCls` is it plus `w-full`, which is what almost every field wants — but
// a narrow field written as `${inputCls} w-24` does NOT get 6rem. Tailwind
// resolves a conflict by CSS SOURCE ORDER, not by the order of the class
// string, and `.w-full` is emitted after `.w-24`, so `w-full` wins and the
// field silently goes full width. That shipped: the birthday year box was
// full width and wrapped onto its own line under Day and Month. Anything
// narrower than the container composes from `inputBase`.
export const inputBase =
  'min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

export const inputCls = `w-full ${inputBase}`

export const selectCls =
  'min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

export const textareaCls = `${inputCls} resize-y leading-relaxed`

export const card = 'rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20 sm:p-5'

export const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400'

export const checkboxCls =
  'h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-950 accent-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'

/** A choice of one among several (Tune this app ▸ Opens on): the tick box's round twin. */
export const radioCls =
  'h-4 w-4 shrink-0 rounded-full border-slate-600 bg-slate-950 accent-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'

/**
 * The suite's Tune glyph: the same two sliders the SDK draws on its Tune this
 * app button, so a Fine-tune button that shows the icon instead of the word
 * reads as the same family of control (James, 2026-10-10).
 */
export function TuneGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </svg>
  )
}

/** A pushpin: filled when pinned, outlined when not. Fine-tune ▸ Pin. */
export function PinGlyph({ filled, className = 'h-4 w-4' }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      <path d="M7 2.75A.75.75 0 0 1 7.75 2h4.5a.75.75 0 0 1 0 1.5H12v4.1l2.55 2.55a.75.75 0 0 1-.53 1.28h-3.27v5.82a.75.75 0 0 1-1.5 0v-5.82H5.98a.75.75 0 0 1-.53-1.28L8 7.6V3.5h-.25A.75.75 0 0 1 7 2.75Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7.75 2.75h4.5M8.75 2.75v5.1L6 10.6h8l-2.75-2.75v-5.1M10 10.6v6.65" />
    </svg>
  )
}
