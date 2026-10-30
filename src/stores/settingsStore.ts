import { create } from 'zustand'
import { FORM_FIELDS, isFormField, type FormField } from '../lib/formFields'
import { normaliseOrder, TABS, type Tab } from '../lib/tabs'
import { normaliseContactActions, normaliseQuickActions, type ContactAction, type QuickAction, type Slots } from '../lib/quickActions'

/**
 * The app's own switches, shown in the SDK's ⚙ menu ▸ App preferences
 * (owner's request, 2026-09-17).
 *
 * Device-local, in localStorage: a preference about how THIS device shows the
 * app, not a fact about the address book, so it stays out of the vault (a backup
 * file carries it, but only "Replace everything" restores it) — the
 * same call as the saved "Opens on" view. ⚠️ Except the tabs: which are shown
 * and their order go up with the online copy (`tabsAt`, 2026-10-30). Unreadable storage (private window,
 * blocked site data) just means the defaults.
 *
 * ⚠️ Every TICK BOX starts unticked: Email lists is off by default; To-do and
 * Notes are on, and their boxes say "Hide …", bound inverted (2026-10-23).
 */
export interface Settings {
  /** Add new ▸ Email list, and Copy emails / Export CSV above the list. */
  emailLists: boolean
  /** The To-do tab beside Contacts (2026-09-27). */
  todos: boolean
  /** The Notes tab beside Contacts (2026-10-23). */
  notes: boolean
  /**
   * The Contacts tab itself, on the phone (James, 2026-10-26: "Allow the user
   * to hide the contacts tab too"). On by default; the book is still there —
   * a note's linked people, Move and search all reach it. The website always
   * shows Contacts.
   */
  contacts: boolean
  /**
   * The optional fields a NEW contact's form shows straight away; the rest
   * wait under "More" (owner's request, 2026-09-29: "select which fields are
   * shown by default and which are in the more area"). Empty, the default, is
   * the form as it always was: Name and Notes, and everything else under More.
   * A field that already holds something shows regardless.
   */
  shownFields: FormField[]
  /**
   * Phone notifications name who or what they are about (James, 2026-10-25).
   * Off, the default, a reminder on the lock screen says only "You have a
   * reminder": nothing private shows to whoever glances at the phone.
   */
  notifyDetails: boolean
  /**
   * The tabs' order (hold a tab and drag, or Tune this app ▸ Tab order;
   * 2026-10-25). Every tab is in it, shown or hidden, so a tab turned back on
   * returns to its place. Tune is always last and not in here.
   */
  tabOrder: Tab[]
  /**
   * New notes' and contacts' locations start at the nearest town to where the
   * device is (2026-10-25), worked out on the device. Off to start.
   */
  fillLocation: boolean
  /**
   * The buttons across the top of a note, in order (James, 2026-10-26: hold
   * and drag to move one, drop it on the bin to take it off, "+" in an empty
   * place to put one back). Only the ones shown are in here.
   */
  noteActions: Slots<QuickAction>
  /** The same for a contact's row (2026-10-27): its own order and its own pick. */
  contactActions: Slots<ContactAction>
  /**
   * Signed in, the top bar says "Your Book" instead of "Bradley's Book"
   * (James, 2026-10-27: hold the name at the top to choose). Off to start.
   */
  bookYours: boolean
  /**
   * When the tabs last changed here — their order, or Lists / To-do / Notes /
   * Contacts turned on or off (James, 2026-10-30). The online copy carries the
   * layout with this stamp and the newer one wins (lib/tabs.ts `TabLayout`).
   * 0: never changed on this device, so any synced layout beats the defaults.
   */
  tabsAt: number
}

/** The switches that make up the synced tab layout. */
const TAB_KEYS = ['tabOrder', 'emailLists', 'todos', 'notes', 'contacts'] as const

const KEY = 'blackbook.settings'
// To-do and Notes are ON by default, Email lists off (James, 2026-10-23: "have
// all active as default except email lists"). Their tick boxes are worded as
// opt-outs ("Hide the To-do tab"), so every box still starts unticked.
const DEFAULTS: Settings = { emailLists: false, todos: true, notes: true, contacts: true, shownFields: [], notifyDetails: false, tabOrder: [...TABS], fillLocation: false, noteActions: normaliseQuickActions(undefined), contactActions: normaliseContactActions(undefined), bookYours: false, tabsAt: 0 }
/**
 * The stored shape's version. 1 (no `v`) wrote every switch whenever any one
 * changed, so a stored `false` for To-do or Notes cannot be told from "never
 * touched": both read as unset now, i.e. on. A stored `true` stays on.
 */
const VERSION = 2

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return {
      emailLists: raw.emailLists === true,
      // Version 2 stores the choice; version 1's `false` was the old default.
      todos: (raw as { v?: number }).v === VERSION ? raw.todos !== false : true,
      notes: (raw as { v?: number }).v === VERSION ? raw.notes !== false : true,
      contacts: raw.contacts !== false,
      // Kept in FORM_FIELDS order whatever order they were ticked in, and
      // anything unknown (a field since removed) dropped.
      shownFields: Array.isArray(raw.shownFields)
        ? FORM_FIELDS.filter((f) => raw.shownFields!.filter(isFormField).includes(f))
        : [],
      notifyDetails: raw.notifyDetails === true,
      tabOrder: normaliseOrder(raw.tabOrder),
      fillLocation: raw.fillLocation === true,
      noteActions: normaliseQuickActions(raw.noteActions),
      contactActions: normaliseContactActions(raw.contactActions),
      bookYours: raw.bookYours === true,
      tabsAt: typeof raw.tabsAt === 'number' && Number.isFinite(raw.tabsAt) ? raw.tabsAt : 0,
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
    // A tab change made here is stamped so it wins over an older layout from
    // another device; one arriving FROM another device brings its own stamp.
    const tabs = patch.tabsAt === undefined && TAB_KEYS.some((k) => k in patch)
    set(tabs ? { ...patch, tabsAt: Date.now() } : patch)
    try {
      const { emailLists, todos, notes, contacts, shownFields, notifyDetails, tabOrder, fillLocation, noteActions, contactActions, bookYours, tabsAt } = get()
      localStorage.setItem(
        KEY,
        JSON.stringify({ v: VERSION, emailLists, todos, notes, contacts, shownFields, notifyDetails, tabOrder, fillLocation, noteActions, contactActions, bookYours, tabsAt }),
      )
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
    set({ ...DEFAULTS, tabOrder: [...TABS], noteActions: normaliseQuickActions(undefined), contactActions: normaliseContactActions(undefined) })
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Unreadable storage already means the defaults.
    }
    // The default tabs are a layout like any other: stamped, so they go to
    // the other devices rather than being overwritten by an older one.
    get().set({ tabsAt: Date.now() })
  },
}))
