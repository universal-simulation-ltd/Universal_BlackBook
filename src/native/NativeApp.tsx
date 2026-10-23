// NativeApp.tsx — the phone app's own screens (shell.ts says when). Lazy-loaded
// by App.tsx, so the website never downloads it.
//
// A bar at the top with the book's name, a tab bar at the foot — Contacts, then
// Lists and To-do when Tune this app turns them on, then Tune — and everything
// else as PAGES that come in from the side (a contact, the form, the panels,
// About, the knowledge base) or BOTTOM SHEETS (choices and confirmations). No
// navbar, suite switcher, Actions menu, changelog or "More from UNI·SIM": the
// app stands alone (store-listings §7–§8), with its credit at the foot of Tune
// and About. Sign-in stays — BlackBook is for the same book on several
// devices — but only at the feature that needs it, Tune ▸ Online backup.
//
// ⚠️ THE PAGE ITSELF SCROLLS, not an inner box: the SDK's pull-down search
// (SearchDrawer → PullDrawer) measures against the window and finds this
// `<header>` as the bar it sits under. So the bars are `position: fixed` and
// `.bb-main` pads under them, as in Universal Jukebox.
//
// Double-tap a tab to make it the one the app opens on (the suite rule, the
// same stored default as the website's tabs); Tune ▸ Reset to defaults
// clears it.

import { useEffect, useMemo, useRef, useState } from 'react'
import { requestSearch, useDefaultView } from '@unisim/sdk'
import { availableTabs, LockLink, SyncStatus, useContactPicker, type Tab } from '../appParts'
import { CloudPanel } from '../components/CloudPanel'
import { ContactForm } from '../components/ContactForm'
import { ContactList } from '../components/ContactList'
import { ContactView } from '../components/ContactView'
import { DeleteAllData } from '../components/DeleteAllData'
import { ImportExport } from '../components/ImportExport'
import { ListsView } from '../components/ListsView'
import { LockPanel } from '../components/Lock'
import { SearchDrawer } from '../components/SearchDrawer'
import { TagManager } from '../components/TagManager'
import { TodoView } from '../components/TodoView'
import { NotesView } from '../components/NotesView'
import { useBookStore } from '../stores/bookStore'
import { useTodoStore } from '../stores/todoStore'
import { useNoteStore } from '../stores/noteStore'
import { usePanelStore } from '../stores/panelStore'
import { useSettingsStore } from '../stores/settingsStore'
import { AboutContent } from './AboutScreen'
import { ContactActions } from './ContactActions'
import { useT, type Key } from '../i18n'
import { IconBook, IconContactsBook, IconFile, IconLists, IconNote, IconPerson, IconPlus, IconTodo, IconTune, Ribbon } from './icons'
import { PhoneKitContext, type PhoneKit } from './kit'
import { ArticleBody, KnowledgeList, useArticles } from './KnowledgeScreen'
import { Page, Sheet, SheetRow } from './layers'
import { useNativeNav } from './nav'
import { SignInContent } from './SignInScreen'
import { PhoneLinkified } from './PhoneLinks'
import { TuneContent } from './TuneScreen'
import './native.css'

type PhoneTab = Tab | 'tune'

const TAB_LABEL: Record<PhoneTab, Key> = { contacts: 'tab_contacts', lists: 'tab_lists', todos: 'tab_todos', notes: 'tab_notes', tune: 'tab_tune' }
const TAB_ICON: Record<PhoneTab, () => JSX.Element> = { contacts: IconBook, lists: IconLists, todos: IconTodo, notes: IconNote, tune: IconTune }

function SignInPage({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <Page title={t('signin_title')} onBack={onClose} backLabel={t('online_backup')}>
      <SignInContent onDone={onClose} />
    </Page>
  )
}

