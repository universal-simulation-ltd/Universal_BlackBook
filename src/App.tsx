import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  PreferencesDialog,
  requestSearch,
  SignInDialog,
  UniversalAppsNavBar,
  UpdateNotice,
  useDefaultView,
  useUniversal,
  useUser,
} from '@unisim/sdk'
// <UsageTracker /> sends one "session.opened" row for a signed-in visitor, and
// nothing else may ever be tracked here: no names, email addresses, category
// names or counts. The vault goes to the server encrypted precisely so we cannot
// see this data, and a usage event that leaked a contact count would undo that.
import { UsageTracker } from '@unisim/sdk'
import ProductLogo from './components/Header/ProductLogo'
import AppMenu from './components/Header/AppMenu'
import { TagManager } from './components/TagManager'
import { CloudPanel } from './components/CloudPanel'
import { ContactForm } from './components/ContactForm'
import { ContactList } from './components/ContactList'
import { ContactView } from './components/ContactView'
import { ImportExport } from './components/ImportExport'
import { ImportPanel } from './components/ImportPanel'
import { DeleteAllData } from './components/DeleteAllData'
import { ListsView } from './components/ListsView'
import { SearchDrawer } from './components/SearchDrawer'
import { TodoView } from './components/TodoView'
import { NotesView } from './components/NotesView'
import { LockPanel, LockScreen } from './components/Lock'
import { DueReminders } from './components/Reminders'
import { NoteLayers } from './components/NoteView'
import { TemplateManager } from './components/TemplateManager'
import { btnGhost, btnPrimary } from './components/ui'
import { allOnline } from './lib/merge'
import { moveTab, withShownOrder } from './lib/tabs'
import { forgetVault, loadSyncMeta } from './lib/store'
import { useBookStore } from './stores/bookStore'
import { useLockStore } from './stores/lockStore'
import { useSettingsStore } from './stores/settingsStore'
import { useSyncStore } from './stores/syncStore'
import { useTodoStore } from './stores/todoStore'
import { useNoteStore } from './stores/noteStore'
import { useSearchReset } from './stores/searchStore'
import { usePanelStore } from './stores/panelStore'
import { AddMenu, APP_ABOUT, availableTabs, LockLink, PREFERENCE_ROWS, REPO_URL, SyncStatus, tabName, TABS, useContactPicker, type Tab } from './appParts'
import { currentT, useT } from './i18n'
import { personalBookTitle, useNamedTitle } from './components/bookTitle'
import { useEffectiveTheme, useThemeStore } from './stores/themeStore'
import { phoneScreens } from './native/shell'
import { followThemeWithStatusBar } from './native/systemBars'

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

/**
 * The phone app's own screens (src/native/, lazy-loaded — the website never
 * downloads them). Decided once: see native/shell.ts. The class is the phone's
 * own look (index.css), on <html> so the lock screen and the overscroll wear
 * it too; index.html's pre-paint sets it in the shell before this runs.
 */
const PHONE = phoneScreens()
if (PHONE) {
  document.documentElement.classList.add('bb-phone')
  // From the start, so the lock screen's clock is legible in Dark too.
  followThemeWithStatusBar()
}
const NativeApp = lazy(() => import('./native/NativeApp'))
// The map (and MapLibre with it) loads only when it is opened.
const MapView = lazy(() => import('./components/MapView').then((m) => ({ default: m.MapView })))

/** How long to wait after the last edit before pushing to the vault. */
const AUTOSAVE_DELAY = 2500

