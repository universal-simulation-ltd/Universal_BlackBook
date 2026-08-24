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
 * A user-defined grouping. Entirely custom, and there are NO built-in tags —
 * a new book starts with none at all. An app that seeds six of its own
 * guesses is telling you how it thinks you should file people; the empty
 * state asks instead.
 */
export interface Tag {
  id: string
  name: string
  /** One of the swatch keys in lib/palette.ts. Not a raw colour — see there. */
  colour: string
}

export interface Contact {
  id: string
  name: string
  email: string
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
  notes: string
  createdAt: number
  updatedAt: number
}
