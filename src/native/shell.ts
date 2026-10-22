// shell.ts — does this run the phone screens (`src/native/`)?
//
// The phone app (iOS / Android) has screens of its own, built for a phone
// rather than the website squeezed onto one (James, 2026-10-20; the
// store-listings §7 bar, the way Universal Jukebox and Universal PDF did it):
// a tab bar, pages that come in from the side and go back with a swipe from
// the left edge, bottom sheets instead of menus and dialogs, its own paper and
// leather look, and no navbar, suite switcher, Actions menu or changelog. The
// website keeps `App.tsx`'s own layout and never downloads this folder (it is
// lazy-loaded).
//
// In `npm run dev`, `?app` shows the phone screens in a browser (it sticks for
// the tab; `?app=0` turns it off). The store screenshots set a session flag
// before the app loads (store-assets/generate.mjs) — never the address, so
// nobody on the website lands here by accident.

import { Capacitor } from '@capacitor/core'

const DEV_KEY = 'blackbook:dev-phone-screens'

/** Set by `store-assets/generate.mjs` before the app loads. index.html reads it too. */
export const CAPTURE_KEY = 'blackbook:store-capture'

let cached: boolean | null = null

export function phoneScreens(): boolean {
  if (cached !== null) return cached
  cached = decide()
  return cached
}

function decide(): boolean {
  if (typeof window === 'undefined') return false
  if (Capacitor.isNativePlatform()) return true
  try {
    if (sessionStorage.getItem(CAPTURE_KEY) === '1') return true
  } catch {
    /* no storage: not a capture */
  }
  if (!import.meta.env.DEV) return false
  try {
    const q = new URLSearchParams(window.location.search).get('app')
    if (q !== null) sessionStorage.setItem(DEV_KEY, q === '0' ? '0' : '1')
    return sessionStorage.getItem(DEV_KEY) === '1'
  } catch {
    return false
  }
}
