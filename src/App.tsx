import { useCallback, useEffect, useRef, useState } from 'react'
import { UniversalAppsNavBar, UpdateNotice, useUniversal, useUser } from '@unisim/sdk'
import UsageTracker from './UsageTracker'
import ProductLogo from './components/Header/ProductLogo'
import AppMenu from './components/Header/AppMenu'
import { TagManager } from './components/TagManager'
import { CloudPanel } from './components/CloudPanel'
import { ContactForm } from './components/ContactForm'
import { ContactList } from './components/ContactList'
import { FilterBar } from './components/FilterBar'
import { ImportExport } from './components/ImportExport'
import { btnGhost, btnPrimary } from './components/ui'
import { contactsAvailability, ContactsPermissionError, pickOneContact } from './lib/deviceContacts'
import { forgetVault } from './lib/store'
import { useBookStore } from './stores/bookStore'
import { useSyncStore } from './stores/syncStore'

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

/** How long to wait after the last edit before pushing to the vault. */
const AUTOSAVE_DELAY = 2500

type Panel = 'tags' | 'io' | 'cloud' | null

export default function App() {
  const init = useBookStore((s) => s.init)
  const loaded = useBookStore((s) => s.loaded)
  const editing = useBookStore((s) => s.editing)
  const edit = useBookStore((s) => s.edit)
  const notice = useBookStore((s) => s.notice)
  const setNotice = useBookStore((s) => s.setNotice)
  const [panel, setPanel] = useState<Panel>(null)
  const { canPick, picking, pick } = useContactPicker()
  const dock = useKeyboardAwareDock()

  useEffect(() => {
    void init()
  }, [init])

  // Stable, not an inline arrow: `openPanel` is a dependency of an effect in
  // there, and a fresh closure per render re-runs it per render — the same
  // shape of bug as the `user` object below, one step short of a loop.
  const openCloud = useCallback(() => setPanel('cloud'), [])
  useCloudSync(openCloud)

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
        actions={
          <AppMenu
            onTags={() => setPanel('tags')}
            onImportExport={() => setPanel('io')}
            onCloud={() => setPanel('cloud')}
          />
        }
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
      />
      {/* ⚠️ The footer's job, on a phone (owner's call, 2026-08-30). A full
          footer bar below a bottom-DOCKED search bar is two stacked strips of
          chrome at the bottom of the screen, and the one that matters is the
          dock — so below 40rem the footer is gone entirely and its two links
          become one small line up here instead. The pair is exclusive:
          `sm:hidden` here, `hidden sm:block` on the footer. */}
      <div className={`${CONTAINER} pt-2 sm:hidden`}>
        <p className="text-[11px] leading-none text-slate-600">
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
          <span aria-hidden className="px-1.5 text-slate-700">·</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-slate-400 hover:underline"
          >
            Source
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
            <button type="button" onClick={() => setNotice(null)} className="font-semibold" aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">Your BlackBook</h1>
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
              Add someone
            </button>
          </div>
        </div>
        {picking && (
          <p className="mb-4 text-xs text-slate-500">
            Waiting for the contact you pick. Closed it without choosing anybody? Tap again.
          </p>
        )}

        {/* ⚠️ On a phone this is FIXED to the bottom of the screen (.filterdock
            in index.css) and therefore OUT OF THE FLOW, so the spacer below the
            list is not decoration — without it the last contact card sits under
            the dock where it cannot be read or tapped. The two belong together;
            do not move one without the other. */}
        <div ref={dock} className="filterdock mb-4">
          <FilterBar />
        </div>

        {loaded && <ContactList />}

        {/* The height of the docked filter bar, reserved at the end of the
            page. The dock is `position: fixed` below 40rem, so nothing else in
            the document knows it is there — without this the last contact card
            sits underneath it and cannot be read or tapped. ⚠️ It lives HERE
            and not in the footer, because the footer does not exist at the
            width the dock does. Zero height above 40rem, where there is no
            dock. */}
        <div className="filterdock-spacer" aria-hidden />
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

      {editing && <ContactForm key={editing} id={editing} />}
      {panel === 'tags' && <TagManager onClose={() => setPanel(null)} />}
      {panel === 'io' && <ImportExport onClose={() => setPanel(null)} />}
      {panel === 'cloud' && <CloudPanel onClose={() => setPanel(null)} />}
    </div>
  )
}

