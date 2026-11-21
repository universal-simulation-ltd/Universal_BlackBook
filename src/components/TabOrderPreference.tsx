import { TabEyeIcon, useTabOrderList } from '@unisim/sdk'
import { TAB_SWITCH, type Tab } from '../lib/tabs'
import { useSettingsStore } from '../stores/settingsStore'
import { useT, type Key } from '../i18n'
import { phoneScreens } from '../native/shell'

const NAME: Record<Tab, Key> = { contacts: 'tab_contacts', places: 'tab_places', lists: 'tab_lists', todos: 'tab_todos', notes: 'tab_notes' }

const moveCls =
  'h-9 w-9 shrink-0 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'

/**
 * Tune this app ▸ Tab order (James, 2026-10-25): the same order the phone's
 * tab bar takes from a hold and a drag, for the website and for anybody who
 * cannot drag. Each row has a grip to drag (mouse or finger) and Move up /
 * Move down buttons. Tune itself is always last on the phone. Reset to
 * defaults puts the order and the tabs back.
 *
 * The eye (James, 2026-11-20: "just have an eye icon on the tab order section
 * … If it's hidden, then it should just be added to the bottom of that
 * list") shows and hides each tab in place of the tick boxes there were, one
 * per tab. A hidden tab drops to the Hidden group at the bottom, in the order
 * they were hidden, and keeps everything in it; shown again it comes back at
 * the bottom of the shown tabs. The eye writes the tab's own switch
 * (TAB_SWITCH), the one the phone's bin writes too, so the two always agree,
 * and the switches and order sync as before (tunedAt). The website always
 * shows People, so People has no eye there; on the phone the last tab shown
 * keeps a disabled eye. The logic is the SDK phone kit's useTabOrderList
 * (eye since 0.236.0); the look is this app's.
 */
export function TabOrderPreference() {
  const t = useT()
  const order = useSettingsStore((s) => s.tabOrder)
  const set = useSettingsStore((s) => s.set)
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todos = useSettingsStore((s) => s.todos)
  const notes = useSettingsStore((s) => s.notes)
  const contacts = useSettingsStore((s) => s.contacts)
  const places = useSettingsStore((s) => s.places)
  const phone = phoneScreens()
  const on: Record<Tab, boolean> = { contacts: !phone || contacts, places, lists: emailLists, todos, notes }
  const list = useTabOrderList<Tab>(order, (next) => set({ tabOrder: next }), {
    hidden: (tab) => !on[tab],
    canHide: (tab) => phone || tab !== 'contacts',
    onHiddenChange: (tab, hide, next) => set({ [TAB_SWITCH[tab]]: !hide, tabOrder: next }),
  })

  const eye = (tab: Tab) =>
    list.hasEye(tab) ? (
      <button
        {...list.eyeProps(tab)}
        className={moveCls}
        aria-label={t(list.isHidden(tab) ? 'pref.tab_show' : 'pref.tab_hide', { name: t(NAME[tab]) })}
      >
        <span className="mx-auto block h-[18px] w-[18px] [&>svg]:h-full [&>svg]:w-full">
          <TabEyeIcon off={list.isHidden(tab)} />
        </span>
      </button>
    ) : (
      <span aria-hidden className="w-9 shrink-0" />
    )

  return (
    <fieldset className="mt-3 border-t border-slate-800 pt-3">
      <legend className="sr-only">{t('pref.tab_order')}</legend>
      <p aria-hidden className="text-sm font-medium text-slate-200">
        {t('pref.tab_order')}
      </p>
      <p className="mb-2 mt-0.5 text-xs text-slate-400">{t('pref.tab_order_note')}</p>
      <ol ref={list.listRef} className="space-y-1">
        {list.shown.map((tab, i) => (
          <li
            key={tab}
            data-tab={tab}
            className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2 ${
              list.held === tab ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-900'
            }`}
          >
            <span
              {...list.gripProps(tab)}
              aria-hidden
              className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-500 hover:text-slate-200"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <circle cx="5.5" cy="4" r="1.2" /><circle cx="10.5" cy="4" r="1.2" />
                <circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" />
                <circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="12" r="1.2" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{t(NAME[tab])}</span>
            <button
              type="button"
              className={moveCls}
              aria-label={t('pref.tab_up', { name: t(NAME[tab]) })}
              disabled={i === 0}
              onClick={() => list.move(tab, i - 1)}
            >
              <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className={moveCls}
              aria-label={t('pref.tab_down', { name: t(NAME[tab]) })}
              disabled={i === list.shown.length - 1}
              onClick={() => list.move(tab, i + 1)}
            >
              <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {eye(tab)}
          </li>
        ))}
      </ol>
      {list.hiddenTabs.length > 0 && (
        <>
          <p aria-hidden className="mb-1 mt-3 text-xs font-semibold text-slate-400">
            {t('pref.tab_hidden_group')}
          </p>
          <ol aria-label={t('pref.tab_hidden_group')} className="space-y-1">
            {list.hiddenTabs.map((tab) => (
              <li
                key={tab}
                data-tab={tab}
                data-hidden=""
                className="flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-slate-800 pl-11 pr-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-500">{t(NAME[tab])}</span>
                {eye(tab)}
              </li>
            ))}
          </ol>
        </>
      )}
    </fieldset>
  )
}
