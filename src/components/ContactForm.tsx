import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { blankDraft, draftIsEmpty, useBookStore, type ContactDraft } from '../stores/bookStore'
import { BirthdayField } from './BirthdayField'
import { TagPicker } from './TagPicker'
import { Modal } from './Modal'
import { ExpandGlyph, NotesFullscreen } from './NotesFullscreen'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls, label, textareaCls } from './ui'

/**
 * Add or edit one person. Six fields, in the order they matter — but on a blank
 * form only TWO of them are showing.
 *
 * ⚠️ **Notes sits directly under Name**, above everything else that is
 * showing. It is the field with the most in it and the one people came to
 * write — "met at the Leeds conference, two kids" is why they opened the form
 * — and it used to be last, below both pickers, which put the main event below
 * the fold on a phone. On a blank form it is now the SECOND thing on screen.
 *
 * ⚠️ **Notes has a "Full screen" button on its label** (owner's request,
 * 2026-08-31), which opens NotesFullscreen — a second dialog on top of this
 * one, holding nothing but the note. Four rows is the right size for the field
 * in a form and the wrong size for reading a note that has grown, and on a
 * phone reading one means scrolling a box inside a scrolling form.
 *
 * ⚠️ **Tags are LAST, below the birthday** (owner's call, 2026-08-30). They
 * were above it, which is the wrong way round for how the form is actually
 * filled in: a birthday is a fact you either have to hand or do not, and tags
 * are a decision — and a decision that opens a picker, adds rows to the
 * dialog, and can create a tag mid-form has no business standing between the
 * typing and the Save button.
 *
 * ⚠️ **FOUR of the six are folded behind "More" unless they hold something** —
 * email, phone, birthday and tags (owner's call, 2026-08-30, extended from two
 * to four on 2026-08-30). Only Name and Notes are unconditional, and that is
 * the app in one line: the name of a person, and the private thing you know
 * about them. Everything else is already on the phone's own contact card.
 *
 * ⚠️ **The split is by CONTENT, not by field.** A field arriving with a value
 * sits out in the open and only the empty ones hide — an email you HAVE
 * recorded has to be visible when you open the contact, or the form is lying
 * about what it holds. The consequence worth knowing: for an existing contact
 * the form looks exactly as it always did, because everything filled in is
 * still there, in its old place. It is only a BLANK form that is short.
 *
 * ⚠️ Which is why the pinned fields render in TWO groups, either side of
 * Notes, rather than in one list. Email and phone are identity and belong
 * above the notes about the person; birthday and tags are the two that used to
 * be below it. Rendering all four in one block after Notes would have shuffled
 * a form people already know, for no reason beyond it being less code.
 *
 * ⚠️ The split is decided ONCE, at mount, and deliberately does not re-run.
 * Recomputing it would make a field you just filled in inside "More" jump out
 * of the section you are looking at and land somewhere else on the page,
 * mid-edit. Same reasoning as the `stashed` read above.
 *
 * Validation is now a NAME and nothing else (owner's call, 2026-08-30). It
 * used to be "a name or an email", which cannot survive email moving behind a
 * disclosure: the one field that could satisfy the rule was no longer on
 * screen, so a blank form would have refused to save with nothing visible to
 * explain why. A name is also the only field this app can show you in a list.
 * It need not be a person's — "Plumber (the good one)" is a perfectly good
 * entry in a little black book.
 */
