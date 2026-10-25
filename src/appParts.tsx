/* eslint-disable react-refresh/only-export-components -- hooks and helpers live beside the components that use them; hot reload of these few files is not worth splitting them */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDefaultView, type AboutAppConfig } from '@unisim/sdk'
// Generated — `npm run credits` after any dependency change. Never edit it by
// hand: it is read off the installed tree, so a hand-kept list drifts from the
// lockfile the first time anyone upgrades anything, and a credits list naming a
// package we removed is worse than no list at all.
import credits from './generated/credits.json'
import { EmailListsPreference } from './components/EmailListsPreference'
import { FormFieldsPreference } from './components/FormFieldsPreference'
import { TemplatesPreference } from './components/TemplateManager'
import { phoneScreens } from './native/shell'
import { contactsAvailability, ContactsPermissionError, pickOneContact } from './lib/deviceContacts'
import { useBookStore } from './stores/bookStore'
import { useLockStore } from './stores/lockStore'
import { useSettingsStore } from './stores/settingsStore'
import { useSyncStore } from './stores/syncStore'
import { btnPrimary, radioCls } from './components/ui'
import { DICTS, en as EN, useT, type Key, type Translator } from './i18n'

// The pieces both layouts share: the website's (App.tsx) and the phone
// screens' (src/native/NativeApp.tsx).

export const REPO_URL = 'https://github.com/universal-simulation-ltd/Universal_BlackBook'

/** The landing screen's tabs. Lists and To-do each need their App preference on. */
export const TABS = ['contacts', 'lists', 'todos', 'notes'] as const
export type Tab = (typeof TABS)[number]
const TAB_KEYS: Record<Tab, Key> = { contacts: 'tab_contacts', lists: 'tab_lists', todos: 'tab_todos', notes: 'tab_notes' }
/** A tab's name, in the language on screen. */
export const tabName = (t: Translator, tab: Tab) => t(TAB_KEYS[tab])

// "About this app" — handed to <UniversalAppsNavBar about>, which draws it at
// the foot of "Tune this app" (SDK 0.161.0+) and opens its own AboutAppDialog.
// It used to be the last row of the Advanced menu (Header/AppMenu.tsx).
/** BlackBook's own rows in Tune this app — in the ⚙ menu's copy and in ours (see `TuneThisApp`). */
export const PREFERENCE_ROWS = (
  <>
    <EmailListsPreference />
    <OpensOnPreference />
    <FormFieldsPreference />
    {/* The phone has its own row in Tune ▸ Your book. */}
    {!phoneScreens() && <TemplatesPreference />}
  </>
)

/** One string in every language, as the SDK's `{ en, fr, … }` maps take it. */
function everyLanguage(key: Key): { en: string } & Record<string, string> {
  const out: { en: string } & Record<string, string> = { en: EN[key] }
  for (const [code, dict] of Object.entries(DICTS)) if (dict[key]) out[code] = dict[key]!
  return out
}

export const APP_ABOUT: AboutAppConfig = {
  repo:    'https://github.com/universal-simulation-ltd/Universal_BlackBook',
  subject: everyLanguage('about.subject'),
  plural:  true,
  except:  everyLanguage('about.except'),
  headline: everyLanguage('about.headline'),
  version: __APP_VERSION__,
  credits,
  noticesHref: 'https://github.com/universal-simulation-ltd/Universal_BlackBook/blob/main/THIRD-PARTY-NOTICES.md',
}

/**
 * The padlock beside the page title: the whole of the PIN lock's front door.
 *
 * With a PIN set it states: "🔒 Locked" is what the app IS, which is the
 * thing worth knowing at a glance, and tapping it asks for the PIN before
 * taking the lock off. With NO PIN it offers: "🔓 Lock with PIN" (owner's
 * call, 2026-10-12). It used to read "🔓 Unlocked" there, which described a
 * lock nobody had set up as if it had been opened. `title` and the accessible
 * name carry the action either way.
 *
 * It sits in the body rather than in the ⚙ menu (owner's call) because a lock
 * nobody knows is available is a lock nobody turns on — and because "is this
 * thing locked?" deserves an answer without opening a menu to find it.
 *
 * The padlocks are emoji, and that is checked rather than assumed: 🔒 is
 * already shipping in this app's own menu (Header/AppMenu.tsx). See the notes
 * on 📇 and ✕ elsewhere for the two codepoints that were NOT safe.
 */
