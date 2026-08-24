// Shared class strings — one visual language across the app.
//
// ⚠️ NOT A SINGLE `dark:` VARIANT IN THIS FILE, on purpose. BlackBook is a
// dark-only app (see index.css for why), so there is exactly one palette and
// these classes ARE it. Writing `bg-white dark:bg-slate-900` here would mean
// every new component silently had a light rendering nobody ever looks at, and
// the first one to forget the `dark:` half would ship a white panel into a
// black app. One palette, no variants, nothing to forget.
//
// The colours: ground #0b1120, panels slate-900, hairlines slate-800, body
// text slate-200, secondary slate-400, accent the brand orange #fe8c01.

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
export const inputCls =
  'w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

export const selectCls =
  'min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

export const textareaCls = `${inputCls} resize-y leading-relaxed`

export const card = 'rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20 sm:p-5'

export const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400'

export const checkboxCls =
  'h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-950 accent-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
