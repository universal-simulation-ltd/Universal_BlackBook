import { isDefaultTabOrder, moveTab as sdkMoveTab, normaliseTabOrder, withShownOrder as sdkWithShownOrder } from '@unisim/sdk'

// The landing screen's tabs and their order (James, 2026-10-25: "I want to be
// able to reorganise the tabs"). Tune stays last on the phone and is not in
// here: it is where the settings are, and a tab bar that could lose it would
// be a trap.

// Places (2026-11-19) sits beside People, as James asked for it "similar to
// people"; a stored order gets it just after Contacts (normaliseOrder).
export const TABS = ['contacts', 'places', 'lists', 'todos', 'notes'] as const
export type Tab = (typeof TABS)[number]

/**
 * The setting that shows each tab: what the eye in Tune ▸ Tab order and the
 * bin on the phone's tab bar both switch (one source of truth). Every tab can
 * go on the phone (James, 2026-10-26); the website always shows Contacts.
 * `emailLists` also brings Email list to Add new, and Copy emails and Export
 * CSV, with the Lists tab.
 */
export const TAB_SWITCH = {
  contacts: 'contacts',
  places: 'places',
  lists: 'emailLists',
  todos: 'todos',
  notes: 'notes',
} as const satisfies Record<Tab, string>

/**
 * A stored order, made whole: unknown names dropped, each tab once, and any
 * tab missing from it (one added after the order was saved) put back just
 * after its neighbour in the default order. Hidden tabs stay in the order, so
 * a tab turned back on returns to its place. (The SDK's phone kit since
 * @unisim/sdk 0.229.0, where this app's copy moved.)
 */
export function normaliseOrder(raw: unknown): Tab[] {
  return normaliseTabOrder(raw, TABS)
}

/** Move one tab to a new place in the order. */
export function moveTab(order: Tab[], tab: Tab, to: number): Tab[] {
  return sdkMoveTab(order, tab, to)
}

/** Is this the default order? */
export function isDefaultOrder(order: Tab[]): boolean {
  return isDefaultTabOrder(order, TABS)
}

/**
 * The shown tabs in a new order, written back into the whole order: hidden
 * tabs keep their slots, the shown ones fill the rest in their new sequence.
 */
export function withShownOrder(full: Tab[], shown: Tab[]): Tab[] {
  return sdkWithShownOrder(full, shown)
}

/**
 * Which tabs are shown and in what order, as it travels in the online copy
 * (James, 2026-10-30: "sync from mobile app which tabs are hidden … and their
 * order and reflect that on web"). `at` is when it was last changed on the
 * device that wrote it; the newer one wins, the same as two devices'
 * edits to one contact would.
 *
 * `contacts` is the phone's switch. The website always shows Contacts, so it
 * carries the value through without acting on it.
 */
export interface TabLayout {
  order: Tab[]
  lists: boolean
  todos: boolean
  notes: boolean
  contacts: boolean
  /** The Places tab (2026-11-19). On unless a device said off. */
  places: boolean
  at: number
}

/** A layout out of a vault, or null when the blob says nothing usable. */
export function parseTabLayout(raw: unknown): TabLayout | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.at !== 'number' || !Number.isFinite(r.at)) return null
  return {
    order: normaliseOrder(r.order),
    lists: r.lists === true,
    todos: r.todos !== false,
    notes: r.notes !== false,
    contacts: r.contacts !== false,
    places: r.places !== false,
    at: r.at,
  }
}
