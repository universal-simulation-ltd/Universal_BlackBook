import { describe, expect, it } from 'vitest'
import { fromCsv, parseCsv, toCsv } from './csv'
import type { Contact, Tag } from './types'

const tag = (id: string, name: string): Tag => ({ id, name, colour: 'amber' })

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Sam Okonkwo',
  email: 'sam@example.com',
  phone: '',
  tagIds: [],
  notes: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

describe('parseCsv', () => {
  it('parses a plain file', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('treats CRLF as one row terminator, not two', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('keeps a comma inside quotes as data', () => {
    expect(parseCsv('name,notes\nSam,"Berlin, then Leeds"')).toEqual([
      ['name', 'notes'],
      ['Sam', 'Berlin, then Leeds'],
    ])
  })

  it('unescapes a doubled quote', () => {
    expect(parseCsv('a\n"He said ""hi"""')).toEqual([['a'], ['He said "hi"']])
  })

  it('keeps a newline inside quotes inside the cell', () => {
    expect(parseCsv('a\n"line one\nline two"')).toEqual([['a'], ['line one\nline two']])
  })

  it('drops blank lines rather than emitting empty records', () => {
    expect(parseCsv('a\n\nb\n')).toEqual([['a'], ['b']])
  })

  it('strips a UTF-8 BOM so the first header is not "\\ufeffName"', () => {
    expect(parseCsv('\ufeffName,Email\nSam,s@x.com')[0][0]).toBe('Name')
  })
})

describe('toCsv', () => {
  it('writes the header and one row per contact', () => {
    const csv = toCsv([contact()], [])
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual([
      'Name',
      'Email',
      'Tags',
      'Notes',
      'Birthday',
      'Phone',
      'Hide birthday',
      'Hide from list',
    ])
    expect(rows[1]).toEqual(['Sam Okonkwo', 'sam@example.com', '', '', '', '', '', ''])
  })

  it('writes tag NAMES, not ids', () => {
    const csv = toCsv([contact({ tagIds: ['f', 'w'] })], [tag('f', 'Family'), tag('w', 'Work')])
    expect(parseCsv(csv)[1][2]).toBe('Family; Work')
  })

  it('silently drops a dangling tag id rather than writing "undefined"', () => {
    const csv = toCsv([contact({ tagIds: ['gone'] })], [])
    expect(parseCsv(csv)[1][2]).toBe('')
  })

  it('leads with a BOM so Excel reads it as UTF-8', () => {
    expect(toCsv([], [])).toMatch(/^\ufeff/)
  })

  it('round-trips a note containing a comma, a quote and a newline', () => {
    const nasty = 'He said "go", then\nleft'
    const csv = toCsv([contact({ notes: nasty })], [])
    expect(parseCsv(csv)[1][3]).toBe(nasty)
  })
})

describe('fromCsv', () => {
  it('reads a headed file', () => {
    const { contacts } = fromCsv('Name,Email,Tags,Notes\nSam,s@x.com,Work,hi', [])
    expect(contacts).toHaveLength(1)
    expect(contacts[0]).toMatchObject({ name: 'Sam', email: 's@x.com', notes: 'hi' })
  })

  it('matches an existing tag by name instead of creating a duplicate', () => {
    const existing = [tag('w', 'Work')]
    const { contacts, tags, created } = fromCsv('Name,Tags\nSam,work', existing)
    expect(created).toEqual([])
    expect(tags).toHaveLength(1)
    expect(contacts[0].tagIds).toEqual(['w'])
  })

  it('creates tags the file mentions and reports them', () => {
    const { tags, created, contacts } = fromCsv('Name,Tags\nSam,Cycling club', [])
    expect(created).toEqual(['Cycling club'])
    expect(tags).toHaveLength(1)
    expect(contacts[0].tagIds).toEqual([tags[0].id])
  })

  it('creates one tag for two rows naming it differently cased', () => {
    const { tags, created } = fromCsv('Name,Tags\nA,Work\nB,work', [])
    expect(created).toEqual(['Work'])
    expect(tags).toHaveLength(1)
  })

  it('splits multiple tags on ; and |', () => {
    const { contacts, tags } = fromCsv('Name,Tags\nSam,Family; Work | Gym', [])
    expect(tags.map((t) => t.name)).toEqual(['Family', 'Work', 'Gym'])
    expect(contacts[0].tagIds).toHaveLength(3)
  })

  it('reads an older export\'s Categories column as tags', () => {
    // Every file this app wrote before 2026-08-24 says "Categories", and so do
    // Google Contacts and Outlook. A rename that stranded them would make the
    // app unable to read its own backups.
    const { contacts, tags } = fromCsv('Name,Categories\nSam,Family', [])
    expect(tags.map((t) => t.name)).toEqual(['Family'])
    expect(contacts[0].tagIds).toHaveLength(1)
  })

  it('ignores an older export\'s Frequency column rather than reading it as notes', () => {
    const { contacts } = fromCsv(
      'Name,Email,Categories,Frequency,Notes,Birthday\nSam,s@x.com,Work,weekly,hello,--06-04',
      [],
    )
    expect(contacts[0]).toMatchObject({ name: 'Sam', notes: 'hello', birthdate: '--06-04' })
  })

  it('skips rows with neither a name nor an email, and counts them', () => {
    const { contacts, skipped } = fromCsv('Name,Email,Tags,Notes,Birthday\nSam,s@x.com,,,\n,,,a stray note,', [])
    expect(contacts).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('falls back to the email as the name when only an email is given', () => {
    const { contacts } = fromCsv('Name,Email\n,solo@x.com', [])
    expect(contacts[0].name).toBe('solo@x.com')
  })

  it('reads a birthday column under any of its usual names', () => {
    for (const header of ['Birthday', 'Birthdate', 'Date of Birth', 'DOB', 'Born']) {
      const { contacts } = fromCsv(`Name,${header}\nSam,1990-06-04`, [])
      expect(contacts[0].birthdate, header).toBe('1990-06-04')
    }
  })

  it('keeps a year-less birthday, and drops an ambiguous one', () => {
    expect(fromCsv('Name,Birthday\nSam,4 June', []).contacts[0].birthdate).toBe('--06-04')
    // Dropped, not rejected — the person still imports.
    const ambiguous = fromCsv('Name,Birthday\nSam,04/06/1990', [])
    expect(ambiguous.contacts).toHaveLength(1)
    expect(ambiguous.contacts[0].birthdate).toBeUndefined()
  })

  it('tolerates a header naming only some columns', () => {
    const { contacts } = fromCsv('Name,Notes\nSam,just a note', [])
    expect(contacts[0]).toMatchObject({ name: 'Sam', email: '', notes: 'just a note' })
  })

  it('round-trips a full export back to the same people and tags', () => {
    const tags = [tag('f', 'Family'), tag('w', 'Work')]
    const people = [
      contact({ id: '1', name: 'Alice', tagIds: ['f'], notes: 'sister, twin', birthdate: '1990-06-04' }),
      contact({ id: '2', name: 'Bob', email: '', tagIds: ['f', 'w'], notes: '', birthdate: '--12-25' }),
    ]
    const back = fromCsv(toCsv(people, tags), tags)
    expect(back.created).toEqual([])
    expect(back.contacts.map((c) => ({ name: c.name, notes: c.notes, birthdate: c.birthdate }))).toEqual([
      { name: 'Alice', notes: 'sister, twin', birthdate: '1990-06-04' },
      // The year-less shape survives a full round trip, which it would not if
      // the export wrote the pretty "25 December" instead of the stored value.
      { name: 'Bob', notes: '', birthdate: '--12-25' },
    ])
    expect(back.contacts[1].tagIds).toEqual(['f', 'w'])
  })
})

describe('headerless files, across the frequency removal', () => {
  // ⚠️ ONE VINTAGE IS NO LONGER READABLE, and it is a deliberate trade. A
  // headerless five-cell row is now read as the CURRENT layout, so a file
  // exported in the brief window when the layout was
  // `Name,Email,Categories,Frequency,Notes` — five cells, no Birthday — reads
  // its cadence as a note and its note as a birthday (which is then dropped as
  // unparseable). That window was between v0.1.0 and the birthday release,
  // days apart in an app first published on 2026-08-21, and it only bites a
  // file somebody stripped the header off. Distinguishing it would mean
  // sniffing cell 3 against a list of frequency words kept alive for no other
  // purpose, and guessing at a file's meaning is what this parser refuses to
  // do everywhere else (see the 04/06/1990 rule).

  // ⚠️ The one case where dropping a column could silently corrupt data. A
  // headerless file cannot say which layout it is, so `fromCsv` decides on the
  // cell count. Get this wrong and every old export reads a cadence as a note
  // and a note as a birthday — with no error, because both fields take
  // anything and an unparseable birthday is quietly dropped.
  it('reads a SIX-cell headerless row in the old layout, skipping the frequency', () => {
    const { contacts } = fromCsv('Sam,s@x.com,Work,weekly,a note,--06-04', [])
    expect(contacts[0]).toMatchObject({
      name: 'Sam',
      email: 's@x.com',
      notes: 'a note',
      birthdate: '--06-04',
    })
  })

  it('reads a FIVE-cell headerless row in the current layout', () => {
    const { contacts } = fromCsv('Sam,s@x.com,Work,a note,--06-04', [])
    expect(contacts[0]).toMatchObject({
      name: 'Sam',
      email: 's@x.com',
      notes: 'a note',
      birthdate: '--06-04',
    })
  })

  it('reads its own headerless export back', () => {
    const people = [contact({ name: 'Alice', notes: 'sister', birthdate: '1990-06-04' })]
    // Strip the header, as somebody pasting rows into a new sheet would.
    const headerless = toCsv(people, []).split('\r\n').slice(1).join('\r\n')
    const { contacts } = fromCsv(headerless, [])
    expect(contacts[0]).toMatchObject({ name: 'Alice', notes: 'sister', birthdate: '1990-06-04' })
  })

  // ── Phone, appended 2026-08-30 ────────────────────────────────────────────

  it('round-trips a phone number exactly as typed', () => {
    const people = [contact({ phone: '+44 (0)7700 900123' })]
    const { contacts } = fromCsv(toCsv(people, []), [])
    expect(contacts[0].phone).toBe('+44 (0)7700 900123')
  })

  it('reads the phone column names other address books use', () => {
    const { contacts } = fromCsv('Name,Mobile\nSam,07700 900123', [])
    expect(contacts[0].phone).toBe('07700 900123')
  })

  it("reads Google Contacts' 'Phone 1 - Value', and not its 'Phone 1 - Type'", () => {
    const { contacts } = fromCsv('Name,Phone 1 - Type,Phone 1 - Value\nSam,Mobile,07700 900123', [])
    expect(contacts[0].phone).toBe('07700 900123')
  })

  it('leaves the phone empty when the file has no such column', () => {
    const { contacts } = fromCsv('Name,Email\nSam,s@x.com', [])
    expect(contacts[0].phone).toBe('')
  })

  // ⚠️ The disambiguation that replaced the old cell-count rule. BOTH layouts
  // are six cells wide now, so the file's content has to decide — and reading
  // it the wrong way round puts a note in the birthday and a cadence in the
  // note, silently, for every row.
  it('reads a SIX-cell headerless row with a phone as the current layout', () => {
    const { contacts } = fromCsv('Sam,s@x.com,Work,a note,--06-04,07700 900123', [])
    expect(contacts[0]).toMatchObject({
      notes: 'a note',
      birthdate: '--06-04',
      phone: '07700 900123',
    })
  })

  it('still reads a SIX-cell headerless row with a frequency as the old layout', () => {
    const { contacts } = fromCsv('Sam,s@x.com,Work,weekly,a note,1990-06-04', [])
    expect(contacts[0]).toMatchObject({ notes: 'a note', birthdate: '1990-06-04', phone: '' })
  })

  it('decides on the whole file, not on one row that happens to be blank', () => {
    const { contacts } = fromCsv(
      ['Sam,s@x.com,,a note,--06-04,07700 900123', 'Alice,a@x.com,,,,'].join('\n'),
      [],
    )
    expect(contacts[0]).toMatchObject({ notes: 'a note', birthdate: '--06-04' })
  })

  // A six-cell headerless file with no birthday in it anywhere is genuinely
  // undecidable, and the tie goes to the OLD layout — the file that certainly
  // exists somewhere, rather than the one that needs somebody to have deleted
  // a header row from this week's export. Pinned as a test because it is a
  // deliberate choice and not an accident of the comparison.
  it('breaks an undecidable tie towards the old layout', () => {
    const { contacts } = fromCsv('Sam,s@x.com,Work,weekly,a note,', [])
    expect(contacts[0].notes).toBe('a note')
  })
})

describe('the Hide birthday column', () => {
  const hidden = contact({ name: 'Ada', birthdate: '1815-12-10', hideBirthday: true })
  const shown = contact({ name: 'Sam', birthdate: '1990-06-04' })

  it('round-trips a hidden birthday through an export and back', () => {
    // The whole point of the column. Before it existed, exporting and
    // re-importing put everybody back in the birthdays list.
    const { contacts } = fromCsv(toCsv([hidden, shown], []), [])
    const back = Object.fromEntries(contacts.map((c) => [c.name, c]))
    expect(back.Ada.hideBirthday).toBe(true)
    expect(back.Ada.birthdate).toBe('1815-12-10')
    expect(back.Sam.hideBirthday).toBeUndefined()
  })

  it('leaves the cell EMPTY for everybody else, not "no"', () => {
    // A column of "no" down a file that is mostly people you never hid is
    // noise in a spreadsheet somebody opens to edit a phone number.
    expect(parseCsv(toCsv([shown], []))[1][6]).toBe('')
    expect(parseCsv(toCsv([hidden], []))[1][6]).toBe('yes')
  })

  it('accepts the spellings a person might type in a spreadsheet', () => {
    for (const cell of ['yes', 'Yes', 'TRUE', 'y', '1', 'hidden']) {
      const csv = `Name,Birthday,Hide birthday\r\nAda,1815-12-10,${cell}\r\n`
      expect(fromCsv(csv, []).contacts[0].hideBirthday).toBe(true)
    }
  })

  it('reads anything ELSE as shown — the failure mode must be a visible birthday', () => {
    for (const cell of ['', 'no', 'false', '0', 'maybe', 'Mobile']) {
      const csv = `Name,Birthday,Hide birthday\r\nAda,1815-12-10,${cell}\r\n`
      expect(fromCsv(csv, []).contacts[0].hideBirthday).toBeUndefined()
    }
  })

  it('drops the flag when the birthday itself did not parse', () => {
    // Otherwise the flag outlives the date it refers to, and the person goes
    // silently missing from the birthdays view whenever one is added later.
    const csv = 'Name,Birthday,Hide birthday\r\nAda,04/06/1990,yes\r\n'
    const [c] = fromCsv(csv, []).contacts
    expect(c.birthdate).toBeUndefined()
    expect(c.hideBirthday).toBeUndefined()
  })

  it('is absent from a file that has no such column, rather than false', () => {
    const csv = 'Name,Email,Birthday\r\nAda,ada@example.com,1815-12-10\r\n'
    expect(fromCsv(csv, []).contacts[0].hideBirthday).toBeUndefined()
  })

  it('reads its own SEVEN-cell headerless export with no guessing', () => {
    // Seven cells cannot be the legacy six-column layout, so this width needs
    // none of the birthday-column heuristic the six-cell case runs.
    const file = toCsv([hidden, shown], [])
    const headerless = file.split('\r\n').slice(1).join('\r\n')
    const { contacts } = fromCsv(headerless, [])
    const back = Object.fromEntries(contacts.map((c) => [c.name, c]))
    expect(back.Ada.hideBirthday).toBe(true)
    expect(back.Ada.birthdate).toBe('1815-12-10')
    expect(back.Sam.birthdate).toBe('1990-06-04')
    expect(back.Sam.hideBirthday).toBeUndefined()
  })
})

describe('the Hide from list column', () => {
  const tidied = contact({ name: 'Plumber', hideFromList: true })
  const normal = contact({ name: 'Sam' })

  it('round-trips somebody hidden from the main list', () => {
    const { contacts } = fromCsv(toCsv([tidied, normal], []), [])
    const back = Object.fromEntries(contacts.map((c) => [c.name, c]))
    expect(back.Plumber.hideFromList).toBe(true)
    expect(back.Sam.hideFromList).toBeUndefined()
  })

  it('is INDEPENDENT of Hide birthday — two flags, two columns', () => {
    // Hiding somebody from the list does not stop their birthday counting
    // down, so a file that conflated them would change behaviour on import.
    const both = contact({ name: 'Ada', birthdate: '1815-12-10', hideBirthday: true, hideFromList: true })
    const listOnly = contact({ name: 'Plumber', birthdate: '1990-06-04', hideFromList: true })
    const { contacts } = fromCsv(toCsv([both, listOnly], []), [])
    const back = Object.fromEntries(contacts.map((c) => [c.name, c]))
    expect(back.Ada.hideBirthday).toBe(true)
    expect(back.Ada.hideFromList).toBe(true)
    expect(back.Plumber.hideFromList).toBe(true)
    expect(back.Plumber.hideBirthday).toBeUndefined()
  })

  it('does NOT need a birthday, unlike Hide birthday', () => {
    const csv = 'Name,Hide from list\r\nPlumber,yes\r\n'
    expect(fromCsv(csv, []).contacts[0].hideFromList).toBe(true)
  })

  it('reads anything but the allowlist as shown', () => {
    for (const cell of ['', 'no', 'false', '0', 'later']) {
      const csv = `Name,Hide from list\r\nPlumber,${cell}\r\n`
      expect(fromCsv(csv, []).contacts[0].hideFromList).toBeUndefined()
    }
  })

  it('reads a SEVEN-cell file from before this column existed', () => {
    // The previous export, headerless. Index 7 is simply absent, and a missing
    // cell has to mean "not hidden" rather than throwing or defaulting to true.
    const row = 'Ada,ada@example.com,,,1815-12-10,,yes\r\n'
    const [c] = fromCsv(row, []).contacts
    expect(c.hideBirthday).toBe(true)
    expect(c.hideFromList).toBeUndefined()
    expect(c.birthdate).toBe('1815-12-10')
  })

  it('reads its own EIGHT-cell headerless export back', () => {
    const file = toCsv([tidied, normal], [])
    const headerless = file.split('\r\n').slice(1).join('\r\n')
    const { contacts } = fromCsv(headerless, [])
    const back = Object.fromEntries(contacts.map((c) => [c.name, c]))
    expect(back.Plumber.hideFromList).toBe(true)
    expect(back.Sam.hideFromList).toBeUndefined()
  })
})
