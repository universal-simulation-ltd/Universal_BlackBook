import { currentT } from '../i18n'
// The To-do tab (owner's request, 2026-09-27): a deliberately small to-do list
// beside the address book — a name, some details, a deadline and tags, and
// nothing else. On only with App preferences ▸ To-do.
//
// The tags are the BOOK's tags, not a second set: "Family" on a person and
// "Family" on a job are the same idea, and two tag lists that happened to share
// names would drift the first time one was renamed.

import { daysInMonth, type Today } from './birthday'
import { tagNames } from './filter'
import { matchesNote, type Note } from './notes'

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
  /**
   * Snoozed (James, 2026-11-19: "snoozed until so it doesn't appear in the
   * main list until that date arrives"): a `YYYY-MM-DD`. Until that day it
   * waits in the tab's Snoozed drawer, not the list; on that day it is simply
   * back, where its deadline and order put it. A date that has passed is
   * harmless and left alone. Absent = not snoozed.
   */
  snoozedUntil?: string
  /**
   * Renews every day (James, 2026-11-20: "an option to renew daily so that
   * every day they become a new task or they get unticked"): ticked, it stays
   * done for the rest of the day; the next day it is unticked again, a
   * group's items too (`renewDaily`). It lives in the tab's Daily drawer,
   * never in the list or Done. Absent = an ordinary to-do.
   */
  daily?: boolean
  createdAt: number
  updatedAt: number
}

/** Local midnight at the start of the day `now` falls in (ms). */
export function startOfDay(now = Date.now()): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Untick the daily to-dos ticked before today (and their items), as a new
 * day starts. Returns the same array when nothing changed. `updatedAt` is
 * left alone on purpose: renewing is not an edit, so a tick made today on
 * another device (a newer updatedAt) still wins the sync merge.
 */
export function renewDaily(todos: Todo[], now = Date.now()): Todo[] {
  const start = startOfDay(now)
  let changed = false
  const out = todos.map((t) => {
    if (!t.daily) return t
    const stale = t.doneAt !== undefined && t.doneAt < start
    const staleItems = t.items?.some((i) => i.doneAt !== undefined && i.doneAt < start)
    if (!stale && !staleItems) return t
    changed = true
    const { doneAt: _d, ...rest } = t
    void _d
    const items = t.items?.map((i) => {
      if (i.doneAt === undefined || i.doneAt >= start) return i
      const { doneAt: _i, ...r } = i
      void _i
      return r
    })
    return { ...rest, ...(stale ? {} : { doneAt: t.doneAt }), ...(items ? { items } : {}) }
  })
  return changed ? out : todos
}

/** The Daily drawer's order: still to do first, then by the list's own order. */
export function compareDaily(a: Todo, b: Todo): number {
  return Number(a.doneAt !== undefined) - Number(b.doneAt !== undefined) || compareOpen(a, b)
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

/**
 * One more item on the end of a group, not yet done (2026-11-22: added from
 * the list, no Fine-tune). A group that was all done is open again, the same
 * as unticking an item. Blank text changes nothing.
 */
export function withItemAdded(todo: Todo, title: string, id: string, now = Date.now()): Todo {
  const name = title.trim().replace(/\s+/g, ' ')
  if (!name) return todo
  return { ...todo, items: [...(todo.items ?? []), { id, title: name }], doneAt: undefined, updatedAt: now }
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
    ...(toDue(r.snoozedUntil) ? { snoozedUntil: toDue(r.snoozedUntil) } : {}),
    ...(r.daily === true ? { daily: true } : {}),
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

/** Today plus `n` days, as `YYYY-MM-DD`. */
export function addDays(today: Today, n: number): string {
  return new Date(Date.UTC(today.year, today.month - 1, today.day + n)).toISOString().slice(0, 10)
}

/** Still asleep: open, and snoozed until a day after today. */
export function isSnoozed(todo: Todo, today: Today): boolean {
  return todo.doneAt === undefined && todo.snoozedUntil !== undefined && todo.snoozedUntil > isoDay(today)
}

export type SnoozeChoice = 'tomorrow' | 'next_week' | 'next_month'

/**
 * The quick snoozes: tomorrow, next Monday (a week on, from a Monday) and the
 * same day next month (its last day where that month is shorter).
 */
export function snoozeChoices(today: Today): { key: SnoozeChoice; until: string }[] {
  const dow = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay()
  const toMonday = (8 - dow) % 7 || 7
  const y = today.month === 12 ? today.year + 1 : today.year
  const m = today.month === 12 ? 1 : today.month + 1
  const p = (n: number) => String(n).padStart(2, '0')
  return [
    { key: 'tomorrow', until: addDays(today, 1) },
    { key: 'next_week', until: addDays(today, toMonday) },
    { key: 'next_month', until: `${y}-${p(m)}-${p(Math.min(today.day, daysInMonth(m, y)))}` },
  ]
}

/** "Thu 20 Nov" (with the year when it is not this one), for a snooze. */
export function shortDate(day: string, today: Today): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(currentT().locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(y !== today.year && { year: 'numeric' }),
    timeZone: 'UTC',
  })
}

/** Snoozed ones, the first to wake first. */
export function compareSnoozed(a: Todo, b: Todo): number {
  return (a.snoozedUntil ?? '').localeCompare(b.snoozedUntil ?? '') || compareOpen(a, b)
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
 * The deadline in days, for the row's one line after a ⏰ (James, 2026-11-18:
 * "the due date could be a clock emoji and X day(s)"): "Today", "1 day",
 * "5 days", "2 days late". `dueLabel` is the full sentence, for the title and
 * a screen reader.
 */
export function dueShort(due: string, today: Today): string {
  const n = daysUntil(due, today)
  const t = currentT()
  if (n === 0) return t('due.short_today')
  if (n < 0) return t.plural('due.short_late', -n)
  return t.plural('due.short_days', n)
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

/** A to-do's search: its name, its text, its tags' names and, for a group, what is in it. */
export function matchesTodo(todo: Todo, query: string, byId: ReadonlyMap<string, { name: string }>): boolean {
  if (!query.trim()) return true
  const items = todo.items?.map((i) => i.title).join('\n') ?? ''
  return matchesNote(
    { ...todo, details: items ? `${todo.details}\n${items}` : todo.details } as unknown as Note,
    query,
    tagNames(todo.tagIds, byId),
  )
}
