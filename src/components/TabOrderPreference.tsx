import { useTabOrderList } from '@unisim/sdk'
import type { Tab } from '../lib/tabs'
import { useSettingsStore } from '../stores/settingsStore'
import { useT, type Key } from '../i18n'
import { phoneScreens } from '../native/shell'

const NAME: Record<Tab, Key> = { contacts: 'tab_contacts', places: 'tab_places', lists: 'tab_lists', todos: 'tab_todos', notes: 'tab_notes' }

/**
 * Tune this app ▸ Tab order (James, 2026-10-25): the same order the phone's
 * tab bar takes from a hold and a drag, for the website and for anybody who
 * cannot drag. Each row has a grip to drag (mouse or finger) and Move up /
 * Move down buttons. Hidden tabs are listed too, so a tab turned back on
 * returns to its place. Tune itself is always last on the phone. Reset to
 * defaults puts the order back. The grips and the moves are the SDK phone
 * kit's useTabOrderList (0.229.0); the look is this app's.
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
  const on: Record<Tab, boolean> = { contacts: !phoneScreens() || contacts, places, lists: emailLists, todos, notes }
  const { held, listRef, gripProps, move } = useTabOrderList<Tab>(order, (next) => set({ tabOrder: next }))

  return (
    <fieldset className="mt-3 border-t border-slate-800 pt-3">
      <legend className="sr-only">{t('pref.tab_order')}</legend>
      <p aria-hidden className="text-sm font-medium text-slate-200">
        {t('pref.tab_order')}
      </p>
      <p className="mb-2 mt-0.5 text-xs text-slate-400">{t('pref.tab_order_note')}</p>
      <ol ref={listRef} className="space-y-1">
        {order.map((tab, i) => (
          <li
            key={tab}
            className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2 ${
              held === tab ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-900'
            }`}
          >
            <span
              {...gripProps(tab)}
              aria-hidden
              className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-500 hover:text-slate-200"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <circle cx="5.5" cy="4" r="1.2" /><circle cx="10.5" cy="4" r="1.2" />
                <circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" />
                <circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="12" r="1.2" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
              {t(NAME[tab])}
              {!on[tab] && <span className="ml-1.5 text-xs text-slate-500">({t('pref.tab_hidden')})</span>}
            </span>
            <button
              type="button"
              className="h-9 w-9 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label={t('pref.tab_up', { name: t(NAME[tab]) })}
              disabled={i === 0}
              onClick={() => move(tab, i - 1)}
            >
              <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label={t('pref.tab_down', { name: t(NAME[tab]) })}
              disabled={i === order.length - 1}
              onClick={() => move(tab, i + 1)}
            >
              <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ol>
    </fieldset>
  )
}
