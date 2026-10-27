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

export const CONTACT_ACTIONS = ['call', 'message', 'email', 'place', 'share', 'remind', 'copy', 'pin'] as const
export type ContactAction = (typeof CONTACT_ACTIONS)[number]
export const DEFAULT_CONTACT_ACTIONS: readonly ContactAction[] = ['call', 'message', 'share']

/**
 * A row is its four places in order, a button or `null` for a "+" (James,
 * 2026-10-27: "allow them to … change position of the + as well"), so a "+"
 * can stand anywhere, not only at the end.
 */
export type Slots<K extends string> = (K | null)[]

/**
 * A stored row made safe: known buttons, each once, gaps kept where they were,
 * four places exactly. Unset is the default. An unknown or repeated button is
 * dropped, not left as a gap.
 */
export function normaliseActions<K extends string>(raw: unknown, all: readonly K[], fallback: readonly K[]): Slots<K> {
  const list: Slots<K> = Array.isArray(raw) ? [] : [...fallback]
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (x === null) list.push(null)
      else if ((all as readonly unknown[]).includes(x) && !list.includes(x as K)) list.push(x as K)
    }
  }
  const row = list.slice(0, QUICK_SLOTS)
  while (row.length < QUICK_SLOTS) row.push(null)
  return row
}

/**
 * A note row stored when there were five places can hold one too many. Copy
 * goes first when Copy and delete is there too: that was added on purpose,
 * and it copies as well.
 */
export function normaliseQuickActions(raw: unknown): Slots<QuickAction> {
  const over = Array.isArray(raw) && raw.filter((k) => k !== null).length > QUICK_SLOTS && raw.includes('copyDelete')
  return normaliseActions(over ? (raw as unknown[]).filter((k) => k !== 'copy') : raw, NOTE_ACTIONS, DEFAULT_QUICK_ACTIONS)
}
export const normaliseContactActions = (raw: unknown) => normaliseActions(raw, CONTACT_ACTIONS, DEFAULT_CONTACT_ACTIONS)

/**
 * The held place (a button, or a "+": James, 2026-10-27 "tap and hold to drag
 * a + also") taken to place `to`. Onto a "+", the two swap, so a button
 * dropped there leaves a "+" where it was. Onto a button, it slides in there
 * and the rest close up behind it.
 */
export function moveSlot<K extends string>(slots: Slots<K>, from: number, to: number): Slots<K> {
  if (from === to || from < 0 || to < 0 || from >= slots.length || to >= slots.length) return slots
  const next = [...slots]
  if (next[to] === null) {
    ;[next[from], next[to]] = [next[to], next[from]]
    return next
  }
  const [held] = next.splice(from, 1)
  next.splice(to, 0, held)
  return next
}

/** The buttons not shown, in their usual order: what a "+" offers. */
export function hiddenActions<K extends string>(all: readonly K[], shown: Slots<K>): K[] {
  return all.filter((k) => !shown.includes(k))
}