export function ContactForm({ id }: { id: string }) {
  const contacts = useBookStore((s) => s.contacts)
  const saveContact = useBookStore((s) => s.saveContact)
  const removeContact = useBookStore((s) => s.removeContact)
  const close = useBookStore((s) => s.edit)
  const stashDraft = useBookStore((s) => s.stashDraft)
  const clearStash = useBookStore((s) => s.clearStash)
  // Read ONCE, at mount. App keys this component on `editing`, so it remounts
  // every time the form opens — which is exactly when "was something left
  // half-typed?" is the right question, and never again while it is open.
  const [stashed] = useState(() => useBookStore.getState().stashed)
  // Same rule, and read at the same moment: a contact just chosen out of the
  // phone's address book (bookStore.startWith).
  const [prefill] = useState(() => useBookStore.getState().prefill)

  const existing = id === 'new' ? undefined : contacts.find((c) => c.id === id)
  // ⚠️ A prefill BEATS a stash, and silently. Both want the same empty form,
  // but the prefill is what the user picked seconds ago and the stash is
  // something they abandoned earlier — offering "you were part way through
  // adding someone" over the top of a contact they just chose would be the app
  // answering a question nobody asked. The stash is left alone rather than
  // dropped, so it is still there the next time a genuinely blank form opens.
  const restorable = id === 'new' && !prefill && stashed !== null && !draftIsEmpty(stashed)

  const [draft, setDraft] = useState<ContactDraft>(() =>
    existing
      ? {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          tagIds: existing.tagIds,
          birthdate: existing.birthdate,
          notes: existing.notes,
        }
      : prefill
        ? prefill
        : restorable
          ? stashed
          : blankDraft(),
  )
  /** Is the "you were part way through" bar still showing? */
  const [offering, setOffering] = useState(restorable)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [more, setMore] = useState(false)
  /** Is Notes showing on its own, full screen? */
  const [notesFull, setNotesFull] = useState(false)
  const moreId = useId()

  // Which of the four optional fields arrived with something in them. Read from
  // the draft's INITIAL value and never again — see the note above.
  const [pinned] = useState<Extra[]>(() => EXTRAS.filter((k) => hasValue(k, draft)))
  const hidden = EXTRAS.filter((k) => !pinned.includes(k))
  // Rendered either side of Notes, in the order they were always in.
  const pinnedAbove = pinned.filter((k) => ABOVE_NOTES.includes(k))
  const pinnedBelow = pinned.filter((k) => !ABOVE_NOTES.includes(k))

  const patch = (p: Partial<ContactDraft>) => setDraft((d) => ({ ...d, ...p }))
  const valid = Boolean(draft.name.trim())

  /**
   * One of the four foldable fields, wherever it happens to be rendering.
   *
   * The same call site draws it pinned above Notes, pinned below Notes, or
   * inside the disclosure, which is what guarantees a field looks and behaves
   * identically in all three places — the earlier version of this file wrote
   * the picker JSX out twice and they had already started to drift.
   *
   * ⚠️ The ids are fixed strings, not generated, because a field is only ever
   * on screen in ONE of those three positions at a time. Pinned and hidden are
   * complements by construction (`hidden` is `EXTRAS` minus `pinned`), so a
   * duplicate id here is impossible unless that invariant is broken.
   */
  const renderExtra = (k: Extra) => {
    switch (k) {
      case 'email':
        return (
          <div key={k}>
            <label className={label} htmlFor="cf-email">
              Email
            </label>
            <input
              id="cf-email"
              className={inputCls}
              // `type="email"` would let the browser block submission on anything
              // without an @ — including a perfectly good internal address, and
              // including the empty string on some older engines. The field is
              // optional and the app never sends mail, so the keyboard hint is
              // worth having and the validation is not.
              type="text"
              inputMode="email"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="sam@example.com"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )
      case 'phone':
        return (
          <div key={k}>
            <label className={label} htmlFor="cf-phone">
              Phone
            </label>
            <input
              id="cf-phone"
              className={inputCls}
              // `type="tel"` for the keypad, and it carries no validation of its
              // own in any engine — which is what this field wants. An address
              // book holds extensions, "ask for Dave", and numbers in formats no
              // pattern of ours would predict, and the value is never dialled by
              // this app.
              type="tel"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+44 7700 900123"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )
      case 'birthday':
        return (
          <Field key={k} name={EXTRA_LABELS[k]}>
            <BirthdayField value={draft.birthdate} onChange={(birthdate) => patch({ birthdate })} />
          </Field>
        )
      case 'tags':
        return (
          <Field key={k} name={EXTRA_LABELS[k]}>
            <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
          </Field>
        )
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    void saveContact(draft)
  }

  /**
   * Closed WITHOUT a decision — the backdrop, Escape, or the ✕.
   *
   * A click on the backdrop is the easiest accident on this screen: the dialog
   * is small, the page behind it is a list people are trying to read, and
   * everything typed used to go in the bin with no warning. So it is kept, and
   * offered back the next time the form opens.
   *
   * Note this is NOT what Cancel does. Cancel is somebody saying no, and an app
   * that answers "are you sure? here it is again" to a deliberate no is
   * arguing with its user.
   */
  const dismiss = () => {
    if (id === 'new') stashDraft(draft)
    close(null)
  }

  const cancel = () => {
    if (id === 'new') clearStash()
    close(null)
  }

  return (
    <Modal title={existing ? 'Edit contact' : 'Add someone'} onClose={dismiss}>
      <form onSubmit={submit} className="space-y-4">
        {offering && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-900/60 bg-orange-950/30 px-3 py-2.5">
            <p className="text-sm text-orange-200">
              You were part way through adding someone. Here it is.
            </p>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} onClick={() => setOffering(false)}>
                Continue
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setDraft(blankDraft())
                  clearStash()
                  setOffering(false)
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div>
          <label className={label} htmlFor="cf-name">
            Name
          </label>
          <input
            id="cf-name"
            className={inputCls}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Sam Okonkwo"
            autoFocus
            autoComplete="off"
          />
        </div>

        {pinnedAbove.map(renderExtra)}

        <div>
          {/* The label and its full-screen button share a row, and BOTH carry
              the label's own `mb-1.5` rather than the row carrying it. Putting
              the margin on the row and cancelling it on the label with `mb-0`
              is the version that silently does nothing: Tailwind resolves a
              conflict by CSS source order, not by the order of the class
              string — the same trap that made the birthday year box full
              width (see ui.tsx). */}
          <div className="flex items-center justify-between gap-2">
            <label className={label} htmlFor="cf-notes">
              Notes
            </label>
            <button
              type="button"
              className={`${btnSubtle} mb-1.5 flex items-center gap-1.5`}
              onClick={() => setNotesFull(true)}
            >
              <ExpandGlyph />
              Full screen
            </button>
          </div>
          <textarea
            id="cf-notes"
            className={textareaCls}
            rows={4}
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Met at the Leeds conference. Two kids. Allergic to shellfish."
          />
        </div>

        {pinnedBelow.map(renderExtra)}

        {hidden.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              aria-expanded={more}
              aria-controls={moreId}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <span className="text-sm font-medium text-slate-300">More</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                {/* Names what is inside rather than saying "More" twice. A
                    disclosure that does not say what it discloses is one
                    people never open. */}
                {listOf(hidden.map((k) => EXTRA_LABELS[k]))}
                <svg
                  viewBox="0 0 16 16"
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${more ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {/* Unmounted rather than hidden with CSS. BirthdayField and
                TagPicker both own popups and focus, and a `hidden` subtree
                still holds tabbable children in some engines — a Tab out of
                Notes landing in a collapsed section is the classic version of
                this bug. */}
            {more && (
              <div id={moreId} className="mt-4 space-y-4">
                {hidden.map(renderExtra)}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
          <div>
            {existing &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rose-300">Delete {existing.name || 'this contact'}?</span>
                  <button type="button" className={btnDanger} onClick={() => void removeContact(existing.id)}>
                    Delete
                  </button>
                  <button type="button" className={btnGhost} onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </div>
              ) : (
                <button type="button" className={btnDanger} onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              ))}
          </div>
          {!confirmDelete && (
            <div className="flex gap-2">
              <button type="button" className={btnGhost} onClick={cancel}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary} disabled={!valid}>
                Save
              </button>
            </div>
          )}
        </div>
        {!valid && (
          <p className="text-xs text-slate-500">
            Give them a name — it is the only thing this needs. A person, a company, or
            "Plumber (the good one)".
          </p>
        )}
      </form>

      {/* Rendered inside the form, and it makes no difference where: a
          `showModal()` dialog is painted in the top layer, not where it sits
          in the tree. Inside is where the draft is, which is what matters. */}
      {notesFull && (
        <NotesFullscreen
          value={draft.notes}
          onChange={(v) => patch({ notes: v })}
          onClose={() => setNotesFull(false)}
          name={draft.name}
        />
      )}
    </Modal>
  )
}

/**
 * The four fields that fold away when empty, in the order they are listed on
 * the "More" button — which is also the order they appear in the form, reading
 * top to bottom THROUGH Notes (email and phone above it, birthday and tags
 * below). One list rather than two so the disclosure label cannot drift out of
 * step with the form.
 */
const EXTRAS = ['email', 'phone', 'birthday', 'tags'] as const
type Extra = (typeof EXTRAS)[number]

/** Of those, the ones that render ABOVE the Notes field when they are pinned. */
const ABOVE_NOTES: readonly Extra[] = ['email', 'phone']

const EXTRA_LABELS: Record<Extra, string> = {
  email: 'Email',
  phone: 'Phone',
  birthday: 'Birthday',
  tags: 'Tags',
}

/** Did this field arrive with something in it? Decides pinned vs. folded. */
function hasValue(k: Extra, draft: ContactDraft): boolean {
  switch (k) {
    case 'email':
      return draft.email.trim() !== ''
    case 'phone':
      return draft.phone.trim() !== ''
    case 'birthday':
      return Boolean(draft.birthdate)
    case 'tags':
      return draft.tagIds.length > 0
  }
}

/**
 * "Email, Phone, Birthday and Tags" — not "Email and Phone and Birthday and
 * Tags", which is what a plain `join(' and ')` gave once there were more than
 * two of these.
 */
function listOf(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * One labelled row. A `<span>` and not a `<label>`: neither of these wraps a
 * single form control — BirthdayField is three, TagPicker is a list of
 * buttons — and a `<label>` pointing at nothing is worse for a screen reader
 * than a plain heading is.
 */
function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <span className={label}>{name}</span>
      {children}
    </div>
  )
}
