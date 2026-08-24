import type { Category } from './types'
import { newId } from './id'
import { SWATCHES } from './palette'

/**
 * The categories a brand-new book starts with.
 *
 * Every one is an ordinary Category: renameable, recolourable, deletable. The
 * app has no built-in groupings — these exist only so the first contact form
 * has something to tick, because an empty multi-select teaches nobody what the
 * field is for.
 *
 * Written ONCE, on the first run with an empty book (see bookStore.init). Not
 * re-seeded afterwards: somebody who deletes the lot has said what they want,
 * and putting them back on the next visit is the app arguing with its user.
 */
const STARTERS = ['Family', 'Close friends', 'Friends', 'Work', 'Clients', 'Keep in touch'] as const

export function seedCategories(): Category[] {
  return STARTERS.map((name, i) => ({
    id: newId(),
    name,
    colour: SWATCHES[i % SWATCHES.length].key,
  }))
}
