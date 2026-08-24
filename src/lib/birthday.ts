// Birthdays.
//
// ── Why the year is optional ──────────────────────────────────────────────────
//
// An address book is full of people whose birthday you know as "the 4th of
// June" and whose year you have never known. Forcing a full date does not get
// you that year — it gets you 1900, or 1970, or whatever the picker was sitting
// on, written down as if it were true. A field that quietly manufactures wrong
// data is worse than one that admits it does not know.
//
// So a birthday is stored as ONE of:
//
//   'YYYY-MM-DD'   full date
//   '--MM-DD'      day and month, year not known
//   undefined      not recorded
//
// The `--MM-DD` shape is not invented here: it is how vCard (RFC 6350 §6.2.5)
// writes a birthday with an omitted year, which means an export can hand this
// straight to anything that speaks vCard without a translation step.
//
// ⚠️ These strings go into CSV exports, so they are a FILE FORMAT.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: i + 1, label }))

export interface BirthdayParts {
  /** null when the year is not known. */
  year: number | null
  /** 1–12. */
  month: number
  /** 1–31. */
  day: number
}

/**
 * Days in a month.
 *
 * With no year, February gets 29 — a birthday on the 29th of February belongs
 * to a real person born in a leap year, and rejecting it because *this* year
 * is not one would be the app arguing with a birth certificate.
 */
export function daysInMonth(month: number, year: number | null): number {
  if (month < 1 || month > 12) return 31
  if (month === 2) {
    if (year === null) return 29
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return leap ? 29 : 28
  }
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Build the stored string. Returns undefined for an incomplete or absurd date. */
export function buildBirthday(parts: Partial<BirthdayParts>): string | undefined {
  const { year, month, day } = parts
  if (!month || !day) return undefined
  if (month < 1 || month > 12) return undefined
  const y = year ?? null
  if (day < 1 || day > daysInMonth(month, y)) return undefined
  if (y === null) return `--${pad(month)}-${pad(day)}`
  // A four-digit floor rather than a "not in the future" rule: this app has no
  // business deciding whose birth date is plausible, and a date typed for a
  // baby due next week is the user's business, not ours.
  if (y < 1000 || y > 9999) return undefined
  return `${y}-${pad(month)}-${pad(day)}`
}

/** Split a stored string back into parts, or null if it is not one of ours. */
export function parseBirthday(value: string | undefined | null): BirthdayParts | null {
  if (!value) return null
  const noYear = /^--(\d{2})-(\d{2})$/.exec(value)
  if (noYear) {
    const month = Number(noYear[1])
    const day = Number(noYear[2])
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, null)) return null
    return { year: null, month, day }
  }
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (full) {
    const year = Number(full[1])
    const month = Number(full[2])
    const day = Number(full[3])
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, year)) return null
    return { year, month, day }
  }
  return null
}

export function isValidBirthday(value: string | undefined | null): boolean {
  return parseBirthday(value) !== null
}

/**
 * Human form: "4 June" or "4 June 1990".
 *
 * Built by hand rather than through `Intl.DateTimeFormat` on purpose. Feeding
 * this to a `Date` means picking a year for the year-less case, and any year
 * you pick is a timezone away from silently printing the 3rd of June for
 * somebody west of UTC. There is no Date object anywhere in this file.
 */
export function formatBirthday(value: string | undefined | null): string {
  const parts = parseBirthday(value)
  if (!parts) return ''
  const stem = `${parts.day} ${MONTHS[parts.month - 1]}`
  return parts.year === null ? stem : `${stem} ${parts.year}`
}

/**
 * Accept what a human or another address book might have written.
 *
 * Deliberately narrow. It takes our own two shapes, the ISO date every
 * spreadsheet exports, and the two unambiguous written forms ("4 June 1990",
 * "June 4"). It does NOT guess at `04/06/1990`, because that is the 4th of June
 * to a British user and the 6th of April to an American one, and an address
 * book that silently picks one is wrong for half its users with no way to tell.
 */
export function parseBirthdayInput(raw: string): string | undefined {
  const text = raw.trim()
  if (!text) return undefined

  if (isValidBirthday(text)) return text

  // ISO with a time attached — what a spreadsheet hands back after it has
  // "helpfully" turned the cell into a datetime.
  const iso = /^(\d{4})-(\d{2})-(\d{2})[T ]/.exec(text)
  if (iso) return buildBirthday({ year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) })

  const monthIndex = (name: string) => {
    const folded = name.toLowerCase()
    return MONTHS.findIndex((m) => m.toLowerCase() === folded || m.toLowerCase().slice(0, 3) === folded)
  }

  // "4 June 1990" / "4 Jun" / "4th June"
  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?(?:\s+(\d{4}))?$/.exec(text)
  if (dayFirst) {
    const m = monthIndex(dayFirst[2])
    if (m >= 0) {
      return buildBirthday({
        year: dayFirst[3] ? Number(dayFirst[3]) : null,
        month: m + 1,
        day: Number(dayFirst[1]),
      })
    }
  }

  // "June 4 1990" / "June 4th, 1990" / "Jun 4"
  const monthFirst = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?$/.exec(text)
  if (monthFirst) {
    const m = monthIndex(monthFirst[1])
    if (m >= 0) {
      return buildBirthday({
        year: monthFirst[3] ? Number(monthFirst[3]) : null,
        month: m + 1,
        day: Number(monthFirst[2]),
      })
    }
  }

  return undefined
}