/**
 * Keeps the docked filter bar above the on-screen keyboard.
 *
 * ⚠️ **Without this, focusing the search box can hide it.** `position: fixed;
 * bottom: 0` pins to the LAYOUT viewport, and iOS does not shrink the layout
 * viewport when the keyboard opens — it shrinks the VISUAL one. So the dock
 * stays where it was, behind the keyboard, and the field you are typing into
 * is the thing that disappears. Safari usually papers over this for a page it
 * scrolls itself; a Capacitor WKWebView with no `@capacitor/keyboard` plugin
 * does not, and this app is a phone app first.
 *
 * The overlap is the gap between the two viewports' bottom edges, and the dock
 * is translated up by exactly that much. `visualViewport` is the only API that
 * reports it; there is no CSS for it.
 *
 * Guarded on the media query, because ABOVE 40rem the element is static and in
 * the flow — translating it there would shove a perfectly placed bar upwards
 * the moment somebody pinch-zoomed, which also changes the visual viewport.
 *
 * ⚠️ Written from the spec and NOT yet seen with a real keyboard open — the
 * simulator screenshots that verified the dock's resting position could not
 * type into it. First thing to check on a device.
 */
function useKeyboardAwareDock() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const vv = window.visualViewport
    const el = ref.current
    if (!vv || !el) return
    // Must match `.filterdock`'s own breakpoint in index.css. Two places, one
    // number — the alternative is reading the computed `position`, which is
    // 'static' mid-transition often enough to flap.
    const docked = window.matchMedia('(max-width: 39.999rem)')

    const apply = () => {
      const overlap = docked.matches
        ? Math.max(0, document.documentElement.clientHeight - (vv.height + vv.offsetTop))
        : 0
      el.style.transform = overlap > 0 ? `translateY(-${overlap}px)` : ''
    }

    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    docked.addEventListener('change', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      docked.removeEventListener('change', apply)
    }
  }, [])

  return ref
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
 * Keeps the encrypted vault in step with the local book.
 *
 * Three jobs, all of them effects because they hang off session state the SDK
 * owns rather than off anything the user did:
 *
 *  1. **Follow the session.** Signing in checks for a vault; signing out drops
 *     the in-memory key AND the remembered one, so a shared machine does not
 *     leave a key behind for whoever signs in next.
 *  2. **Debounced push.** Every edit restarts a timer; the vault is written
 *     once the typing stops. Pushing per keystroke would re-encrypt and
 *     re-upload the whole book on every letter of a note.
 *  3. **Never push what we have not loaded.** The guard on `loaded` is the
 *     important one — without it the empty initial state counts as a change
 *     and uploads an empty book over a full one on the first render.
 */
function useCloudSync(openPanel: () => void) {
  const { supabase } = useUniversal()
  const { user } = useUser()
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
  const loaded = useBookStore((s) => s.loaded)
  const hydrate = useSyncStore((s) => s.hydrate)
  const push = useSyncStore((s) => s.push)
  const state = useSyncStore((s) => s.state)
  const status = useSyncStore((s) => s.status)

  const wasSignedIn = useRef(false)

  useEffect(() => {
    void hydrate(supabase, userId)
    if (userId) {
      wasSignedIn.current = true
    } else if (wasSignedIn.current) {
      wasSignedIn.current = false
      void forgetVault()
    }
  }, [supabase, userId, hydrate])

  useEffect(() => {
    if (!loaded || state !== 'on') return
    const t = setTimeout(() => void push(supabase), AUTOSAVE_DELAY)
    return () => clearTimeout(t)
  }, [contacts, tags, loaded, state, push, supabase])

  // A conflict is the one sync outcome the user MUST answer — it is the only
  // one where the app cannot proceed without destroying somebody's edits — so
  // it opens the panel rather than waiting to be noticed in a menu.
  useEffect(() => {
    if (status === 'conflict') openPanel()
  }, [status, openPanel])
}
