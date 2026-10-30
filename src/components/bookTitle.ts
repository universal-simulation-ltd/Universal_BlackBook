// What BlackBook calls itself once somebody is signed in — "Bradley's Book" —
// on the phone's top bar and the website's navbar alike (James, 2026-10-30:
// the website too). One choice for both: the SDK's App name (useAppTitleChoice,
// 0.212.0), kept on the Universal ID, so "Your Book" picked on the phone is
// what the website shows and the other way round.
//
// The name is the one every suite app greets them by (useCallMe: Global
// Tuning's "Call me…", else the profile's first name, else a name-shaped
// email) — the same one the navbar hands its `personalTitle`.

import { resolveAppTitle, useAppTitleChoice, useCallMe, useUser } from '@unisim/sdk'
import { useT, type Translator } from '../i18n'

/** "Bradley's Book", or "My Book" for an account with no name yet. */
export function personalBookTitle(t: Translator, name: string | undefined): string {
  if (!name) return t('book_mine')
  const title = t('book_of', { name })
  // A name ending in s takes the apostrophe alone — "James’ Book", not
  // "James’s Book" (James, 2026-10-28, for Jukebox's title; the suite's rule).
  return /s$/i.test(name) ? title.replace(`${name}’s`, `${name}’`) : title
}

/** "Bradley's Book" for whoever is signed in, whatever they chose to call it. */
export function useNamedTitle(): string {
  return personalBookTitle(useT(), useCallMe())
}

/**
 * The bar's name: "BlackBook" signed out; signed in, the App name choice —
 * "Bradley's Book" (the default), "Your Book" or anything typed, or
 * "BlackBook" when they chose the product's own name.
 */
export function useBookTitle(): string {
  const { user } = useUser()
  const named = useNamedTitle()
  const { mode, custom } = useAppTitleChoice()
  if (!user) return 'BlackBook'
  return resolveAppTitle(mode, custom, named) ?? 'BlackBook'
}
