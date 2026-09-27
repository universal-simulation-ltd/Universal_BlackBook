// The To-do tab (owner's request, 2026-09-27): a deliberately small to-do list
// beside the address book — a name, some details, a deadline and tags, and
// nothing else. On only with App preferences ▸ To-do.
//
// The tags are the BOOK's tags, not a second set: "Family" on a person and
// "Family" on a job are the same idea, and two tag lists that happened to share
// names would drift the first time one was renamed.

import { daysInMonth, type Today } from './birthday'

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
  createdAt: number
  updatedAt: number
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
  if (n < 0) return `Overdue by ${-n} ${n === -1 ? 'day' : 'days'}`
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  if (n <= 14) return `Due in ${n} days`
  const [y, m, d] = due.split('-').map(Number)
  return `Due ${new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(y !== today.year && { year: 'numeric' }),
    timeZone: 'UTC',
  })}`
}

/**
 * Open ones by deadline, soonest (and so overdue) first; the ones with no
 * deadline after them, newest first. `YYYY-MM-DD` sorts as a string.
 */
export function compareOpen(a: Todo, b: Todo): number {
  if (a.due && b.due) return a.due.localeCompare(b.due) || b.createdAt - a.createdAt
  if (a.due) return -1
  if (b.due) return 1
  return b.createdAt - a.createdAt
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