export default function App() {
  // First, so everything rendered below — and the lib/ helpers it calls —
  // answers in the language on screen (see i18n/index.ts).
  const tr = useT()
  const init = useBookStore((s) => s.init)
  const loaded = useBookStore((s) => s.loaded)
  const editing = useBookStore((s) => s.editing)
  const viewing = useBookStore((s) => s.viewing)
  const newContact = useBookStore((s) => s.newContact)
  const notice = useBookStore((s) => s.notice)
  const setNotice = useBookStore((s) => s.setNotice)
  useEffect(() => {
    if (takeSignedOutNote()) {
      setNotice(currentT()('app.signed_out_wiped'))
    }
  }, [setNotice])
  const panel = usePanelStore((s) => s.panel)
  const setPanel = usePanelStore((s) => s.open)
  const closePanel = usePanelStore((s) => s.close)
  const resetSettings = useSettingsStore((s) => s.reset)
  // Contacts | Lists | To-do, on the landing screen. Lists only exists with App
  // preferences ▸ Email lists on, To-do with ▸ To-do; turning either off drops
  // back to Contacts.
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todosOn = useSettingsStore((s) => s.todos)
  const notesOn = useSettingsStore((s) => s.notes)
  // James, 2026-09-30: double-tap a tab to make it the one the app opens on
  // (the SDK's useDefaultView, lifted from Jukebox's library tabs). Stored per
  // device. A default of Lists or To-do whose switch has since gone off opens
  // on Contacts, by the same `current` rule as turning the switch off.
  const tabDefault = useDefaultView<Tab>('tab', 'contacts', { views: TABS })
  const [tab, setTab] = useState<Tab>(tabDefault.defaultView)
  const onLists = emailLists && tab === 'lists'
  const onTodos = todosOn && tab === 'todos'
  const onNotes = notesOn && tab === 'notes'
  const offContacts = onLists || onTodos || onNotes
  const tabOrder = useSettingsStore((s) => s.tabOrder)
  const shownTabs = availableTabs(emailLists, todosOn, notesOn, tabOrder)
  // Drag a tab along the bar to move it (James, 2026-10-30), as a hold and a
  // drag does on the phone. While one is held the bar shows where it would
  // land; letting go writes it back into the whole order, so hidden tabs keep
  // their slots (withShownOrder). Tune ▸ Tab order is the way without a mouse.
  const setSettings = useSettingsStore((s) => s.set)
  const [dragTabs, setDragTabs] = useState<{ tab: Tab; order: Tab[] } | null>(null)
  const tabs = dragTabs?.order ?? shownTabs
  const dropTabs = () => {
    if (dragTabs && dragTabs.order.join() !== shownTabs.join()) setSettings({ tabOrder: withShownOrder(tabOrder, dragTabs.order) })
    setDragTabs(null)
  }
  const current = offContacts ? tab : 'contacts'
  const initTodos = useTodoStore((s) => s.init)
  const initNotes = useNoteStore((s) => s.init)
  const { canPick, picking, pick } = useContactPicker()
  const lockStatus = useLockStore((s) => s.status)
  const initLock = useLockStore((s) => s.init)
  const theme = useEffectiveTheme()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    void initLock()
  }, [initLock])

  // ⚠️ Whether or not the To-do tab is on. The vault carries the list either
  // way, and a push made before it was read would say nothing about to-dos
  // rather than the truth (see VaultPayload.todos).
  useEffect(() => {
    void initTodos()
    // The same for the Notes tab's notes, on or off.
    void initNotes()
  }, [initTodos, initNotes])


  // Stable, not an inline arrow: `openPanel` is a dependency of an effect in
  // there, and a fresh closure per render re-runs it per render — the same
  // shape of bug as the `user` object below, one step short of a loop.
  const openCloud = useCallback(() => setPanel('cloud'), [setPanel])
  useCloudSync(openCloud)

  // ⚠️ Every hook above runs whatever the lock says — they have to, and none of
  // them puts anything on screen. What the gate below decides is only what is
  // RENDERED: until the lock has been read off the disk ('unknown') that is
  // nothing at all, because a frame of somebody's contact list before the
  // keypad appears is exactly what this feature exists to prevent.
  if (lockStatus === 'unknown') return <div className="min-h-screen bg-slate-950" />
  if (lockStatus === 'locked') return <LockScreen />

  if (PHONE) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <NativeApp openCloud={openCloud} />
      </Suspense>
    )
  }

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
        theme={theme}
        // Light / Dark / Match my device in Tune this app (2026-10-22: light
        // first; BlackBook was dark-only until then). index.css says how one
        // set of classes paints both.
        themeStore={useThemeStore}
        product="blackbook"
        productLogo={<ProductLogo />}
        productHomeHref={import.meta.env.BASE_URL}
        about={APP_ABOUT}
        actions={
          <AppMenu
            theme={theme}
            onTags={() => setPanel('tags')}
            onImport={() => setPanel('import')}
            onImportExport={() => setPanel('io')}
            onBackup={openCloud}
            onDeleteAll={() => setPanel('wipe')}
          />
        }
        // ⚙ menu ▸ App preferences (SDK 0.143). The SDK adds Language and
        // Colour scheme (from `themeStore`) above BlackBook's own rows.
        appPreferences={PREFERENCE_ROWS}
        // Reset to defaults: the SDK clears the default tab and the language;
        // this puts BlackBook's own switches back to off. The book, its tags
        // and the saved sort-and-filter "Default" (a choice made in the list,
        // kept in IndexedDB) are left alone.
        onResetDefaults={resetSettings}
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
        // Signed in, the bar says "Bradley's Book" where the product's name
        // was, and there is no profile button: the account is Tune this app ▸
        // Your Universal ID, with the App name choice the phone shares
        // (components/bookTitle.ts; James, 2026-10-30: "Website too").
        accountInTune
        personalTitle={(name) => personalBookTitle(tr, name)}
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
            {tr('app.with')}{' '}
            <span aria-hidden="true" className="text-orange-500">&hearts;</span>
            <span className="sr-only">{tr('app.love')}</span> {tr('app.from')}{' '}
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
            aria-label={tr('app.github')}
            title={tr('app.github_title')}
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
      <UsageTracker />

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
              aria-label={tr('dismiss')}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <DueReminders />

        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label={tr('app.tabs')}
            // Both, or the browser never takes the bar as a drop target: an
            // uncancelled dragenter sends the drag on to the page behind it.
            onDragEnter={(e) => {
              if (dragTabs) e.preventDefault()
            }}
            onDragOver={(e) => {
              if (dragTabs) e.preventDefault()
            }}
            onDrop={(e) => {
              e.preventDefault()
              dropTabs()
            }}
            className={`mb-5 grid gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 ${
              tabs.length === 4 ? 'grid-cols-4 sm:max-w-md' : tabs.length === 3 ? 'grid-cols-3 sm:max-w-sm' : 'grid-cols-2 sm:max-w-xs'
            }`}
          >
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={t === current}
                {...tabDefault.buttonProps(t, tabName(tr, t))}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  // Firefox starts no drag without some data.
                  e.dataTransfer.setData('text/plain', tabName(tr, t))
                  setDragTabs({ tab: t, order: shownTabs })
                }}
                onDragEnter={() => {
                  if (dragTabs && dragTabs.tab !== t) setDragTabs({ ...dragTabs, order: moveTab(dragTabs.order, dragTabs.tab, dragTabs.order.indexOf(t)) })
                }}
                // Dropped outside the bar, or Escape: nothing moves.
                onDragEnd={() => setDragTabs(null)}
                onClick={() => {
                  const double = tabDefault.tap(t)
                  // Contacts tapped while already on it: open the search, keyboard
                  // up (Jukebox's tab tap). Sent here, inside the tap, which iOS
                  // needs to raise the keyboard. The second tap of a double tap
                  // is making the tab the default, so it shuts it again. Only a
                  // phone listens (SearchDrawer); elsewhere the box is on show.
                  if (t === current) requestSearch(!double)
                  // Another tab: its search starts empty (searchStore).
                  else useSearchReset.getState().clearAll()
                  setTab(t)
                }}
                // The default tab is orange: filled while you are on it, an
                // orange ring while you are not (Jukebox's look, SDK README ▸
                // Default views).
                className={`cursor-grab rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  dragTabs?.tab === t ? 'opacity-50 ' : ''
                }${
                  t === current
                    ? 'bg-orange-500/15 text-orange-300 data-[default-view=true]:bg-gradient-to-br data-[default-view=true]:from-[#FE8C01] data-[default-view=true]:to-[#E05504] data-[default-view=true]:text-white'
                    : 'text-slate-400 hover:text-slate-200 data-[default-view=true]:text-orange-400 data-[default-view=true]:ring-1 data-[default-view=true]:ring-inset data-[default-view=true]:ring-orange-400/70'
                }`}
              >
                {tabName(tr, t)}
              </button>
            ))}
          </div>
        )}

        {onLists && loaded && <ListsView />}
        {onTodos && <TodoView />}
        {onNotes && <NotesView />}

        {/* Hidden with a class, not unmounted, while Lists or To-do is showing,
            so the search, the Filters and the list are as they were left. */}
        <div className={offContacts ? 'hidden' : undefined}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">{tr('app.title')}</h1>
                <LockLink onClick={() => setPanel('lock')} />
              <SyncStatus onOpen={openCloud} />
              </div>
              <p className="text-sm text-slate-500">
                {tr('app.tagline')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* With the device's own contacts to offer, the two ways to add
                  somebody are one Add new menu (James, 2026-10-23, the phone
                  app's + sheet); without them Add new is still one click. */}
              <button type="button" className={btnGhost} onClick={() => setPanel('map')}>
                {tr('map.title')}
              </button>
              {canPick ? (
                <AddMenu onNew={() => void newContact()} onPick={pick} />
              ) : (
                <button type="button" className={btnPrimary} onClick={() => void newContact()}>
                  {tr('add_new')}
                </button>
              )}
            </div>
          </div>
          {picking && (
            <p className="mb-4 text-xs text-slate-500">
              {tr('picking_hint')}
            </p>
          )}

          {/* On a phone, folded away until pulled down from the top (and pulled
              again for the keyboard); everywhere else, the bar as it always was.
              ⚠️ The list must stay its NEXT sibling: the drawer measures it to
              hold the list still on screen as it folds itself away. */}
          <SearchDrawer onContacts={!offContacts} />

          {loaded && <ContactList onImport={() => setPanel('import')} />}
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
            {tr('app.with')}{' '}
            <span aria-hidden="true" className="text-orange-400">&hearts;</span>
            <span className="sr-only">{tr('app.love')}</span>{' '}
            {tr('app.from')}{' '}
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
            aria-label={tr('app.github')}
            title={tr('app.github_title')}
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
      <NoteLayers />
      <TuneThisApp />
      {panel === 'tags' && <TagManager onClose={closePanel} />}
      {panel === 'templates' && <TemplateManager onClose={closePanel} />}
      {panel === 'map' && (
        <Suspense fallback={null}>
          <MapView onClose={closePanel} />
        </Suspense>
      )}
      {panel === 'import' && <ImportPanel onClose={closePanel} />}
      {panel === 'io' && <ImportExport part="export" onClose={closePanel} />}
      {panel === 'cloud' && <CloudPanel onClose={closePanel} />}
      {panel === 'lock' && <LockPanel onClose={closePanel} />}
      {panel === 'wipe' && <DeleteAllData onClose={closePanel} />}
    </div>
  )
}

