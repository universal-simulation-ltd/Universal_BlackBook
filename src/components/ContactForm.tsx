import { useState, type FormEvent } from 'react'
import { blankDraft, draftIsEmpty, useBookStore, type ContactDraft } from '../stores/bookStore'
import { BirthdayField } from './BirthdayField'
import { TagPicker } from './TagPicker'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, inputCls, label, textareaCls } from './ui'

/**
 * Add or edit one person. Five fields, in the order they matter.
 *
 * ⚠️ **Notes sits third, directly under Name and Email**, above tags and the
 * birthday. It is the field with the most in it and the one people came to
 * write — "met at the Leeds conference, two kids" is why they opened the form
 * — and it used to be last, below two pickers, which put the main event below
 * the fold on a phone.
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

  const existing = id === 'new' ? undefined : contacts.find((c) => c.id === id)
  const restorable = id === 'new' && stashed !== null && !draftIsEmpty(stashed)

  const [draft, setDraft] = useState<ContactDraft>(() =>
    existing
      ? {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          tagIds: existing.tagIds,
          birthdate: existing.birthdate,
          notes: existing.notes,
        }
      : restorable
        ? stashed
        : blankDraft(),
  )
  /** Is the "you were part way through" bar still showing? */
  const [offering, setOffering] = useState(restorable)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

        <div>
          <span className={label}>Tags</span>
          <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
        </div>

        <div>
          <span className={label}>Birthday</span>
          <BirthdayField value={draft.birthdate} onChange={(birthdate) => patch({ birthdate })} />
        </div>

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
