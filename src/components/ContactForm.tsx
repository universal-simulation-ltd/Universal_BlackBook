import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { blankDraft, draftIsEmpty, useBookStore, type ContactDraft } from '../stores/bookStore'
import { BirthdayField } from './BirthdayField'
import { TagPicker } from './TagPicker'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, inputCls, label, textareaCls } from './ui'

/**
 * Add or edit one person. Six fields, in the order they matter.
 *
 * ⚠️ **Notes sits above the two pickers**, directly under the three identity
 * fields. It is the field with the most in it and the one people came to write
 * — "met at the Leeds conference, two kids" is why they opened the form — and
 * it used to be last, below both pickers, which put the main event below the
 * fold on a phone.
 *
 * ⚠️ **Tags are LAST, below the birthday** (owner's call, 2026-08-30). They
 * were above it, which is the wrong way round for how the form is actually
 * filled in: a birthday is a fact you either have to hand or do not, and tags
 * are a decision — and a decision that opens a picker, adds rows to the
 * dialog, and can create a tag mid-form has no business standing between the
 * typing and the Save button.
 *
 * ⚠️ **And both of them are folded behind "More" unless they hold something**
 * (owner's call, 2026-08-30, from the phone). Four fields fit above the fold
 * on a phone and six do not, and the two that got cut are the two nobody fills
 * in most of the time — but a birthday you HAVE recorded has to be visible
 * when you open the contact, or the form is lying about what it holds. So the
 * split is by content, not by field: anything with a value sits out in the
 * open, and only the empty ones hide.
 *
 * ⚠️ The split is decided ONCE, at mount, and deliberately does not re-run.
 * Recomputing it would make a field you just filled in inside "More" jump out
 * of the section you are looking at and land somewhere else on the page,
 * mid-edit. Same reasoning as the `stashed` read above.
 *
 * Validation is deliberately thin: a name OR an email is enough. A real
 * address book is full of half-known people — someone you have an email for
 * and no surname, someone whose email you have lost — and an app that refuses
 * to record them is an app people keep a second list alongside.
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
  const moreId = useId()

  // Which of the two optional fields arrived with something in them. Read from
  // the draft's INITIAL value and never again — see the note above.
  const [pinned] = useState<Extra[]>(() =>
    EXTRAS.filter((k) => (k === 'birthday' ? Boolean(draft.birthdate) : draft.tagIds.length > 0)),
  )
  const hidden = EXTRAS.filter((k) => !pinned.includes(k))

  const patch = (p: Partial<ContactDraft>) => setDraft((d) => ({ ...d, ...p }))
  const valid = Boolean(draft.name.trim() || draft.email.trim())

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

        <div>
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

        <div>
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

        <div>
          <label className={label} htmlFor="cf-notes">
            Notes
          </label>
          <textarea
            id="cf-notes"
            className={textareaCls}
            rows={4}
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Met at the Leeds conference. Two kids. Allergic to shellfish."
          />
        </div>

        {pinned.map((k) => (
          <Field key={k} name={EXTRA_LABELS[k]}>
            {k === 'birthday' ? (
              <BirthdayField value={draft.birthdate} onChange={(birthdate) => patch({ birthdate })} />
            ) : (
              <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
            )}
          </Field>
        ))}

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
                {hidden.map((k) => EXTRA_LABELS[k]).join(' and ')}
                <svg
                  viewBox="0 0 16 16"
                  className={`h-3.5 w-3.5 transition-transform ${more ? 'rotate-180' : ''}`}
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
                {hidden.map((k) => (
                  <Field key={k} name={EXTRA_LABELS[k]}>
                    {k === 'birthday' ? (
                      <BirthdayField value={draft.birthdate} onChange={(birthdate) => patch({ birthdate })} />
                    ) : (
                      <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
                    )}
                  </Field>
                ))}
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
          <p className="text-xs text-slate-500">Give them a name or an email — either one is enough.</p>
        )}
      </form>
    </Modal>
  )
}

/**
 * The two fields that fold away when empty. In render order, which is also the
 * order they are listed in on the "More" button.
 */
const EXTRAS = ['birthday', 'tags'] as const
type Extra = (typeof EXTRAS)[number]

const EXTRA_LABELS: Record<Extra, string> = { birthday: 'Birthday', tags: 'Tags' }

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
