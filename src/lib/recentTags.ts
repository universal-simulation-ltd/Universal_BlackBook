// Recent tags for the tag box (components/TagCombo.tsx).

/**
 * Tags lately taken from a box like this, newest first, on this device
 * (James, 2026-11-11: "when clicking the tags search box show a few recently
 * used quick tags"). Shared by every TagCombo: a tag used on a note is a
 * likely one for a to-do. Ids only; one since deleted is simply not offered.
 */
const RECENT_KEY = 'bb.tags.recent'
const RECENT_KEEP = 12
/** How many show in an empty, focused box. */
export const RECENT_SHOWN = 5

export function readRecentTags(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function noteRecentTag(id: string) {
  const next = [id, ...readRecentTags().filter((x) => x !== id)].slice(0, RECENT_KEEP)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* private mode: no memory, the box still works */
  }
}

/**
 * What an empty box offers when focused: the recent ones still here and not
 * already chosen, topped up from the list's own order when there are few.
 */
export function quickTags<T extends { id: string }>(options: T[], isOn: (id: string) => boolean, recent: string[], count = RECENT_SHOWN): T[] {
  const byId = new Map(options.map((o) => [o.id, o]))
  const out: T[] = []
  for (const id of recent) {
    const o = byId.get(id)
    if (o && !isOn(o.id)) out.push(o)
    if (out.length >= count) return out
  }
  for (const o of options) {
    if (out.length >= count) break
    if (!isOn(o.id) && !out.includes(o)) out.push(o)
  }
  return out
}
