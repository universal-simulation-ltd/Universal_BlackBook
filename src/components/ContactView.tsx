import { useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { countdownLabel, currentAge, formatBirthday, nextBirthday, todayParts } from '../lib/birthday'
import { usePageScrollLock } from '../lib/scrollLock'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { CloseGlyph } from './Modal'
import { TagChip } from './TagChip'
import { btnPrimary, label } from './ui'

/**
 * One person, filling the screen, with an Edit button (owner's request,
 * 2026-09-11).
 *
 * ⚠️ **Tapping a card used to open the EDIT FORM.** That put a form between
 * somebody and the thing they tapped to read — a note two lines deep in a
 * four-row textarea, an email address in a box, a Save button on a screen where
 * nothing had been typed. Looking at a contact is what an address book is for
 * and editing one is the occasional act, so the tap now opens this and the form
 * is one button away.
 *
 * ⚠️ **A `<dialog>` of its own rather than `Modal`**, for the same two reasons
 * NotesFullscreen has one: Modal is a capped centred box and this is the whole
 * screen, and Modal hardcodes `id="modal-title"`, which cannot be on screen
 * twice — and this view is very often open UNDERNEATH the edit form. The
 * stacking is deliberate and it is what the top layer is for: Edit opens the
 * form above this, Escape goes to the form because it is topmost, and closing
 * it puts you back on the card you were reading rather than in the list.
 *
 * ⚠️ **The phone number and the email are LINKS here**, which they are not on
 * the card in the list — there the whole card is a button and an anchor inside
 * a button is invalid HTML that behaves differently in every engine (see
 * ContactList). This view is the place that comment promised: one tap to ring
 * them, one to write to them.
 */
export function ContactView({ id }: { id: string }) {
  const contact = useBookStore((s) => s.contacts.find((c) => c.id === id))
  const tags = useBookStore((s) => s.tags)
  const close = useBookStore((s) => s.view)
  const edit = useBookStore((s) => s.edit)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  usePageScrollLock()

  // ⚠️ Read through a ref so the effect below can keep an EMPTY dependency
  // list. `close` is stable here (it is the store's own action) but the
  // sibling component that made this mistake — NotesFullscreen — is one file
  // away, and an effect that tears down and reopens a dialog is the kind of
  // bug that only shows up once somebody passes an inline arrow in.
  const closeRef = useRef(close)
  closeRef.current = close

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // `.open` guard: StrictMode double-invokes this in development, and
    // showModal() on an already-open dialog throws. Same as Modal.
    if (!el.open) el.showModal()
    const onCancel = (e: Event) => {
      e.preventDefault()
      closeRef.current(null)
    }
    el.addEventListener('cancel', onCancel)
    return () => {
      el.removeEventListener('cancel', onCancel)
      // Closing before React drops the node hands focus back to the card that
      // opened this, rather than to the top of the list.
      if (el.open) el.close()
    }
  }, [])

  const today = useMemo(() => todayParts(), [])
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  // Deleted from the form that opened on top of this, or replaced by an
  // import. The store clears `viewing` in both cases, so this is belt and
  // braces rather than a state anybody should reach — but a card rendering a
  // person the book no longer holds is not a thing to leave to chance.
  if (!contact) return null

  const chips = contact.tagIds.map((t) => byId.get(t)).filter((t): t is Tag => Boolean(t))
  const next = nextBirthday(contact.birthdate, today)
  const age = currentAge(contact.birthdate, today)
  const bare =
    !contact.email.trim() &&
    !contact.phone.trim() &&
    !contact.birthdate &&
    chips.length === 0 &&
    !contact.notes.trim()

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Every default the UA puts on a modal dialog is in the way: `m-auto`
      // centres a box, the max sizes cap it well short of the screen, and the
      // border draws a card edge around something that has no edge. `h-[100dvh]`
      // and not vh — the dynamic unit is the one that shrinks for the iOS
      // keyboard and the browser's own chrome.
      className="m-0 flex h-[100dvh] max-h-none w-screen max-w-none flex-col rounded-none border-0 bg-slate-950 p-0 text-slate-200 backdrop:bg-slate-950"
    >
      <div
        className="shrink-0 border-b border-slate-800 px-4 py-3"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        }}
      >
        {/* The same capped, centred column as the body below — the rule is on
            the row so the hairline still spans the screen, and the name sits
            directly over the fields it belongs to at every width. */}
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold text-slate-100">
            {contact.name || 'Unnamed'}
          </h2>
          {/* The Edit button is FIRST of the two and the primary one: it is the
              thing this screen exists to offer that the list could not. Close is
              beside it because Escape and the back gesture are not discoverable
              and not available to every input. */}
          <button type="button" className={`${btnPrimary} shrink-0`} onClick={() => edit(contact.id)}>
            Edit
          </button>
          <button
            type="button"
            onClick={() => close(null)}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <CloseGlyph />
          </button>
        </div>
      </div>

      {/* `flex-auto` and `min-h-0`, never `flex-1` — a zero flex-basis is what
          collapsed every dialog in this app on WebKit (see Modal). The column
          is capped and centred: a full-width line of notes on a desktop is a
          40-word measure nobody can read. */}
      <div
        className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 py-5"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto w-full max-w-2xl space-y-5">
          {contact.email.trim() && (
            <Row name="Email">
              <a
                href={`mailto:${contact.email.trim()}`}
                className="break-all text-base text-orange-300 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {contact.email}
              </a>
            </Row>
          )}

          {contact.phone.trim() && (
            <Row name="Phone">
              {/* The stored string is what is SHOWN — spacing, brackets and all
                  (see Contact.phone) — and the digits are what is dialled. A
                  `tel:` href keeps the punctuation the phone would choke on out
                  of the URL without rewriting what the user typed. */}
              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                className="text-base tabular-nums text-orange-300 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {contact.phone}
              </a>
            </Row>
          )}

          {contact.birthdate && (
            <Row name="Birthday">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base text-slate-200">
                <span>{formatBirthday(contact.birthdate)}</span>
                {age !== null && <span className="text-sm text-slate-500 tabular-nums">Age {age}</span>}
              </p>
              {/* The countdown is here on every contact, not only in the
                  birthdays view: "in 9 days" is the reason to have opened
                  somebody's card at all in the week before it. */}
              {next && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-orange-300/90">
                  <span aria-hidden>{next.inDays === 0 ? '🎉' : '🎂'}</span>
                  <span>{countdownLabel(next.inDays)}</span>
                  {next.turning !== null && (
                    <>
                      <span aria-hidden className="text-slate-600">·</span>
                      <span className="tabular-nums">Turning {next.turning}</span>
                    </>
                  )}
                </p>
              )}
            </Row>
          )}

          {chips.length > 0 && (
            <Row name="Tags">
              <div className="flex flex-wrap gap-1.5">
                {chips.map((t) => (
                  <TagChip key={t.id} name={t.name} colour={t.colour} />
                ))}
              </div>
            </Row>
          )}

          <Row name="Notes">
            {contact.notes.trim() ? (
              // `whitespace-pre-wrap` and no clamp: this is the screen where the
              // note is read in full. The list card clamps to two lines; that is
              // what this view is the way out of.
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-200">{contact.notes}</p>
            ) : (
              <p className="text-sm text-slate-500">Nothing written down yet.</p>
            )}
          </Row>

          {bare && (
            <p className="text-sm text-slate-500">
              A name and nothing else so far. Edit them to add an email, a number, a birthday or the
              thing you want to remember.
            </p>
          )}
        </div>
      </div>
    </dialog>
  )
}

/**
 * One labelled block. A `<span>` heading and not a `<label>`: there is no form
 * control on this screen for a label to point at, and a `<label>` pointing at
 * nothing is worse for a screen reader than a plain heading is — the same rule
 * as ContactForm's `Field`.
 */
function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <span className={label}>{name}</span>
      {children}
    </div>
  )
}
