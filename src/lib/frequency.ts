import type { Frequency } from './types'

/**
 * The frequency list, in the order it is offered — loosest commitment last.
 *
 * `days` is advisory: it exists so the list can be SORTED by how demanding a
 * cadence is, and for nothing else. This app records an intention; it does not
 * compute who is overdue, and deliberately so — that turns an address book
 * into a task list that nags, which is a different product.
 *
 * `big-news` has no interval at all, which is the point of it: some people you
 * do not contact on a schedule, you contact when something happens. It sorts
 * last via Infinity rather than 0, or "no cadence" would rank as the most
 * demanding one.
 */
export const FREQUENCIES: { value: Frequency; label: string; short: string; days: number }[] = [
  { value: 'weekly',      label: 'Once a week',        short: 'Weekly',      days: 7 },
  { value: 'fortnightly', label: 'Once a fortnight',   short: 'Fortnightly', days: 14 },
  { value: 'monthly',     label: 'Once a month',       short: 'Monthly',     days: 30 },
  { value: 'quarterly',   label: 'Once a quarter',     short: 'Quarterly',   days: 91 },
  { value: 'biannually',  label: 'Once every 6 months', short: 'Twice a year', days: 182 },
  { value: 'yearly',      label: 'Once a year',        short: 'Yearly',      days: 365 },
  { value: 'big-news',    label: 'Big news only',      short: 'Big news',    days: Infinity },
]

export const DEFAULT_FREQUENCY: Frequency = 'quarterly'

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

/** Sort key — see the note on `days` above. */
export function frequencyRank(value: Frequency): number {
  return BY_VALUE.get(value)?.days ?? Infinity
}
