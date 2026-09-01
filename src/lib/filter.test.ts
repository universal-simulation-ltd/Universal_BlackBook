import { describe, expect, it } from 'vitest'
import {
  compare,
  fold,
  hiddenBirthdays,
  hiddenFromList,
  isSearching,
  matchesTags,
  matchesText,
  runQuery,
  showsInBirthdays,
  UNTAGGED,
} from './filter'
import type { Today } from './birthday'
import type { Contact } from './types'

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: over.id ?? 'c1',
  name: 'Sam Okonkwo',
  email: 'sam@example.com',
  phone: '',
  tagIds: ['work'],
  notes: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

/** A fixed "today" so every birthday assertion means the same thing forever. */
const TODAY: Today = { year: 2026, month: 8, day: 24 }

describe('fold', () => {
  it('strips case and surrounding space', () => {
    expect(fold('  Sam  ')).toBe('sam')
  })

  it('strips accents so a plain-ASCII search finds an accented name', () => {
    expect(fold('Zoë')).toBe('zoe')
    expect(fold('José Ramírez')).toBe('jose ramirez')
  })
})

describe('matchesText', () => {
  it('matches nothing typed', () => {
    expect(matchesText(contact(), '   ')).toBe(true)
  })

  it('searches name, email and notes', () => {
    const c = contact({ name: 'Priya', email: 'p@corp.io', notes: 'Met in Berlin' })
    expect(matchesText(c, 'priya')).toBe(true)
    expect(matchesText(c, 'corp')).toBe(true)
    expect(matchesText(c, 'berlin')).toBe(true)
  })

  it('ANDs the terms across fields — a second word narrows, never widens', () => {
    const c = contact({ name: 'Sam', email: 'sam@x.com', notes: 'Met in Berlin' })
    expect(matchesText(c, 'sam berlin')).toBe(true)
    expect(matchesText(c, 'sam paris')).toBe(false)
  })

  it('finds an accented name from the plain spelling', () => {
    expect(matchesText(contact({ name: 'Zoë Fenwick' }), 'zoe')).toBe(true)
  })
})

  // ── Phone, added 2026-08-30 ──────────────────────────────────────────────

  it('finds a contact by their phone number', () => {
    expect(matchesText(contact({ phone: '07700 900123' }), '900123')).toBe(true)
  })

  it('ignores how either side punctuated the number', () => {
    // The single reason the digit fold exists: nobody retypes the spacing.
    const c = contact({ phone: '+44 (0)7700 900123' })
    expect(matchesText(c, '07700900123')).toBe(true)
    expect(matchesText(c, '+44 (0)7700-900123')).toBe(true)
  })

  it('does not match a number that is not in there', () => {
    expect(matchesText(contact({ phone: '07700 900123' }), '900999')).toBe(false)
  })

  // ⚠️ The bug the `d !== ''` guard in matchesText exists for. A term with no
  // digits folds to the empty string, and `'07700900123'.includes('')` is
  // TRUE — so without the guard every text search would match everybody who
  // has a phone number, and only them.
  it('does not match every phone-owner on a term with no digits in it', () => {
    expect(matchesText(contact({ name: 'Sam', phone: '07700 900123' }), 'zebra')).toBe(false)
  })

describe('matchesTags', () => {
  it('passes everything when nothing is selected', () => {
    expect(matchesTags(contact(), [])).toBe(true)
  })

  it('ORs within the selection', () => {
    const c = contact({ tagIds: ['work'] })
    expect(matchesTags(c, ['work', 'family'])).toBe(true)
    expect(matchesTags(c, ['family'])).toBe(false)
  })

  it('matches the untagged pseudo-filter only when a contact has none', () => {
    expect(matchesTags(contact({ tagIds: [] }), [UNTAGGED])).toBe(true)
    expect(matchesTags(contact({ tagIds: ['work'] }), [UNTAGGED])).toBe(false)
  })

  it('does not let the untagged filter swallow a tagged contact when combined', () => {
    const c = contact({ tagIds: ['work'] })
    expect(matchesTags(c, [UNTAGGED, 'work'])).toBe(true)
    expect(matchesTags(c, [UNTAGGED, 'family'])).toBe(false)
  })
})

