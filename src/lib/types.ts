// The whole domain, in one file. A BlackBook is a list of people, a list of
// categories, and nothing else — there is no server, no account and no sync,
// so these types are also the complete on-disk schema (see lib/store.ts).

/**
 * How often you want to be in touch with someone.
 *
 * Stored as a string key, never as a number of days. The label and the day
 * count are both derived (lib/frequency.ts) — so "quarterly" survives a change
 * of mind about whether a quarter is 90 or 91 days, and an export written by
 * an older build still reads correctly in a newer one.
 *
 * ⚠️ These keys are written into CSV exports, so they are a FILE FORMAT.
 * Renaming one silently orphans every row already exported under the old name;
 * add a new key and map the old one in lib/csv.ts instead.
 */
export type Frequency =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'biannually'
  | 'yearly'
  | 'big-news'

/**
 * A user-defined grouping. Entirely custom: the app ships a starter set on
 * first run (lib/seed.ts) and every one of them can be renamed or deleted.
 * There are no built-in categories a user cannot get rid of.
 */
export interface Category {
  id: string
  name: string
  /** One of the swatch keys in lib/palette.ts. Not a raw colour — see there. */
  colour: string
}

export interface Contact {
  id: string
  name: string
  email: string
  /** Many-to-many, by id. A contact may be in no categories at all. */
  categoryIds: string[]
  frequency: Frequency
  notes: string
  createdAt: number
  updatedAt: number
}
