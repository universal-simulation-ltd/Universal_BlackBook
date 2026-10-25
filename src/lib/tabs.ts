// The landing screen's tabs and their order (James, 2026-10-25: "I want to be
// able to reorganise the tabs"). Tune stays last on the phone and is not in
// here: it is where the settings are, and a tab bar that could lose it would
// be a trap.

export const TABS = ['contacts', 'lists', 'todos', 'notes'] as const
export type Tab = (typeof TABS)[number]

/**
 * A stored order, made whole: unknown names dropped, each tab once, and any
 * tab missing from it (one added after the order was saved) put back just
 * after its neighbour in the default order. Hidden tabs stay in the order, so a tab turned
 * back on returns to its place.
 */
export function normaliseOrder(raw: unknown): Tab[] {
  const known = Array.isArray(raw) ? raw.filter((x): x is Tab => (TABS as readonly string[]).includes(x as string)) : []
  const out = [...new Set(known)]
  // A missing tab goes just after the one before it in the default order.
  TABS.forEach((t, i) => {
    if (out.includes(t)) return
    const before = i > 0 ? out.indexOf(TABS[i - 1]) : -1
    out.splice(before + 1, 0, t)
  })
  return out
}

/** Move one tab to a new place in the order. */
export function moveTab(order: Tab[], tab: Tab, to: number): Tab[] {
  const rest = order.filter((t) => t !== tab)
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, tab)
  return rest
}

/** Is this the default order? */
export function isDefaultOrder(order: Tab[]): boolean {
  return order.every((t, i) => t === TABS[i])
}

/**
 * The shown tabs in a new order, written back into the whole order: hidden
 * tabs keep their slots, the shown ones fill the rest in their new sequence.
 */
export function withShownOrder(full: Tab[], shown: Tab[]): Tab[] {
  const on = new Set(shown)
  let k = 0
  return full.map((t) => (on.has(t) ? shown[k++] : t))
}