export default function NativeApp({ openCloud }: { openCloud: () => void }) {
  const t = useT()
  const kit = useMemo<PhoneKit>(
    () => ({ Page, Sheet, SignIn: SignInPage, ContactActions, Linkified: PhoneLinkified, t: (key, vars) => t(key as Key, vars) }),
    [t],
  )

  const loaded = useBookStore((s) => s.loaded)
  const viewing = useBookStore((s) => s.viewing)
  const editing = useBookStore((s) => s.editing)
  const edit = useBookStore((s) => s.edit)
  const notice = useBookStore((s) => s.notice)
  const setNotice = useBookStore((s) => s.setNotice)
  const panel = usePanelStore((s) => s.panel)
  const openPanel = usePanelStore((s) => s.open)
  const closePanel = usePanelStore((s) => s.close)
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todosOn = useSettingsStore((s) => s.todos)
  const notesOn = useSettingsStore((s) => s.notes)
  const tuning = useSettingsStore((s) => s.tune !== null)
  const closeTune = useSettingsStore((s) => s.closeTune)
  const reopenParked = useBookStore((s) => s.reopenParked)
  const nav = useNativeNav()

  const tabDefault = useDefaultView<Tab>('tab', 'contacts', { views: ['contacts', 'lists', 'todos', 'notes'] })
  const [tab, setTab] = useState<PhoneTab>(tabDefault.defaultView)
  const tabs: PhoneTab[] = [...availableTabs(emailLists, todosOn, notesOn), 'tune']
  // A tab whose switch has since gone off opens on Contacts (the website's rule).
  const current: PhoneTab = tabs.includes(tab) ? tab : 'contacts'
  const { canPick, picking, pick } = useContactPicker()
  const newList = useBookStore((s) => s.newList)
  const editTodo = useTodoStore((s) => s.edit)
  const editNote = useNoteStore((s) => s.edit)
  // The top bar's + (James, 2026-10-23): on Contacts it opens a sheet of the
  // ways to add somebody, so "From my contacts" is no longer a button of its
  // own on the page; on Lists and To-do there is one way, so + just does it.
  const [adding, setAdding] = useState(false)
  const articles = useArticles()

  // Every tab opens at its top.
  const lastTab = useRef(current)
  useEffect(() => {
    if (lastTab.current !== current) window.scrollTo(0, 0)
    lastTab.current = current
  }, [current])

  const tapTab = (target: PhoneTab) => {
    const double = target !== 'tune' && tabDefault.tap(target as Tab)
    if (target === current) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Contacts tapped while on it opens the search, keyboard up (Jukebox's
      // tab tap); the second tap of a double tap shuts it again. Sent inside
      // the tap, which iOS needs to raise the keyboard.
      if (target !== 'tune') requestSearch(!double)
    }
    setTab(target)
  }

  const article = nav.article ? articles?.find((a) => a.id === nav.article) : undefined

  return (
    <PhoneKitContext.Provider value={kit}>
      <div className="bb-app">
        <header className="bb-top">
          <div className="bb-topbar">
            <span className="bb-brand">
              <Ribbon />
              <span className="truncate">BlackBook</span>
            </span>
            {current === 'contacts' && (
              <button type="button" className="bb-iconbtn" aria-label={t('add_contact')} aria-haspopup="dialog" onClick={() => setAdding(true)}>
                <IconPlus />
              </button>
            )}
            {current === 'lists' && (
              <button type="button" className="bb-iconbtn" aria-label={t('add_list')} onClick={() => newList()}>
                <IconPlus />
              </button>
            )}
            {current === 'todos' && (
              <button type="button" className="bb-iconbtn" aria-label={t('add_todo')} onClick={() => editTodo('new')}>
                <IconPlus />
              </button>
            )}
            {current === 'notes' && (
              <button type="button" className="bb-iconbtn" aria-label={t('add_note')} onClick={() => editNote('new')}>
                <IconPlus />
              </button>
            )}
          </div>
        </header>

        <main className="bb-main">
          {notice && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-orange-900/60 bg-orange-950/30 px-4 py-3 text-sm text-orange-200">
              <p>{notice}</p>
              <button type="button" onClick={() => setNotice(null)} className="shrink-0 font-semibold" aria-label={t('dismiss')}>
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}

          {/* Hidden with a class, not unmounted, while another tab shows, so
              the search, the Filters and the list are as they were left. */}
          <div className={current === 'contacts' ? undefined : 'hidden'}>
            <h1 className="bb-h1">{t('contacts_title')}</h1>
            <div className="mb-4 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <LockLink onClick={() => openPanel('lock')} />
              <SyncStatus onOpen={openCloud} />
            </div>
            {picking && <p className="-mt-2 mb-4 text-xs text-slate-500">{t('picking_hint')}</p>}
            {/* ⚠️ The list must stay the drawer's NEXT sibling: it measures it to
                hold the list still on screen as it folds itself away. */}
            <SearchDrawer onContacts={current === 'contacts'} />
            {loaded && <ContactList onImport={() => openPanel('io')} />}
          </div>

          {current === 'lists' && loaded && <ListsView />}
          {current === 'todos' && <TodoView />}
          {current === 'notes' && <NotesView />}
          {current === 'tune' && (
            <>
              <h1 className="bb-h1">{t('tab_tune_title')}</h1>
              <TuneContent />
            </>
          )}
        </main>

        <nav className="bb-tabs" aria-label={t('tabs_label')}>
          {tabs.map((target) => {
            const Icon = TAB_ICON[target]
            const props = target === 'tune' ? {} : tabDefault.buttonProps(target as Tab, t(TAB_LABEL[target]))
            return (
              <button
                key={target}
                type="button"
                className="bb-tab"
                aria-current={current === target ? 'page' : undefined}
                {...props}
                onClick={() => tapTab(target)}
              >
                <Icon />
                <span>{t(TAB_LABEL[target])}</span>
                {target !== 'tune' && tabs.length > 2 && tabDefault.defaultView === target && <i className="bb-default" aria-hidden />}
              </button>
            )
          })}
        </nav>

        {/* The pages, in the order they stack. The contact's page is under its
            form, so saving or backing out of the form lands on the person. */}
        {viewing && <ContactView key={`view-${viewing}`} id={viewing} />}
        {editing && <ContactForm key={`form-${editing}`} id={editing} />}
        {panel === 'tags' && <TagManager onClose={closePanel} />}
        {panel === 'io' && <ImportExport onClose={closePanel} />}
        {panel === 'cloud' && <CloudPanel onClose={closePanel} />}
        {panel === 'lock' && <LockPanel onClose={closePanel} />}
        {panel === 'wipe' && <DeleteAllData onClose={closePanel} />}
        {tuning && (
          // "Customise fields" from the contact form: Tune this app over it,
          // and back to the form (with the new fields) on the way out.
          <Page
            title={t('tab_tune_title')}
            backLabel={t('back_to_form')}
            onBack={() => {
              closeTune()
              reopenParked()
            }}
          >
            <TuneContent />
          </Page>
        )}
        {nav.about && (
          <Page title={t('about_title')} backLabel={t('tab_tune')} onBack={() => nav.setAbout(false)}>
            <AboutContent />
          </Page>
        )}
        {nav.kb && (
          <Page title={t('kb_title')} backLabel={t('tab_tune')} onBack={() => nav.setKb(false)}>
            <KnowledgeList articles={articles} onOpen={(id) => nav.setArticle(id)} />
          </Page>
        )}
        {nav.kb && article && (
          <Page title={article.title} backLabel={t('kb_short')} onBack={() => nav.setArticle(null)}>
            <ArticleBody article={article} />
          </Page>
        )}
        {adding && (
          <Sheet title={t('add_contact')} onClose={() => setAdding(false)}>
            <SheetRow
              icon={<IconPerson />}
              onClick={() => {
                setAdding(false)
                edit('new')
              }}
            >
              {t('add_new_contact')}
            </SheetRow>
            {canPick && (
              <SheetRow
                icon={<IconContactsBook />}
                onClick={() => {
                  setAdding(false)
                  pick()
                }}
              >
                {t('from_my_contacts')}
              </SheetRow>
            )}
            <SheetRow
              icon={<IconFile />}
              onClick={() => {
                setAdding(false)
                openPanel('io')
              }}
            >
              {t('add_from_file')}
            </SheetRow>
          </Sheet>
        )}
        <Toast />
      </div>
    </PhoneKitContext.Provider>
  )
}

function Toast() {
  const toast = useNativeNav((s) => s.toast)
  const say = useNativeNav((s) => s.say)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => say(null), 2800)
    return () => window.clearTimeout(id)
  }, [toast, say])
  if (!toast) return null
  return (
    <div role="status" className="bb-toast" onClick={() => say(null)}>
      {toast}
    </div>
  )
}
