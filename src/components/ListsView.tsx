import { useMemo, useState } from 'react'
import { actionSwipe, deleteSwipe, removeSwipe, SelectBar, SwipeGroup, SwipeItem, UndoBar, useHoldSelect, useUndo } from './SwipeActions'
import type { TagUndo } from '../stores/bookStore'
import { toRecipients } from '../lib/emailList'
import { copyText } from '../lib/clipboard'
import { usePhoneKit } from '../native/kit'
import { useNativeNav } from '../native/nav'
import { useRevealOnOpen } from '@unisim/sdk'
import { currentAge, todayParts } from '../lib/birthday'
import { fold } from '../lib/filter'
import { isList, membersOf } from '../lib/lists'
import type { Contact, Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { ContactRow, ListExport } from './ContactList'
import { ListChip } from './ListChip'
import { TagChip } from './TagChip'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls } from './ui'
import { autoFocusOK } from '../native/kit'
import { phoneScreens } from '../native/shell'
import { useT } from '../i18n'
import { AddTyped, ListSearch } from './ListSearch'

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
  const t = useT()
  const kitForSel = usePhoneKit()
  const removeTag = useBookStore((s) => s.removeTag)
  const restoreTag = useBookStore((s) => s.restoreTag)
  // Swipe left: the list goes (its people stay in the book), with Undo.
  // Swipe right: copy its email addresses.
  const undo = useUndo<TagUndo[]>(async (snaps) => {
    for (const s of snaps) await restoreTag(s)
  })
  const removeLists = async (ids: string[]) => {
    const snaps: TagUndo[] = []
    for (const id of ids) {
      const snap = await removeTag(id)
      if (snap) snaps.push(snap)
    }
    if (snaps.length) undo.deleted(snaps)
  }
  const removeList = (id: string) => removeLists([id])
  const kit = usePhoneKit()
  const say = useNativeNav((s) => s.say)
  const copyEmails = async (people: Contact[]) => {
    const r = toRecipients(people)
    const ok = await copyText(r.text)
    if (kit) say(ok ? t.plural('export.copied', r.count) : t('export.copy_failed'))
  }
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const newList = useBookStore((s) => s.newList)
  const [openId, setOpenId] = useState<string | null>(null)
  // The tab's search (James, 2026-10-23), never remembered.
  const [query, setQuery] = useState('')

  const lists = useMemo(
    () =>
      tags
        .filter(isList)
        .sort((a, b) => fold(a.name).localeCompare(fold(b.name), t.locale))
        .filter((tag) => !query.trim() || fold(tag.name).includes(fold(query.trim())))
        .map((t) => ({ tag: t, people: contacts.filter((c) => c.tagIds.includes(t.id)) })),
    [tags, contacts, t, query],
  )
  const sel = useHoldSelect(lists.map((l) => l.tag.id), Boolean(kitForSel))


  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const open = openId ? byId.get(openId) : undefined
  // Deleted, or turned back into a tag on another device: back to the index.
  if (open && isList(open)) return <ListPage list={open} onBack={() => setOpenId(null)} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">{t('tab_lists')}</h1>
          <p className="text-sm text-slate-500">{t('lists.intro')}</p>
        </div>
        {/* On the phone the top bar's + does this. */}
        {!phoneScreens() && (
          <button type="button" className={btnPrimary} onClick={() => newList()}>
            {t('c.add_new')}
          </button>
        )}
      </div>

      <ListSearch value={query} onChange={setQuery} label={t('lists.search')} />
      {/* What was typed, as a new list's name. */}
      <AddTyped text={query} onAdd={(name) => newList(name)} />

      {lists.length === 0 && query.trim() ? (
        <p className="rounded-2xl border border-dashed border-slate-800 px-6 py-8 text-center text-sm text-slate-400">
          {t('lists.no_match')}
        </p>
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">
            {phoneScreens() ? t('lists.none_phone') : t('lists.none')}
          </p>
        </div>
      ) : (
        <SwipeGroup>
        <SelectBar
          select={sel}
          total={lists.length}
          actions={[
            {
              label: t('lists.copy_short'),
              onClick: (ids) => void copyEmails([...new Map(lists.filter((l) => ids.includes(l.tag.id)).flatMap((l) => l.people).map((c) => [c.id, c])).values()]),
            },
            { label: t('c.delete'), danger: true, onClick: (ids) => void removeLists(ids) },
          ]}
        />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map(({ tag, people }) => (
            <li key={tag.id}>
            <SwipeItem
              id={tag.id}
              select={sel}
              name={tag.name}
              left={
                people.length
                  ? actionSwipe('copy', t('lists.copy_short'), t('lists.copy_label', { name: tag.name }), () => void copyEmails(people))
                  : undefined
              }
              right={deleteSwipe(tag.name, () => void removeList(tag.id))}
              focus={[{ label: t('todo.delete_label', { title: tag.name }), onClick: () => void removeList(tag.id) }]}
            >
            <div className="flex h-full flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <button
                type="button"
                onClick={() => setOpenId(tag.id)}
                className="flex items-center justify-between gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <ListChip name={tag.name} />
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {t.plural('c.people', people.length)} ›
                </span>
              </button>
              <ListTags list={tag} byId={byId} />
              {people.length > 0 && <ListExport contacts={people} tags={tags} tagIds={[tag.id]} />}
            </div>
            </SwipeItem>
            </li>
          ))}
        </ul>
        </SwipeGroup>
      )}
      {undo.item && (
        <UndoBar
          title={undo.item.length === 1 ? undo.item[0].tag.name : ''}
          text={undo.item.length === 1 ? undefined : t.plural('sel.deleted', undo.item.length)}
          onUndo={() => void undo.undo()}
        />
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
        <TagChip key={t.id} name={t.name} colour={t.colour} pattern={t.pattern} />
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
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const memberKitEarly = usePhoneKit()
  const newList = useBookStore((s) => s.newList)
  const openContact = useBookStore((s) => s.view)
  const edit = useBookStore((s) => s.edit)
  const renameTag = useBookStore((s) => s.renameTag)
  const removeTag = useBookStore((s) => s.removeTag)
  const removeContact = useBookStore((s) => s.removeContact)
  const patchContact = useBookStore((s) => s.patchContact)
  // Off this list (they stay in the book), with Undo.
  const memberUndo = useUndo<Contact[]>(async (cs) => {
    for (const c of cs) {
      const now = useBookStore.getState().contacts.find((x) => x.id === c.id)
      if (now && !now.tagIds.includes(list.id)) await patchContact(c.id, { tagIds: [...now.tagIds, list.id], listOnly: c.listOnly })
    }
  })
  const takeOffMany = (cs: Contact[]) => {
    if (!cs.length) return
    memberUndo.deleted(cs)
    for (const c of cs) void patchContact(c.id, { tagIds: c.tagIds.filter((x) => x !== list.id) })
  }
  const takeOff = (c: Contact) => takeOffMany([c])

  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const revealConfirmRef = useRevealOnOpen()

  const today = useMemo(() => todayParts(), [])
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const people = useMemo(() => membersOf(contacts, list.id), [contacts, list.id])
  const memberSel = useHoldSelect(people.map((c) => c.id), Boolean(memberKitEarly))
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
        <span aria-hidden>‹</span> {t('tab_lists')}
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              className={`${inputCls} max-w-sm`}
              value={list.name}
              aria-label={t('lists.name')}
              autoFocus={autoFocusOK()}
              onChange={(e) => void renameTag(list.id, e.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setRenaming(false)
              }}
            />
          ) : (
            <h1 className="truncate text-xl font-semibold text-slate-100 sm:text-2xl">{list.name}</h1>
          )}
          <p className="text-sm text-slate-500 tabular-nums">{t.plural('c.people', people.length)}</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => newList(list.name)}>
          {t('c.add_new')}
        </button>
      </div>

      <ListTags list={list} byId={byId} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {people.length > 0 ? <ListExport contacts={people} tags={tags} tagIds={[list.id]} /> : <span />}
        <div className="flex items-center gap-1">
          <button type="button" className={btnSubtle} onClick={() => setRenaming(true)}>
            {t('lists.rename')}
          </button>
          <button type="button" className={btnSubtle} onClick={() => setConfirming(true)}>
            <span className="text-rose-300">{t('lists.delete')}</span>
          </button>
        </div>
      </div>

      {confirming && (
        <div ref={revealConfirmRef} className="space-y-2 rounded-xl border border-rose-900/60 bg-rose-950/20 px-3 py-3">
          <p className="text-sm text-slate-300">
            {t('del.ask_before')}
            <span className="font-semibold text-slate-100">{list.name}</span>
            {t('del.ask_after')}
            {onlyHere.length > 0 && ` ${t.plural('lists.only_here', onlyHere.length)}`}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(false)}>
              {t('c.cancel')}
            </button>
            {onlyHere.length > 0 && (
              <button type="button" className={btnGhost} onClick={() => void remove(false)}>
                {t('lists.delete_keep')}
              </button>
            )}
            <button type="button" className={btnDanger} onClick={() => void remove(true)}>
              {onlyHere.length > 0 ? t('lists.delete_and', { count: onlyHere.length }) : t('lists.delete')}
            </button>
          </div>
        </div>
      )}

      {people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">{t('lists.empty')}</p>
        </div>
      ) : (
        <SwipeGroup>
        <SelectBar
          select={memberSel}
          total={people.length}
          actions={[{ label: t('lists.take_off'), danger: true, onClick: (ids) => takeOffMany(people.filter((c) => ids.includes(c.id))) }]}
        />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((c) => (
            <li key={c.id}>
              <SwipeItem
                id={c.id}
                select={memberSel}
                name={c.name || t('c.unnamed')}
                left={c.email.trim() ? actionSwipe('mail', t('action_email'), t('nlink.email_label', { name: c.name || t('c.unnamed') }), () => (window.location.href = `mailto:${c.email.trim()}`)) : undefined}
                right={removeSwipe('leave', t('lists.take_off'), t('lists.take_off_label', { name: c.name || t('c.unnamed'), list: list.name }), () => takeOff(c))}
                focus={[{ label: t('lists.take_off_label', { name: c.name || t('c.unnamed'), list: list.name }), onClick: () => takeOff(c) }]}
              >
              <ContactRow
                contact={c}
                byId={byId}
                onOpen={() => openContact(c.id)}
                countdown={null}
                age={currentAge(c.birthdate, today)}
                onFineTune={() => edit(c.id)}
              />
              </SwipeItem>
            </li>
          ))}
        </ul>
        </SwipeGroup>
      )}
      {memberUndo.item && (
        <UndoBar
          title=""
          text={
            memberUndo.item.length === 1
              ? t('lists.taken_off', { name: memberUndo.item[0].name || t('c.unnamed'), list: list.name })
              : t.plural('sel.taken_off', memberUndo.item.length, { list: list.name })
          }
          onUndo={() => void memberUndo.undo()}
        />
      )}
    </div>
  )
}
