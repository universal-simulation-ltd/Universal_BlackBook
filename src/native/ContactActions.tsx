/* eslint-disable react-refresh/only-export-components -- hooks and helpers live beside the components that use them; hot reload of these few files is not worth splitting them */
// Call · Message · Email · Share, across the top of a contact's page — the
// phone doing what a phone does with a person (store-listings §7: native
// things first). Each hands straight to the phone's own app or sheet: the
// dialler, Messages, Mail, and the system share sheet with the person as text.
// A button with nothing to act on stays in its place, dimmed, so the row never
// shifts from one person to the next.

import { Capacitor } from '@capacitor/core'
import type { Contact } from '../lib/types'
import { formatBirthday } from '../lib/birthday'
import { useT } from '../i18n'
import { IconMail, IconMessage, IconPhone, IconShare } from './icons'
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

export function ContactActions({ contact }: { contact: Contact }) {
  const t = useT()
  const say = useNativeNav((s) => s.say)
  const phone = contact.phone.trim()
  const email = contact.email.trim()

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
      <ActionButton label={t('action_call')} disabled={!phone} onClick={() => go(`tel:${dial(phone)}`)}>
        <IconPhone />
      </ActionButton>
      <ActionButton label={t('action_message')} disabled={!phone} onClick={() => go(`sms:${dial(phone)}`)}>
        <IconMessage />
      </ActionButton>
      <ActionButton label={t('action_email')} disabled={!email} onClick={() => go(`mailto:${email}`)}>
        <IconMail />
      </ActionButton>
      <ActionButton label={t('action_share')} onClick={() => void share()}>
        <IconShare />
      </ActionButton>
    </div>
  )
}

function ActionButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="bb-action"
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick()
      }}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
