import { useMemo } from 'react'
import { fold } from '../lib/filter'
import { useBookStore } from '../stores/bookStore'
import { ListExport } from './ContactList'
import { TagChip } from './TagChip'
import { btnPrimary } from './ui'

/**
 * The Lists tab on the landing screen (owner's request, 2026-09-17), there
 * only with App preferences ▸ Email lists on.
 *
 * ⚠️ A list is a TAG, and every tag is shown. Saving an Email list files its
 * people under a tag of the list's name, so there is no separate record of
 * which tags are "lists" — and a Copy emails for "Important People" is as
 * useful as one for "Book club". Tapping a list opens Contacts filtered to it.
 */
export function ListsView({ onOpen }: { onOpen: () => void }) {
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const setQuery = useBookStore((s) => s.setQuery)
  const newList = useBookStore((s) => s.newList)

  const lists = useMemo(
    () =>
      [...tags]
        .sort((a, b) => fold(a.name).localeCompare(fold(b.name)))
        .map((t) => ({ tag: t, people: contacts.filter((c) => c.tagIds.includes(t.id)) })),
    [tags, contacts],
  )

  const open = (id: string) => {
    setQuery({ text: '', tagIds: [id], hiddenTagIds: [] })
    onOpen()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">Lists</h1>
          <p className="text-sm text-slate-500">
            Everyone under one tag. Copy their emails, export them, or tap a list to see who is on it.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={newList}>
          New list
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">No lists yet. Make one with New list.</p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map(({ tag, people }) => (
            <li
              key={tag.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4"
            >
              <button
                type="button"
                onClick={() => open(tag.id)}
                className="flex items-center justify-between gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <TagChip name={tag.name} colour={tag.colour} />
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {people.length} {people.length === 1 ? 'person' : 'people'} ›
                </span>
              </button>
              {people.length > 0 && <ListExport contacts={people} tags={tags} tagIds={[tag.id]} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
