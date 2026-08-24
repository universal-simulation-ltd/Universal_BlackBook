import type { Frequency } from './types'

/**
 * The frequency list, in the order it is OFFERED.
 *
 * `na` leads because it is the default: most people you add are just people,
 * and making the app demand a cadence before it will take a name is how a
 * field meant to be useful becomes a toll. "Not said" is a real answer and it
 * is the one the form starts on.
 *
 * `days` is the honest interval and is used for nothing but display reasoning;
 * `order` is what sorting uses. They are separate on purpose — see
 * `frequencyRank`.
 *
 * ⚠️ `value` strings are written into CSV exports, so they are a FILE FORMAT.
 * Renaming one silently orphans every row already exported under the old name.
 */
export const FREQUENCIES: {
  value: Frequency
  label: string
  short: string
  days: number
  /** Sort position: most demanding first, "no cadence" answers last. */
  order: number
}[] = [
  { value: 'na',          label: 'N/A — no set frequency', short: 'N/A',          days: Infinity, order: 90 },
  { value: 'weekly',      label: 'Once a week',            short: 'Weekly',       days: 7,        order: 10 },
  { value: 'fortnightly', label: 'Once a fortnight',       short: 'Fortnightly',  days: 14,       order: 20 },
  { value: 'monthly',     label: 'Once a month',           short: 'Monthly',      days: 30,       order: 30 },
  { value: 'quarterly',   label: 'Once a quarter',         short: 'Quarterly',    days: 91,       order: 40 },
  { value: 'biannually',  label: 'Once every 6 months',    short: 'Twice a year', days: 182,      order: 50 },
  { value: 'yearly',      label: 'Once a year',            short: 'Yearly',       days: 365,      order: 60 },
  { value: 'big-news',    label: 'Big news only',          short: 'Big news',     days: Infinity, order: 80 },
]

/**
 * What a new contact starts on.
 *
 * Also what a corrupt record and an unrecognised CSV value fall back to — and
 * `na` is the honest answer for both. The previous default said `quarterly`,
 * which invented a commitment on the user's behalf and made "quarterly" mean
 * two different things: "I chose this" and "nobody said".
 */
export const DEFAULT_FREQUENCY: Frequency = 'na'

const BY_VALUE = new Map(FREQUENCIES.map((f) => [f.value, f]))

export function isFrequency(value: string): value is Frequency {
  return BY_VALUE.has(value as Frequency)
}

/** The long form, for the edit form. */
export function frequencyLabel(value: Frequency): string {
  return BY_VALUE.get(value)?.label ?? value
}

/** The short form, for the chip on a contact row where space is tight. */
export function frequencyShort(value: Frequency): string {
  return BY_VALUE.get(value)?.short ?? value
}

/**
 * Sort key — most demanding cadence first, the two "no cadence" answers last
 * (big-news, then na).
 *
 * ⚠️ Returns `order`, NOT `days`, and that is the entire point of the field
 * existing. The comparator subtracts two of these, and `days` has more than one
 * `Infinity` in it — so two big-news contacts gave `Infinity - Infinity`, which
 * is `NaN`. That happened to fall through to the name tiebreak because `NaN` is
 * falsy, i.e. it worked by accident, and adding `na` as a second Infinity would
 * have widened the accident rather than breaking it visibly. `order` is finite
 * and total.
 */
export function frequencyRank(value: Frequency): number {
  return BY_VALUE.get(value)?.order ?? 99
}
