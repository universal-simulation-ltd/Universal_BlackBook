import { currentT } from '../i18n'
// The To-do tab (owner's request, 2026-09-27): a deliberately small to-do list
// beside the address book — a name, some details, a deadline and tags, and
// nothing else. On only with App preferences ▸ To-do.
//
// The tags are the BOOK's tags, not a second set: "Family" on a person and
// "Family" on a job are the same idea, and two tag lists that happened to share
// names would drift the first time one was renamed.

import { daysInMonth, type Today } from './birthday'

/** One to-do inside a group (2026-10-30): a name, and whether it is done. */
export interface TodoItem {
  id: string
  title: string
  /** Epoch ms it was ticked off; absent while it is still to do. */
  doneAt?: number
}

export interface Todo {
  id: string
  /** What it is. The only required field. */
  title: string
  details: string
  /** `YYYY-MM-DD`, a calendar date with no time or zone. */
  due?: string
  /** Tag ids — the same `Tag` records contacts carry. Lists are never offered. */
  tagIds: string[]
  /** Epoch ms it was ticked off; absent while it is still to do. */
  doneAt?: number
  /**
   * Pinned to the top of the list (swipe, 2026-10-25): when. Pinned ones stay
   * above the rest, the latest pin first. Absent = not pinned.
   */
  pinnedAt?: number
  /**
   * Its place in an order of your own (tap, hold and drag, 2026-10-25). Lower
   * comes first. Absent on every to-do that has never been dragged: those keep
   * the deadline order and sit above the ones you have arranged, so a new one
   * shows at the top.
   */
  rank?: number
  /**
   * A group (James, 2026-10-30: "a title with multiple todos within it"):
   * present, even empty, makes this to-do a group of these. Absent on an
   * ordinary one, and on every to-do written before groups — an older build
   * reading a group simply sees its title and details. The items live inside
   * their group, so syncing, merging, Undo and Move all keep treating a
   * group as one to-do.
   */
  items?: TodoItem[]
  createdAt: number
  updatedAt: number
}

/** A group's items from storage, or undefined when it is not a group. */
function toItems(v: unknown): TodoItem[] | undefined {
  if (!Array.isArray(v)) return undefined
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .filter((x) => typeof x.id === 'string' && x.id !== '' && typeof x.title === 'string')
    .map((x): TodoItem => ({
      id: x.id as string,
      title: x.title as string,
      ...(typeof x.doneAt === 'number' && Number.isFinite(x.doneAt) ? { doneAt: x.doneAt } : {}),
    }))
}

/** How many of a group's items are done, and of how many. */
export function groupProgress(todo: Todo): { done: number; count: number } | null {
  if (!todo.items) return null
  return { done: todo.items.filter((i) => i.doneAt !== undefined).length, count: todo.items.length }
}

/** Tick one item of a group. The last one ticks the group; unticking one opens it again. */
export function withItemDone(todo: Todo, itemId: string, done: boolean, now = Date.now()): Todo {
  const items = (todo.items ?? []).map((i): TodoItem => {
    if (i.id !== itemId) return i
    const { doneAt: _d, ...rest } = i
    void _d
    return done ? { ...rest, doneAt: now } : rest
  })
  const all = items.length > 0 && items.every((i) => i.doneAt !== undefined)
  return { ...todo, items, doneAt: all ? (todo.doneAt ?? now) : done ? todo.doneAt : undefined, updatedAt: now }
}

/** A calendar date, strictly. Anything else is dropped rather than shown wrong. */
function toDue(v: unknown): string | undefined {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  const [y, m, d] = v.split('-').map(Number)
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(m, y) ? v : undefined
}

/**
 * Coerce a stored or synced record into a Todo, or null. Same rule as
 * `toContact`: one bad row is dropped, never thrown over.
 */
