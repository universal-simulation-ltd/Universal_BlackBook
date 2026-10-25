import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  ContactsPermissionError,
  openDeviceContact,
  pickOneContact,
  readDeviceContact,
  type PickedContact,
} from '../lib/deviceContacts'
import type { Contact } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { useNativeNav } from '../native/nav'
import { useT } from '../i18n'
import { btnGhost, btnSubtle, label } from './ui'

/**
 * Linked to a phone contact (James, 2026-10-25), on the contact form: pick
 * the person from the phone's own contacts, and the form shows "Linked to
 * phone contact" with Open in Contacts, Update from phone contact and Unlink.
 *
 * The link is written straight away (it is not one of the form's fields), and
 * "Update from phone contact" fills the FORM's boxes, so what it brings in is
 * seen, and kept or not, with the form's own Save.
 *
 * Phone only: the identifier is the phone's, so the website (or another phone)
 * shows the link and nothing to do with it.
 */
export function PhoneContactLink({ contact, onUpdate }: { contact: Contact; onUpdate: (picked: PickedContact) => void }) {
  const t = useT()
  const patch = useBookStore((s) => s.patchContact)
  const say = useNativeNav((s) => s.say)
  const [problem, setProblem] = useState<string | null>(null)
  const native = Capacitor.isNativePlatform()
  const link = contact.phoneLink
  const tell = (m: string) => setProblem(m)

  if (!native && !link) return null

  const linkOne = async () => {
    setProblem(null)
    try {
      const picked = await pickOneContact()
      if (!picked) return
      if (!picked.deviceContactId) return tell(t('link.no_id'))
      await patch(contact.id, { phoneLink: { id: picked.deviceContactId, name: picked.name } })
    } catch (e) {
      tell(e instanceof ContactsPermissionError ? t('pick.denied') : t('pick.failed'))
    }
  }

  const update = async () => {
    if (!link) return
    setProblem(null)
    try {
      const found = await readDeviceContact(link.id)
      if (!found) return tell(t('link.gone'))
      onUpdate(found)
      say(t('link.updated'))
    } catch (e) {
      tell(e instanceof ContactsPermissionError ? t('pick.denied') : t('pick.failed'))
    }
  }

  const open = async () => {
    if (!link) return
    setProblem(null)
    if (!(await openDeviceContact(link.id))) tell(t('link.gone'))
  }

  return (
    <div>
      <span className={label}>{t('link.title')}</span>
      {link ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
          <p className="flex items-center gap-2 text-sm text-slate-200">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
            </svg>
            <span className="min-w-0 break-words">
              {t('link.linked')}
              {link.name && <span className="text-slate-400"> · {link.name}</span>}
            </span>
          </p>
          {native ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={() => void open()}>
                {t('link.open')}
              </button>
              <button type="button" className={btnGhost} onClick={() => void update()}>
                {t('link.update')}
              </button>
              <button type="button" className={btnSubtle} onClick={() => void patch(contact.id, { phoneLink: undefined })}>
                {t('link.unlink')}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{t('link.web_only')}</p>
          )}
        </div>
      ) : (
        <button type="button" className={btnGhost} onClick={() => void linkOne()}>
          {t('link.link')}
        </button>
      )}
      {problem && (
        <p className="mt-1.5 text-xs text-rose-300" role="alert">
          {problem}
        </p>
      )}
    </div>
  )
}
