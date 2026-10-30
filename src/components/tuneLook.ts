// The look in Tune this app — this app's own colour scheme and language, and
// the tab it opens on — kept in step with the synced settings (James,
// 2026-10-30: "everything on tune this app" from the phone to the website).
//
// The SDK holds the live values (the theme store, the provider's app
// language, useDefaultView), each in this device's storage. This copies a
// change made here into settingsStore `look`, which stamps it for the online
// copy, and applies a `look` that arrived from another device back to the SDK.
// Mounted once, at the top of App, so it runs on the phone and the website.

import { useEffect, useRef } from 'react'
import { isSupportedLanguage, useDefaultView, useUniversal } from '@unisim/sdk'
import { TABS, type Tab } from '../lib/tabs'
import { sameLook, type Look } from '../lib/tuning'
import { useSettingsStore } from '../stores/settingsStore'
import { useThemeStore } from '../stores/themeStore'

export function useTuneLook() {
  const scheme = useThemeStore((s) => s.override)
  const setScheme = useThemeStore((s) => s.setOverride)
  const { appLanguage, setAppLanguage } = useUniversal()
  const { defaultView, setDefaultView } = useDefaultView<Tab>('tab', 'contacts', { views: TABS })
  const look = useSettingsStore((s) => s.look)
  // The look the SDK and the store last agreed on. A store `look` that is not
  // this one came from another device.
  const agreed = useRef(look)

  useEffect(() => {
    const here: Look = { scheme, language: appLanguage, opensOn: defaultView }
    if (look !== agreed.current) {
      agreed.current = look
      if (!look || sameLook(look, here)) return
      if (look.scheme !== scheme) setScheme(look.scheme)
      if (look.language !== appLanguage) setAppLanguage(isSupportedLanguage(look.language) ? look.language : null)
      if (look.opensOn !== defaultView) setDefaultView(look.opensOn)
      return
    }
    if (sameLook(look, here)) return
    agreed.current = here
    const { set, tunedAt } = useSettingsStore.getState()
    // The first sight of the look on this device is not a change: unstamped,
    // so it cannot outrank settings chosen on another device.
    set(look ? { look: here } : { look: here, tunedAt })
    // `agreed` follows the store's own copy, which is `here` itself.
    agreed.current = useSettingsStore.getState().look
  }, [look, scheme, appLanguage, defaultView, setScheme, setAppLanguage, setDefaultView])
}
