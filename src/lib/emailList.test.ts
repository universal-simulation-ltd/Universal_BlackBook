import { describe, expect, it } from 'vitest'
import { toRecipients } from './emailList'
import type { Contact } from './types'

const c = (name: string, email: string): Contact => ({
  id: name + email,
  name,
  email,
  phone: '',
  tagIds: [],
  notes: '',
  createdAt: 1,
  updatedAt: 1,
})

describe('toRecipients', () => {
  it('writes Name <email>, comma separated', () => {
    expect(toRecipients([c('Sam Okonkwo', 'sam@example.com'), c('Ada', 'ada@example.com')])).toEqual({
      text: 'Sam Okonkwo <sam@example.com>, Ada <ada@example.com>',
      count: 2,
    })
  })

  it('skips the email-less and the repeated address', () => {
    expect(toRecipients([c('Plumber', ''), c('Sam', 'SAM@example.com'), c('Sam O', 'sam@example.com')]).text).toBe(
      'Sam <SAM@example.com>',
    )
  })

  it('quotes a name a mail client would split, and uses a bare address when the name is the address', () => {
    expect(toRecipients([c('Okonkwo, Sam "Sammy"', 'sam@example.com')]).text).toBe(
      '"Okonkwo, Sam \\"Sammy\\"" <sam@example.com>',
    )
    expect(toRecipients([c('ada@example.com', 'ada@example.com')]).text).toBe('ada@example.com')
  })
})