/**
 * The account the backup panel last opened itself for, on this device.
 *
 * localStorage and not IndexedDB: it is a courtesy, not data. If it cannot be
 * read (a private window, blocked storage) the worst case is being shown the
 * panel again after signing in.
 */
const PROMPTED_KEY = 'blackbook.backupPrompted'

function readPrompted(): string | null {
  try {
    return localStorage.getItem(PROMPTED_KEY)
  } catch {
    return null
  }
}

function writePrompted(userId: string | null) {
  try {
    if (userId) localStorage.setItem(PROMPTED_KEY, userId)
    else localStorage.removeItem(PROMPTED_KEY)
  } catch {
    // See readPrompted.
  }
}

/**
 * Keeps the encrypted vault in step with the local book.
 *
 * Three jobs, all of them effects because they hang off session state the SDK
 * owns rather than off anything the user did:
 *
 *  1. **Follow the session.** Signing in checks for a vault and opens the
 *     backup panel if it needs a passphrase; signing out drops the in-memory
 *     key AND the remembered one, so a shared machine does not leave a key
 *     behind for whoever signs in next.
 *  2. **Debounced push.** Every edit restarts a timer; the vault is written
 *     once the typing stops. Pushing per keystroke would re-encrypt and
 *     re-upload the whole book on every letter of a note.
 *  3. **Never push what we have not loaded.** The guard on `loaded` is the
 *     important one — without it the empty initial state counts as a change
 *     and uploads an empty book over a full one on the first render.
 */
