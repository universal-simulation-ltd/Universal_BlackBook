import { useCallback, useEffect, useState } from 'react'
import {
  DefaultViewSelect,
  PreferencesDialog,
  requestSearch,
  UniversalAppsNavBar,
  UpdateNotice,
  useDefaultView,
  useUniversal,
  type AboutAppConfig,
} from '@unisim/sdk'
// No <UsageTracker />: there is no sign-in (main.tsx, `noAccounts`), so there
// is no signed-in visitor to count, and nothing about a book is ever sent.
import ProductLogo from './components/Header/ProductLogo'
import AppMenu from './components/Header/AppMenu'
// Generated — `npm run credits` after any dependency change. Never edit it by
// hand: it is read off the installed tree, so a hand-kept list drifts from the
// lockfile the first time anyone upgrades anything, and a credits list naming a
// package we removed is worse than no list at all.
import credits from './generated/credits.json'
import { TagManager } from './components/TagManager'
import { EmailListsPreference } from './components/EmailListsPreference'
import { FormFieldsPreference } from './components/FormFieldsPreference'
import { ContactForm } from './components/ContactForm'
import { ContactList } from './components/ContactList'
import { ContactView } from './components/ContactView'
import { ImportExport } from './components/ImportExport'
import { DeleteAllData } from './components/DeleteAllData'
import { ListsView } from './components/ListsView'
import { SearchDrawer } from './components/SearchDrawer'
import { TodoView } from './components/TodoView'
import { LockPanel, LockScreen } from './components/Lock'
import { btnGhost, btnPrimary } from './components/ui'
import { contactsAvailability, ContactsPermissionError, pickOneContact } from './lib/deviceContacts'
import { useBookStore } from './stores/bookStore'
import { useLockStore } from './stores/lockStore'
import { useSettingsStore } from './stores/settingsStore'
import { useTodoStore } from './stores/todoStore'

// The single page container. The navbar (via the SDK's `contentClassName`), the
// page body and the footer all share it, so the suite switcher lines up with
// the left edge of the page content — and the profile cluster with its right
// edge — at every breakpoint. Without it the navbar falls back to the SDK's
// standalone default: a fixed 1280px row with the profile cluster pinned 12px
// off the VIEWPORT edge, overhanging the content by ~128px a side at 1440.
//
// `gutter` (index.css) is px-4 / sm:px-6 / lg:px-8 widened by the safe-area
// insets, so on a notched phone held sideways the navbar keeps clear of the
// notch along with everything it lines up with.
const CONTAINER = 'gutter mx-auto w-full max-w-7xl'

const REPO_URL = 'https://github.com/universal-simulation-ltd/Universal_BlackBook'

type Panel = 'tags' | 'io' | 'lock' | 'wipe' | null

/** The landing screen's tabs. Lists and To-do each need their App preference on. */
const TABS = ['contacts', 'lists', 'todos'] as const
type Tab = (typeof TABS)[number]
const TAB_NAMES: Record<Tab, string> = { contacts: 'Contacts', lists: 'Lists', todos: 'To-do' }

// "About this app" — handed to <UniversalAppsNavBar about>, which draws it at
// the foot of "Tune this app" (SDK 0.161.0+) and opens its own AboutAppDialog.
// It used to be the last row of the Advanced menu (Header/AppMenu.tsx).
/** BlackBook's own rows in Tune this app — in the ⚙ menu's copy and in ours (see `TuneThisApp`). */
const PREFERENCE_ROWS = (
  <>
    <EmailListsPreference />
    <OpensOnPreference />
    <FormFieldsPreference />
  </>
)

const APP_ABOUT: AboutAppConfig = {
  repo:    'https://github.com/universal-simulation-ltd/Universal_BlackBook',
  subject: 'Your contacts',
  plural:  true,
  headline: 'Other address books keep your contacts on their servers.',
  version: __APP_VERSION__,
  credits,
  noticesHref: 'https://github.com/universal-simulation-ltd/Universal_BlackBook/blob/main/THIRD-PARTY-NOTICES.md',
}

