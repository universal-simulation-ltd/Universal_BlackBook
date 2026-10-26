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

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { withShownOrder } from '../lib/tabs'
import { requestSearch, useDefaultView } from '@unisim/sdk'
import { availableTabs, LockLink, SyncStatus, useContactPicker, type Tab } from '../appParts'
import { CloudPanel } from '../components/CloudPanel'
import { ContactForm } from '../components/ContactForm'
import { ContactList } from '../components/ContactList'
import { ContactView } from '../components/ContactView'
import { DeleteAllData } from '../components/DeleteAllData'
import { ImportExport } from '../components/ImportExport'
import { ImportPanel } from '../components/ImportPanel'
import { ListsView } from '../components/ListsView'
import { LockPanel } from '../components/Lock'
import { SearchDrawer } from '../components/SearchDrawer'
import { TagManager } from '../components/TagManager'
import { TodoView } from '../components/TodoView'
import { NotesView } from '../components/NotesView'
import { useBookStore } from '../stores/bookStore'
import { useTodoStore } from '../stores/todoStore'
import { useNoteStore } from '../stores/noteStore'
import { useSearchReset } from '../stores/searchStore'
import { usePanelStore } from '../stores/panelStore'
import { useSettingsStore } from '../stores/settingsStore'
import { AboutContent } from './AboutScreen'
import { ContactActions } from './ContactActions'
import { useT, type Key } from '../i18n'
import { IconBin, IconMap, IconBook, IconContactsBook, IconFile, IconLists, IconNote, IconPerson, IconPlus, IconTodo, IconTune, Ribbon } from './icons'
import { PhoneKitContext, type PhoneKit } from './kit'
import { ArticleBody, KnowledgeList, useArticles } from './KnowledgeScreen'
import { Page, Sheet, SheetRow } from './layers'
import { useNativeNav } from './nav'
import { SignInContent } from './SignInScreen'
import { useBookTitle } from './Account'
import { PhoneLinkified } from './PhoneLinks'
import { TuneContent } from './TuneScreen'
import { DueReminders, useAllReminders } from '../components/Reminders'
import { UndoBar, useUndo } from '../components/SwipeActions'
import { NoteLayers } from '../components/NoteView'
import { TemplateManager } from '../components/TemplateManager'
import { onNotificationTap, scheduleReminders } from './notify'
import './native.css'

// The map (and MapLibre with it) loads only when it is opened.
const MapView = lazy(() => import('../components/MapView').then((m) => ({ default: m.MapView })))

type PhoneTab = Tab | 'tune'

/**
 * The tabs a switch in Tune turns off, and that switch: what the bin can take.
 * Every tab now, Contacts too (James, 2026-10-26); the last one shown stays.
 */