/** Survives the reload that finishes a wipe, so the notice can say what happened. */
const SIGNED_OUT_NOTE = 'blackbook:signed-out-wipe'

/**
 * Signing out takes the book off this device (James, 2026-10-11: "when
 * signing out, remove all data stored locally"), the same wipe as Delete all
 * data — but ONLY when every entry is already in the online copy, so signing
 * back in (and the passphrase) brings all of it back.
 *
 * ⚠️ **Otherwise the book stays, and says why.** Online backup is opt-in, so a
 * signed-in book with backup off — or with edits the last save did not reach
 * — has no other copy, and the sign-out happens in the SDK's menu, after which
 * nothing can be saved. Wiping then would be deleting somebody's only copy for
 * pressing Sign out.
 *
 * `seen`: this page watched the sign-out happen. Unseen (found at load), a
 * book that is not all online is left exactly as before: `hydrate` folds it
 * back in on the next sign-in, which depends on the bookkeeping staying.
 */
async function leaveDevice(seen: boolean, unsaved: boolean): Promise<void> {
  const meta = await loadSyncMeta()
  if (!seen && !meta) return
  await Promise.all([useBookStore.getState().init(), useTodoStore.getState().init(), useNoteStore.getState().init()])
  const book = { contacts: useBookStore.getState().contacts, todos: useTodoStore.getState().todos, pages: useNoteStore.getState().notes }
  if (!unsaved && allOnline(meta, book)) {
    try {
      sessionStorage.setItem(SIGNED_OUT_NOTE, '1')
    } catch {
      // No session storage: the wipe still happens, just without the notice.
    }
    // Wipes and reloads — see `resetDevice` for why the reload is part of it.
    await useLockStore.getState().resetDevice()
    return
  }
  if (!seen) return
  // As before this change: a shared machine must not keep the key.
  await forgetVault()
  if (book.contacts.length > 0 || book.todos.length > 0 || book.pages.length > 0) {
    useBookStore
      .getState()
      .setNotice(
        currentT()('app.signed_out_kept'),
      )
  }
}

