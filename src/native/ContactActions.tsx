/* eslint-disable react-refresh/only-export-components -- hooks and helpers live beside the components that use them; hot reload of these few files is not worth splitting them */
// Call · Message · Share · More, across the top of a contact's page — the
// phone doing what a phone does with a person (store-listings §7: native
// things first). Each hands straight to the phone's own app or sheet: the
// dialler, Messages, Mail, and the system share sheet with the person as text.
// With no number, Call and Message stay in place, fainter, and offer to add
// one, so the row never shifts from one person to the next.

import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { AddField } from '../components/ContactMore'
import { contactsAvailability, ContactsPermissionError, pickOneContact } from '../lib/deviceContacts'
import { useBookStore } from '../stores/bookStore'
import { IconContactsBook, IconPlus } from './icons'
import { Sheet, SheetRow } from './layers'
import type { Contact } from '../lib/types'
import { formatBirthday } from '../lib/birthday'
import { useT } from '../i18n'
import { IconMessage, IconMore, IconPhone, IconShare } from './icons'
import { useNativeNav } from './nav'

/** The digits a dialler wants, from the number exactly as typed (see Contact.phone). */
const dial = (phone: string) => phone.replace(/[^\d+]/g, '')

/** The person as plain text: what the share sheet hands on. Never the note — it is private. */
export function contactText(c: Contact): string {
  return [c.name, c.company, c.phone, c.email, c.address, c.birthdate ? formatBirthday(c.birthdate) : '']
    .map((v) => (v ?? '').trim())
    .filter(Boolean)
    .join('\n')
}

export function ContactActions({ contact, onMore }: { contact: Contact; onMore: () => void }) {
  const t = useT()
  const say = useNativeNav((s) => s.say)
  const patch = useBookStore((s) => s.patchContact)
  const phone = contact.phone.trim()
  // No number yet: Call and Message offer to add one rather than sitting there
  // dimmed (James, 2026-10-25) — typed in, or taken from the phone's contacts.
  const [noPhone, setNoPhone] = useState<'menu' | 'add' | null>(null)
  const canPick = contactsAvailability() !== 'none'

  const importPhone = async () => {
    setNoPhone(null)
    try {
      const picked = await pickOneContact()
      if (!picked) return
      if (!picked.phone.trim()) return say(t('more.picked_no_phone', { name: picked.name || t('c.unnamed') }))
      await patch(contact.id, { phone: picked.phone.trim() })
    } catch (e) {
      say(e instanceof ContactsPermissionError ? t('pick.denied') : t('pick.failed'))
    }
  }

  const share = async () => {
    const text = contactText(contact)
    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share')
        await Share.share({ title: contact.name, text, dialogTitle: contact.name })
      } else if (navigator.share) {
        await navigator.share({ title: contact.name, text })
      } else {
        await navigator.clipboard.writeText(text)
        say(t('share_copied'))
      }
    } catch {
      // Closing the share sheet rejects; that is a decision, not a fault.
    }
  }

  const go = (href: string) => {
    window.location.href = href
  }

  return (
    <div className="bb-actions mb-5" role="group" aria-label={t('actions_label')}>
      <ActionButton label={t('action_call')} muted={!phone} onClick={() => (phone ? go(`tel:${dial(phone)}`) : setNoPhone('menu'))}>
        <IconPhone />
      </ActionButton>
      <ActionButton label={t('action_message')} muted={!phone} onClick={() => (phone ? go(`sms:${dial(phone)}`) : setNoPhone('menu'))}>
        <IconMessage />
      </ActionButton>
      <ActionButton label={t('action_share')} onClick={() => void share()}>
        <IconShare />
      </ActionButton>
      {/* Email moved into ⋯ with the other secondary actions (James,
          2026-10-25); the row keeps four buttons. */}
      <ActionButton label={t('action_more')} onClick={onMore}>
        <IconMore />
      </ActionButton>
      {noPhone === 'menu' && (
        <Sheet title={t('more.no_phone_title')} onClose={() => setNoPhone(null)}>
          <SheetRow icon={<IconPlus />} onClick={() => setNoPhone('add')}>
            {t('more.add_phone')}
          </SheetRow>
          {canPick && (
            <SheetRow icon={<IconContactsBook />} onClick={() => void importPhone()}>
              {t('more.import_phone')}
            </SheetRow>
          )}
        </Sheet>
      )}
      {noPhone === 'add' && (
        <Sheet title={t('more.add_phone')} onClose={() => setNoPhone(null)}>
          <AddField
            label={t('field.phone')}
            type="tel"
            onCancel={() => setNoPhone(null)}
            onSave={(v) => {
              setNoPhone(null)
              void patch(contact.id, { phone: v })
            }}
          />
        </Sheet>
      )}
    </div>
  )
}

function ActionButton({
  label,
  muted = false,
  onClick,
  children,
}: {
  label: string
  /** Drawn fainter (no number yet) but still tappable: it offers to add one. */
  muted?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" className={`bb-action${muted ? ' muted' : ''}`} aria-haspopup={muted ? 'dialog' : undefined} onClick={onClick}>
      {children}
      <span>{label}</span>
    </button>
  )
}
