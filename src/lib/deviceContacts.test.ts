import { describe, expect, it } from 'vitest'
import type { ContactPayload } from '@capacitor-community/contacts'
import { planBulkImport, toDraft } from './deviceContacts'
import type { Contact } from './types'

/** A system contact, as the plugin hands it over — every field optional. */
const payload = (over: Partial<ContactPayload> = {}): ContactPayload => ({
  contactId: 'sys-1',
  ...over,
})

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Sam Okonkwo',
  email: '',
  phone: '',
  tagIds: [],
  notes: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

describe('toDraft', () => {
  it('takes the display name when there is one', () => {
    const d = toDraft(
      payload({
        name: { display: 'Sam Okonkwo', given: 'Sam', middle: null, family: 'Okonkwo', prefix: null, suffix: null },
      }),
    )
    expect(d.name).toBe('Sam Okonkwo')
  })

  it('builds a name from the parts when there is no display name', () => {
    const d = toDraft(
      payload({
        name: { display: null, given: 'Sam', middle: null, family: 'Okonkwo', prefix: null, suffix: null },
      }),
    )
    expect(d.name).toBe('Sam Okonkwo')
  })

  it('prefers the primary number over the first one', () => {
    const d = toDraft(
      payload({
        phones: [
          { type: 'home', number: '0113 496 0000', isPrimary: false },
          { type: 'home', number: '07700 900123', isPrimary: true },
        ],
      } as Partial<ContactPayload>),
    )
    // Not "the mobile": the type is a label the contact's owner chose, and
    // half of everybody's mobiles are filed under "home".
    expect(d.phone).toBe('07700 900123')
  })

  it('falls back to the first number when none is primary', () => {
    const d = toDraft(
      payload({ phones: [{ type: 'other', number: '0113 496 0000' }] } as Partial<ContactPayload>),
    )
    expect(d.phone).toBe('0113 496 0000')
  })

  it('keeps a year-less birthday year-less', () => {
    // iOS stores "the 4th of June, no idea what year" as a null year, which is
    // exactly this app's `--MM-DD`. Guessing a year here would put a wrong age
    // on the birthdays view forever.
    expect(toDraft(payload({ birthday: { day: 4, month: 6, year: null } })).birthdate).toBe('--06-04')
  })

  it('takes a full birthday whole', () => {
    expect(toDraft(payload({ birthday: { day: 4, month: 6, year: 1990 } })).birthdate).toBe('1990-06-04')
  })

  it('drops an impossible birthday rather than importing it', () => {
    expect(toDraft(payload({ birthday: { day: 31, month: 2, year: 1990 } })).birthdate).toBeUndefined()
  })

  it('never brings across notes or tags', () => {
    // The phone's note field is the phone's copy of a thought. This app is for
    // a private one, and seeding the field people came here to write would be
    // both presumptuous and a privacy leak into the encrypted vault.
    const d = toDraft(payload({ note: 'sent a card last year' }))
    expect(d.notes).toBe('')
    expect(d.tagIds).toEqual([])
  })

  it('survives a contact with nothing in it at all', () => {
    expect(toDraft(payload())).toMatchObject({ name: '', email: '', phone: '' })
  })
})

describe('planBulkImport', () => {
  const picked = (over: Partial<ReturnType<typeof toDraft>> = {}) => ({
    name: 'Sam Okonkwo',
    email: '',
    phone: '',
    tagIds: [],
    notes: '',
    birthdate: undefined,
    ...over,
  })

  it('adds people who are not in the book', () => {
    const { contacts, duplicates } = planBulkImport([picked({ email: 's@x.com' })], [])
    expect(contacts).toHaveLength(1)
    expect(duplicates).toBe(0)
  })

  it('skips somebody already in the book by name and email', () => {
    const { contacts, duplicates } = planBulkImport(
      [picked({ email: 'S@X.com' })],
      [contact({ email: 's@x.com' })],
    )
    expect(contacts).toHaveLength(0)
    expect(duplicates).toBe(1)
  })

  it('matches a number however either side punctuated it', () => {
    const { duplicates } = planBulkImport(
      [picked({ phone: '+44 (0)7700 900123' })],
      [contact({ phone: '+440770-0900123' })],
    )
    expect(duplicates).toBe(1)
  })

  it('keeps two people who share a household number', () => {
    // The name is always part of the key for exactly this: a shared landline
    // is not evidence that two people are one person.
    const { contacts } = planBulkImport(
      [picked({ name: 'Ada Okonkwo', phone: '0113 496 0000' })],
      [contact({ name: 'Sam Okonkwo', phone: '0113 496 0000' })],
    )
    expect(contacts).toHaveLength(1)
  })

  it('catches a name-only contact on a second run', () => {
    const { duplicates } = planBulkImport([picked()], [contact()])
    expect(duplicates).toBe(1)
  })

  it('deduplicates within one import, not just against the book', () => {
    // Two accounts syncing the same card is the normal cause.
    const { contacts, duplicates } = planBulkImport(
      [picked({ email: 's@x.com' }), picked({ email: 's@x.com' })],
      [],
    )
    expect(contacts).toHaveLength(1)
    expect(duplicates).toBe(1)
  })

  it('falls back to the email or number as a name when there is none', () => {
    const { contacts } = planBulkImport([picked({ name: '', email: 's@x.com' })], [])
    expect(contacts[0].name).toBe('s@x.com')
  })
})
