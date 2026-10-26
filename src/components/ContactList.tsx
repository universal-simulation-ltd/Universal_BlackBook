import { useId, useMemo, useRef, useState } from 'react'
import { saveBlob } from '@unisim/media/save'
import {
  countdownLabel,
  currentAge,
  formatBirthday,
  nextBirthday,
  todayParts,
  type NextBirthday,
} from '../lib/birthday'
import { addedWhen, hiddenBirthdays, hiddenFromList, isSearching, lastAdded, pinnedContacts, runQuery, searchSeed } from '../lib/filter'
import { copyText } from '../lib/clipboard'
import { toCsv } from '../lib/csv'
import { toRecipients } from '../lib/emailList'
import { isList, keptOffContacts, listIdsOf } from '../lib/lists'
import type { Side } from '../lib/swipe'
import type { Contact, Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSyncStore } from '../stores/syncStore'
import { Modal } from './Modal'
import { SwipeRow, type SwipeAction } from './SwipeRow'
import { useMove } from './MoveTo'
import { FocusActions, UndoBar, useHold, useLeaveSelection, useUndo } from './SwipeActions'
import { ListChip } from './ListChip'
import { TagDot } from './TagChip'
import { TagPicker } from './TagPicker'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, TuneGlyph } from './ui'
import { currentT, useT } from '../i18n'
import { usePhoneKit } from '../native/kit'

// The glyphs the swipe actions carry. SVG and not emoji: 🗑 is one of the
// codepoints with no glyph in iOS's system font (see Modal's CloseGlyph), and
// this is a phone-only surface.
const BinIcon = (
  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M6.5 1a1 1 0 0 0-1 1v.5H2.75a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H10.5V2a1 1 0 0 0-1-1h-3ZM4.5 5.5h7l-.6 8.1a1.5 1.5 0 0 1-1.5 1.4H6.6a1.5 1.5 0 0 1-1.5-1.4L4.5 5.5Z" />
  </svg>
)

const EyeOffIcon = (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M3.3 2.2a.75.75 0 1 0-1.1 1l2.2 2.2A10.6 10.6 0 0 0 1.8 9.6a1 1 0 0 0 0 .8C3.1 13.6 6.2 16 10 16c1.4 0 2.8-.35 4-.98l2.7 2.7a.75.75 0 0 0 1.1-1.06l-14.5-14.5Zm5.1 7.2 2.2 2.2a2 2 0 0 1-2.2-2.2Zm3.4 4.5c-.6.25-1.2.4-1.8.4-3 0-5.5-1.8-6.7-4.5.5-1 1.2-1.9 2-2.6l1.9 1.9a3.5 3.5 0 0 0 4.6 4.6l.7.7-.7-.5ZM10 5.5c3 0 5.5 1.8 6.7 4.5-.4.9-1 1.7-1.7 2.4l1.1 1.1a10.6 10.6 0 0 0 2.1-3.1 1 1 0 0 0 0-.8C16.9 6.4 13.8 4 10 4c-.9 0-1.8.13-2.6.4l1.2 1.2c.45-.07.92-.1 1.4-.1Z" />
  </svg>
)

const EyeIcon = (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M10 4c-3.8 0-6.9 2.4-8.2 5.6a1 1 0 0 0 0 .8C3.1 13.6 6.2 16 10 16s6.9-2.4 8.2-5.6a1 1 0 0 0 0-.8C16.9 6.4 13.8 4 10 4Zm0 10.5c-3 0-5.5-1.8-6.7-4.5C4.5 7.3 7 5.5 10 5.5s5.5 1.8 6.7 4.5c-1.2 2.7-3.7 4.5-6.7 4.5Zm0-7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  </svg>
)

/**
 * The three swipe actions, as small builders rather than inline objects.
 *
 * Each names the person in its `label`: a screen-reader user reaching a button
 * revealed behind a row has no idea which row it belongs to, and "Delete" on
 * its own is the least useful thing it could say. The visible `text` stays one
 * word — the button is 96px wide and the name is already on the card.
 */
const who = (contact: Contact) => contact.name || currentT()('c.this_contact')

function deleteAction(contact: Contact, onAction: () => void): SwipeAction {
  const t = currentT()
  return {
    text: t('c.delete'),
    label: t('swipe.delete_label', { name: who(contact) }),
    icon: BinIcon,
    tone: 'bg-rose-600 text-white focus-visible:ring-rose-200',
    onAction,
  }
}

function hideAction(contact: Contact, onAction: () => void): SwipeAction {
  return {
    text: currentT()('c.hide'),
    label: currentT()('swipe.hide_birthdays_label', { name: who(contact) }),
    icon: EyeOffIcon,
    // Slate, not rose. Hiding is reversible and undramatic, and giving it the
    // colour of the button that deletes somebody would say otherwise — on a
    // row where the two are one flick apart in opposite directions.
    tone: 'bg-slate-700 text-slate-100 focus-visible:ring-slate-300',
    onAction,
  }
}

function hideFromListAction(contact: Contact, onAction: () => void): SwipeAction {
  return {
    text: currentT()('c.hide'),
    label: currentT()('swipe.hide_list_label', { name: who(contact) }),
    icon: EyeOffIcon,
    tone: 'bg-slate-700 text-slate-100 focus-visible:ring-slate-300',
    onAction,
  }
}

function showInListAction(contact: Contact, onAction: () => void): SwipeAction {
  return {
    text: currentT()('c.show'),
    label: currentT()('swipe.show_list_label', { name: who(contact) }),
    icon: EyeIcon,
    tone: 'bg-orange-600 text-white focus-visible:ring-orange-200',
    onAction,
  }
}

function showAction(contact: Contact, onAction: () => void): SwipeAction {
  return {
    text: currentT()('c.show'),
    label: currentT()('swipe.show_birthdays_label', { name: who(contact) }),
    icon: EyeIcon,
    tone: 'bg-orange-600 text-white focus-visible:ring-orange-200',
    onAction,
  }
}

