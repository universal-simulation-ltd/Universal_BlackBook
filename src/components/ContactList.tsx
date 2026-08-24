import { useMemo } from 'react'
import { frequencyShort } from '../lib/frequency'
import { runQuery } from '../lib/filter'
import type { Category, Contact } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { CategoryChip } from './CategoryChip'
import { btnPrimary } from './ui'

export function ContactList() {
  const contacts = useBookStore((s) => s.contacts)
  const categories = useBookStore((s) => s.categories)
  const query = useBookStore((s) => s.query)
  const edit = useBookStore((s) => s.edit)

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const visible = useMemo(() => runQuery(contacts, query), [contacts, query])

  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-slate-200">Your book is empty</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
          Add the people you actually want to stay in touch with, file them however you like, and say how
          often you'd like to be in contact.
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
          Nobody matches that. {contacts.length} {contacts.length === 1 ? 'person is' : 'people are'} in
          your book.
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="mb-2 text-xs text-slate-500 tabular-nums" aria-live="polite">
        {visible.length === contacts.length
          ? `${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`
          : `${visible.length} of ${contacts.length}`}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => (
          <ContactRow key={c.id} contact={c} byId={byId} onOpen={() => edit(c.id)} />
        ))}
      </ul>
    </>
  )
}

function ContactRow({
  contact,
  byId,
  onOpen,
}: {
  contact: Contact
  byId: Map<string, Category>
  onOpen: () => void
}) {
  // A dangling id renders as nothing rather than as an "undefined" chip. They
  // shouldn't exist — removeCategory strips them — but an imported or
  // hand-edited book can carry one, and a broken chip in the list is a worse
  // outcome than a missing one.
  const chips = contact.categoryIds.map((id) => byId.get(id)).filter((c): c is Category => Boolean(c))

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-100">{contact.name || 'Unnamed'}</p>
            {contact.email && <p className="truncate text-sm text-slate-400">{contact.email}</p>}
          </div>
          <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {frequencyShort(contact.frequency)}
          </span>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <CategoryChip key={c.id} name={c.name} colour={c.colour} />
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