/** After a sign-out wipe's reload: say where the book went, once. */
function takeSignedOutNote(): boolean {
  try {
    if (sessionStorage.getItem(SIGNED_OUT_NOTE) === null) return false
    sessionStorage.removeItem(SIGNED_OUT_NOTE)
    return true
  } catch {
    return false
  }
}

function useCloudSync(openPanel: () => void) {
  const { supabase } = useUniversal()
  const { user, loading } = useUser()
  // ⚠️ THE ID, NEVER THE `user` OBJECT. The SDK's `useUser` builds a fresh
  // `{ id, email }` literal on every render, so `user` in a dependency array is
  // a NEW value every render and the effect below re-runs every time. That
  // effect calls `hydrate`, which `set`s a status, which re-renders, which
  // re-runs the effect: measured at ~320 hydrations a second, each one a
  // `blackbook_vaults` round trip, an IndexedDB read and an AES-GCM decrypt.
  // It made the whole browser sluggish, and only ever while signed IN —
  // signed out `user` is a stable `null`, which is why it hid for so long.
  const userId = user?.id ?? null
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const todos = useTodoStore((s) => s.todos)
  const pages = useNoteStore((s) => s.notes)
  const templates = useNoteStore((s) => s.templates)
  // The tabs' layout goes up with the book (2026-10-30, lib/tabs.ts TabLayout).
  const tabsAt = useSettingsStore((s) => s.tabsAt)
  const loaded = useBookStore((s) => s.loaded)
  const hydrate = useSyncStore((s) => s.hydrate)
  const push = useSyncStore((s) => s.push)
  const state = useSyncStore((s) => s.state)
  const status = useSyncStore((s) => s.status)

  const wasSignedIn = useRef(false)
  // Never reset: tells the load-time check below that a sign-out has already
  // been handled in this page's life.
  const everSignedIn = useRef(false)

  useEffect(() => {
    let cancelled = false
    // Read BEFORE `hydrate`, which resets the status on the way out.
    const sync = useSyncStore.getState()
    const unsaved = sync.dirty || sync.pending !== null || sync.status === 'working' || sync.status === 'error' || sync.status === 'conflict'
    void hydrate(supabase, userId).then(() => {
      // Signing in IS turning the backup on: open the panel so the passphrase
      // and the merge question come straight away. Once per account per
      // device, so somebody who closes it is not asked on every launch — and
      // keyed on the stored flag rather than on a null → user transition,
      // because a sign-in that went via the hub comes back as a fresh page
      // load with the session already there.
      if (cancelled || !userId) return
      // No merge question to open for any more: `hydrate` merges a device's
      // own entries in by itself (owner's call, 2026-10-08).
      const { state } = useSyncStore.getState()
      if ((state === 'locked' || state === 'off') && readPrompted() !== userId) {
        writePrompted(userId)
        openPanel()
      }
    })
    if (userId) {
      wasSignedIn.current = true
      everSignedIn.current = true
    } else if (wasSignedIn.current) {
      wasSignedIn.current = false
      writePrompted(null)
      void leaveDevice(true, unsaved)
    }
    return () => {
      cancelled = true
    }
  }, [supabase, userId, hydrate, openPanel])

  // A sign-out this page never saw — made in another suite app on the same
  // site, or a session that expired while the app was shut. The book was left
  // behind with its sync bookkeeping, which is how it is recognised here.
  // ⚠️ Only once the SDK has finished loading the session: before that `user`
  // is null for a signed-in person too, and this would wipe their device on
  // every launch.
  useEffect(() => {
    if (loading || userId || everSignedIn.current) return
    void leaveDevice(false, false)
  }, [loading, userId])

  // Only a CHANGE of book marks it unsynced — not this effect re-running
  // because sync turned on or the page loaded, which would show "Syncing…"
  // over a book that is already up there.
  const lastBook = useRef<{ contacts: unknown; tags: unknown; todos: unknown; pages: unknown; templates: unknown; tabsAt: number } | null>(null)
  useEffect(() => {
    if (!loaded || state !== 'on') {
      lastBook.current = null
      return
    }
    const changed =
      lastBook.current !== null &&
      (lastBook.current.contacts !== contacts ||
        lastBook.current.tags !== tags ||
        lastBook.current.todos !== todos ||
        lastBook.current.pages !== pages ||
        lastBook.current.templates !== templates ||
        lastBook.current.tabsAt !== tabsAt)
    lastBook.current = { contacts, tags, todos, pages, templates, tabsAt }
    if (changed) useSyncStore.getState().markDirty()
    const t = setTimeout(() => void push(supabase), AUTOSAVE_DELAY)
    return () => clearTimeout(t)
  }, [contacts, tags, todos, pages, templates, tabsAt, loaded, state, push, supabase])

  // A save that failed for want of a network is tried again, rather than
  // sitting there until somebody opens the panel and taps Save now (owner's
  // report, 2026-09-29: "TypeError: Load failed" on the iPhone, which is
  // WebKit's word for a fetch cut off, typically by the app going to the
  // background mid-save). Again after a growing wait, and at once when the
  // connection comes back or the app is brought to the front.
  const offline = useSyncStore((s) => s.offline)
  useEffect(() => {
    if (offline === 0 || state !== 'on') return
    const retry = () => void push(supabase)
    // 5 s, 10 s, 20 s, 40 s, then every minute. Each failure bumps `offline`
    // and re-runs this effect, which is what schedules the next one.
    const timer = setTimeout(retry, Math.min(5_000 * 2 ** (offline - 1), 60_000))
    const onVisible = () => {
      if (document.visibilityState === 'visible') retry()
    }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [offline, state, push, supabase])

  // A conflict is the one sync outcome the user MUST answer — it is the only
  // one where the app cannot proceed without destroying somebody's edits — so
  // it opens the panel rather than waiting to be noticed in a menu.
  useEffect(() => {
    if (status === 'conflict') openPanel()
  }, [status, openPanel])
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
  const theme = useEffectiveTheme()
  // The account area the navbar's copy has (`accountInTune`, `personalTitle`).
  const { user } = useUser()
  const named = useNamedTitle()
  const [signingIn, setSigningIn] = useState(false)
  return (
    <>
    <SignInDialog open={signingIn} onClose={() => setSigningIn(false)} />
    <PreferencesDialog
      kind="app"
      open={open}
      onClose={() => {
        closeTune()
        reopenParked()
      }}
      theme={theme}
      themeStore={useThemeStore}
      combined={!splitPreferences}
      about={APP_ABOUT}
      onResetDefaults={resetSettings}
      showAccount
      personalTitle={user ? named : undefined}
      onSignIn={() => setSigningIn(true)}
    >
      {PREFERENCE_ROWS}
    </PreferencesDialog>
    </>
  )
}