export default function App() {
  const init = useBookStore((s) => s.init)
  const loaded = useBookStore((s) => s.loaded)
  const editing = useBookStore((s) => s.editing)
  const viewing = useBookStore((s) => s.viewing)
  const edit = useBookStore((s) => s.edit)
  const notice = useBookStore((s) => s.notice)
  const setNotice = useBookStore((s) => s.setNotice)
  const [panel, setPanel] = useState<Panel>(null)
  const resetSettings = useSettingsStore((s) => s.reset)
  // Contacts | Lists | To-do, on the landing screen. Lists only exists with App
  // preferences ▸ Email lists on, To-do with ▸ To-do; turning either off drops
  // back to Contacts.
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todosOn = useSettingsStore((s) => s.todos)
  // James, 2026-09-30: double-tap a tab to make it the one the app opens on
  // (the SDK's useDefaultView, lifted from Jukebox's library tabs). Stored per
  // device. A default of Lists or To-do whose switch has since gone off opens
  // on Contacts, by the same `current` rule as turning the switch off.
  const tabDefault = useDefaultView<Tab>('tab', 'contacts', { views: TABS })
  const [tab, setTab] = useState<Tab>(tabDefault.defaultView)
  const onLists = emailLists && tab === 'lists'
  const onTodos = todosOn && tab === 'todos'
  const offContacts = onLists || onTodos
  const tabs = availableTabs(emailLists, todosOn)
  const current = offContacts ? tab : 'contacts'
  const initTodos = useTodoStore((s) => s.init)
  const { canPick, picking, pick } = useContactPicker()
  const lockStatus = useLockStore((s) => s.status)
  const initLock = useLockStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    void initLock()
  }, [initLock])

  // ⚠️ Whether or not the To-do tab is on: a backup file carries the list
  // either way, and one saved before it was read would leave the to-dos out.
  useEffect(() => {
    void initTodos()
  }, [initTodos])

  // ⚠️ Every hook above runs whatever the lock says — they have to, and none of
  // them puts anything on screen. What the gate below decides is only what is
  // RENDERED: until the lock has been read off the disk ('unknown') that is
  // nothing at all, because a frame of somebody's contact list before the
  // keypad appears is exactly what this feature exists to prevent.
  if (lockStatus === 'unknown') return <div className="min-h-screen bg-slate-950" />
  if (lockStatus === 'locked') return <LockScreen />

  return (
    // ⚠️ pt-[env(safe-area-inset-top)] is for the native (Capacitor) build, not
    // the web one. Capacitor runs the app in a FULL-SCREEN WKWebView, and
    // index.html asks for `viewport-fit=cover`, so without this the navbar
    // renders UNDERNEATH the status bar and Dynamic Island, which puts the
    // product name on the clock and the menu out of reach. In a browser the
    // inset is 0, so this is a no-op on web. Converter, PDF, QR and Images all
    // carry the same line; `.gutter` (index.css) already does the same job for
    // the left/right insets in landscape, and the footer below does the bottom.
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200 pt-[env(safe-area-inset-top)]">
      <UniversalAppsNavBar
        contentClassName={CONTAINER}
        theme="dark"
        product="blackbook"
        productLogo={<ProductLogo />}
        productHomeHref={import.meta.env.BASE_URL}
        about={APP_ABOUT}
        actions={
          <AppMenu
            onTags={() => setPanel('tags')}
            onImportExport={() => setPanel('io')}
            onDeleteAll={() => setPanel('wipe')}
          />
        }
        // ⚙ menu ▸ App preferences (SDK 0.143). The SDK adds Language and
        // Colour scheme; BlackBook is dark-only, which the SDK reads off
        // `theme` and shows as "always dark".
        appPreferences={PREFERENCE_ROWS}
        // Reset to defaults: the SDK clears the default tab and the language;
        // this puts BlackBook's own switches back to off. The book, its tags
        // and the saved sort-and-filter "Default" (a choice made in the list,
        // kept in IndexedDB) are left alone.
        onResetDefaults={resetSettings}
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
      />
      {/* The footer's job, on a phone (owner's call, 2026-08-30): below 40rem
          the footer is gone entirely and its two links become one small line
          up here instead. (It was made for a search bar docked to the bottom
          of the screen, which is now pulled down from the top; the small line
          stayed.) The pair is exclusive: `sm:hidden` here, `hidden sm:block`
          on the footer. */}
      <div className={`${CONTAINER} pt-2 sm:hidden`}>
        <p className="flex items-center justify-center gap-1.5 text-[11px] leading-none text-slate-600">
          <span>
            With{' '}
            <span aria-hidden="true" className="text-orange-500">&hearts;</span>
            <span className="sr-only">love</span> from{' '}
            <a
              href="https://www.unisim.co.uk"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:text-orange-400 hover:underline"
            >
              UNISIM.co.uk
            </a>
          </span>
          <span aria-hidden className="text-slate-700">·</span>
          {/* The mark, not the word — it is the same link the desktop footer
              carries, and at 11px an icon reads faster than "Source" does.
              `aria-label` and `title` do the naming, so nothing is lost by the
              text going. */}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Universal BlackBook on GitHub"
            title="View source on GitHub"
            className="inline-flex hover:text-slate-400"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </p>
      </div>

      {/* Renders nothing until this tab is genuinely running superseded code.
          See the SDK's useAppUpdate: an autoUpdate PWA hands the new worker
          control but leaves the running page on its old JavaScript. */}
      <div className={`${CONTAINER} pt-4 empty:hidden`}>
        <UpdateNotice />
      </div>

      <main className={`${CONTAINER} flex-1 py-6 sm:py-8`}>
        {notice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-orange-900/60 bg-orange-950/30 px-4 py-3 text-sm text-orange-200">
            <p>{notice}</p>
            {/* ⚠️ An SVG, not `✕` — U+2715 has no glyph in iOS's system font
                and draws as a hollow ▯?▯ box on the phone. See the note on
                Modal's CloseGlyph, and the 📇 note further down. */}
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 font-semibold"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label="Contacts, lists or to-do"
            className={`mb-5 grid gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 ${
              tabs.length === 3 ? 'grid-cols-3 sm:max-w-sm' : 'grid-cols-2 sm:max-w-xs'
            }`}
          >
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={t === current}
                {...tabDefault.buttonProps(t, TAB_NAMES[t])}
                onClick={() => {
                  const double = tabDefault.tap(t)
                  // Contacts tapped while already on it: open the search, keyboard
                  // up (Jukebox's tab tap). Sent here, inside the tap, which iOS
                  // needs to raise the keyboard. The second tap of a double tap
                  // is making the tab the default, so it shuts it again. Only a
                  // phone listens (SearchDrawer); elsewhere the box is on show.
                  if (t === 'contacts' && t === current) requestSearch(!double)
                  setTab(t)
                }}
                // The default tab is orange: filled while you are on it, an
                // orange ring while you are not (Jukebox's look, SDK README ▸
                // Default views).
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  t === current
                    ? 'bg-orange-500/15 text-orange-300 data-[default-view=true]:bg-gradient-to-br data-[default-view=true]:from-[#FE8C01] data-[default-view=true]:to-[#E05504] data-[default-view=true]:text-white'
                    : 'text-slate-400 hover:text-slate-200 data-[default-view=true]:text-orange-400 data-[default-view=true]:ring-1 data-[default-view=true]:ring-inset data-[default-view=true]:ring-orange-400/70'
                }`}
              >
                {TAB_NAMES[t]}
              </button>
            ))}
          </div>
        )}

        {onLists && loaded && <ListsView />}
        {onTodos && <TodoView />}

        {/* Hidden with a class, not unmounted, while Lists or To-do is showing,
            so the search, the Filters and the list are as they were left. */}
        <div className={offContacts ? 'hidden' : undefined}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">Your BlackBook</h1>
                <LockLink onClick={() => setPanel('lock')} />
              </div>
              <p className="text-sm text-slate-500">
                The people worth staying in touch with — tagged your way, and never a birthday missed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canPick && (
                <button type="button" className={`${btnGhost} inline-flex items-center gap-1.5`} onClick={pick}>
                  {/* ⚠️ An SVG and not an emoji. 📇 (CARD INDEX) has no glyph in
                      iOS's emoji font and rendered as a hollow ? box on the
                      phone — visible in a simulator screenshot, invisible in
                      every browser, which is exactly the class of bug that ships.
                      The 🎂 on the birthdays switch is fine; not every codepoint
                      is. */}
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M4 2.5A1.5 1.5 0 0 0 2.5 4v12A1.5 1.5 0 0 0 4 17.5h12a1.5 1.5 0 0 0 1.5-1.5V4A1.5 1.5 0 0 0 16 2.5H4ZM4 4h12v12H4V4Z" />
                    <path d="M10 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 5c2.2 0 4 1.2 4 2.6v.9H6v-.9C6 12.2 7.8 11 10 11Z" />
                  </svg>
                  From my contacts
                </button>
              )}
              <button type="button" className={btnPrimary} onClick={() => edit('new')}>
                Add new
              </button>
            </div>
          </div>
          {picking && (
            <p className="mb-4 text-xs text-slate-500">
              Waiting for the contact you pick. Closed it without choosing anybody? Tap again.
            </p>
          )}

          {/* On a phone, folded away until pulled down from the top (and pulled
              again for the keyboard); everywhere else, the bar as it always was.
              ⚠️ The list must stay its NEXT sibling: the drawer measures it to
              hold the list still on screen as it folds itself away. */}
          <SearchDrawer onContacts={!offContacts} />

          {loaded && <ContactList onImport={() => setPanel('io')} />}
        </div>
      </main>

      {/* ⚠️ `hidden sm:block` — there is no footer on a phone at all; the line
          under the navbar above replaces it. The safe-area padding is kept
          because a landscape iPad and a tall phone-in-desktop-width both still
          reach this branch: on a device with a home indicator the last 34pt is
          the swipe-up gesture area, so the footer's own padding is ADDED to
          the inset rather than replaced by it. 0 in a browser. */}
      <footer className="hidden border-t border-slate-800 bg-slate-900 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:block">
        <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500`}>
          <p>
            With{' '}
            <span aria-hidden="true" className="text-orange-400">&hearts;</span>
            <span className="sr-only">love</span>{' '}
            from{' '}
            <a
              href="https://www.unisim.co.uk"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 underline-offset-2 hover:text-orange-400 hover:underline"
            >
              UNISIM.co.uk
            </a>
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Universal BlackBook on GitHub"
            title="View source on GitHub"
            className="inline-flex items-center gap-1.5 hover:text-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </footer>

      {/* ⚠️ The view is rendered BEFORE the form, and the two are open together
          on purpose. Tapping a card opens the full-screen view; its Edit button
          opens the form on top of it, because `showModal()` stacks in call
          order — so closing the form drops you back on the person you were
          reading rather than in the list. */}
      {/* ⚠️ The keys are PREFIXED, and that prefix is the whole of a bug that
          left the app wedged on a full-screen contact. Both of these are keyed
          on a contact id so that opening a different person remounts them —
          the form reads the stash and the prefill once at mount, and the view
          calls `showModal()` once — but the two ids are THE SAME id whenever
          the form was opened from the view's own Edit button, which is the
          normal way in. Two siblings with the key `c-sam` is a duplicate key,
          and React's own warning for it says the behaviour is unsupported:
          asked to unmount BOTH in one commit — which is exactly what deleting
          somebody from that form does, since `removeContact` clears `viewing`
          and `editing` together — it dropped one of the two deletions. The
          form went; the full-screen view stayed on screen, never re-rendered,
          never ran its unmount cleanup, and so never `close()`d its dialog —
          a card for a person no longer in the book, with a Close button that
          did nothing. The prefixes make the two keys distinct, so both fibers
          are deleted and both dialogs go.

          ⚠️ It only ever showed up in a PRODUCTION build. The duplicate-key
          warning is development-only, and this pair of dialogs had only ever
          been driven in the deployed app. */}
      {viewing && <ContactView key={`view-${viewing}`} id={viewing} />}
      {editing && <ContactForm key={`form-${editing}`} id={editing} />}
      <TuneThisApp />
      {panel === 'tags' && <TagManager onClose={() => setPanel(null)} />}
      {panel === 'io' && <ImportExport onClose={() => setPanel(null)} />}
      {panel === 'lock' && <LockPanel onClose={() => setPanel(null)} />}
      {panel === 'wipe' && <DeleteAllData onClose={() => setPanel(null)} />}
    </div>
  )
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
function LockLink({ onClick }: { onClick: () => void }) {
  const locked = useLockStore((s) => s.record !== null)
  return (
    <button
      type="button"
      onClick={onClick}
      title={locked ? 'Turn the PIN lock off' : 'Lock this app with a 4-digit PIN'}
      className="inline-flex items-center gap-1 rounded text-sm text-slate-400 underline-offset-4 hover:text-orange-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <span aria-hidden>{locked ? '\u{1F512}' : '\u{1F513}'}</span>
      <span>{locked ? 'Locked' : 'Lock with PIN'}</span>
      {locked && <span className="sr-only">— tap to turn the PIN lock off</span>}
    </button>
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
function useContactPicker() {
  const startWith = useBookStore((s) => s.startWith)
  const setNotice = useBookStore((s) => s.setNotice)
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
      if (picked) startWith({ ...picked })
    } catch (e) {
      setNotice(
        e instanceof ContactsPermissionError
          ? 'BlackBook cannot see your contacts. Allow it in Settings ▸ Privacy ▸ Contacts, or add them by hand.'
          : 'That contact could not be read. You can still add them by hand.',
      )
    } finally {
      setPicking(false)
    }
  }, [startWith, setNotice])

  return { canPick: where !== 'none', picking, pick: () => void pick() }
}

