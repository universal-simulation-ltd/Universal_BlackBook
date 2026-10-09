import { create } from 'zustand'
import { FORM_FIELDS, isFormField, type FormField } from '../lib/formFields'

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
  /** The To-do tab beside Contacts (2026-09-27). */
  todos: boolean
  /**
   * The optional fields a NEW contact's form shows straight away; the rest
   * wait under "More" (owner's request, 2026-09-29: "select which fields are
   * shown by default and which are in the more area"). Empty, the default, is
   * the form as it always was: Name and Notes, and everything else under More.
   * A field that already holds something shows regardless.
   */
  shownFields: FormField[]
}

const KEY = 'blackbook.settings'
const DEFAULTS: Settings = { emailLists: false, todos: false, shownFields: [] }

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return {
      emailLists: raw.emailLists === true,
      todos: raw.todos === true,
      // Kept in FORM_FIELDS order whatever order they were ticked in, and
      // anything unknown (a field since removed) dropped.
      shownFields: Array.isArray(raw.shownFields)
        ? FORM_FIELDS.filter((f) => raw.shownFields!.filter(isFormField).includes(f))
        : [],
    }
  } catch {
    return DEFAULTS
  }
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void
  /** Show or fold one field on a new contact's form. */
  toggleField: (field: FormField, shown: boolean) => void
  /**
   * "Tune this app" opened from inside the app rather than from the ⚙ menu —
   * the contact form's Customise button. Not saved: it is a dialog being open.
   * `focus` names the section to scroll to.
   */
  tune: { focus: 'fields' | null } | null
  openTune: (focus?: 'fields') => void
  closeTune: () => void
  /**
   * Tune this app ▸ Reset to defaults (SDK 0.170): every switch back to off
   * and the contact form back to Name and Notes. Nothing in the book changes —
   * a To-do list with the tab turned off is kept, as it always is.
   */
  reset: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch)
    try {
      const { emailLists, todos, shownFields } = get()
      localStorage.setItem(KEY, JSON.stringify({ emailLists, todos, shownFields }))
    } catch {
      // See the note above: the switch still works until the app is closed.
    }
  },
  toggleField: (field, shown) => {
    const next = new Set(get().shownFields)
    if (shown) next.add(field)
    else next.delete(field)
    get().set({ shownFields: FORM_FIELDS.filter((f) => next.has(f)) })
  },
  tune: null,
  openTune: (focus) => set({ tune: { focus: focus ?? null } }),
  closeTune: () => set({ tune: null }),
  reset: () => {
    set({ ...DEFAULTS })
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Unreadable storage already means the defaults.
    }
  },
}))
