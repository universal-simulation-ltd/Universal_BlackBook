// The whole domain, in one file. A BlackBook is a list of people, a list of
// tags, and nothing else — there is no server, no account and no sync, so
// these types are also the complete on-disk schema (see lib/store.ts).
//
// ⚠️ Tags were called CATEGORIES until 2026-08-24, and the old name survives in
// two places that are not ours to rename freely: the IndexedDB object store,
// and the `categoryIds` field on records already written to a user's disk.
// `toContact` in lib/store.ts reads either spelling. Nothing else should have
// to know.

/**
 * A user-defined grouping. Entirely custom.
 *
 * A brand new book is given TWO to start with — "Important People" and
 * "Important Notes" (owner's request, 2026-09-11; see `SEED_TAGS` in
 * stores/bookStore.ts). They are ordinary tags from the moment they exist:
 * nothing in the app treats them specially, deleting them is final, and no
 * record anywhere says a tag was seeded. The restraint that kept this list
 * empty for a year still applies to a LONG one — an app that seeds six of its
 * own guesses is telling you how it thinks you should file people.
 */
export interface Tag {
  id: string
  name: string
  /** One of the swatch keys in lib/palette.ts. Not a raw colour — see there. */
  colour: string
  /**
   * `'list'` makes this an Email LIST rather than a tag (owner's request,
   * 2026-09-17: "have a distinction between lists and tags"). Same record,
   * same `tagIds` membership on a contact — a list is a tag with a job — but
   * drawn with a list glyph instead of the colour dot, managed on the Lists
   * tab, and able to carry tags of its own. Absent means an ordinary tag, so
   * every tag written before this reads as one.
   */
  kind?: 'list'
  /** A LIST's own tags ("Book club" tagged Important People). Lists only. */
  tagIds?: string[]
}

export interface Contact {
  id: string
  name: string
  email: string
  /**
   * Free text, never normalised. `+44 7700 900123`, `07700 900123` and
   * `(0113) 496 0000` are all the same number to a person and all different
   * strings, and every scheme for canonicalising them needs a country to
   * assume — which this app has no way of knowing and no business guessing.
   * Search folds the digits out instead (lib/filter.ts), so the display form
   * stays exactly what was typed or what the phone handed over.
   */
  phone: string
  /** Many-to-many, by id. A contact may carry no tags at all. */
  tagIds: string[]
  /**
   * `YYYY-MM-DD`, or `--MM-DD` when the year is not known, or absent.
   *
   * Optional in both senses: the field may be blank, and a birthday whose year
   * nobody remembers is a first-class value rather than a half-filled one. See
   * lib/birthday.ts — the `--MM-DD` shape is vCard's, not ours.
   */
  birthdate?: string
  /**
   * Keep this person out of the birthdays view, without forgetting the date.
   *
   * ⚠️ A VIEW flag, not a fact about the person, and deliberately not the
   * absence of one. Somebody you have fallen out with, an ex, a client whose
   * birthday came in with an import — you want the date kept (it is real, and
   * deleting it is the one thing you cannot undo) and you do not want the app
   * reminding you every year. Clearing `birthdate` would achieve the second at
   * the cost of the first.
   *
   * Absent means shown, so every record written before this existed reads
   * correctly with no migration.
   */
  hideBirthday?: boolean
  /**
   * Keep this person out of the main list, but still findable by searching.
   *
   * ⚠️ Independent of `hideBirthday`, and the two mean different things. This
   * one is about CLUTTER — the plumber, the landlord, the person you contact
   * once a year and do not want to scroll past every time. That one is about
   * REMINDERS. Hiding somebody from the list does not stop their birthday
   * counting down, and hiding their birthday does not take them off the list.
   *
   * ⚠️ Hidden from BROWSING, never from searching. Type their name and they
   * are there — which is what makes this different from deleting them, and
   * what stops it being a way to lose people quietly.
   *
   * Absent means shown, so every record written before this existed reads
   * correctly with no migration.
   */
  hideFromList?: boolean
  /**
   * Added by an Email list and never as a contact (owner's request,
   * 2026-09-17: "if the user is only in a list then don't show them in the
   * contact tab"). Such a person is left out of Contacts while they are on any
   * list — still found by search, and shown when that list is open. Adding
   * them to Contacts from their card clears it.
   *
   * Absent means an ordinary contact, so nothing written before this moves.
   */
  listOnly?: boolean
  notes: string
  createdAt: number
  updatedAt: number
}
