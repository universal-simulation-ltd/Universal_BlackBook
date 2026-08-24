import { useEffect, useRef, useState } from 'react'
import { UniversalAppsNavBar, UpdateNotice, useUniversal, useUser } from '@unisim/sdk'
import UsageTracker from './UsageTracker'
import ProductLogo from './components/Header/ProductLogo'
import AppMenu from './components/Header/AppMenu'
import { CategoryManager } from './components/CategoryManager'
import { CloudPanel } from './components/CloudPanel'
import { ContactForm } from './components/ContactForm'
import { ContactList } from './components/ContactList'
import { FilterBar } from './components/FilterBar'
import { ImportExport } from './components/ImportExport'
import { btnPrimary } from './components/ui'
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

type Panel = 'categories' | 'io' | 'cloud' | null

export default function App() {
  const init = useBookStore((s) => s.init)
  const loaded = useBookStore((s) => s.loaded)
  const editing = useBookStore((s) => s.editing)
  const edit = useBookStore((s) => s.edit)
  const notice = useBookStore((s) => s.notice)
  const setNotice = useBookStore((s) => s.setNotice)
  const [panel, setPanel] = useState<Panel>(null)

  useEffect(() => {
    void init()
  }, [init])

  useCloudSync(() => setPanel('cloud'))

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <UniversalAppsNavBar
        contentClassName={CONTAINER}
        theme="dark"
        product="blackbook"
        productLogo={<ProductLogo />}
        productHomeHref={import.meta.env.BASE_URL}
        actions={
          <AppMenu
            onCategories={() => setPanel('categories')}
            onImportExport={() => setPanel('io')}
            onCloud={() => setPanel('cloud')}
          />
        }
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
      />
      {/* Renders nothing until this tab is genuinely running superseded code.
          See the SDK's useAppUpdate: an autoUpdate PWA hands the new worker
          control but leaves the running page on its old JavaScript. */}
      <div className={`${CONTAINER} pt-4`}>
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
              The people worth staying in touch with — filed your way, at the pace you choose.
            </p>
          </div>
          <button type="button" className={btnPrimary} onClick={() => edit('new')}>
            Add someone
          </button>
        </div>

        <div className="mb-4">
          <FilterBar />
        </div>

        {loaded && <ContactList />}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-4">
        <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500`}>
          <p>
            Your book lives in this browser.{' '}
            <strong className="font-semibold text-slate-400">
              Saving online is optional and end-to-end encrypted.
            </strong>
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Open source (MIT)
          </a>
        </div>
      </footer>

      {editing && <ContactForm key={editing} id={editing} />}
      {panel === 'categories' && <CategoryManager onClose={() => setPanel(null)} />}
      {panel === 'io' && <ImportExport onClose={() => setPanel(null)} />}
      {panel === 'cloud' && <CloudPanel onClose={() => setPanel(null)} />}
    </div>
  )
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
  const contacts = useBookStore((s) => s.contacts)
  const categories = useBookStore((s) => s.categories)
  const loaded = useBookStore((s) => s.loaded)
  const hydrate = useSyncStore((s) => s.hydrate)
  const push = useSyncStore((s) => s.push)
  const state = useSyncStore((s) => s.state)
  const status = useSyncStore((s) => s.status)

  const wasSignedIn = useRef(false)

  useEffect(() => {
    void hydrate(supabase, user?.id ?? null)
    if (user) {
      wasSignedIn.current = true
    } else if (wasSignedIn.current) {
      wasSignedIn.current = false
      void forgetVault()
    }
  }, [supabase, user, hydrate])

  useEffect(() => {
    if (!loaded || state !== 'on') return
    const t = setTimeout(() => void push(supabase), AUTOSAVE_DELAY)
    return () => clearTimeout(t)
  }, [contacts, categories, loaded, state, push, supabase])

  // A conflict is the one sync outcome the user MUST answer — it is the only
  // one where the app cannot proceed without destroying somebody's edits — so
  // it opens the panel rather than waiting to be noticed in a menu.
  useEffect(() => {
    if (status === 'conflict') openPanel()
  }, [status, openPanel])
}
