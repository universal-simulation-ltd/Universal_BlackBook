import { createThemeStore, type ThemePref } from '@unisim/sdk'

// Light / Dark / Match my device. The store itself lives in @unisim/sdk
// (createThemeStore): it puts the `dark` class on <html> and sets
// `color-scheme`, at import time, so a dark-mode user never sees a light frame.
//
// ⚠️ LIGHT FIRST (James, 2026-10-20, the suite rule). BlackBook was dark-only
// from 2026-08-24 until this; it now opens light until the user picks Dark or
// Match my device, in Tune this app. index.css says how one set of dark
// classes paints both themes.
//
// The key holds this app's OVERRIDE of the suite-wide colour scheme (SDK
// 0.143.0): absent = follow `universal:color-scheme`, itself light until
// chosen. ⚠️ index.html's pre-paint script reads the same key — rename both or
// neither, and never rename it once shipped: it is every user's saved choice.
export type { ThemePref }

export const useThemeStore = createThemeStore('unisim-blackbook-theme')

/** 'light' | 'dark', with Match my device resolved. For the SDK's `theme` / `ground` props. */
export function useEffectiveTheme(): 'light' | 'dark' {
  return useThemeStore((s) => s.effective)
}