export function LockLink({ onClick }: { onClick: () => void }) {
  const locked = useLockStore((s) => s.record !== null)
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      title={locked ? t('pin.turn_off_title') : t('pin.lock_title')}
      className="inline-flex items-center gap-1 rounded text-sm text-slate-400 underline-offset-4 hover:text-orange-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <span aria-hidden>{locked ? '\u{1F512}' : '\u{1F513}'}</span>
      <span>{locked ? t('pin.locked') : t('tune_pin')}</span>
      {locked && <span className="sr-only">{t('pin.tap_off')}</span>}
    </button>
  )
}

/**
 * "Syncing…" / "Synced" beside the page title (owner's request, 2026-09-17:
 * show that what was just added is backed up).
 *
 * Only while signed in — signed out the book is local-first by design, and a
 * permanent "not backed up" would nag people who chose that. Signed in without
 * a backup yet, or with one waiting for its passphrase, it says so and opens
 * the backup panel; the same for a failed or conflicting save.
 */
export function SyncStatus({ onOpen }: { onOpen: () => void }) {
  const state = useSyncStore((s) => s.state)
  const status = useSyncStore((s) => s.status)
  const dirty = useSyncStore((s) => s.dirty)
  const lastPushedAt = useSyncStore((s) => s.lastPushedAt)
  const t = useT()
  if (state === 'signed-out') return null

  const problem = status === 'error' || status === 'conflict'
  const view =
    state === 'off'
      ? { text: t('st.off'), tone: 'text-slate-400', icon: '☁︎', spin: false }
      : state === 'locked'
        ? { text: t('st.locked'), tone: 'text-slate-400', icon: '☁︎', spin: false }
        : problem
          ? { text: t('st.problem'), tone: 'text-rose-300', icon: '!', spin: false }
          : dirty || status === 'working'
            ? { text: t('st.syncing'), tone: 'text-slate-400', icon: '↻', spin: true }
            : { text: t('st.synced'), tone: 'text-emerald-300', icon: '✓', spin: false }
  const clickable = state !== 'on' || problem

  const body = (
    <>
      <span aria-hidden className={view.spin ? 'inline-block animate-spin' : undefined}>
        {view.icon}
      </span>
      <span>{view.text}</span>
    </>
  )
  const cls = `inline-flex items-center gap-1 text-sm ${view.tone}`
  return clickable ? (
    <button
      type="button"
      onClick={onOpen}
      className={`${cls} rounded underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
    >
      {body}
    </button>
  ) : (
    <span
      className={cls}
      role="status"
      aria-live="polite"
      title={lastPushedAt ? t('st.backed_up', { when: new Date(lastPushedAt).toLocaleString(t.locale) }) : undefined}
    >
      {body}
    </span>
  )
}

/**
 * "From my contacts" — the phone's own address book, one person at a time.
 *
 * The picked name, email, number and birthday open the normal Add form rather
 * than being saved straight into the book. That is the whole point of the
 * feature: the fields the phone can fill in are not the fields anybody opens
 * BlackBook for, so it hands you the form with the boring half done and the
 * cursor free for the note and the tags.
 *
 * ⚠️ **`picking` never disables the button, deliberately.** iOS's contact
 * picker has no cancel callback in @capacitor-community/contacts 7.2.0, so
 * closing it without choosing anybody leaves this promise pending forever
 * (see `pickOneContact`). A disabled button would make one cancel the end of
 * the feature until the app restarts; a stale "waiting" line that a second tap
 * clears is the harmless version of the same bug.
 */
export function useContactPicker() {
  const newContact = useBookStore((s) => s.newContact)
  const setNotice = useBookStore((s) => s.setNotice)
  const t = useT()
  // Read once: whether the device has contacts to offer cannot change while
  // the app is open, and calling it per render would run a feature detection
  // on every keystroke in the search box.
  const [where] = useState(contactsAvailability)
  const [picking, setPicking] = useState(false)

  const pick = useCallback(async () => {
    setPicking(true)
    try {
      const picked = await pickOneContact()
      // Null is the web picker's cancel, which is a decision and not a fault:
      // nothing is said about it.
      if (picked) void newContact(picked)
    } catch (e) {
      setNotice(
        e instanceof ContactsPermissionError
          ? t('pick.denied')
          : t('pick.failed'),
      )
    } finally {
      setPicking(false)
    }
  }, [newContact, setNotice, t])

  return { canPick: where !== 'none', picking, pick: () => void pick() }
}

/** The tabs the landing screen shows, given Tune this app ▸ Email lists, ▸ To-do and ▸ Notes. */
export function availableTabs(emailLists: boolean, todos: boolean, notes = false): Tab[] {
  const on: Record<Tab, boolean> = { contacts: true, lists: emailLists, todos, notes }
  return TABS.filter((t) => on[t])
}

/**
 * Tune this app ▸ "Opens on": the double-tapped default tab as a row, for
 * anybody who cannot double-tap. Only while there is more than one tab to open
 * on — with Email lists and To-do both off there is only Contacts.
 */
function OpensOnPreference() {
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todos = useSettingsStore((s) => s.todos)
  const notes = useSettingsStore((s) => s.notes)
  const t = useT()
  const tabs = availableTabs(emailLists, todos, notes)
  // The same stored default the double tap writes (useDefaultView), shown as
  // the app's own choice rows rather than the SDK's dropdown (James,
  // 2026-10-25: "the dropdown doesn't fit the style"): exactly one is on, and
  // choosing Contacts, the app's own default, forgets the stored one.
  const { defaultView, setDefaultView } = useDefaultView<Tab>('tab', 'contacts', { views: TABS })
  const name = useId()
  if (tabs.length < 2) return null
  const current = tabs.includes(defaultView) ? defaultView : 'contacts'
  return (
    <fieldset className="mt-3 border-t border-slate-800 pt-3">
      <legend className="sr-only">{t('pref.opens_on')}</legend>
      <p aria-hidden className="text-sm font-medium text-slate-200">
        {t('pref.opens_on')}
      </p>
      <p className="mb-1.5 mt-0.5 text-xs text-slate-400">{t('pref.opens_on_note')}</p>
      <div className="grid grid-cols-2 gap-x-4">
        {tabs.map((tab) => (
          <label key={tab} className="flex min-h-[36px] items-center gap-3 py-1 text-sm text-slate-200">
            <input
              type="radio"
              name={name}
              className={radioCls}
              checked={current === tab}
              onChange={() => setDefaultView(tab === 'contacts' ? null : tab)}
            />
            {tabName(t, tab)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * The website's Add new, when the device has its own contacts to offer: one
 * button and a small menu of the ways to add somebody (New contact, From my
 * contacts), the same grouping as the phone app's + sheet (James, 2026-10-23).
 * Escape or a click anywhere else closes it.
 */
export function AddMenu({ onNew, onPick }: { onNew: () => void; onPick: () => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  const item =
    'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
  const choose = (f: () => void) => () => {
    setOpen(false)
    f()
  }
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className={`${btnPrimary} inline-flex items-center gap-1.5`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t('add_new')}
        <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" aria-hidden>
          <path d="M4 6h8l-4 4.5Z" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1.5 w-56 rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-xl">
          <button type="button" role="menuitem" className={item} onClick={choose(onNew)}>
            {t('add_new_contact')}
          </button>
          <button type="button" role="menuitem" className={item} onClick={choose(onPick)}>
            {t('from_my_contacts')}
          </button>
        </div>
      )}
    </div>
  )
}
