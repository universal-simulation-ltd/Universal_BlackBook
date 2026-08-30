// The phone's own address book — the one door into this app that does not go
// through a file.
//
// ── Why this exists ──────────────────────────────────────────────────────────
//
// BlackBook's whole point is the Notes field: private things about people you
// would not put in the contact card your phone syncs to iCloud. But nobody
// wants to re-type a name, an email and a number that are already on the
// device to get there. So: pick a person from the system contacts, and BlackBook
// opens its form with the boring fields already filled in, ready for the part
// that is actually yours.
//
// ⚠️ **Nothing is read without the user choosing it, and nothing is written
// back — ever.** The plugin can create and delete system contacts; those
// methods are deliberately not wrapped here. This app reads, once, what the
// user pointed at.
//
// ── The three platforms ──────────────────────────────────────────────────────
//
//   native (iOS)   @capacitor-community/contacts → CNContactPickerViewController
//                  for one person, or the whole store for a bulk import.
//   Chrome/Android The web Contact Picker API, which is a different thing with
//                  a similar shape — see `pickViaWeb`.
//   everywhere else  Not available. The UI hides the button and points at CSV,
//                  which is the door that works in every browser.

// ⚠️ A STATIC import, and it must stay one. This was a lazy
// `await import('@capacitor-community/contacts')` — to keep ~9KB of plugin
// JavaScript out of the web bundle — and inside the Capacitor WebView **that
// import never settled**. Not rejected: pending, forever. So the button did
// nothing at all, with no error, no permission prompt, and no bridge call:
// the native side was never reached, which is why nothing in the device log
// mentioned Contacts. Proved by putting the call on a timer and reading
// `simctl launch --console-pty`: with the lazy import there is no
// `To Native -> Contacts pickContact` line at all, and with this one there
// is, followed by the iOS permission alert.
//
// The cause is Vite's `__vitePreload` wrapper around a code-split chunk under
// the `capacitor://localhost` scheme. **Never lazily import a Capacitor plugin
// in this suite** — the saving is a few KB and the failure mode is silence.
import { Capacitor } from '@capacitor/core'
import { Contacts, type ContactPayload } from '@capacitor-community/contacts'
import { parseBirthdayInput } from './birthday'
import { digits, fold } from './filter'
import { newId } from './id'
import type { Contact } from './types'
import type { ContactDraft } from '../stores/bookStore'

/** What a picked person looks like before it becomes a Contact. */
export type PickedContact = Omit<ContactDraft, 'id'>

/** Everything this app has any use for. Nothing else is requested. */
const PROJECTION = { name: true, phones: true, emails: true, birthday: true } as const

export type Availability = 'native' | 'web' | 'none'

/**
 * Can this device offer its contacts at all?
 *
 * Feature-detected rather than user-agent sniffed, and `navigator.contacts` is
 * checked for `select` specifically — the property name is generic enough that
 * an unrelated extension could own it, and calling a stranger's function is a
 * worse failure than not offering the button.
 */
export function contactsAvailability(): Availability {
  if (Capacitor.isNativePlatform()) return 'native'
  const web = (navigator as NavigatorWithContacts).contacts
  return typeof web?.select === 'function' ? 'web' : 'none'
}

interface NavigatorWithContacts extends Navigator {
  contacts?: {
    select?: (
      properties: string[],
      options?: { multiple?: boolean },
    ) => Promise<{ name?: string[]; email?: string[]; tel?: string[] }[]>
  }
}

/** The user said no, or was never asked. Separated so the UI can say so. */
export class ContactsPermissionError extends Error {
  constructor() {
    super('BlackBook was not allowed to read your contacts.')
    this.name = 'ContactsPermissionError'
  }
}

/**
 * The system picker, for ONE person.
 *
 * ⚠️ **A cancelled pick never settles this promise.** The iOS plugin saves the
 * Capacitor call and resolves it from `contactPicker(_:didSelect:)` — and it
 * implements no `contactPickerDidCancel(_:)`, so closing the picker without
 * choosing anybody leaves the saved call hanging for the lifetime of the app.
 * That is upstream behaviour (@capacitor-community/contacts 7.2.0), not
 * something this wrapper can fix from JavaScript: there is no event to listen
 * for. **Callers must therefore never disable the button they are awaiting**,
 * or a single cancel takes the feature away until the app is restarted. See
 * how App.tsx handles it.
 */
export async function pickOneContact(): Promise<PickedContact | null> {
  const where = contactsAvailability()
  if (where === 'none') return null
  if (where === 'web') return pickViaWeb()

  try {
    const { contact } = await Contacts.pickContact({ projection: { ...PROJECTION } })
    return toDraft(contact)
  } catch (e) {
    throw asPermissionError(e)
  }
}

/**
 * Every contact on the device, for the bulk import.
 *
 * Unlike the picker this genuinely needs the permission — it reads the whole
 * store — so it asks first and reports a refusal as something the UI can
 * explain rather than as a raw plugin string.
 */
export async function readAllContacts(): Promise<PickedContact[]> {
  if (!Capacitor.isNativePlatform()) return []
  const permission = await Contacts.requestPermissions()
  // 'limited' is iOS 18's partial access — the user picked some contacts to
  // share. That is a yes to exactly those, and reading them is correct.
  if (permission.contacts !== 'granted' && permission.contacts !== 'limited') {
    throw new ContactsPermissionError()
  }
  try {
    const { contacts } = await Contacts.getContacts({ projection: { ...PROJECTION } })
    return contacts.map(toDraft).filter((c) => c.name.trim() || c.email.trim() || c.phone.trim())
  } catch (e) {
    throw asPermissionError(e)
  }
}

