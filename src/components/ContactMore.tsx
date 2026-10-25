import { useId, useState, type ReactNode } from 'react'
import type { Contact } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { usePhoneKit } from '../native/kit'
import { useT } from '../i18n'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, inputCls, label } from './ui'

/**
 * "⋯" on a contact's view (James, 2026-10-25: "replace the email action at the
 * top with … containing Email, Add notification and the other secondary
 * actions"). A bottom sheet on the phone, a small dialog on the website: the
 * same rows either way. Each row either does its job at once (pin, hide) or
 * turns the sheet into the one question it needs (an email address, "Delete
 * Sam?").
 */
export type MoreStep = 'menu' | 'email' | 'delete'

export function ContactMore({
  contact,
  onClose,
  extraRows,
  start = 'menu',
}: {
  contact: Contact
  onClose: () => void
  /** Rows a later feature adds (Add notification), above pin and hide. */
  extraRows?: (close: () => void) => ReactNode
  start?: MoreStep
}) {
  const t = useT()
  const [step, setStep] = useState<MoreStep>(start)
  const patch = useBookStore((s) => s.patchContact)
  const setPinned = useBookStore((s) => s.setPinned)
  const setListHidden = useBookStore((s) => s.setListHidden)
  const setBirthdayHidden = useBookStore((s) => s.setBirthdayHidden)
  const removeContact = useBookStore((s) => s.removeContact)
  const name = contact.name || t('c.unnamed')
  const email = contact.email.trim()

  const run = (f: () => unknown) => () => {
    void f()
    onClose()
  }

  if (step === 'email') {
    return (
      <Modal phone="sheet" title={t('more.add_email')} onClose={onClose}>
        <AddField
          label={t('field.email')}
          type="email"
          onCancel={onClose}
          onSave={(v) => {
            void patch(contact.id, { email: v })
            onClose()
          }}
        />
      </Modal>
    )
  }

  if (step === 'delete') {
    return (
      <Modal phone="sheet" title={t('del.title')} onClose={onClose}>
        <p className="text-sm text-slate-300">
          {t('del.ask_before')}
          <span className="font-semibold text-slate-100">{name}</span>
          {t('del.ask_after')}
        </p>
        <p className="mt-2 text-sm text-slate-500">{t('del.body')}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            {t('c.keep')}
          </button>
          <button type="button" className={btnDanger} onClick={run(() => removeContact(contact.id))}>
            {t('c.delete')}
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal phone="sheet" title={name} onClose={onClose}>
      <div className="flex flex-col">
        {email ? (
          <MoreRow
            icon={<MailGlyph />}
            note={email}
            onClick={() => {
              window.location.href = `mailto:${email}`
              onClose()
            }}
          >
            {t('more.email')}
          </MoreRow>
        ) : (
          <MoreRow icon={<MailGlyph />} onClick={() => setStep('email')}>
            {t('more.add_email')}
          </MoreRow>
        )}
        {extraRows?.(onClose)}
        <MoreRow icon={<PinGlyph />} onClick={run(() => setPinned(contact.id, !contact.pinnedAt))}>
          {contact.pinnedAt ? t('more.unpin') : t('more.pin')}
        </MoreRow>
        <MoreRow icon={<EyeGlyph />} onClick={run(() => setListHidden(contact.id, !contact.hideFromList))}>
          {contact.hideFromList ? t('row.show_list_title') : t('row.hide_list_title')}
        </MoreRow>
        {contact.birthdate && (
          <MoreRow icon={<CakeGlyph />} onClick={run(() => setBirthdayHidden(contact.id, !contact.hideBirthday))}>
            {contact.hideBirthday ? t('row.show_birthdays_title') : t('row.hide_birthdays_title')}
          </MoreRow>
        )}
        <MoreRow icon={<BinGlyph />} danger onClick={() => setStep('delete')}>
          {t('c.delete')}
        </MoreRow>
      </div>
    </Modal>
  )
}

/** One row of the sheet: the phone's sheet row there, a menu row on the website. */
export function MoreRow({
  children,
  note,
  icon,
  danger = false,
  onClick,
}: {
  children: ReactNode
  note?: string
  icon?: ReactNode
  danger?: boolean
  onClick: () => void
}) {
  const kit = usePhoneKit()
  const cls = kit
    ? `bb-sheetrow${danger ? ' danger' : ''}`
    : `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
        danger ? 'text-rose-300' : 'text-slate-200'
      }`
  return (
    <button type="button" className={cls} onClick={onClick}>
      {icon && (
        <span className={kit ? 'bb-sheetrow-icon' : 'inline-flex w-5 justify-center text-orange-400'} aria-hidden>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="block">{children}</span>
        {note && <span className="block truncate text-xs text-slate-500">{note}</span>}
      </span>
    </button>
  )
}

/** One box and Save: an email address or a phone number added from the view. */
export function AddField({
  label: name,
  type,
  onSave,
  onCancel,
}: {
  label: string
  type: 'email' | 'tel'
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const t = useT()
  const id = useId()
  const [value, setValue] = useState('')
  const ok = value.trim() !== ''
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onSave(value.trim())
      }}
    >
      <label htmlFor={id} className={label}>
        {name}
      </label>
      <input
        id={id}
        className={inputCls}
        type={type}
        inputMode={type}
        autoComplete={type === 'email' ? 'email' : 'tel'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onCancel}>
          {t('c.cancel')}
        </button>
        <button type="submit" className={btnPrimary} disabled={!ok}>
          {t('c.save')}
        </button>
      </div>
    </form>
  )
}

const g = {
  viewBox: '0 0 24 24',
  className: 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}
export const MailGlyph = () => (
  <svg {...g}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
)
const PinGlyph = () => (
  <svg {...g}>
    <path d="M9 3h6l-1 6 3 3H7l3-3-1-6ZM12 12v9" />
  </svg>
)
const EyeGlyph = () => (
  <svg {...g}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)
const CakeGlyph = () => (
  <svg {...g}>
    <path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7ZM4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M12 11V8M12 5.5v.01" />
  </svg>
)
const BinGlyph = () => (
  <svg {...g}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
  </svg>
)
export const BellGlyph = () => (
  <svg {...g}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0" />
  </svg>
)
