import { useMemo } from 'react'
import {
  countdownLabel,
  currentAge,
  formatBirthday,
  nextBirthday,
  todayParts,
  type NextBirthday,
} from '../lib/birthday'
import { runQuery } from '../lib/filter'
import type { Contact, Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { TagChip } from './TagChip'
import { btnPrimary } from './ui'

export function ContactList() {
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const query = useBookStore((s) => s.query)
  const edit = useBookStore((s) => s.edit)

  // Read once per mount rather than per render, so the query's memo has a
  // stable input. A tab left open across midnight keeps yesterday's "today"
  // until it is reloaded — which for an address book is a fair trade against
  // re-sorting the list on a timer nobody asked for.
  const today = useMemo(() => todayParts(), [])
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const visible = useMemo(() => runQuery(contacts, query, today), [contacts, query, today])
  const birthdays = query.sort === 'birthday'

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

  if (visible.length === 0) {
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
          ? `${visible.length} ${visible.length === 1 ? 'birthday' : 'birthdays'}, soonest first`
          : visible.length === contacts.length
            ? `${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`
            : `${visible.length} of ${contacts.length}`}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => (
          <ContactRow
            key={c.id}
            contact={c}
            byId={byId}
            // Every card is a button that opens the contact, in the birthdays
            // view as much as anywhere else — the point of being told it is
            // somebody's birthday in nine days is being one tap from their
            // email address and the note about their kids.
            onOpen={() => edit(c.id)}
            countdown={birthdays ? nextBirthday(c.birthdate, today) : null}
            age={currentAge(c.birthdate, today)}
          />
        ))}
      </ul>
    </>
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
}: {
  contact: Contact
  byId: Map<string, Tag>
  onOpen: () => void
  /** Set only in the birthdays view. */
  countdown: NextBirthday | null
  /** How old they are today. Null when the year is not recorded. */
  age: number | null
}) {
  // A dangling id renders as nothing rather than as an "undefined" chip. They
  // shouldn't exist — removeTag strips them — but an imported or hand-edited
  // book can carry one, and a broken chip in the list is a worse outcome than
  // a missing one.
  const chips = contact.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => Boolean(t))
  const isToday = countdown?.inDays === 0

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex h-full w-full flex-col gap-2 rounded-xl border bg-slate-900 p-3.5 text-left transition-colors hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
          isToday ? 'border-orange-500/50 hover:border-orange-500/70' : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-100">{contact.name || 'Unnamed'}</p>
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
    </li>
  )
}
