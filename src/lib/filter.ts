import type { Contact, Frequency } from './types'
import { formatBirthday } from './birthday'
import { frequencyRank } from './frequency'

export type SortKey = 'name' | 'name-desc' | 'frequency' | 'recent'

/** The pseudo-category for "in no category at all". Not a real Category id. */
export const UNCATEGORISED = ' uncategorised'

export interface Query {
  text: string
  /** Category ids, plus possibly UNCATEGORISED. Empty = no category filter. */
  categoryIds: string[]
  /** Empty = no frequency filter. */
  frequencies: Frequency[]
  sort: SortKey
}

export const EMPTY_QUERY: Query = { text: '', categoryIds: [], frequencies: [], sort: 'name' }

/**
 * Fold a string for searching: case, surrounding space, and accents.
 *
 * The accent fold is the part that earns its keep — "Zoe" should find "Zoë",
 * and the person typing is far more likely to reach for the plain form than
 * the name's owner is. NFD splits a letter from its diacritic and the range
 * strips the combining marks; it is a no-op for unaccented text.
 */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Does the contact match the free-text box?
 *
 * Every whitespace-separated term must match SOMEWHERE in the contact (name,
 * email, notes or birthday) — AND across terms, OR across fields. So "sam
 * berlin" finds Sam whose notes mention Berlin, which a single-field search
 * would not, and typing a second word always narrows rather than widens.
 */
export function matchesText(contact: Contact, text: string): boolean {
  const terms = fold(text).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  // The FORMATTED birthday, so "june" matches and "--06-04" is not what a
  // person has to type. The stored string is in there too, so an exact
  // `1990-06-04` pasted from a spreadsheet still finds its contact.
  const haystack = [
    fold(contact.name),
    fold(contact.email),
    fold(contact.notes),
    fold(formatBirthday(contact.birthdate)),
    fold(contact.birthdate ?? ''),
  ].join(' ')
  return terms.every((t) => haystack.includes(t))
}

/** Category filter: OR within the selection — a person in ANY chosen category. */
export function matchesCategories(contact: Contact, categoryIds: string[]): boolean {
  if (categoryIds.length === 0) return true
  if (categoryIds.includes(UNCATEGORISED) && contact.categoryIds.length === 0) return true
  return contact.categoryIds.some((id) => categoryIds.includes(id))
}

export function matchesFrequency(contact: Contact, frequencies: Frequency[]): boolean {
  return frequencies.length === 0 || frequencies.includes(contact.frequency)
}

/**
 * `localeCompare` with `numeric` so "Flat 10" sorts after "Flat 9", and
 * `sensitivity: 'base'` so case and accents do not split the alphabet.
 */
function byName(a: Contact, b: Contact): number {
  return a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base', numeric: true })
}

/**
 * Sort comparator.
 *
 * Every branch falls through to a name comparison as its tiebreak, so the list
 * is TOTALLY ordered under all four keys. Without that, two contacts on the
 * same frequency could swap places between renders for no visible reason —
 * Array.prototype.sort is stable, but the array it is handed here is rebuilt
 * by a filter on every keystroke, so "stable" buys nothing.
 */
export function compare(sort: SortKey): (a: Contact, b: Contact) => number {
  switch (sort) {
    case 'name-desc':
      return (a, b) => byName(b, a)
    case 'frequency':
      // Most demanding first. Infinity (big-news) therefore lands last, which
      // is the whole reason it is Infinity rather than 0.
      return (a, b) => frequencyRank(a.frequency) - frequencyRank(b.frequency) || byName(a, b)
    case 'recent':
      return (a, b) => b.createdAt - a.createdAt || byName(a, b)
    case 'name':
    default:
      return byName
  }
}

/** Filter + sort in one pass. Returns a new array; never mutates the input. */
export function runQuery(contacts: Contact[], query: Query): Contact[] {
  return contacts
    .filter(
      (c) =>
        matchesText(c, query.text) &&
        matchesCategories(c, query.categoryIds) &&
        matchesFrequency(c, query.frequencies),
    )
    .sort(compare(query.sort))
}
