// The status bar (and, on older Android web views, the strips round the page)
// follow Light / Dark / Match my device — Universal Jukebox's
// src/lib/systemBars.ts, which says the why at length. In short:
//
// - iOS, and Android with a WebView from Chromium 140: the page is drawn under
//   the status bar and pads itself by `env(safe-area-inset-top)`, so the clock
//   and battery sit over the top bar — paper in Light, leather in Dark. Only
//   the glyphs need flipping.
// - Android with an older WebView: Capacitor's SystemBars pads the web view
//   natively and the strips show the WINDOW background, which Android 15 will
//   not let us recolour at run time. The shell's own WindowThemePlugin
//   (android/…/WindowThemePlugin.java) lays a theme overlay with the right
//   colour instead, and the glyphs follow once it has.
//
// capacitor.config.ts starts the glyphs dark (`style: 'LIGHT'`, "for a light
// background"), right for the Light default. ⚠️ Through SystemBars, never
// `@capacitor/status-bar` (SystemBars re-applies its own style on every
// Android configuration change). Capacitor's names read backwards: `Dark`
// means "for a dark background", i.e. LIGHT glyphs.

import { Capacitor } from '@capacitor/core'

/** Is the page drawn under the status bar (so the top bar is behind the glyphs)? */
export function pageUnderStatusBar(platform: string, userAgent: string): boolean {
  if (platform === 'ios') return true
  if (platform !== 'android') return false
  const major = Number(/Chrome\/(\d+)/.exec(userAgent)?.[1] ?? 0)
  return major >= 140
}

/** Keeps the status bar in step with the theme until the returned function is called. No-op off the native shell. */
export function followThemeWithStatusBar(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}
  const platform = Capacitor.getPlatform()
  const underBar = pageUnderStatusBar(platform, navigator.userAgent)
  let last: boolean | null = null
  let windowTheme: { set(options: { theme: 'light' | 'dark' }): Promise<void> } | null = null
  const apply = () => {
    const dark = document.documentElement.classList.contains('dark')
    if (dark === last) return
    last = dark
    void (async () => {
      try {
        const { registerPlugin, SystemBars, SystemBarsStyle } = await import('@capacitor/core')
        if (!underBar && platform === 'android') {
          // The strip first, then the glyphs, so a failed repaint leaves dark
          // glyphs over the light strip rather than white on white.
          windowTheme ??= registerPlugin<{ set(options: { theme: 'light' | 'dark' }): Promise<void> }>('WindowTheme')
          await windowTheme.set({ theme: dark ? 'dark' : 'light' })
        }
        await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
      } catch {
        /* Cosmetic: a status bar that cannot be styled never breaks a render. */
      }
    })()
  }
  const observer = new MutationObserver(apply)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  apply()
  return () => observer.disconnect()
}
