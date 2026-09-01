import { useMemo, useState } from 'react'
import {
  countdownLabel,
  currentAge,
  formatBirthday,
  nextBirthday,
  todayParts,
  type NextBirthday,
} from '../lib/birthday'
import { hiddenBirthdays, runQuery } from '../lib/filter'
import type { Side } from '../lib/swipe'
import type { Contact, Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { Modal } from './Modal'
import { SwipeRow, type SwipeAction } from './SwipeRow'
import { TagChip } from './TagChip'
import { btnDanger, btnGhost, btnPrimary } from './ui'

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
function deleteAction(contact: Contact, onAction: () => void): SwipeAction {
  return {
    text: 'Delete',
    label: `Delete ${contact.name || 'this contact'}`,
    icon: BinIcon,
    tone: 'bg-rose-600 text-white focus-visible:ring-rose-200',
    onAction,
  }
}

function hideAction(contact: Contact, onAction: () => void): SwipeAction {
  return {
    text: 'Hide',
    label: `Hide ${contact.name || 'this contact'} from the birthdays list`,
    icon: EyeOffIcon,
    // Slate, not rose. Hiding is reversible and undramatic, and giving it the
    // colour of the button that deletes somebody would say otherwise — on a
    // row where the two are one flick apart in opposite directions.
    tone: 'bg-slate-700 text-slate-100 focus-visible:ring-slate-300',
    onAction,
  }
}

function showAction(contact: Contact, onAction: () => void): SwipeAction {
  return {
    text: 'Show',
    label: `Show ${contact.name || 'this contact'} in the birthdays list again`,
    icon: EyeIcon,
    tone: 'bg-orange-600 text-white focus-visible:ring-orange-200',
    onAction,
  }
}

export function ContactList() {
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const query = useBookStore((s) => s.query)
  const edit = useBookStore((s) => s.edit)
  const removeContact = useBookStore((s) => s.removeContact)
  // Which row is swiped open and on which side, if any. ONE at a time across
  // the whole list, and held here rather than in each row: two rows showing a
  // Delete button is two chances to tap the wrong one, and the second swipe
  // should put the first row back.
  const [openRow, setOpenRow] = useState<{ id: string; side: Side } | null>(null)
  /** The contact whose deletion is being confirmed. */
  const [pending, setPending] = useState<Contact | null>(null)
  /** Is the "hidden from this list" drawer open? Never persisted — it is a
      management view, and it should be shut again the next time you come
      looking for whose birthday is next. */
  const [showHidden, setShowHidden] = useState(false)

  // Read once per mount rather than per render, so the query's memo has a
  // stable input. A tab left open across midnight keeps yesterday's "today"
  // until it is reloaded — which for an address book is a fair trade against
  // re-sorting the list on a timer nobody asked for.
  const today = useMemo(() => todayParts(), [])
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const visible = useMemo(() => runQuery(contacts, query, today), [contacts, query, today])
  const birthdays = query.sort === 'birthday'
  const hidden = useMemo(
    () => (birthdays ? hiddenBirthdays(contacts, today) : []),
    [birthdays, contacts, today],
  )
  const setBirthdayHidden = useBookStore((s) => s.setBirthdayHidden)

  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-slate-200">Your book is empty</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
          Add the people you actually want to stay in touch with, and file them however you like. There are
          no tags until you make one.
        </p>
        <button type="button" className={`${btnPrimary} mt-5`} onClick={() => edit('new')}>
          Add your first contact
        </button>
      </div>
    )
  }

  // ⚠️ An empty birthdays view has TWO causes and they need different words.
  // "Nobody has a birthday recorded" is a lie when the truth is that you hid
  // everybody who does — and it is a lie that hides its own undo.
  if (visible.length === 0 && !(birthdays && hidden.length > 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
        <p className="text-sm text-slate-400">
          {birthdays
            ? 'Nobody in your book has a birthday recorded yet. Add one to a contact and they will show up here.'
            : `Nobody matches that. ${contacts.length} ${contacts.length === 1 ? 'person is' : 'people are'} in your book.`}
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="mb-2 text-xs text-slate-500 tabular-nums" aria-live="polite">
        {birthdays
          ? visible.length === 0
            ? 'Every birthday you have is hidden'
            : `${visible.length} ${visible.length === 1 ? 'birthday' : 'birthdays'}, soonest first`
          : visible.length === contacts.length
            ? `${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`
            : `${visible.length} of ${contacts.length}`}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => (
          <li key={c.id}>
            <SwipeRow
              open={openRow?.id === c.id ? openRow.side : null}
              onOpenChange={(side) => setOpenRow(side ? { id: c.id, side } : null)}
              right={deleteAction(c, () => setPending(c))}
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
                  : undefined
              }
            >
              <ContactRow
                contact={c}
                byId={byId}
                // Every card is a button that opens the contact, in the
                // birthdays view as much as anywhere else — the point of being
                // told it is somebody's birthday in nine days is being one tap
                // from their email address and the note about their kids.
                onOpen={() => edit(c.id)}
                countdown={birthdays ? nextBirthday(c.birthdate, today) : null}
                age={currentAge(c.birthdate, today)}
                // Only in the birthdays view. Elsewhere the card is a contact
                // and the flag would mean nothing on it.
                onToggleHidden={birthdays ? () => void setBirthdayHidden(c.id, true) : undefined}
                hiddenFromBirthdays={false}
              />
            </SwipeRow>
          </li>
        ))}
      </ul>

      {birthdays && hidden.length > 0 && (
        <section className="mt-4 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
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
              {hidden.length} hidden from this list
            </span>
          </button>
          {showHidden && (
            <>
              <p className="mb-2 mt-1 px-1.5 text-xs text-slate-600">
                Their birthdays are still recorded — they are just not counted down here.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {hidden.map((c) => (
                  <li key={c.id}>
                    <SwipeRow
                      open={openRow?.id === c.id ? openRow.side : null}
                      onOpenChange={(side) => setOpenRow(side ? { id: c.id, side } : null)}
                      right={deleteAction(c, () => setPending(c))}
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
                        onOpen={() => edit(c.id)}
                        // Dimmed, and with no countdown banner: a hidden row is
                        // here to be un-hidden or opened, and "in 12 days" on it
                        // would be the app doing the counting it was told not to.
                        countdown={null}
                        age={currentAge(c.birthdate, today)}
                        onToggleHidden={() => void setBirthdayHidden(c.id, false)}
                        hiddenFromBirthdays
                      />
                    </SwipeRow>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

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
  return (
    <Modal title="Delete contact" onClose={onKeep}>
      <p className="text-sm text-slate-300">
        Delete <span className="font-semibold text-slate-100">{contact.name || 'this contact'}</span>?
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Their notes, tags and birthday go with them. There is no undo — if you save your book online,
        the deletion is copied there the next time it syncs.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onKeep} autoFocus>
          Keep
        </button>
        <button type="button" className={btnDanger} onClick={onDelete}>
          Delete
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
          <span className="tabular-nums">Turning {next.turning}</span>
        </>
      )}
    </p>
  )
}

function ContactRow({
  contact,
  byId,
  onOpen,
  countdown,
  age,
  onToggleHidden,
  hiddenFromBirthdays,
}: {
  contact: Contact
  byId: Map<string, Tag>
  onOpen: () => void
  /** Set only in the birthdays view. */
  countdown: NextBirthday | null
  /** How old they are today. Null when the year is not recorded. */
  age: number | null
  /** Set only in the birthdays view: hide this person, or put them back. */
  onToggleHidden?: () => void
  /** Whether this row is being rendered in the hidden drawer. */
  hiddenFromBirthdays?: boolean
}) {
  // A dangling id renders as nothing rather than as an "undefined" chip. They
  // shouldn't exist — removeTag strips them — but an imported or hand-edited
  // book can carry one, and a broken chip in the list is a worse outcome than
  // a missing one.
  const chips = contact.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => Boolean(t))
  const isToday = countdown?.inDays === 0

  return (
    // No <li> of its own: the list wraps every row in SwipeRow, which is
    // what the <li> holds. `h-full` on the button keeps the cards in a grid
    // row the same height now that there is a wrapper between the two.
    //
    // ⚠️ `relative`, because the hide control is a SIBLING of the card button
    // positioned over its corner — never a child of it. A button inside a
    // button is invalid HTML and behaves differently in every engine; the same
    // reason the phone number on this card is plain text and not a `tel:` link.
    <div className={`relative h-full ${hiddenFromBirthdays ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        className={`flex h-full w-full flex-col gap-2 rounded-xl border bg-slate-900 p-3.5 text-left transition-colors hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
          isToday ? 'border-orange-500/50 hover:border-orange-500/70' : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="min-w-0">
          <p className={`truncate font-semibold text-slate-100 ${onToggleHidden ? 'pr-8' : ''}`}>
            {contact.name || 'Unnamed'}
          </p>
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
                <span className="shrink-0 text-slate-500 tabular-nums">(Age {age})</span>
              )}
            </p>
          )
        )}

        {/* In the birthdays view the date itself still has to be readable —
            "in 12 days" does not tell you when to post a card. */}
        {countdown && (
          <p className="text-xs text-slate-500">{formatBirthday(contact.birthdate)}</p>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((t) => (
              <TagChip key={t.id} name={t.name} colour={t.colour} />
            ))}
          </div>
        )}

        {contact.notes.trim() && (
          // `line-clamp-2` and not a JS truncation: clamping in JS needs a
          // character count, and a character count is wrong at every width the
          // card is actually rendered at.
          <p className="line-clamp-2 whitespace-pre-wrap text-sm text-slate-500">{contact.notes}</p>
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
            hiddenFromBirthdays
              ? `Show ${contact.name || 'this contact'} in the birthdays list again`
              : `Hide ${contact.name || 'this contact'} from the birthdays list`
          }
          title={hiddenFromBirthdays ? 'Show in the birthdays list again' : 'Hide from the birthdays list'}
          className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {hiddenFromBirthdays ? (
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
    </div>
  )
}
