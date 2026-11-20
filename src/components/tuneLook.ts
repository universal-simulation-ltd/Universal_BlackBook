// The tab on screen follows the default view (useFollowDefaultTab, below).
//
// Until @unisim/sdk 0.229.0 this file also held useTuneLook, which copied this
// app's own colour scheme, language and opening tab in and out of
// settingsStore `look` so they travelled in the vault. The SDK now syncs
// exactly those three for every app (its `tune:blackbook` row, newest change
// wins), so useTuneLook went: kept, the look would have synced twice.

import { useCallback, useEffect, useRef } from 'react'

/**
 * The tab on screen follows the default until somebody picks one (James,
 * 2026-11-12: set To-do as the default on the phone, signed in on the website,
 * and it stayed on People). A tab state seeded from `useDefaultView` reads the
 * default once, at start-up — but signing in loads the page first and the
 * phone's choice arrives with the book a moment later. So a default that
 * changes while nobody has touched the tabs moves the screen too. Returns the
 * call a tab tap makes, after which the screen is left where it is put.
 */
export function useFollowDefaultTab<T extends string>(defaultView: T, setTab: (tab: T) => void): () => void {
  const picked = useRef(false)
  const seen = useRef(defaultView)
  useEffect(() => {
    if (defaultView === seen.current) return
    seen.current = defaultView
    if (!picked.current) setTab(defaultView)
  }, [defaultView, setTab])
  return useCallback(() => {
    picked.current = true
  }, [])
}