function asPermissionError(e: unknown): Error {
  const message = e instanceof Error ? e.message : String(e)
  // The plugin rejects with this exact sentence from `permissionCallback`.
  // Matched on the distinctive half rather than the whole string, so a
  // reworded upstream message still has a chance of being recognised.
  if (/permission/i.test(message)) return new ContactsPermissionError()
  return e instanceof Error ? e : new Error(message)
}

/**
 * One system contact → one BlackBook draft.
 *
 * The lossy decisions, all in one place and all the same shape — this app
 * holds ONE of each field and a phone holds a list:
 *
 *   • **The primary number wins**, else the first one. Not "mobile", because
 *     the type is a label the contact's owner chose and half of everybody's
 *     mobiles are filed under "home".
 *   • **The primary email wins**, else the first.
 *   • **Tags and notes come across empty.** A system contact's note field is
 *     not requested at all: it is the phone's copy of a thought, this app is
 *     for a private one, and silently seeding the field people came here to
 *     write is presumptuous.
 *   • **A birthday with no year survives as one.** iOS stores a year-less
 *     birthday as a null year, which is exactly this app's `--MM-DD`, so it
 *     round-trips rather than being guessed at or dropped.
 */
export function toDraft(contact: ContactPayload): PickedContact {
  const name = contact.name?.display?.trim() || joinName(contact) || ''
  const phones = contact.phones ?? []
  const emails = contact.emails ?? []
  const phone = (phones.find((p) => p.isPrimary) ?? phones[0])?.number ?? ''
  const email = (emails.find((e) => e.isPrimary) ?? emails[0])?.address ?? ''
  return {
    name,
    email: email.trim(),
    phone: phone.trim(),
    tagIds: [],
    notes: '',
    birthdate: toBirthdate(contact.birthday),
  }
}

function joinName(contact: ContactPayload): string {
  const n = contact.name
  if (!n) return ''
  return [n.given, n.middle, n.family].filter(Boolean).join(' ').trim()
}

/**
 * `{ day, month, year }` → this app's birthday string.
 *
 * Routed through `parseBirthdayInput` rather than formatted here so there is
 * one validator: a month of 0 or a day of 32 out of some sync'd calendar is
 * rejected by the same code that rejects it from a CSV.
 */
function toBirthdate(birthday: ContactPayload['birthday']): string | undefined {
  if (!birthday?.month || !birthday?.day) return undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  const stem = `${pad(birthday.month)}-${pad(birthday.day)}`
  return parseBirthdayInput(birthday.year ? `${birthday.year}-${stem}` : `--${stem}`)
}

/**
 * The web Contact Picker API — Chrome on Android, and nothing else today.
 *
 * ⚠️ Untested on a device from this workspace, and deliberately kept to the
 * three properties every implementation of the spec has. There is no birthday
 * in the API at all, so an Android pick brings across a name, an email and a
 * number and no more. Cancelling here resolves with an EMPTY ARRAY, which is
 * the sane behaviour the native plugin is missing.
 */
async function pickViaWeb(): Promise<PickedContact | null> {
  const api = (navigator as NavigatorWithContacts).contacts
  if (!api?.select) return null
  const picked = await api.select(['name', 'email', 'tel'], { multiple: false })
  const first = picked[0]
  if (!first) return null
  return {
    name: (first.name?.[0] ?? '').trim(),
    email: (first.email?.[0] ?? '').trim(),
    phone: (first.tel?.[0] ?? '').trim(),
    tagIds: [],
    notes: '',
    birthdate: undefined,
  }
}

// ─────────────────────── the bulk import

/**
 * A key for "this is the same person I already have".
 *
 * Two keys per contact, either of which is enough: name + email, and name +
 * phone digits. The name is always in there because an address book
 * legitimately holds a shared household number and a shared family email, and
 * matching on the number alone would silently drop the second person in the
 * house.
 *
 * The phone goes through `digits` for the reason `Contact.phone` explains: the
 * same number is written five ways, and the copy in the system contacts is
 * rarely punctuated the way the copy typed in here was.
 */
function identityKeys(c: { name: string; email: string; phone: string }): string[] {
  const name = fold(c.name)
  const keys: string[] = []
  if (c.email.trim()) keys.push(`${name} e:${fold(c.email)}`)
  if (c.phone.trim()) keys.push(`${name} p:${digits(c.phone)}`)
  // Someone with a name and nothing else can still be matched — otherwise a
  // second import of the same phone re-adds every name-only contact.
  if (keys.length === 0 && name) keys.push(`${name} only`)
  return keys
}

export interface BulkImport {
  /** New people, ready for the store. */
  contacts: Contact[]
  /** Already in the book, by the rule above. */
  duplicates: number
}

/**
 * Turn what the phone handed over into contacts to add, minus the people
 * already in the book.
 *
 * Deduplicating rather than offering merge-or-replace is deliberate: this is
 * the one import where running it twice is the NORMAL thing to do — you add
 * three people to your phone and pull them in — and an importer that answers
 * that with 400 duplicates is one people use exactly once.
 */
export function planBulkImport(picked: PickedContact[], existing: Contact[]): BulkImport {
  const seen = new Set(existing.flatMap(identityKeys))
  const now = Date.now()
  const contacts: Contact[] = []
  let duplicates = 0
  for (const p of picked) {
    const keys = identityKeys(p)
    if (keys.some((k) => seen.has(k))) {
      duplicates++
      continue
    }
    // Added to the set as we go, so a phone holding the same person twice —
    // which happens, via two accounts syncing the same card — is caught too.
    for (const k of keys) seen.add(k)
    contacts.push({
      id: newId(),
      name: p.name || p.email || p.phone,
      email: p.email,
      phone: p.phone,
      tagIds: [],
      birthdate: p.birthdate,
      notes: '',
      createdAt: now,
      updatedAt: now,
    })
  }
  return { contacts, duplicates }
}
