/* eslint-disable react-refresh/only-export-components -- hooks and helpers live beside the components that use them; hot reload of these few files is not worth splitting them */
// The buttons across the top of a contact's page — the phone doing what a
// phone does with a person (store-listings §7: native things first). Each
// hands straight to the phone's own app or sheet: the dialler, Messages, Mail,
// and the system share sheet with the person as text. Since 2026-10-27 the
// same emoji row as a note's (components/QuickActions): four places, Call ·
// Message · Share and a "+" to start, the person's own pick and order after
// that. With no number, Call and Message stay where they are, fainter, and
// offer to add one; Email the same with no address.

import { useState } from 'react'
import { AddField } from '../components/ContactMore'
import { QuickActions, type QuickButton } from '../components/QuickActions'
import { contactsAvailability, ContactsPermissionError, pickOneContact } from '../lib/deviceContacts'
import { CONTACT_ACTIONS, type ContactAction } from '../lib/quickActions'
import { copyText } from '../lib/clipboard'
import { shareText } from '../lib/share'
import { useBookStore } from '../stores/bookStore'
import { useSettingsStore } from '../stores/settingsStore'
import { IconContactsBook, IconPlus } from './icons'
import { Sheet, SheetRow } from './layers'
import type { Contact } from '../lib/types'
import { formatBirthday } from '../lib/birthday'
import { useT } from '../i18n'
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

export function ContactActions({ contact, onRemind }: { contact: Contact; onRemind: () => void }) {
  const t = useT()
  const say = useNativeNav((s) => s.say)
  const patch = useBookStore((s) => s.patchContact)
  const setPinned = useBookStore((s) => s.setPinned)
  const order = useSettingsStore((s) => s.contactActions)
  const setSettings = useSettingsStore((s) => s.set)
  const phone = contact.phone.trim()
  const email = contact.email.trim()
  // No number yet: Call and Message offer to add one rather than sitting there
  // dimmed (James, 2026-10-25) — typed in, or taken from the phone's contacts.
  const [noPhone, setNoPhone] = useState<'menu' | 'add' | null>(null)
  const [addEmail, setAddEmail] = useState(false)
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
    const done = await shareText(contact.name, contactText(contact))
    if (done === 'copied') say(t('share_copied'))
    else if (done === 'failed') say(t('export.copy_failed'))
  }

  const go = (href: string) => {
    window.location.href = href
  }

  const pinned = contact.pinnedAt !== undefined
  const buttons: Record<ContactAction, QuickButton> = {
    call: { label: t('action_call'), emoji: '\u{1F4DE}', muted: !phone, onClick: () => (phone ? go(`tel:${dial(phone)}`) : setNoPhone('menu')) },
    message: { label: t('action_message'), emoji: '\u{1F4AC}', muted: !phone, onClick: () => (phone ? go(`sms:${dial(phone)}`) : setNoPhone('menu')) },
    email: { label: t('action_email'), emoji: '\u{2709}\u{FE0F}', muted: !email, onClick: () => (email ? go(`mailto:${email}`) : setAddEmail(true)) },
    share: { label: t('action_share'), emoji: '\u{1F4E4}', onClick: () => void share() },
    remind: { label: t('rem.add'), emoji: '\u{1F514}', onClick: onRemind },
    copy: {
      label: t('notes.copy'),
      emoji: '\u{1F4CB}',
      onClick: () => void copyText(contactText(contact)).then((ok) => say(ok ? t('share_copied') : t('export.copy_failed'))),
    },
    pin: {
      label: pinned ? t('more.unpin') : t('more.pin'),
      emoji: '\u{1F4CC}',
      pressed: pinned,
      onClick: () => void setPinned(contact.id, !pinned),
    },
  }

  return (
    <>
      <QuickActions buttons={buttons} all={CONTACT_ACTIONS} order={order} onChange={(contactActions) => setSettings({ contactActions })} label={t('actions_label')} />
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
      {addEmail && (
        <Sheet title={t('more.add_email')} onClose={() => setAddEmail(false)}>
          <AddField
            label={t('field.email')}
            type="email"
            onCancel={() => setAddEmail(false)}
            onSave={(v) => {
              setAddEmail(false)
              void patch(contact.id, { email: v })
            }}
          />
        </Sheet>
      )}
    </>
  )
}
