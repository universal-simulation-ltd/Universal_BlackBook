// The buttons across the top of a note and of a contact (James, 2026-10-26:
// "allow the user to click and drag to customise their position, put it in a
// bin to hide … show a '+' in the empty slot and allow the user to pick one").
//
// 2026-10-27, the two rows matched: "use four buttons but only show the
// emojis. Instead of … have + and then allow them to choose the fourth one."
// Four places on both; three buttons to start, so the fourth is a "+". The
// choices are the same kind of thing on both (a reminder, a copy, a share), but
// each keeps its own order and its own pick: "don't sync the order and choice".

export const QUICK_SLOTS = 4

export const NOTE_ACTIONS = ['contacts', 'place', 'remind', 'copy', 'copyDelete', 'share'] as const
export type QuickAction = (typeof NOTE_ACTIONS)[number]
export const DEFAULT_QUICK_ACTIONS: readonly QuickAction[] = ['contacts', 'place', 'remind']

export const CONTACT_ACTIONS = ['call', 'message', 'email', 'share', 'remind', 'copy', 'pin'] as const
export type ContactAction = (typeof CONTACT_ACTIONS)[number]
export const DEFAULT_CONTACT_ACTIONS: readonly ContactAction[] = ['call', 'message', 'share']

/** A stored list made safe: known buttons, each once, no more than fit. Unset is the default. */
export function normaliseActions<K extends string>(raw: unknown, all: readonly K[], fallback: readonly K[]): K[] {
  if (!Array.isArray(raw)) return [...fallback]
  const known = raw.filter((x): x is K => (all as readonly unknown[]).includes(x))
  return [...new Set(known)].slice(0, QUICK_SLOTS)
}

/**
 * A note row stored when there were five places can hold one too many. Copy
 * goes first when Copy and delete is there too: that was added on purpose,
 * and it copies as well.
 */
export function normaliseQuickActions(raw: unknown): QuickAction[] {
  const over = Array.isArray(raw) && raw.length > QUICK_SLOTS && raw.includes('copyDelete')
  return normaliseActions(over ? (raw as unknown[]).filter((k) => k !== 'copy') : raw, NOTE_ACTIONS, DEFAULT_QUICK_ACTIONS)
}
export const normaliseContactActions = (raw: unknown) => normaliseActions(raw, CONTACT_ACTIONS, DEFAULT_CONTACT_ACTIONS)

/** One button moved to a new place among those shown. */
export function moveQuickAction<K extends string>(shown: K[], key: K, to: number): K[] {
  const rest = shown.filter((k) => k !== key)
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, key)
  return rest
}

/** The buttons not shown, in their usual order: what a "+" offers. */
export function hiddenActions<K extends string>(all: readonly K[], shown: K[]): K[] {
  return all.filter((k) => !shown.includes(k))
}