/**
 * Tune this app, opened from inside the app — the contact form's "Customise
 * fields" — rather than from the ⚙ menu. The SDK exports no way to open the
 * menu's own copy, so this draws the same `PreferencesDialog` with the same
 * props the menu passes it (`UserProfile`, SDK 0.165), `combined` included, so
 * the two copies cannot be told apart.
 *
 * Closing it puts back the form Customise set aside, with the new choices.
 */
function TuneThisApp() {
  const open = useSettingsStore((s) => s.tune !== null)
  const closeTune = useSettingsStore((s) => s.closeTune)
  const reopenParked = useBookStore((s) => s.reopenParked)
  const resetSettings = useSettingsStore((s) => s.reset)
  const { splitPreferences } = useUniversal()
  return (
    <PreferencesDialog
      kind="app"
      open={open}
      onClose={() => {
        closeTune()
        reopenParked()
      }}
      theme="dark"
      fixedColorScheme="dark"
      combined={!splitPreferences}
      about={APP_ABOUT}
      onResetDefaults={resetSettings}
    >
      {PREFERENCE_ROWS}
    </PreferencesDialog>
  )
}

/** The tabs the landing screen shows, given App preferences ▸ Email lists and ▸ To-do. */
function availableTabs(emailLists: boolean, todos: boolean): Tab[] {
  return TABS.filter((t) => t === 'contacts' || (t === 'lists' ? emailLists : todos))
}

/**
 * Tune this app ▸ "Opens on": the double-tapped default tab as a row, for
 * anybody who cannot double-tap. Only while there is more than one tab to open
 * on — with Email lists and To-do both off there is only Contacts.
 */
function OpensOnPreference() {
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todos = useSettingsStore((s) => s.todos)
  const tabs = availableTabs(emailLists, todos)
  if (tabs.length < 2) return null
  return (
    <DefaultViewSelect<Tab>
      id="tab"
      label="Opens on"
      fallback="contacts"
      views={tabs.map((t) => ({ value: t, label: TAB_NAMES[t] }))}
    />
  )
}
