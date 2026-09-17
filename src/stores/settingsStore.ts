import { create } from 'zustand'

/**
 * The app's own switches, shown in the SDK's ⚙ menu ▸ App preferences
 * (owner's request, 2026-09-17).
 *
 * Device-local, in localStorage: a preference about how THIS device shows the
 * app, not a fact about the address book, so it stays out of the vault — the
 * same call as the saved "Opens on" view. Unreadable storage (private window,
 * blocked site data) just means the defaults.
 *
 * ⚠️ Every switch starts OFF, and is worded so that off is the plain app.
 */
export interface Settings {
  /** Add new ▸ Email list, and Copy emails / Export CSV above the list. */
  emailLists: boolean
}

const KEY = 'blackbook.settings'
const DEFAULTS: Settings = { emailLists: false }

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return { emailLists: raw.emailLists === true }
  } catch {
    return DEFAULTS
  }
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch)
    try {
      localStorage.setItem(KEY, JSON.stringify({ emailLists: get().emailLists }))
    } catch {
      // See the note above: the switch still works until the app is closed.
    }
  },
}))
