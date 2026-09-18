import { useMemo, useState } from 'react'
import { currentAge, todayParts } from '../lib/birthday'
import { fold } from '../lib/filter'
import { isList, membersOf } from '../lib/lists'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { ContactRow, ListExport } from './ContactList'
import { ListChip } from './ListChip'
import { TagChip } from './TagChip'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls } from './ui'

/**
 * The Lists tab on the landing screen (owner's request, 2026-09-17), there
 * only with App preferences ▸ Email lists on.
 *
 * Lists only (`Tag.kind === 'list'`), each with its own tags underneath. A
 * list made before lists were their own kind is still a tag — Tags ▸ "This is
 * an email list" turns it into one.
 *
 * ⚠️ Tapping a list opens it HERE, on its own page (2026-09-18). It used to
 * open Contacts filtered to the list, which is how list-only people ended up
 * on the Contacts tab; they are never there now (see `keptOffContacts`), so
 * this page is the one place they are seen.
 */
export function ListsView() {
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const newList = useBookStore((s) => s.newList)
  const [openId, setOpenId] = useState<string | null>(null)

  const lists = useMemo(
    () =>
      tags
        .filter(isList)
        .sort((a, b) => fold(a.name).localeCompare(fold(b.name)))
        .map((t) => ({ tag: t, people: contacts.filter((c) => c.tagIds.includes(t.id)) })),
    [tags, contacts],
  )

  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const open = openId ? byId.get(openId) : undefined
  // Deleted, or turned back into a tag on another device: back to the index.
  if (open && isList(open)) return <ListPage list={open} onBack={() => setOpenId(null)} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">Lists</h1>
          <p className="text-sm text-slate-500">
            People you email together. Copy their addresses, export them, or tap a list to see who is on it.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => newList()}>
          Add new
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">
            No lists yet. Make one with Add new — or turn an existing tag into one under Tags.
          </p>
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
                onClick={() => setOpenId(tag.id)}
                className="flex items-center justify-between gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <ListChip name={tag.name} />
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {people.length} {people.length === 1 ? 'person' : 'people'} ›
                </span>
              </button>
              <ListTags list={tag} byId={byId} />
              {people.length > 0 && <ListExport contacts={people} tags={tags} tagIds={[tag.id]} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ListTags({ list, byId }: { list: Tag; byId: Map<string, Tag> }) {
  const own = (list.tagIds ?? []).map((id) => byId.get(id)).filter((t): t is Tag => Boolean(t))
  if (own.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {own.map((t) => (
        <TagChip key={t.id} name={t.name} colour={t.colour} />
      ))}
    </div>
  )
}

/**
 * One list, open: who is on it, Add new (the Email list form, this list
 * already chosen), Copy emails / Export CSV, and renaming or deleting it —
 * which used to live in the Tags panel, back when lists were listed there.
 */
function ListPage({ list, onBack }: { list: Tag; onBack: () => void }) {
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const newList = useBookStore((s) => s.newList)
  const openContact = useBookStore((s) => s.view)
  const renameTag = useBookStore((s) => s.renameTag)
  const removeTag = useBookStore((s) => s.removeTag)
  const removeContact = useBookStore((s) => s.removeContact)
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const today = useMemo(() => todayParts(), [])
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const people = useMemo(() => membersOf(contacts, list.id), [contacts, list.id])
  // Deleting the list leaves these people on no list at all — which would
  // drop them into Contacts. So the delete offers to take them with it.
  const onlyHere = useMemo(() => {
    const lists = new Set(tags.filter(isList).map((t) => t.id))
    return people.filter((c) => c.listOnly && c.tagIds.every((id) => id === list.id || !lists.has(id)))
  }, [people, tags, list.id])

  const remove = async (withPeople: boolean) => {
    onBack()
    if (withPeople) for (const c of onlyHere) await removeContact(c.id)
    await removeTag(list.id)
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded text-sm text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <span aria-hidden>‹</span> Lists
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              className={`${inputCls} max-w-sm`}
              value={list.name}
              aria-label="List name"
              autoFocus
              onChange={(e) => void renameTag(list.id, e.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setRenaming(false)
              }}
            />
          ) : (
            <h1 className="truncate text-xl font-semibold text-slate-100 sm:text-2xl">{list.name}</h1>
          )}
          <p className="text-sm text-slate-500 tabular-nums">
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => newList(list.name)}>
          Add new
        </button>
      </div>

      <ListTags list={list} byId={byId} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {people.length > 0 ? <ListExport contacts={people} tags={tags} tagIds={[list.id]} /> : <span />}
        <div className="flex items-center gap-1">
          <button type="button" className={btnSubtle} onClick={() => setRenaming(true)}>
            Rename
          </button>
          <button type="button" className={btnSubtle} onClick={() => setConfirming(true)}>
            <span className="text-rose-300">Delete list</span>
          </button>
        </div>
      </div>

      {confirming && (
        <div className="space-y-2 rounded-xl border border-rose-900/60 bg-rose-950/20 px-3 py-3">
          <p className="text-sm text-slate-300">
            Delete <span className="font-semibold text-slate-100">{list.name}</span>?
            {onlyHere.length > 0 &&
              ` ${onlyHere.length} ${onlyHere.length === 1 ? 'person is' : 'people are'} only on this list — keep them and they move to Contacts.`}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(false)}>
              Cancel
            </button>
            {onlyHere.length > 0 && (
              <button type="button" className={btnGhost} onClick={() => void remove(false)}>
                Delete list, keep people
              </button>
            )}
            <button type="button" className={btnDanger} onClick={() => void remove(true)}>
              {onlyHere.length > 0 ? `Delete list and ${onlyHere.length}` : 'Delete list'}
            </button>
          </div>
        </div>
      )}

      {people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">Nobody on this list yet. Add new puts people on it.</p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((c) => (
            <li key={c.id}>
              <ContactRow
                contact={c}
                byId={byId}
                onOpen={() => openContact(c.id)}
                countdown={null}
                age={currentAge(c.birthdate, today)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
