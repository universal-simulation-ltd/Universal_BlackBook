import { useState, type FormEvent } from 'react'
import { FREQUENCIES } from '../lib/frequency'
import type { Frequency } from '../lib/types'
import { blankDraft, useBookStore, type ContactDraft } from '../stores/bookStore'
import { BirthdayField } from './BirthdayField'
import { CategoryPicker } from './CategoryPicker'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, inputCls, label, selectCls, textareaCls } from './ui'

/**
 * Add or edit one person. The six fields, in the order they matter.
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

  const existing = id === 'new' ? undefined : contacts.find((c) => c.id === id)
  const [draft, setDraft] = useState<ContactDraft>(() =>
    existing
      ? {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          categoryIds: existing.categoryIds,
          frequency: existing.frequency,
          birthdate: existing.birthdate,
          notes: existing.notes,
        }
      : blankDraft(),
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patch = (p: Partial<ContactDraft>) => setDraft((d) => ({ ...d, ...p }))
  const valid = Boolean(draft.name.trim() || draft.email.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    void saveContact(draft)
  }

  return (
    <Modal title={existing ? 'Edit contact' : 'Add someone'} onClose={() => close(null)}>
      <form onSubmit={submit} className="space-y-4">
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
          <span className={label}>Categories</span>
          <CategoryPicker value={draft.categoryIds} onChange={(categoryIds) => patch({ categoryIds })} />
        </div>

        <div>
          <label className={label} htmlFor="cf-frequency">
            Contact frequency
          </label>
          <select
            id="cf-frequency"
            className={`${selectCls} w-full`}
            value={draft.frequency}
            onChange={(e) => patch({ frequency: e.target.value as Frequency })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            How often you'd like to be in touch. BlackBook records it and lets you filter by it — it never
            nags you.
          </p>
        </div>

        <div>
          <span className={label}>Birthday</span>
          <BirthdayField value={draft.birthdate} onChange={(birthdate) => patch({ birthdate })} />
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
              <button type="button" className={btnGhost} onClick={() => close(null)}>
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
