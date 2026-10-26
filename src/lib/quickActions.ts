// The buttons across the top of a note (James, 2026-10-26: "allow the user to
// click and drag to customise their position, put it in a bin to hide … show
// a '+' in the empty slot and allow the user to pick one"). Five places; four
// buttons to start, so the fifth is a "+" from the first day and Copy and
// delete ("useful for me when I write issues down then copy them here then
// delete the note") is one tap away from being added.

export const QUICK_ACTIONS = ['contacts', 'place', 'remind', 'copy', 'copyDelete'] as const
export type QuickAction = (typeof QUICK_ACTIONS)[number]

export const QUICK_SLOTS = 5
export const DEFAULT_QUICK_ACTIONS: readonly QuickAction[] = ['contacts', 'place', 'remind', 'copy']

const isQuickAction = (x: unknown): x is QuickAction => (QUICK_ACTIONS as readonly unknown[]).includes(x)

/** A stored list made safe: known buttons, each once, no more than fit. Unset is the default. */
export function normaliseQuickActions(raw: unknown): QuickAction[] {
  if (!Array.isArray(raw)) return [...DEFAULT_QUICK_ACTIONS]
  return [...new Set(raw.filter(isQuickAction))].slice(0, QUICK_SLOTS)
}

/** One button moved to a new place among those shown. */
export function moveQuickAction(shown: QuickAction[], key: QuickAction, to: number): QuickAction[] {
  const rest = shown.filter((k) => k !== key)
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, key)
  return rest
}

/** The buttons not shown, in their usual order: what a "+" offers. */
export function hiddenQuickActions(shown: QuickAction[]): QuickAction[] {
  return QUICK_ACTIONS.filter((k) => !shown.includes(k))
}
