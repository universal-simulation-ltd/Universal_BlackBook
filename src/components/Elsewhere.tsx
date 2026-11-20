import { useMemo, type ReactNode } from 'react'
import { isList, keptOffContacts, listIdsOf } from '../lib/lists'
import { matchesText, tagNames } from '../lib/filter'
import { matchesNote, preview } from '../lib/notes'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { useNoteStore } from '../stores/noteStore'
import { useTodoStore } from '../stores/todoStore'
import { usePlaceStore } from '../stores/placeStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useGoTab } from '../stores/searchStore'
import { matchesTodo } from '../lib/todos'
import { comparePlaces, matchesPlace, placeWhere } from '../lib/places'
import { TagDot } from './TagChip'
import { IconBook, IconNote, IconPlace, IconTodo } from '../native/icons'
import { useT } from '../i18n'

/** How many of each kind before "and N more". */
const EACH = 6

type Here = 'contacts' | 'notes' | 'todos' | 'lists' | 'places'

/**
 * Under a tab's own search results, what the same search finds everywhere
 * else (James, 2026-11-18: "In searches show the results for current tab and
 * then global results e.g. you tagged a contact and a note the same and then
 * search the name of the tag"). The tab's own kind is left out — it is the
 * list above — and so is any tab switched off. Every search matches tags'
 * names (lib/filter.ts ▸ tagNames), so a tag's name finds the contacts, the
 * notes and the to-dos that carry it.
 *
 * A tap opens the thing: a contact or a note over whatever tab this is (both
 * open from anywhere), a to-do on the To-do tab, its form open, and a place
 * (2026-11-19) on the Places tab, the same way.
 */
export function Elsewhere({ here, query }: { here: Here; query: string }) {
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const notes = useNoteStore((s) => s.notes)
  const todos = useTodoStore((s) => s.todos)
  const places = usePlaceStore((s) => s.places)
  const placesOn = useSettingsStore((s) => s.places)
  const contactsOn = useSettingsStore((s) => s.contacts)
  const notesOn = useSettingsStore((s) => s.notes)
  const todosOn = useSettingsStore((s) => s.todos)
  const q = query.trim()
  const byId = useMemo(() => new Map(tags.map((x) => [x.id, x])), [tags])
  const listIds = useMemo(() => listIdsOf(tags), [tags])

  const found = useMemo(() => {
    if (!q) return null
    return {
      contacts:
        here === 'contacts' || !contactsOn
          ? []
          : contacts.filter((c) => !keptOffContacts(c, listIds) && matchesText(c, q, tagNames(c.tagIds, byId))).sort((a, b) => a.name.localeCompare(b.name)),
      notes: here === 'notes' || !notesOn ? [] : notes.filter((n) => matchesNote(n, q, tagNames(n.tagIds, byId))).sort((a, b) => b.updatedAt - a.updatedAt),
      // Open ones first.
      todos:
        here === 'todos' || !todosOn
          ? []
          : todos.filter((x) => matchesTodo(x, q, byId)).sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt))),
      places: here === 'places' || !placesOn ? [] : places.filter((p) => matchesPlace(p, q, byId, t.locale)).sort((a, b) => comparePlaces(a, b, t.locale)),
    }
  }, [q, here, contacts, notes, todos, places, contactsOn, notesOn, todosOn, placesOn, byId, listIds, t.locale])

  if (!found) return null
  const total = found.contacts.length + found.notes.length + found.todos.length + found.places.length
  if (total === 0) return null
  const chips = (ids: readonly string[] | undefined) => (ids ?? []).map((id) => byId.get(id)).filter((x): x is Tag => Boolean(x) && !isList(x!))

  return (
    <section aria-label={t('search.elsewhere')} className="space-y-3 border-t border-slate-800 pt-4">
      <h2 className="px-1 text-xs font-semibold text-slate-500">{t('search.elsewhere')}</h2>
      <Group icon={<IconBook />} title={t('ix.contacts')} more={found.contacts.length - EACH}>
        {found.contacts.slice(0, EACH).map((c) => (
          <Row key={c.id} title={c.name || t('c.unnamed')} sub={c.company || c.email || c.phone} tags={chips(c.tagIds)} onClick={() => useBookStore.getState().view(c.id)} />
        ))}
      </Group>
      <Group icon={<IconPlace />} title={t('tab_places')} more={found.places.length - EACH}>
        {found.places.slice(0, EACH).map((p) => (
          <Row
            key={p.id}
            title={p.name || t('c.unnamed')}
            sub={placeWhere(p, t.locale) || p.phone}
            tags={chips(p.tagIds)}
            onClick={() => {
              useGoTab.getState().go('places')
              usePlaceStore.getState().view(p.id)
            }}
          />
        ))}
      </Group>
      <Group icon={<IconNote />} title={t('ix.notes')} more={found.notes.length - EACH}>
        {found.notes.slice(0, EACH).map((n) => (
          <Row key={n.id} title={n.title || preview(n) || t('c.untitled')} sub={n.title ? preview(n) : ''} tags={chips(n.tagIds)} onClick={() => useNoteStore.getState().view(n.id)} />
        ))}
      </Group>
      <Group icon={<IconTodo />} title={t('ix.todos')} more={found.todos.length - EACH}>
        {found.todos.slice(0, EACH).map((x) => (
          <Row
            key={x.id}
            title={x.title || t('c.untitled')}
            sub={x.details}
            done={Boolean(x.doneAt)}
            tags={chips(x.tagIds)}
            onClick={() => {
              useGoTab.getState().go('todos')
              useTodoStore.getState().edit(x.id)
            }}
          />
        ))}
      </Group>
    </section>
  )
}

function Group({ icon, title, more, children }: { icon: ReactNode; title: string; more: number; children: ReactNode[] }) {
  const t = useT()
  if (children.length === 0) return null
  return (
    <div>
      <h3 className="mb-1 flex items-center gap-1.5 px-1 text-xs font-medium text-slate-400 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        {title}
      </h3>
      <ul className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">{children}</ul>
      {more > 0 && <p className="mt-1 px-1 text-xs text-slate-500">{t.plural('search.more', more)}</p>}
    </div>
  )
}

function Row({ title, sub, tags, done = false, onClick }: { title: string; sub?: string; tags: Tag[]; done?: boolean; onClick: () => void }) {
  return (
    <li className="border-b border-slate-800 last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[44px] w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-semibold text-slate-100 ${done ? 'line-through decoration-slate-500 opacity-60' : ''}`}>{title}</span>
          {sub && <span className="block truncate text-xs text-slate-400">{sub.split('\n').find((l) => l.trim())}</span>}
        </span>
        {tags.length > 0 && (
          <span className="flex shrink-0 items-center">
            {tags.map((x) => (
              <TagDot key={x.id} name={x.name} colour={x.colour} pattern={x.pattern} />
            ))}
          </span>
        )}
      </button>
    </li>
  )
}