describe('compare', () => {
  const a = contact({ id: 'a', name: 'Alice', createdAt: 10 })
  const b = contact({ id: 'b', name: 'bob', createdAt: 20 })

  it('sorts by name case-insensitively', () => {
    expect([b, a].sort(compare('name', TODAY)).map((c) => c.id)).toEqual(['a', 'b'])
    expect([a, b].sort(compare('name-desc', TODAY)).map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('sorts numerically within a name, so Flat 9 precedes Flat 10', () => {
    const nine = contact({ id: '9', name: 'Flat 9' })
    const ten = contact({ id: '10', name: 'Flat 10' })
    expect([ten, nine].sort(compare('name', TODAY)).map((c) => c.id)).toEqual(['9', '10'])
  })

  it('sorts recently added first', () => {
    expect([a, b].sort(compare('recent', TODAY)).map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('sorts the soonest birthday first, wrapping into next year', () => {
    // Today is 24 August. December is 100-odd days off; February is next
    // year's and further still; tomorrow wins.
    const dec = contact({ id: 'dec', name: 'Dec', birthdate: '--12-25' })
    const feb = contact({ id: 'feb', name: 'Feb', birthdate: '--02-01' })
    const tomorrow = contact({ id: 'tom', name: 'Tom', birthdate: '--08-25' })
    expect([feb, dec, tomorrow].sort(compare('birthday', TODAY)).map((c) => c.id)).toEqual([
      'tom',
      'dec',
      'feb',
    ])
  })

  it('breaks a shared birthday by name, so the order never wobbles between renders', () => {
    const x = contact({ id: 'x', name: 'Xavier', birthdate: '--09-01' })
    const y = contact({ id: 'y', name: 'Aaron', birthdate: '1990-09-01' })
    expect([x, y].sort(compare('birthday', TODAY)).map((c) => c.id)).toEqual(['y', 'x'])
    expect([y, x].sort(compare('birthday', TODAY)).map((c) => c.id)).toEqual(['y', 'x'])
  })
})

describe('runQuery', () => {
  const people = [
    contact({ id: '1', name: 'Alice', tagIds: ['fam'], notes: 'sister', birthdate: '--12-25' }),
    contact({ id: '2', name: 'Bob', tagIds: [], notes: '' }),
    contact({ id: '3', name: 'Carla', tagIds: ['work'], notes: 'Berlin office', birthdate: '--08-25' }),
  ]

  it('applies text and tags together', () => {
    const out = runQuery(people, { text: 'berlin', tagIds: ['work'], sort: 'name' }, TODAY)
    expect(out.map((c) => c.id)).toEqual(['3'])
  })

  it('returns everything for an empty query', () => {
    expect(runQuery(people, { text: '', tagIds: [], sort: 'name' }, TODAY)).toHaveLength(3)
  })

  it('does not mutate the array it was given', () => {
    const original = [...people]
    runQuery(people, { text: '', tagIds: [], sort: 'name-desc' }, TODAY)
    expect(people).toEqual(original)
  })

  it('drops everyone without a birthday in the birthdays view', () => {
    // Bob has none, so he is not in the list at all — the view answers "whose
    // birthday is coming up", and padding it with people who have none is a
    // worse answer than a shorter list.
    const out = runQuery(people, { text: '', tagIds: [], sort: 'birthday' }, TODAY)
    expect(out.map((c) => c.id)).toEqual(['3', '1'])
  })

  it('still applies the text and tag filters in the birthdays view', () => {
    const out = runQuery(people, { text: 'sister', tagIds: [], sort: 'birthday' }, TODAY)
    expect(out.map((c) => c.id)).toEqual(['1'])
  })
})

describe('hiding somebody from the birthdays view', () => {
  const sam = contact({ id: 'sam', name: 'Sam', birthdate: '1990-06-04' })
  const ada = contact({ id: 'ada', name: 'Ada', birthdate: '1815-12-10', hideBirthday: true })
  const noDate = contact({ id: 'nia', name: 'Nia' })

  it('keeps a hidden person out of the birthdays view', () => {
    const out = runQuery([sam, ada], { text: '', tagIds: [], sort: 'birthday' }, TODAY)
    expect(out.map((c) => c.id)).toEqual(['sam'])
  })

  it('leaves them in every OTHER view — this hides a birthday, not a person', () => {
    const out = runQuery([sam, ada], { text: '', tagIds: [], sort: 'name' }, TODAY)
    expect(out.map((c) => c.id).sort()).toEqual(['ada', 'sam'])
  })

  it('does not touch the stored birthday', () => {
    // The whole point: the date is still there to come back to.
    expect(ada.birthdate).toBe('1815-12-10')
  })

  it('separates the two reasons somebody is not in the list', () => {
    expect(showsInBirthdays(sam, TODAY)).toBe(true)
    expect(showsInBirthdays(ada, TODAY)).toBe(false)
    expect(showsInBirthdays(noDate, TODAY)).toBe(false)
  })

  it('lists the hidden ones so they can be put back', () => {
    expect(hiddenBirthdays([sam, ada, noDate], TODAY).map((c) => c.id)).toEqual(['ada'])
  })

  it('never lists somebody hidden who has no birthday at all', () => {
    // Nothing to un-hide, and a row in that drawer offering to "show" a person
    // with no date would put them nowhere.
    const ghost = contact({ id: 'ghost', hideBirthday: true })
    expect(hiddenBirthdays([ghost], TODAY)).toEqual([])
  })

  it('sorts the hidden list by name, not by countdown', () => {
    const zed = contact({ id: 'zed', name: 'Zed', birthdate: '--01-02', hideBirthday: true })
    const abe = contact({ id: 'abe', name: 'Abe', birthdate: '--12-30', hideBirthday: true })
    expect(hiddenBirthdays([zed, abe], TODAY).map((c) => c.name)).toEqual(['Abe', 'Zed'])
  })
})

describe('hiding somebody from the main list', () => {
  const plumber = contact({ id: 'p', name: 'Dave the Plumber', hideFromList: true, tagIds: [] })
  const sam = contact({ id: 's', name: 'Sam Okonkwo', tagIds: [] })
  const browse = { text: '', tagIds: [] as string[], sort: 'name' as const }

  it('drops them while browsing', () => {
    expect(runQuery([plumber, sam], browse, TODAY).map((c) => c.id)).toEqual(['s'])
  })

  it('puts them back the moment you search — that is the whole point', () => {
    // Hidden from browsing, never from searching. Otherwise this is a way to
    // lose people quietly, which is what deleting is for.
    const found = runQuery([plumber, sam], { ...browse, text: 'plumber' }, TODAY)
    expect(found.map((c) => c.id)).toEqual(['p'])
  })

  it('stays hidden behind a TAG filter, which is still browsing', () => {
    const tagged = contact({ id: 'p2', name: 'Dave', hideFromList: true, tagIds: ['work'] })
    const out = runQuery([tagged, sam], { ...browse, tagIds: ['work'] }, TODAY)
    expect(out).toEqual([])
  })

  it('treats whitespace as no search at all', () => {
    expect(isSearching({ ...browse, text: '   ' })).toBe(false)
    expect(runQuery([plumber, sam], { ...browse, text: '  ' }, TODAY).map((c) => c.id)).toEqual(['s'])
  })

  it('is independent of hiding a BIRTHDAY', () => {
    // Two flags, two meanings: clutter and reminders. Somebody tidied off the
    // main list still has their birthday counted down.
    const tidied = contact({ id: 't', name: 'Dave', hideFromList: true, birthdate: '--06-04' })
    const out = runQuery([tidied], { ...browse, sort: 'birthday' }, TODAY)
    expect(out.map((c) => c.id)).toEqual(['t'])
  })

  it('lists the hidden ones so they can be put back', () => {
    expect(hiddenFromList([plumber, sam]).map((c) => c.id)).toEqual(['p'])
  })
})
