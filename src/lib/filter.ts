import type { Contact } from './types'
import { formatBirthday, nextBirthday, type Today } from './birthday'

/**
 * How the list is ordered.
 *
 * `birthday` is the odd one out and deliberately so: it is the only key that
 * also FILTERS, dropping everyone with no birthday recorded — and everyone
 * marked `hideBirthday`. A "sort by birthday" that padded the bottom of the
 * list with people who have none is a worse answer to "whose birthday is
 * coming up" than a shorter list is.
 */
export type SortKey = 'name' | 'name-desc' | 'recent' | 'birthday'

/** The pseudo-tag for "carrying no tags at all". Not a real Tag id. */
export const UNTAGGED = ' untagged'

export interface Query {
  text: string
  /** Tag ids, plus possibly UNTAGGED. Empty = no tag filter. */
  tagIds: string[]
  sort: SortKey
}

export const EMPTY_QUERY: Query = { text: '', tagIds: [], sort: 'name' }

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
 * Every digit in a phone number, and nothing else.
 *
 * Both sides of a phone search go through this, which is what makes
 * `07700900123` find `+44 7700 900123`: the stored spacing, the brackets, the
 * dashes and the leading `+` are all noise a person will not reproduce. It is
 * deliberately NOT a normalisation — no country code is added or removed, so
 * `447700900123` and `07700900123` stay different strings and the app never
 * has to guess which country somebody is in. See Contact.phone.
 */
export function digits(s: string): string {
  return s.replace(/\D/g, '')
}

/**
 * Does the contact match the free-text box?
 *
 * Every whitespace-separated term must match SOMEWHERE in the contact (name,
 * email, phone, notes or birthday) — AND across terms, OR across fields. So
 * "sam berlin" finds Sam whose notes mention Berlin, which a single-field
 * search would not, and typing a second word always narrows rather than widens.
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
    fold(contact.phone),
    fold(contact.notes),
    fold(formatBirthday(contact.birthdate)),
    fold(contact.birthdate ?? ''),
  ].join(' ')
  // The number's digits are searched separately from its text, and the term is
  // reduced the same way, so how either side was punctuated stops mattering.
  // Guarded on the term having digits at all: a bare `includes('')` is true
  // for every contact, which would make every non-numeric term match anyone
  // with a phone number.
  const phoneDigits = digits(contact.phone)
  return terms.every((t) => {
    if (haystack.includes(t)) return true
    const d = digits(t)
    return d !== '' && phoneDigits.includes(d)
  })
}

/** Tag filter: OR within the selection — a person carrying ANY chosen tag. */
export function matchesTags(contact: Contact, tagIds: string[]): boolean {
  if (tagIds.length === 0) return true
  if (tagIds.includes(UNTAGGED) && contact.tagIds.length === 0) return true
  return contact.tagIds.some((id) => tagIds.includes(id))
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
 * is TOTALLY ordered under every key. Without that, two contacts sharing a
 * birthday could swap places between renders for no visible reason —
 * Array.prototype.sort is stable, but the array it is handed here is rebuilt
 * by a filter on every keystroke, so "stable" buys nothing.
 */
export function compare(sort: SortKey, today: Today): (a: Contact, b: Contact) => number {
  switch (sort) {
    case 'name-desc':
      return (a, b) => byName(b, a)
    case 'recent':
      return (a, b) => b.createdAt - a.createdAt || byName(a, b)
    case 'birthday':
      // Soonest first. Anyone reaching this comparator has a birthday — the
      // filter above dropped the rest — but the `?? Infinity` keeps it total
      // rather than returning NaN if that ever stops being true.
      return (a, b) =>
        (nextBirthday(a.birthdate, today)?.inDays ?? Infinity) -
          (nextBirthday(b.birthdate, today)?.inDays ?? Infinity) || byName(a, b)
    case 'name':
    default:
      return byName
  }
}

/**
 * Filter + sort in one pass. Returns a new array; never mutates the input.
 *
 * `today` is passed in rather than read from the clock here so the whole
 * pipeline stays pure — see `nextBirthday` for why that matters.
 */
export function runQuery(contacts: Contact[], query: Query, today: Today): Contact[] {
  const searching = isSearching(query)
  return contacts
    .filter(
      (c) =>
        matchesText(c, query.text) &&
        matchesTags(c, query.tagIds) &&
        (query.sort !== 'birthday' || showsInBirthdays(c, today)) &&
        // ⚠️ `hideFromList` does NOT apply to the birthdays view. The two flags
        // mean different things — clutter and reminders — and the birthdays
        // view is somewhere you went ON PURPOSE to see birthdays, not a list
        // you are scrolling past somebody in. Somebody tidied off the main list
        // still has their birthday counted down; `hideBirthday` is the flag
        // that stops that, and it is theirs to set separately.
        (query.sort === 'birthday' || searching || !c.hideFromList),
    )
    .sort(compare(query.sort, today))
}

/**
 * Is the user LOOKING for somebody, as opposed to browsing?
 *
 * The whole of `hideFromList` turns on this one distinction, so it is a
 * function with a name rather than a `!==  ''` buried in a filter.
 *
 * ⚠️ The search BOX and not the tag chips. Tags are how the list is browsed —
 * a chip narrows a list you are still reading down, and somebody hidden from
 * that list is hidden from it whichever chips are lit. Typing a name is the
 * opposite act: it is asking for one person, and answering "no such person"
 * because they were tidied away six months ago would be the app lying about
 * what it holds.
 */
export function isSearching(query: Query): boolean {
  return query.text.trim() !== ''
}

/**
 * Does this person belong in the birthdays view?
 *
 * Two ways to be out of it, and they are different in kind: no date recorded
 * (nothing to show) and `hideBirthday` (a date you asked not to be shown). The
 * second is why `hiddenBirthdays` below exists — anything a user switched on
 * needs somewhere to switch it off, or it is a trapdoor.
 */
export function showsInBirthdays(contact: Contact, today: Today): boolean {
  return !contact.hideBirthday && Boolean(nextBirthday(contact.birthdate, today))
}

/**
 * Everybody hidden from the main list, for the drawer that puts them back.
 *
 * ⚠️ NOT filtered by the search box or the tag chips. This list is the undo for
 * hiding somebody, so it has to show everybody who is hidden regardless of what
 * else the query says — a person you cannot find is a person you cannot
 * un-hide. Same rule as `hiddenBirthdays` below, for the same reason.
 */
export function hiddenFromList(contacts: Contact[]): Contact[] {
  return contacts.filter((c) => c.hideFromList).sort(byName)
}

/**
 * The people the birthdays view is leaving out ON PURPOSE — hidden, but with a
 * real birthday behind them. Sorted by name, like `hiddenFromList`: there is no
 * countdown ordering worth applying to a list whose whole point is that you are
 * not counting. Not filtered by the query either, and for the same reason.
 */
export function hiddenBirthdays(contacts: Contact[], today: Today): Contact[] {
  return contacts
    .filter((c) => c.hideBirthday && Boolean(nextBirthday(c.birthdate, today)))
    .sort(byName)
}