export function toTodo(raw: unknown): Todo | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  return {
    id: r.id,
    title: typeof r.title === 'string' ? r.title : '',
    details: typeof r.details === 'string' ? r.details : '',
    due: toDue(r.due),
    tagIds: Array.isArray(r.tagIds) ? r.tagIds.filter((v): v is string => typeof v === 'string') : [],
    doneAt: typeof r.doneAt === 'number' ? r.doneAt : undefined,
    ...(typeof r.pinnedAt === 'number' && Number.isFinite(r.pinnedAt) ? { pinnedAt: r.pinnedAt } : {}),
    ...(typeof r.rank === 'number' && Number.isFinite(r.rank) ? { rank: r.rank } : {}),
    ...(toItems(r.items) ? { items: toItems(r.items) } : {}),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

export function toTodos(raw: unknown): Todo[] {
  return Array.isArray(raw) ? raw.map(toTodo).filter((t): t is Todo => t !== null) : []
}

/** Today as `YYYY-MM-DD`, for comparing against `due` as a string. */
export function isoDay(today: Today): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${today.year}-${p(today.month)}-${p(today.day)}`
}

/** Whole days from today to the deadline; negative once it has passed. */
export function daysUntil(due: string, today: Today): number {
  const [y, m, d] = due.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.year, today.month - 1, today.day)) / 86_400_000)
}

/** "Overdue by 3 days", "Due today", "Due tomorrow", "Due in 5 days", "Due 4 Nov". */
export function dueLabel(due: string, today: Today): string {
  const n = daysUntil(due, today)
  const t = currentT()
  if (n < 0) return t.plural('due.overdue', -n)
  if (n === 0) return t('due.today')
  if (n === 1) return t('due.tomorrow')
  if (n <= 14) return t('due.in_days', { count: n })
  const [y, m, d] = due.split('-').map(Number)
  return t('due.on', {
    date: new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(t.locale, {
      day: 'numeric',
      month: 'short',
      ...(y !== today.year && { year: 'numeric' }),
      timeZone: 'UTC',
    }),
  })
}

/**
 * Open ones by deadline, soonest (and so overdue) first; the ones with no
 * deadline after them, newest first. `YYYY-MM-DD` sorts as a string.
 */
export function compareOpen(a: Todo, b: Todo): number {
  // Pinned first, the latest pin first; then a hand-made order where there is
  // one (never-dragged ones above it); then the deadline rule.
  if (Boolean(a.pinnedAt) !== Boolean(b.pinnedAt)) return a.pinnedAt ? -1 : 1
  const ra = a.rank !== undefined
  const rb = b.rank !== undefined
  if (ra && rb) return a.rank! - b.rank! || b.createdAt - a.createdAt
  if (ra !== rb) return ra ? 1 : -1
  if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) return b.pinnedAt - a.pinnedAt
  if (a.due && b.due) return a.due.localeCompare(b.due) || b.createdAt - a.createdAt
  if (a.due) return -1
  if (b.due) return 1
  return b.createdAt - a.createdAt
}

/**
 * Move one open to-do to just before (or after) another, in the order the list
 * shows, and number that group (pinned, or not) afresh. Returns the to-dos
 * whose rank changed, ready to save. Only within a group: a pinned one dragged
 * among the others stays pinned, and lands at that end.
 */
export function moveTodo(todos: Todo[], id: string, targetId: string, after: boolean, now = Date.now()): Todo[] {
  const moving = todos.find((t) => t.id === id)
  const target = todos.find((t) => t.id === targetId)
  if (!moving || !target || moving.doneAt || id === targetId) return []
  const pinned = Boolean(moving.pinnedAt)
  const group = todos.filter((t) => !t.doneAt && Boolean(t.pinnedAt) === pinned).sort(compareOpen)
  const order = group.filter((t) => t.id !== id)
  let at = Boolean(target.pinnedAt) === pinned ? order.findIndex((t) => t.id === targetId) + (after ? 1 : 0) : pinned ? order.length : 0
  if (at < 0) at = 0
  order.splice(at, 0, moving)
  const changed: Todo[] = []
  order.forEach((t, i) => {
    if (t.rank !== i) changed.push({ ...t, rank: i, updatedAt: now })
  })
  return changed
}

/** Done ones, most recently finished first. */
export function compareDone(a: Todo, b: Todo): number {
  return (b.doneAt ?? 0) - (a.doneAt ?? 0)
}

/** OR across the chosen tags, the same as the contact list's tag filter. */
export function matchesTodoTags(todo: Todo, tagIds: string[]): boolean {
  return tagIds.length === 0 || todo.tagIds.some((id) => tagIds.includes(id))
}

/**
 * Two devices' to-do lists into one — the to-do half of `mergeBooks`.
 *
 * By id, the newer edit winning. `remap` is the tag remapping the contact merge
 * made (a local tag folded into an online one of the same name), so a to-do
 * keeps pointing at the tag its contacts now point at.
 */
export function mergeTodos(online: Todo[], local: Todo[], remap: Map<string, string> = new Map()): Todo[] {
  const out = [...online]
  const index = new Map(out.map((t, i) => [t.id, i]))
  for (const raw of local) {
    const t = remap.size ? { ...raw, tagIds: [...new Set(raw.tagIds.map((id) => remap.get(id) ?? id))] } : raw
    const at = index.get(t.id)
    if (at === undefined) {
      index.set(t.id, out.length)
      out.push(t)
    } else if (t.updatedAt > out[at].updatedAt) {
      out[at] = t
    }
  }
  return out
}