const TAB_SWITCH: Record<Tab, 'emailLists' | 'todos' | 'notes' | 'contacts'> = {
  contacts: 'contacts',
  lists: 'emailLists',
  todos: 'todos',
  notes: 'notes',
}

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
  const newContact = useBookStore((s) => s.newContact)
  const notice = useBookStore((s) => s.notice)
  const setNotice = useBookStore((s) => s.setNotice)
  const panel = usePanelStore((s) => s.panel)
  const openPanel = usePanelStore((s) => s.open)
  const closePanel = usePanelStore((s) => s.close)
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todosOn = useSettingsStore((s) => s.todos)
  const notesOn = useSettingsStore((s) => s.notes)
  const contactsOn = useSettingsStore((s) => s.contacts)
  const tuning = useSettingsStore((s) => s.tune !== null)
  const closeTune = useSettingsStore((s) => s.closeTune)
  const reopenParked = useBookStore((s) => s.reopenParked)
  const nav = useNativeNav()

  const tabDefault = useDefaultView<Tab>('tab', 'contacts', { views: ['contacts', 'lists', 'todos', 'notes'] })
  const [tab, setTab] = useState<PhoneTab>(tabDefault.defaultView)
  const tabOrder = useSettingsStore((s) => s.tabOrder)
  const setSettings = useSettingsStore((s) => s.set)
  const shownTabs = availableTabs(emailLists, todosOn, notesOn, tabOrder, contactsOn)
  // Hold a tab and drag it (James, 2026-10-25). While one is held the bar
  // shows the order it would drop into; Tune stays last. A tab that Tune can
  // switch off can also be dropped on the bin that rises above the bar, which
  // switches it off (James, 2026-10-26, a suite rule), with Undo.
  const [dragTabs, setDragTabs] = useState<{ tab: Tab; order: Tab[]; bin?: boolean } | null>(null)
  const binRef = useRef<HTMLDivElement>(null)
  const binned = useUndo<Tab>(async (x) => setSettings({ [TAB_SWITCH[x]]: true }))
  const tabs: PhoneTab[] = [...(dragTabs?.order ?? shownTabs), 'tune']
  const navRef = useRef<HTMLElement>(null)
  const tabHold = useRef<{ tab: Tab; x0: number; y0: number; active: boolean; timer: ReturnType<typeof setTimeout> } | null>(null)
  const dragRef = useRef(dragTabs)
  dragRef.current = dragTabs
  const shownRef = useRef(shownTabs)
  shownRef.current = shownTabs
  const orderRef = useRef(tabOrder)
  orderRef.current = tabOrder
  const binnedRef = useRef(binned.deleted)
  binnedRef.current = binned.deleted
  const holdTab = (tab: Tab) => (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || shownRef.current.length < 2) return
    const t0 = e.touches[0]
    const h = {
      tab,
      x0: t0.clientX,
      y0: t0.clientY,
      active: false,
      timer: setTimeout(() => {
        h.active = true
        navigator.vibrate?.(12)
        setDragTabs({ tab, order: shownRef.current })
      }, 500),
    }
    if (tabHold.current) clearTimeout(tabHold.current.timer)
    tabHold.current = h
  }
  useEffect(() => {
    const move = (e: TouchEvent) => {
      const h = tabHold.current
      if (!h) return
      const t0 = e.touches[0]
      if (!h.active) {
        if (t0 && Math.hypot(t0.clientX - h.x0, t0.clientY - h.y0) > 10) {
          clearTimeout(h.timer)
          tabHold.current = null
        }
        return
      }
      e.preventDefault()
      const d = dragRef.current
      if (!d) return
      // Over the bin (with a finger's width to spare): the order holds still.
      const b = binRef.current?.getBoundingClientRect()
      const pad = 18
      const overBin = Boolean(
        b && t0.clientX >= b.left - pad && t0.clientX <= b.right + pad && t0.clientY >= b.top - pad && t0.clientY <= b.bottom + pad,
      )
      if (overBin !== Boolean(d.bin)) {
        navigator.vibrate?.(8)
        setDragTabs({ ...d, bin: overBin })
      }
      if (overBin) return
      // Which slot the finger is over, among the tabs that can move.
      const slots = [...(navRef.current?.querySelectorAll<HTMLElement>('[data-tab]') ?? [])].filter((el) => el.dataset.tab !== 'tune')
      const at = slots.findIndex((el) => {
        const r = el.getBoundingClientRect()
        return t0.clientX >= r.left && t0.clientX <= r.right
      })
      if (at < 0) return
      const next = d.order.filter((x) => x !== d.tab)
      next.splice(Math.min(at, next.length), 0, d.tab)
      if (next.join() !== d.order.join()) setDragTabs({ tab: d.tab, order: next })
    }
    const end = () => {
      const h = tabHold.current
      tabHold.current = null
      if (!h) return
      clearTimeout(h.timer)
      if (!h.active) return
      // The lift is not a tap: the click it ends with must not switch tabs
      // or count toward a double tap.
      // Only on the bar itself: a quick tap on the Undo the bin leaves must count.
      const swallow = (ev: Event) => {
        if (!navRef.current?.contains(ev.target as Node)) return
        ev.preventDefault()
        ev.stopPropagation()
      }
      document.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 600)
      const d = dragRef.current
      setDragTabs(null)
      if (d?.bin && shownRef.current.length > 1) {
        setSettings({ [TAB_SWITCH[d.tab]]: false })
        binnedRef.current(d.tab)
        return
      }
      if (d && d.order.join() !== shownRef.current.join()) setSettings({ tabOrder: withShownOrder(orderRef.current, d.order) })
    }
    document.addEventListener('touchmove', move, { passive: false, capture: true })
    document.addEventListener('touchend', end, true)
    document.addEventListener('touchcancel', end, true)
    return () => {
      document.removeEventListener('touchmove', move, { capture: true })
      document.removeEventListener('touchend', end, true)
      document.removeEventListener('touchcancel', end, true)
    }
  }, [setSettings])
  // A tab whose switch has since gone off opens on the first one shown
  // (Contacts, unless that is hidden too).
  const current: PhoneTab = tabs.includes(tab) ? tab : (shownTabs[0] ?? 'tune')
  const { canPick, picking, pick } = useContactPicker()
  const newList = useBookStore((s) => s.newList)
  const editTodo = useTodoStore((s) => s.edit)
  const newNote = useNoteStore((s) => s.newNote)
  // The top bar's + (James, 2026-10-23): on Contacts it opens a sheet of the
  // ways to add somebody, so "From my contacts" is no longer a button of its
  // own on the page; on Lists and To-do there is one way, so + just does it.
  const [adding, setAdding] = useState(false)
  const articles = useArticles()

  // Reminders → the phone's own notifications (native/notify.ts): rebuilt a
  // moment after any change, and again whenever the app comes to the front.
  const reminders = useAllReminders()
  const notifyDetails = useSettingsStore((s) => s.notifyDetails)
  useEffect(() => {
    const run = () => void scheduleReminders(reminders, notifyDetails, t)
    const timer = window.setTimeout(run, 800)
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reminders, notifyDetails, t])
  const viewContact = useBookStore((s) => s.view)
  const openNote = useNoteStore((s) => s.view)
  useEffect(
    () => onNotificationTap((kind, id) => (kind === 'contact' ? viewContact(id) : openNote(id))),
    [viewContact, openNote],
  )

  // Every tab opens at its top, and with its search empty (searchStore).
  const lastTab = useRef(current)
  useEffect(() => {
    if (lastTab.current !== current) {
      window.scrollTo(0, 0)
      useSearchReset.getState().clearAll()
    }
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
  const bookTitle = useBookTitle()

  return (
    <PhoneKitContext.Provider value={kit}>
      <div className="bb-app">
        <header className="bb-top">
          <div className="bb-topbar">
            <span className="bb-brand">
              <Ribbon />
              {/* Signed in, the book is named after its owner — the only sign
                  of the account up here, in place of a profile button. */}
              <span className="truncate">{bookTitle}</span>
            </span>
            {(current === 'contacts' || current === 'notes') && (
              <button type="button" className="bb-iconbtn" aria-label={t('map.title')} onClick={() => openPanel('map')}>
                <IconMap />
              </button>
            )}
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
              <button type="button" className="bb-iconbtn" aria-label={t('add_note')} onClick={() => newNote()}>
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

          <DueReminders />

          {/* Hidden with a class, not unmounted, while another tab shows, so
              the search, the Filters and the list are as they were left. */}
          <div className={current === 'contacts' ? undefined : 'hidden'}>
            <h1 className="bb-h1">{t('tab_contacts')}</h1>
            <div className="mb-4 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <LockLink onClick={() => openPanel('lock')} />
              <SyncStatus onOpen={openCloud} />
            </div>
            {picking && <p className="-mt-2 mb-4 text-xs text-slate-500">{t('picking_hint')}</p>}
            {/* ⚠️ The list must stay the drawer's NEXT sibling: it measures it to
                hold the list still on screen as it folds itself away. */}
            <SearchDrawer onContacts={current === 'contacts'} />
            {loaded && <ContactList onImport={() => openPanel('import')} />}
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

        {dragTabs && (
          <div ref={binRef} className={`bb-tabbin${dragTabs.bin ? ' hot' : ''}`} aria-hidden>
            <IconBin />
            <span>{t(dragTabs.bin ? 'tab_bin_drop' : 'tab_bin_hint')}</span>
          </div>
        )}
        {binned.item && (
          <UndoBar
            title=""
            text={t('tab_binned', { tab: t(TAB_LABEL[binned.item]) })}
            onUndo={() => void binned.undo()}
          />
        )}

        <nav ref={navRef} className="bb-tabs" aria-label={t('tabs_label')}>
          {tabs.map((target) => {
            const Icon = TAB_ICON[target]
            const props = target === 'tune' ? {} : tabDefault.buttonProps(target as Tab, t(TAB_LABEL[target]))
            return (
              <button
                key={target}
                type="button"
                data-tab={target}
                className={`bb-tab${dragTabs?.tab === target ? ' lifted' : ''}`}
                aria-current={current === target ? 'page' : undefined}
                {...props}
                onTouchStart={target === 'tune' ? undefined : holdTab(target as Tab)}
                onContextMenu={(e) => e.preventDefault()}
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
        <NoteLayers />
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
                void newContact()
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
                openPanel('import')
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
