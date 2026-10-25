// Reminders — "Add notification" on a contact (and on a note), James
// 2026-10-25: a date and time, once or every month or every year (an
// anniversary), with a short label. Phone notifications, no server: the phone
// app schedules them with @capacitor/local-notifications (native/notify.ts),
// and the website shows the ones that are due inside the app while it is open
// (components/Reminders.tsx ▸ DueReminders).
//
// A reminder is stored WITH what it is about (Contact.reminders,
// Note.reminders), so it travels in the encrypted online copy and the backup
// file with the rest of the record and needs no list of its own.
//
// Times are LOCAL wall-clock times ("9:00 on the 3rd"), kept as the string the
// date and time boxes give, `YYYY-MM-DDTHH:mm`: a reminder set for 9am stays at
// 9am after a flight or a clock change, which is what a person means by it.

import { daysInMonth } from './birthday'

export type Repeat = 'once' | 'monthly' | 'yearly'
export const REPEATS: readonly Repeat[] = ['once', 'monthly', 'yearly']

export interface Reminder {
  id: string
  /** A few words: "Anniversary", "Ask about the new job". May be empty. */
  label: string
  /** The first (or only) time, local: `YYYY-MM-DDTHH:mm`. */
  at: string
  repeat: Repeat
  createdAt: number
  /**
   * Epoch ms the reminder was last marked done in the app ("Done" on a due
   * reminder). Occurrences at or before it are not shown as due again.
   */
  ackAt?: number
}

export const REMINDER_LIMITS = { perRecord: 50, label: 200 } as const

const AT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
const ID = /^[A-Za-z0-9_-]{1,100}$/

/** A real local date and time in the `YYYY-MM-DDTHH:mm` shape, or false. */
export function isValidAt(at: unknown): at is string {
  if (typeof at !== 'string') return false
  const m = AT.exec(at)
  if (!m) return false
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  return y >= 1900 && y <= 2200 && mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(mo, y) && h <= 23 && mi <= 59
}

/**
 * Coerce stored, synced or file data into reminders. One bad entry is dropped,
 * never thrown over (the rule everywhere in lib/store.ts). Absent or empty
 * comes back as undefined, so records without reminders stay as they were.
 */
export function toReminders(raw: unknown): Reminder[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: Reminder[] = []
  const seen = new Set<string>()
  for (const r of raw.slice(0, REMINDER_LIMITS.perRecord * 2)) {
    if (!r || typeof r !== 'object') continue
    const x = r as Record<string, unknown>
    if (typeof x.id !== 'string' || !ID.test(x.id) || seen.has(x.id) || !isValidAt(x.at)) continue
    seen.add(x.id)
    out.push({
      id: x.id,
      label: typeof x.label === 'string' ? x.label.slice(0, REMINDER_LIMITS.label) : '',
      at: x.at,
      repeat: REPEATS.includes(x.repeat as Repeat) ? (x.repeat as Repeat) : 'once',
      createdAt: typeof x.createdAt === 'number' && Number.isFinite(x.createdAt) ? x.createdAt : 0,
      ...(typeof x.ackAt === 'number' && Number.isFinite(x.ackAt) ? { ackAt: x.ackAt } : {}),
    })
    if (out.length >= REMINDER_LIMITS.perRecord) break
  }
  return out.length ? out : undefined
}

function parts(at: string) {
  const [y, mo, d, h, mi] = AT.exec(at)!.slice(1).map(Number)
  return { y, mo, d, h, mi }
}

/**
 * The k-th occurrence (0 = the first), as epoch ms. A monthly reminder on the
 * 31st falls on the last day of a shorter month; a yearly one on 29 February
 * falls on the 28th in a year without one.
 */
export function occurrence(r: Pick<Reminder, 'at' | 'repeat'>, k: number): number {
  const { y, mo, d, h, mi } = parts(r.at)
  let year = y
  let month = mo
  if (r.repeat === 'monthly') {
    const m0 = mo - 1 + k
    year = y + Math.floor(m0 / 12)
    month = (m0 % 12) + 1
  } else if (r.repeat === 'yearly') {
    year = y + k
  }
  const day = Math.min(d, daysInMonth(month, year))
  return new Date(year, month - 1, day, h, mi).getTime()
}

/** Which occurrence index is about where `t` falls (an underestimate). */
function startIndex(r: Pick<Reminder, 'at' | 'repeat'>, t: number): number {
  if (r.repeat === 'once') return 0
  const { y, mo } = parts(r.at)
  const at = new Date(t)
  const k =
    r.repeat === 'monthly'
      ? (at.getFullYear() - y) * 12 + (at.getMonth() + 1 - mo) - 1
      : at.getFullYear() - y - 1
  return Math.max(0, k)
}

/** The next `count` occurrences at or after `from`. */
export function upcoming(r: Pick<Reminder, 'at' | 'repeat'>, from: number, count = 1): number[] {
  if (r.repeat === 'once') {
    const t = occurrence(r, 0)
    return t >= from && count > 0 ? [t] : []
  }
  const out: number[] = []
  for (let k = startIndex(r, from); out.length < count && k < startIndex(r, from) + count + 30; k++) {
    const t = occurrence(r, k)
    if (t >= from) out.push(t)
  }
  return out
}

/** The next occurrence at or after `from`, or null once a one-off has passed. */
export function nextOccurrence(r: Pick<Reminder, 'at' | 'repeat'>, from: number): number | null {
  return upcoming(r, from, 1)[0] ?? null
}

/** The latest occurrence at or before `now`, or null if none yet. */
export function lastOccurrence(r: Pick<Reminder, 'at' | 'repeat'>, now: number): number | null {
  if (r.repeat === 'once') {
    const t = occurrence(r, 0)
    return t <= now ? t : null
  }
  for (let k = startIndex(r, now) + 2; k >= 0; k--) {
    const t = occurrence(r, k)
    if (t <= now) return t
  }
  return null
}

/**
 * Has this reminder gone off and not been marked done? Only occurrences after
 * it was MADE count: an anniversary added in July for a date in June waits for
 * next June rather than greeting you as overdue.
 */
export function isDue(r: Reminder, now: number): boolean {
  const last = lastOccurrence(r, now)
  return last !== null && last > Math.max(r.ackAt ?? 0, r.createdAt)
}

/** "Fri 3 Jun 2027, 09:00": a time in the language on screen. */
export function formatWhen(t: number, locale: string): string {
  return new Date(t).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Now as the date box's and the time box's values, for a new reminder. */
export function defaultAt(now = new Date()): string {
  const t = new Date(now.getTime() + 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:00`
}

/** A stable 31-bit number for one occurrence: what a phone notification needs as its id. */
export function notificationId(reminderId: string, when: number): number {
  let h = 2166136261
  const s = `${reminderId}@${when}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 1) || 1
}