/** `onImport` opens Import (ImportPanel) — offered from the empty book, where a
 *  newcomer who already keeps their people in a spreadsheet or another app
 *  would otherwise have to find it in the Actions menu. */
export function ContactList({ onImport }: { onImport?: () => void } = {}) {
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const query = useBookStore((s) => s.query)
  const emailLists = useSettingsStore((s) => s.emailLists)
  const edit = useBookStore((s) => s.edit)
  const newContact = useBookStore((s) => s.newContact)
  // Signed in, the book is (or is about to be) backed up online too, so
  // "it stays on this device" is only said to somebody signed out.
  const signedOut = useSyncStore((s) => s.state === 'signed-out')
  // Tapping a card OPENS the person, it does not edit them — see ContactView.
  const openContact = useBookStore((s) => s.view)
  const removeContact = useBookStore((s) => s.removeContact)
  // Which row is swiped open and on which side, if any. ONE at a time across
  // the whole list, and held here rather than in each row: two rows showing a
  // Delete button is two chances to tap the wrong one, and the second swipe
  // should put the first row back.
  const [openRow, setOpenRow] = useState<{ id: string; side: Side } | null>(null)
  /** The contact whose deletion is being confirmed. */
  const [pending, setPending] = useState<Contact | null>(null)
  // A swipe's Delete goes at once, with Undo (BRANDING.md ▸ "A deletable row
  // swipes", 2026-10-25); the form's Delete and the bulk Delete still ask.
  const restoreContacts = useBookStore((s) => s.restoreContacts)
  const undoDelete = useUndo<Contact[]>(restoreContacts)
  // Select ▸ Move: to Notes or To-do (MoveTo).
  const moveTo = useMove('contacts')
  const removeWithUndo = (list: Contact[]) => {
    undoDelete.deleted(list)
    for (const c of list) void removeContact(c.id)
  }
  /** Is the "hidden from this list" drawer open? Never persisted — it is a
      management view, and it should be shut again the next time you come
      looking for whose birthday is next. */
  const [showHidden, setShowHidden] = useState(false)
  /**
   * Select mode (owner's request, 2026-09-27): tap cards to pick several, then
   * act on them all at once. `null` when off. While it is on a tap SELECTS
   * rather than opens, and the swipe actions are gone — a card that could be
   * flicked open to a Delete while you are ticking it is two meanings for one
   * gesture.
   */
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const selecting = selected !== null
  // Hold a card to select it (James, 2026-10-25), and the phone's ways out.
  const phoneKit = usePhoneKit()
  const holdCard = useHold((id) => setSelected((s) => new Set([...(s ?? []), id])))
  useLeaveSelection(selecting, Boolean(phoneKit), () => setSelected(null))
  const [bulk, setBulk] = useState<'delete' | 'tag' | null>(null)
  const tidiedId = useId()
  const hiddenBirthdaysId = useId()
  const recentId = useId()
  /**
   * "See all pinned": the list shows only the pinned, most recently pinned
   * first. Held as the query it was opened on rather than a flag, so touching
   * the search or the filters closes it without an effect to reset it — and it
   * is never remembered, like the search box.
   */
  const [pinsFor, setPinsFor] = useState<typeof query | null>(null)

  // Read once per mount rather than per render, so the query's memo has a
  // stable input. A tab left open across midnight keeps yesterday's "today"
  // until it is reloaded — which for an address book is a fair trade against
  // re-sorting the list on a timer nobody asked for.
  const today = useMemo(() => todayParts(), [])
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const listIds = useMemo(() => listIdsOf(tags), [tags])
  const queried = useMemo(() => runQuery(contacts, query, today, listIds), [contacts, query, today, listIds])
  const pins = useMemo(() => pinnedContacts(contacts), [contacts])
  // Unpinning the last one closes the view by itself.
  const showingPins = pinsFor === query && pins.length > 0
  const visible = showingPins ? pins : queried
  // What "x of N" counts: the people Contacts shows with no filter on. A
  // list-only person is not one of them, so they must not make a full list
  // read as "1 of 2".
  const inContacts = useMemo(
    () => contacts.filter((c) => !keptOffContacts(c, listIds)).length,
    [contacts, listIds],
  )
  const birthdays = query.sort === 'birthday'
  const hidden = useMemo(
    () => (birthdays ? hiddenBirthdays(contacts, today) : []),
    [birthdays, contacts, today],
  )
  const setBirthdayHidden = useBookStore((s) => s.setBirthdayHidden)
  const setListHidden = useBookStore((s) => s.setListHidden)
  const setListHiddenMany = useBookStore((s) => s.setListHiddenMany)
  const removeContacts = useBookStore((s) => s.removeContacts)
  const addTagsTo = useBookStore((s) => s.addTagsTo)
  const searching = isSearching(query)
  // Only outside the birthdays view: that view has its own hidden drawer, and
  // two of them stacked would be asking the reader to hold two different
  // meanings of "hidden" at once.
  const tidiedAway = useMemo(
    () => (birthdays || searching || showingPins ? [] : hiddenFromList(contacts)),
    [birthdays, searching, showingPins, contacts],
  )
  // The "Last added" cards over the list — for checking somebody you have just
  // filed. Not in the birthdays view (soonest first is its whole order), not
  // while searching (the results are the answer), and not when the newest
  // already heads the list, which "Recently added" does by design.
  //
  // The pinned go first, most recently pinned first, and take slots from the
  // recent adds (James, 2026-10-11), so it is still one row: three cards at
  // xl, two at sm, one on a phone. More pins than fit → "See all pinned".
  // The pinned are left out of the run rather than ending it — being pinned
  // is not a reason to stop showing who was added after them.
  const SLOTS = 3
  const recent = useMemo(() => {
    const room = Math.max(0, SLOTS - pins.length)
    return lastAdded(pins.length ? contacts.filter((c) => c.pinnedAt === undefined) : contacts, listIds, room)
  }, [contacts, listIds, pins])
  const recentShown = queried[0]?.id === recent[0]?.id ? [] : recent
  const topCards = [...pins.slice(0, SLOTS), ...recentShown]
  const showRecent = topCards.length > 0 && !birthdays && !searching && !showingPins
  // "See all" only where pins are cut off: past one on a phone, two at sm,
  // three at xl. Breakpoint classes, like the cards themselves.
  const seeAllAt =
    pins.length > SLOTS ? '' : pins.length === 3 ? 'xl:hidden' : pins.length === 2 ? 'sm:hidden' : 'hidden'
  // ⚠️ What an action acts on is the selection AS SEEN — the ticked people
  // still on screen. Tick five, then narrow the filter to a tag two of them
  // lack, and Delete must not take out two people you can no longer see.
  const picked = useMemo(
    () => (selected ? visible.filter((c) => selected.has(c.id)) : []),
    [selected, visible],
  )
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-slate-200">{t('list.empty_title')}</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">{t('list.empty_body')}</p>
        {/* Answered here, once, rather than as a standing "not backed up"
            line (see SyncStatus in App): where a newcomer's book lives, and
            that nothing has to be signed up for first. */}
        {signedOut && (
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {t('list.empty_local')}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className={btnPrimary} onClick={() => void newContact()}>
            {t('list.add_first')}
          </button>
          {onImport && (
            <button type="button" className={btnGhost} onClick={onImport}>
              {t('ix.title')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ⚠️ An empty list has TWO causes and they need different words. "Nobody has
  // a birthday recorded" — or "nobody matches that" — is a lie when the truth
  // is that you hid everybody, and it is a lie that hides its own undo: the
  // drawer that puts them back sits below a list that is not rendered.
  if (visible.length === 0 && hidden.length === 0 && tidiedAway.length === 0) {
    return (
      <>
      {/* Above what the search found (James, 2026-10-23), here above "nobody
          matches" as much as above a list of results. */}
      {searching && !birthdays && <AddFromSearch text={query.text} className="mb-3" />}
      <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
        <p className="text-sm text-slate-400">
          {birthdays
            ? t('list.no_birthdays')
            : t.plural('list.no_match', contacts.length)}
        </p>
      </div>
      </>
    )
  }

  return (
    <>
      {searching && !selecting && <AddFromSearch text={query.text} className="mb-3" />}
      {showRecent && !selecting && (
        <section aria-labelledby={recentId} className="mb-3">
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
            {/* With pins, every card carries its own "Pinned" or date label,
                and a heading of "Pinned" over a card labelled "Pinned" reads
                as a glitch — so it is for screen readers only. */}
            <h2 id={recentId} className={`text-xs font-medium text-slate-400 ${pins.length ? 'sr-only' : ''}`}>
              {pins.length ? t('list.pinned_and_last') : t('list.last_added')}
            </h2>
            {pins.length > 1 && (
              <button
                type="button"
                className={`${seeAllAt} rounded text-xs font-medium text-orange-400 hover:text-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
                onClick={() => {
                  setPinsFor(query)
                  setOpenRow(null)
                }}
              >
                {t('list.see_all_pinned', { count: pins.length })}
              </button>
            )}
          </div>
          {/* As many as fill one row of the list's own grid — one on a phone,
              two at sm, three at xl — so a wide screen is not one card and
              two empty columns. The extras are hidden by breakpoint rather
              than measured, so the row never reflows after first paint. */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {topCards.map((c, i) => (
              <div key={c.id} className={i === 1 ? 'hidden sm:block' : i === 2 ? 'hidden xl:block' : undefined}>
                <p className="mb-1 px-1 text-xs text-slate-500">{c.pinnedAt !== undefined ? t('list.pinned') : addedWhen(c.createdAt)}</p>
                {/* The orange ring says "this one is not part of the list": the
                    same person is in their usual place below, and two
                    identical cards read as a duplicate entry. */}
                <div className="rounded-xl ring-1 ring-orange-500/40">
                  {/* No swipe row: this is a second copy of a card that is also
                      in the list below, and a Delete on the copy is one more
                      place to flick somebody away by accident. */}
                  <ContactRow
                    contact={c}
                    byId={byId}
                    onOpen={() => openContact(c.id)}
                    countdown={null}
                    age={currentAge(c.birthdate, today)}
                    // Straight to the form: the card exists so a mistake is
                    // one tap from fixed, and opening the person first would
                    // make it two.
                    onFineTune={() => edit(c.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs text-slate-500 tabular-nums" aria-live="polite">
          {showingPins
            ? t('list.count_pinned', { count: visible.length })
            : birthdays
            ? visible.length === 0
              ? t('list.all_birthdays_hidden')
              : t.plural('list.count_birthdays', visible.length)
            : visible.length === 0
              ? t('list.all_hidden')
              : // `>=` is belt and braces: nothing visible is outside
              // `inContacts` now that a list filter no longer exists.
              visible.length >= inContacts
              ? t.plural('list.count_contacts', visible.length)
              : t('list.count_of', { shown: visible.length, total: inContacts })}
        </p>
        <div className="flex items-center gap-1">
          {showingPins && !selecting && (
            <button type="button" className={btnSubtle} onClick={() => setPinsFor(null)}>
              {t('list.show_everyone')}
            </button>
          )}
          {emailLists && visible.length > 0 && !selecting && (
            <ListExport contacts={visible} tags={tags} tagIds={query.tagIds} />
          )}
          {visible.length > 0 && !selecting && (
            <button
              type="button"
              className={btnSubtle}
              onClick={() => {
                setSelected(new Set())
                setOpenRow(null)
              }}
            >
              {t('list.select')}
            </button>
          )}
        </div>
      </div>
      {selecting && (
        <SelectBar
          count={picked.length}
          allPicked={picked.length === visible.length}
          onAll={() => setSelected(picked.length === visible.length ? new Set() : new Set(visible.map((c) => c.id)))}
          // Hide/Show is the main list's flag; the birthdays view has its own
          // meaning of "hidden" and a separate drawer for it.
          hide={
            birthdays || picked.length === 0
              ? null
              : picked.every((c) => c.hideFromList)
                ? 'show'
                : 'hide'
          }
          onHide={(hidden) => {
            void setListHiddenMany(
              picked.map((c) => c.id),
              hidden,
            )
            setSelected(null)
          }}
          onTag={() => setBulk('tag')}
          onMove={() => {
            moveTo.start(picked.map((c) => c.id))
            setSelected(null)
          }}
          onDelete={() => setBulk('delete')}
          onDone={() => setSelected(null)}
        />
      )}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => (
          <li key={c.id} className="bb-todo" onTouchStart={selecting ? undefined : holdCard(c.id)}>
            {selecting ? (
              <SelectableRow
                contact={c}
                byId={byId}
                selected={selected.has(c.id)}
                onToggle={() => toggle(c.id)}
                countdown={birthdays ? nextBirthday(c.birthdate, today) : null}
                age={currentAge(c.birthdate, today)}
              />
            ) : (
            <SwipeRow
              open={openRow?.id === c.id ? openRow.side : null}
              onOpenChange={(side) => setOpenRow(side ? { id: c.id, side } : null)}
              right={deleteAction(c, () => removeWithUndo([c]))}
              // Swipe RIGHT to hide, and only where hiding means something.
              // In every other view the row has no left action at all, which
              // makes that direction a wall rather than a gesture that opens
              // onto nothing.
              left={
                birthdays
                  ? hideAction(c, () => {
                      void setBirthdayHidden(c.id, true)
                      setOpenRow(null)
                    })
                  : c.hideFromList
                    ? // Only reachable while SEARCHING — a hidden person is in
                      // the results but not the list, and the same gesture that
                      // put them away is the one that brings them back.
                      showInListAction(c, () => {
                        void setListHidden(c.id, false)
                        setOpenRow(null)
                      })
                    : hideFromListAction(c, () => {
                        void setListHidden(c.id, true)
                        setOpenRow(null)
                      })
              }
            >
              <ContactRow
                contact={c}
                byId={byId}
                // Every card is a button that opens the contact, in the
                // birthdays view as much as anywhere else — the point of being
                // told it is somebody's birthday in nine days is being one tap
                // from their email address and the note about their kids.
                onOpen={() => openContact(c.id)}
                countdown={birthdays ? nextBirthday(c.birthdate, today) : null}
                age={currentAge(c.birthdate, today)}
                // Only in the birthdays view. Elsewhere the card is a contact
                // and the flag would mean nothing on it.
                onToggleHidden={
                  birthdays
                    ? () => void setBirthdayHidden(c.id, true)
                    : () => void setListHidden(c.id, !c.hideFromList)
                }
                hideLabel={
                  birthdays
                    ? { on: 'birthdays', hidden: false }
                    : { on: 'list', hidden: Boolean(c.hideFromList) }
                }
                dimmed={Boolean(c.hideFromList)}
                onFineTune={() => edit(c.id)}
                swipeHides
              />
              <FocusActions
                actions={[
                  { label: t('nsel.select_label', { title: who(c) }), onClick: () => setSelected(new Set([c.id])) },
                  { label: t('swipe.delete_label', { name: who(c) }), onClick: () => removeWithUndo([c]) },
                ]}
              />
            </SwipeRow>
            )}
          </li>
        ))}
      </ul>

      {/* The drawers are not selectable, so they step aside while selecting
          rather than sit there as cards a tap would unexpectedly open. */}
      {tidiedAway.length > 0 && !selecting && (
        <section className="mt-4 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
            aria-controls={tidiedId}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <svg
              viewBox="0 0 16 16"
              className={`h-3.5 w-3.5 transition-transform ${showHidden ? 'rotate-90' : ''}`}
              fill="currentColor"
              aria-hidden
            >
              <path d="M6 3.5 10.5 8 6 12.5V3.5Z" />
            </svg>
            <span className="tabular-nums">{t('list.hidden_count', { count: tidiedAway.length })}</span>
          </button>
          {showHidden && (
            <>
              <p className="mb-2 mt-1 px-1.5 text-xs text-slate-600">
                {t('list.hidden_note')}
              </p>
              <ul id={tidiedId} className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {tidiedAway.map((c) => (
                  <li key={c.id}>
                    <SwipeRow
                      open={openRow?.id === c.id ? openRow.side : null}
                      onOpenChange={(side) => setOpenRow(side ? { id: c.id, side } : null)}
                      right={deleteAction(c, () => removeWithUndo([c]))}
                      left={showInListAction(c, () => {
                        void setListHidden(c.id, false)
                        setOpenRow(null)
                      })}
                    >
                      <ContactRow
                        contact={c}
                        byId={byId}
                        onOpen={() => openContact(c.id)}
                        countdown={null}
                        age={currentAge(c.birthdate, today)}
                        onToggleHidden={() => void setListHidden(c.id, false)}
                        hideLabel={{ on: 'list', hidden: true }}
                        dimmed
                        onFineTune={() => edit(c.id)}
                        swipeHides
                      />
                    </SwipeRow>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {birthdays && hidden.length > 0 && !selecting && (
        <section className="mt-4 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
            aria-controls={hiddenBirthdaysId}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <svg
              viewBox="0 0 16 16"
              className={`h-3.5 w-3.5 transition-transform ${showHidden ? 'rotate-90' : ''}`}
              fill="currentColor"
              aria-hidden
            >
              <path d="M6 3.5 10.5 8 6 12.5V3.5Z" />
            </svg>
            <span className="tabular-nums">
              {t('list.hidden_count', { count: hidden.length })}
            </span>
          </button>
          {showHidden && (
            <>
              <p className="mb-2 mt-1 px-1.5 text-xs text-slate-600">
                {t('list.hidden_birthdays_note')}
              </p>
              <ul id={hiddenBirthdaysId} className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {hidden.map((c) => (
                  <li key={c.id}>
                    <SwipeRow
                      open={openRow?.id === c.id ? openRow.side : null}
                      onOpenChange={(side) => setOpenRow(side ? { id: c.id, side } : null)}
                      right={deleteAction(c, () => removeWithUndo([c]))}
                      // The same gesture, the opposite action: in this drawer
                      // a right-swipe puts somebody back rather than taking
                      // them out. One direction, one meaning — "the thing that
                      // changes whether they are in the list".
                      left={showAction(c, () => {
                        void setBirthdayHidden(c.id, false)
                        setOpenRow(null)
                      })}
                    >
                      <ContactRow
                        contact={c}
                        byId={byId}
                        onOpen={() => openContact(c.id)}
                        // Dimmed, and with no countdown banner: a hidden row is
                        // here to be un-hidden or opened, and "in 12 days" on it
                        // would be the app doing the counting it was told not to.
                        countdown={null}
                        age={currentAge(c.birthdate, today)}
                        onToggleHidden={() => void setBirthdayHidden(c.id, false)}
                        hideLabel={{ on: 'birthdays', hidden: true }}
                        dimmed
                        onFineTune={() => edit(c.id)}
                        swipeHides
                      />
                    </SwipeRow>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {bulk === 'delete' && (
        <ConfirmBulkDelete
          people={picked}
          onKeep={() => setBulk(null)}
          onDelete={() => {
            void removeContacts(picked.map((c) => c.id))
            setBulk(null)
            setSelected(null)
          }}
        />
      )}

      {bulk === 'tag' && (
        <BulkTag
          count={picked.length}
          onClose={() => setBulk(null)}
          onAdd={(tagIds) => {
            void addTagsTo(
              picked.map((c) => c.id),
              tagIds,
            )
            setBulk(null)
            setSelected(null)
          }}
        />
      )}

      {moveTo.ui}
      {undoDelete.item && <UndoBar title={undoDelete.item[0]?.name || ''} onUndo={() => void undoDelete.undo()} />}
      {pending && (
        <ConfirmDelete
          contact={pending}
          onKeep={() => setPending(null)}
          onDelete={() => {
            void removeContact(pending.id)
            setPending(null)
            setOpenRow(null)
          }}
        />
      )}
    </>
  )
}

/**
 * "Add “Sam Okonkwo”" — the first thing over the search results (owner's
 * request, 2026-10-03; moved from under them to over them, James 2026-10-23),
 * so that looking somebody up and finding they are not
 * there is one tap from filing them, with what you typed already in the form.
 *
 * Shown under results as well as under none: searching "Sam" and finding Sam
 * Okonkwo does not mean the Sam you were after is in the book. The text goes
 * into whichever field it looks like (`searchSeed`), and through `startWith`
 * rather than `edit('new')`, so it is a prefill — it beats a stashed half-typed
 * contact, which is right, because it is what was typed two seconds ago.
 */
function AddFromSearch({ text, className = '' }: { text: string; className?: string }) {
  const t = useT()
  const newContact = useBookStore((s) => s.newContact)
  const seed = searchSeed(text)
  if (!seed.value) return null
  return (
    <button
      type="button"
      onClick={() => {
        void newContact({ [seed.field]: seed.value })
        // Added: the search has done its job (James, 2026-10-26).
        useBookStore.getState().setQuery({ text: '' })
      }}
      className={`flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-700 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${className}`}
    >
      <span aria-hidden className="text-lg leading-none text-orange-400">＋</span>
      <span className="min-w-0 truncate">
        {t('add_quoted_before')}
        <span className="font-semibold text-slate-100">“{seed.value}”</span>
        {t('add_quoted_after')}
      </span>
    </button>
  )
}

/**
 * "Delete Sam Okonkwo?" — the second half of the swipe.
 *
 * A dialog and not an inline confirmation, because the thing being confirmed
 * has scrolled under a thumb: the row it belongs to is at the bottom of a
 * list, mid-gesture, and an inline Yes/No there is two more taps in the same
 * few square centimetres that the swipe just happened in. It also names the
 * person, which is the only real protection against having swiped the row
 * above the one you meant.
 *
 * ⚠️ Keep is FIRST and Delete is the destructive-styled one on the right. The
 * cheap way to close this dialog — Escape, or a tap on the backdrop — keeps
 * the contact, because this app holds the only copy of it.
 */
function ConfirmDelete({
  contact,
  onKeep,
  onDelete,
}: {
  contact: Contact
  onKeep: () => void
  onDelete: () => void
}) {
  const t = useT()
  return (
    <Modal phone="sheet" title={t('del.title')} onClose={onKeep}>
      <p className="text-sm text-slate-300">
        {t('del.ask_before')}
        <span className="font-semibold text-slate-100">{contact.name || t('c.this_contact')}</span>
        {t('del.ask_after')}
      </p>
      <p className="mt-2 text-sm text-slate-500">{t('del.body')}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onKeep} autoFocus>
          {t('c.keep')}
        </button>
        <button type="button" className={btnDanger} onClick={onDelete}>
          {t('c.delete')}
        </button>
      </div>
    </Modal>
  )
}

/**
 * The strip that replaces nothing and sits over the list while selecting.
 *
 * `sticky top-0`, so the actions stay in reach while you scroll down ticking
 * people.
 */
function SelectBar({
  count,
  allPicked,
  onAll,
  hide,
  onHide,
  onTag,
  onMove,
  onDelete,
  onDone,
}: {
  count: number
  allPicked: boolean
  onAll: () => void
  hide: 'hide' | 'show' | null
  onHide: (hidden: boolean) => void
  onTag: () => void
  onMove: () => void
  onDelete: () => void
  onDone: () => void
}) {
  const t = useT()
  const none = count === 0
  const act = `${btnSubtle} disabled:cursor-not-allowed disabled:opacity-40`
  return (
    <div className="sticky top-0 z-30 -mx-1 mb-2 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border border-slate-800 bg-slate-900 px-2 py-1.5">
      <p className="mr-auto px-1 text-sm font-medium text-slate-200 tabular-nums" aria-live="polite">
        {t('sel.count', { count })}
      </p>
      <button type="button" className={act} onClick={onAll}>
        {allPicked ? t('sel.none') : t('sel.all')}
      </button>
      <button type="button" className={act} onClick={onTag} disabled={none}>
        {t('sel.tag')}
      </button>
      <button type="button" className={act} onClick={onMove} disabled={none}>
        {t('sel.move')}
      </button>
      {hide && (
        <button type="button" className={act} onClick={() => onHide(hide === 'hide')} disabled={none}>
          {hide === 'hide' ? t('c.hide') : t('c.show')}
        </button>
      )}
      <button
        type="button"
        className={`${act} text-rose-300 hover:bg-rose-950 hover:text-rose-200`}
        onClick={onDelete}
        disabled={none}
      >
        {t('c.delete')}
      </button>
      <button type="button" className={`${act} text-orange-300`} onClick={onDone}>
        {t('c.done')}
      </button>
    </div>
  )
}

/** A card in select mode: the whole card is the tick box. */
function SelectableRow({
  contact,
  byId,
  selected,
  onToggle,
  countdown,
  age,
}: {
  contact: Contact
  byId: Map<string, Tag>
  selected: boolean
  onToggle: () => void
  countdown: NextBirthday | null
  age: number | null
}) {
  return (
    <div
      // The card's own button carries `aria-pressed`, so a screen reader hears
      // "selected" on it; the tick box here is only the visible half of that.
      className={`relative h-full rounded-xl ${selected ? 'ring-2 ring-orange-500' : ''}`}
    >
      <ContactRow contact={contact} byId={byId} onOpen={onToggle} countdown={countdown} age={age} pressed={selected} />
      <span
        aria-hidden
        className={`pointer-events-none absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border ${
          selected ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-600 bg-slate-950'
        }`}
      >
        {selected && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
            <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </div>
  )
}

/**
 * "Delete 4 people?" — the bulk twin of ConfirmDelete, and for the same
 * reasons Keep comes first and is what Escape does. Names the first few, so a
 * stray tick is caught before it costs somebody.
 */
function ConfirmBulkDelete({
  people,
  onKeep,
  onDelete,
}: {
  people: Contact[]
  onKeep: () => void
  onDelete: () => void
}) {
  const t = useT()
  const names = people.slice(0, 5).map((c) => c.name || t('c.unnamed'))
  const more = people.length - names.length
  return (
    <Modal phone="sheet" title={t('del.many_title')} onClose={onKeep}>
      <p className="text-sm text-slate-300">
        {t('del.ask_before')}
        <span className="font-semibold text-slate-100">{t.plural('c.people', people.length)}</span>
        {t('del.ask_after')}
      </p>
      <p className="mt-2 text-sm text-slate-400">
        {names.join(', ')}
        {more > 0 && t('del.and_more', { count: more })}
      </p>
      <p className="mt-2 text-sm text-slate-500">{t('del.many_body')}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onKeep} autoFocus>
          {t('c.keep')}
        </button>
        <button type="button" className={btnDanger} onClick={onDelete}>
          {t('del.delete_n', { count: people.length })}
        </button>
      </div>
    </Modal>
  )
}

/** Add tags to everybody selected. Adds only — nobody loses a tag here. */
function BulkTag({ count, onClose, onAdd }: { count: number; onClose: () => void; onAdd: (tagIds: string[]) => void }) {
  const t = useT()
  const [tagIds, setTagIds] = useState<string[]>([])
  return (
    <Modal phone="sheet" title={t('bulk.tag_title', { people: t.plural('c.people', count) })} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-400">{t('bulk.tag_note')}</p>
      <TagPicker value={tagIds} onChange={setTagIds} />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onClose}>
          {t('c.cancel')}
        </button>
        <button type="button" className={btnPrimary} onClick={() => onAdd(tagIds)} disabled={tagIds.length === 0}>
          {t('bulk.add_tags')}
        </button>
      </div>
    </Modal>
  )
}

/**
 * The birthday banner: "🎂 Today · Turning 34".
 *
 * Colour is never the only signal — today's birthdays are orange AND say
 * "Today", the same reason every tag chip carries a dot as well as a name.
 */
function BirthdayBanner({ next }: { next: NextBirthday }) {
  const t = useT()
  const soon = next.inDays <= 7
  const today = next.inDays === 0
  return (
    <p
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium ${
        today
          ? 'border-orange-500/60 bg-orange-500/15 text-orange-200'
          : soon
            ? 'border-orange-900/60 bg-orange-950/30 text-orange-300/90'
            : 'border-slate-800 bg-slate-950/60 text-slate-300'
      }`}
    >
      <span aria-hidden className="text-base leading-none">
        {today ? '🎉' : '🎂'}
      </span>
      <span>{countdownLabel(next.inDays)}</span>
      {next.turning !== null && (
        <>
          <span aria-hidden className="text-slate-600">
            ·
          </span>
          <span className="tabular-nums">{t('bday.turning', { age: next.turning })}</span>
        </>
      )}
    </p>
  )
}

export function ContactRow({
  contact,
  byId,
  onOpen,
  countdown,
  age,
  onToggleHidden,
  swipeHides = false,
  hideLabel,
  dimmed,
  pressed,
  onFineTune,
}: {
  contact: Contact
  byId: Map<string, Tag>
  onOpen: () => void
  /** Set only in the birthdays view. */
  countdown: NextBirthday | null
  /** How old they are today. Null when the year is not recorded. */
  age: number | null
  /** Hide this person from whichever list they are in, or put them back. */
  onToggleHidden?: () => void
  /**
   * The card sits in a SwipeRow whose right-swipe does the same hide/show
   * (James, 2026-10-23: "on mobile doesn't need the hide icon on cards if you
   * can swipe to hide"). On the phone the corner icon then goes; a
   * screen-reader-only button keeps it reachable without the swipe, which
   * VoiceOver and TalkBack cannot make. The website (no swipe) keeps the icon.
   */
  swipeHides?: boolean
  /**
   * What the hide control says. `on` names the list ("list", "birthdays list")
   * and `hidden` picks the direction — the same corner button means "hide" in
   * one view and "show again" in another, and a control that does not say which
   * is a control people stop trusting.
   */
  hideLabel?: { on: string; hidden: boolean }
  /** Dim the card: this person is hidden from the list they are showing in. */
  dimmed?: boolean
  /** Select mode: is this card ticked? Sets `aria-pressed` on the card. */
  pressed?: boolean
  /**
   * Straight to the form, from the sliders icon in the card's corner — on every
   * card (James, 2026-10-11; it was the "Last added" cards only). It owns the
   * corner, and the hide control sits to its left when a card has both.
   */
  onFineTune?: () => void
}) {
  const t = useT()
  const name = contact.name || t('c.this_contact')
  // A dangling id renders as nothing rather than as an "undefined" chip. They
  // shouldn't exist — removeTag strips them — but an imported or hand-edited
  // book can carry one, and a broken chip in the list is a worse outcome than
  // a missing one.
  // Tags, then lists — each list as a ListChip, a different kind of chip.
  const chips = contact.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => Boolean(t))
  const tagChips = chips.filter((t) => !isList(t))
  const listChips = chips.filter(isList)
  const isToday = countdown?.inDays === 0
  // The corner icons, right to left: Fine-tune keeps the corner and hide sits
  // left of it. Pinning is inside Fine-tune (James, 2026-10-11: a cleaner card).
  const tuneAt = onFineTune ? 'right-1' : ''
  const hideAt = onFineTune ? 'right-10' : 'right-1'
  const kit = usePhoneKit()
  const hideIcon = Boolean(onToggleHidden) && !(kit && swipeHides)
  const icons = (onFineTune ? 1 : 0) + (hideIcon ? 1 : 0)
  const namePad = icons === 2 ? 'pr-[4.5rem]' : icons === 1 || pressed !== undefined ? 'pr-8' : ''

  return (
    // No <li> of its own: the list wraps every row in SwipeRow, which is
    // what the <li> holds. `h-full` on the button keeps the cards in a grid
    // row the same height now that there is a wrapper between the two.
    //
    // ⚠️ `relative`, because the hide control is a SIBLING of the card button
    // positioned over its corner — never a child of it. A button inside a
    // button is invalid HTML and behaves differently in every engine; the same
    // reason the phone number on this card is plain text and not a `tel:` link.
    //
    // ⚠️ The dim goes on the CONTENTS, never on this wrapper. A card sits on
    // top of its swipe actions and they are out of sight only because it is
    // opaque — fading the wrapper fades the card's own background with it, and
    // "Show" and "Delete" read straight through a row nobody has swiped. So
    // the wrapper carries an opaque card-coloured backdrop instead, and the
    // two buttons fade against that.
    <div className={`relative h-full ${dimmed ? 'rounded-xl bg-slate-900' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={pressed}
        // ⚠️ `hover:bg-slate-800`, and never a translucent one. This was
        // `hover:bg-slate-800/70`, and a card is the only thing hiding the
        // swipe buttons behind it — so on web, hovering a card made the Delete
        // underneath it glow through at 30%. Same failure as the dimmed card
        // (see the note above), reached a different way. The row's actions are
        // now off a pointer device altogether (SwipeRow), and this stays opaque
        // so nothing else can shine through either.
        className={`flex h-full w-full flex-col gap-2 rounded-xl border bg-slate-900 p-3.5 text-left transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
          isToday ? 'border-orange-500/50 hover:border-orange-500/70' : 'border-slate-800 hover:border-slate-700'
        } ${dimmed ? 'opacity-60' : ''}`}
      >
        <div className="min-w-0">
          {/* The tags ride on the name as lights, not as a row of chips —
              see TagDot. The name truncates first; the lights stay whole. */}
          <div
            className={`flex min-w-0 items-center gap-1 ${namePad}`}
          >
            <p className="min-w-0 truncate font-semibold text-slate-100">{contact.name || t('c.unnamed')}</p>
            {tagChips.length > 0 && (
              <span className="-my-0.5 flex shrink-0 items-center">
                {tagChips.map((t) => (
                  <TagDot key={t.id} name={t.name} colour={t.colour} pattern={t.pattern} />
                ))}
              </span>
            )}
          </div>
          {contact.company && <p className="truncate text-sm text-slate-300">{contact.company}</p>}
          {contact.email && <p className="truncate text-sm text-slate-400">{contact.email}</p>}
          {/* Plain text, not a `tel:` link. The whole card is already a button
              that opens the contact, and an anchor nested inside a button is
              invalid HTML that behaves differently in every engine — the
              number is one tap away on the contact's own screen instead. */}
          {contact.phone && (
            <p className="truncate text-sm text-slate-400 tabular-nums">{contact.phone}</p>
          )}
        </div>

        {countdown ? (
          <BirthdayBanner next={countdown} />
        ) : (
          contact.birthdate && (
            <p className="flex items-center gap-1.5 text-sm text-slate-400">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                <path d="M8 0a1 1 0 0 1 .9 1.44L8.5 2.3V3h.5A2.5 2.5 0 0 1 11.5 5.5V6h.5A2 2 0 0 1 14 8v1.2a2.6 2.6 0 0 1-1 .4 2.6 2.6 0 0 1-2-.7 2.6 2.6 0 0 1-3 0 2.6 2.6 0 0 1-3 0 2.6 2.6 0 0 1-2 .7 2.6 2.6 0 0 1-1-.4V8a2 2 0 0 1 2-2h.5v-.5A2.5 2.5 0 0 1 7 3h.5v-.7l-.4-.86A1 1 0 0 1 8 0Zm6 11.1V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2.9c.86.3 1.8.2 2.6-.3.9.5 2 .5 2.9 0 .9.5 2 .5 2.9 0 .8.5 1.74.6 2.6.3Z" />
              </svg>
              <span className="truncate">{formatBirthday(contact.birthdate)}</span>
              {/* Only ever alongside the date, never instead of it — a
                  year-less birthday has no age, and a card that showed one
                  person's age and not another's with no visible reason would
                  read as a bug rather than as missing data. `shrink-0` so the
                  date truncates and the age stays whole; the other way round
                  gives you "(Age 3…)". */}
              {age !== null && (
                <span className="shrink-0 text-slate-500 tabular-nums">{t('bday.age_paren', { age })}</span>
              )}
            </p>
          )
        )}

        {/* In the birthdays view the date itself still has to be readable —
            "in 12 days" does not tell you when to post a card. */}
        {countdown && (
          <p className="text-xs text-slate-500">{formatBirthday(contact.birthdate)}</p>
        )}

        {/* Lists keep their chip: a list is a different kind of thing from a
            tag (see ListChip) and has no colour of its own to be a light. */}
        {listChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listChips.map((t) => (
              <ListChip key={t.id} name={t.name} />
            ))}
          </div>
        )}

        {contact.notes.trim() && (
          // `line-clamp-2` and not a JS truncation: clamping in JS needs a
          // character count, and a character count is wrong at every width the
          // card is actually rendered at.
          <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm text-slate-500">{contact.notes}</p>
        )}
      </button>

      {onToggleHidden && (
        <button
          type="button"
          onClick={onToggleHidden}
          // The full sentence, not "Hide" — a screen reader reaching this
          // control has no idea which card it is sitting on, and "Hide" on its
          // own does not say hide from WHAT either.
          aria-label={
            hideLabel?.on === 'birthdays'
              ? hideLabel.hidden
                ? t('swipe.show_birthdays_label', { name })
                : t('swipe.hide_birthdays_label', { name })
              : hideLabel?.hidden
                ? t('swipe.show_list_label', { name })
                : t('row.hide_list_label', { name })
          }
          title={
            hideLabel?.on === 'birthdays'
              ? hideLabel.hidden
                ? t('row.show_birthdays_title')
                : t('row.hide_birthdays_title')
              : hideLabel?.hidden
                ? t('row.show_list_title')
                : t('row.hide_list_title')
          }
          className={
            hideIcon
              ? `absolute ${hideAt} top-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  dimmed ? 'opacity-60' : ''
                }`
              : 'sr-only'
          }
        >
          {hideLabel?.hidden ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M10 4c-3.8 0-6.9 2.4-8.2 5.6a1 1 0 0 0 0 .8C3.1 13.6 6.2 16 10 16s6.9-2.4 8.2-5.6a1 1 0 0 0 0-.8C16.9 6.4 13.8 4 10 4Zm0 10.5c-3 0-5.5-1.8-6.7-4.5C4.5 7.3 7 5.5 10 5.5s5.5 1.8 6.7 4.5c-1.2 2.7-3.7 4.5-6.7 4.5Zm0-7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M3.3 2.2a.75.75 0 1 0-1.1 1l2.2 2.2A10.6 10.6 0 0 0 1.8 9.6a1 1 0 0 0 0 .8C3.1 13.6 6.2 16 10 16c1.4 0 2.8-.35 4-.98l2.7 2.7a.75.75 0 0 0 1.1-1.06l-14.5-14.5Zm5.1 7.2 2.2 2.2a2 2 0 0 1-2.2-2.2Zm3.4 4.5c-.6.25-1.2.4-1.8.4-3 0-5.5-1.8-6.7-4.5.5-1 1.2-1.9 2-2.6l1.9 1.9a3.5 3.5 0 0 0 4.6 4.6l.7.7-.7-.5ZM10 5.5c3 0 5.5 1.8 6.7 4.5-.4.9-1 1.7-1.7 2.4l1.1 1.1a10.6 10.6 0 0 0 2.1-3.1 1 1 0 0 0 0-.8C16.9 6.4 13.8 4 10 4c-.9 0-1.8.13-2.6.4l1.2 1.2c.45-.07.92-.1 1.4-.1Z" />
            </svg>
          )}
        </button>
      )}

      {/* Inside the card like the hide control (James, 2026-10-10): it was a
          "Fine-tune" word on the date line above, which read as a stray label.
          The sliders icon is the suite's Tune glyph. */}
      {onFineTune && (
        <button
          type="button"
          onClick={onFineTune}
          aria-label={t('row.fine_tune_label', { name })}
          title={t('row.fine_tune')}
          className={`absolute ${tuneAt} top-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
        >
          <TuneGlyph />
        </button>
      )}
    </div>
  )
}

/**
 * "Copy emails" and "Export CSV" for exactly the people on screen (owner's
 * request, 2026-09-17), with App preferences ▸ Email lists on. Filter the list to a tag — an email list — and this is
 * how it leaves the app: pasted into a To: line, or opened in a spreadsheet.
 *
 * ⚠️ The VISIBLE list, not the book. What the filters show is what goes out;
 * Advanced ▸ Backup & export is still the whole-book export.
 */
export function ListExport({ contacts, tags, tagIds }: { contacts: Contact[]; tags: Tag[]; tagIds: string[] }) {
  const t = useT()
  const recipients = useMemo(() => toRecipients(contacts), [contacts])
  const [said, setSaid] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const copy = async () => {
    const ok = await copyText(recipients.text)
    setSaid(ok ? t.plural('export.copied', recipients.count) : t('export.copy_failed'))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaid(null), 2500)
  }

  const csv = () => {
    const blob = new Blob([toCsv(contacts, tags)], { type: 'text/csv;charset=utf-8' })
    // saveBlob, not `a.download`: the phone's web view ignores the attribute.
    // See ImportExport.
    // Named after the list when the screen is showing exactly one:
    // "book-club-2026-09-17.csv" says what it is in a Downloads folder.
    const list = tagIds.length === 1 ? tags.find((t) => t.id === tagIds[0]) : undefined
    const slug = list ? list.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''
    saveBlob(blob, `${slug || 'blackbook'}-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="flex items-center gap-1">
      {said && (
        <span className="text-xs text-emerald-300" role="status">
          {said}
        </span>
      )}
      <button
        type="button"
        className={`${btnSubtle} disabled:cursor-not-allowed disabled:opacity-40`}
        onClick={() => void copy()}
        disabled={recipients.count === 0}
        title={
          recipients.count === 0
            ? t('export.no_emails')
            : t.plural('export.copy_title', recipients.count)
        }
      >
        {t('export.copy_emails')}
      </button>
      <button type="button" className={btnSubtle} onClick={csv} title={t('export.csv_title')}>
        {t('export.csv')}
      </button>
    </div>
  )
}
