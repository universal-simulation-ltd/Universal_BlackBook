import { describe, expect, it } from 'vitest'
import { fromCsv, parseCsv, parseFrequency, toCsv } from './csv'
import type { Category, Contact } from './types'

const cat = (id: string, name: string): Category => ({ id, name, colour: 'amber' })

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Sam Okonkwo',
  email: 'sam@example.com',
  categoryIds: [],
  frequency: 'monthly',
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
    expect(rows[0]).toEqual(['Name', 'Email', 'Categories', 'Frequency', 'Notes', 'Birthday'])
    expect(rows[1]).toEqual(['Sam Okonkwo', 'sam@example.com', '', 'monthly', '', ''])
  })

  it('writes category NAMES, not ids', () => {
    const csv = toCsv([contact({ categoryIds: ['f', 'w'] })], [cat('f', 'Family'), cat('w', 'Work')])
    expect(parseCsv(csv)[1][2]).toBe('Family; Work')
  })

  it('silently drops a dangling category id rather than writing "undefined"', () => {
    const csv = toCsv([contact({ categoryIds: ['gone'] })], [])
    expect(parseCsv(csv)[1][2]).toBe('')
  })

  it('leads with a BOM so Excel reads it as UTF-8', () => {
    expect(toCsv([], [])).toMatch(/^\ufeff/)
  })

  it('round-trips a note containing a comma, a quote and a newline', () => {
    const nasty = 'He said "go", then\nleft'
    const csv = toCsv([contact({ notes: nasty })], [])
    expect(parseCsv(csv)[1][4]).toBe(nasty)
  })
})

describe('parseFrequency', () => {
  it('accepts the stored key', () => {
    expect(parseFrequency('fortnightly')).toBe('fortnightly')
  })

  it('accepts the label a human would type', () => {
    expect(parseFrequency('Once a quarter')).toBe('quarterly')
    expect(parseFrequency('Every 6 months')).toBe('biannually')
    expect(parseFrequency('annually')).toBe('yearly')
    expect(parseFrequency('Big news only')).toBe('big-news')
  })

  it('falls back to N/A rather than rejecting the row, or inventing a cadence', () => {
    // Was 'quarterly', which made that one value mean two different things:
    // "I chose this" and "nobody said".
    expect(parseFrequency('whenever')).toBe('na')
    expect(parseFrequency('')).toBe('na')
  })

  it('accepts the ways a human writes "no set frequency"', () => {
    expect(parseFrequency('N/A')).toBe('na')
    expect(parseFrequency('na')).toBe('na')
    expect(parseFrequency('Not specified')).toBe('na')
  })
})

describe('fromCsv', () => {
  it('reads a headed file', () => {
    const { contacts } = fromCsv('Name,Email,Categories,Frequency,Notes\nSam,s@x.com,Work,weekly,hi', [])
    expect(contacts).toHaveLength(1)
    expect(contacts[0]).toMatchObject({ name: 'Sam', email: 's@x.com', frequency: 'weekly', notes: 'hi' })
  })

  it('matches an existing category by name instead of creating a duplicate', () => {
    const existing = [cat('w', 'Work')]
    const { contacts, categories, created } = fromCsv('Name,Categories\nSam,work', existing)
    expect(created).toEqual([])
    expect(categories).toHaveLength(1)
    expect(contacts[0].categoryIds).toEqual(['w'])
  })

  it('creates categories the file mentions and reports them', () => {
    const { categories, created, contacts } = fromCsv('Name,Categories\nSam,Cycling club', [])
    expect(created).toEqual(['Cycling club'])
    expect(categories).toHaveLength(1)
    expect(contacts[0].categoryIds).toEqual([categories[0].id])
  })

  it('creates one category for two rows naming it differently cased', () => {
    const { categories, created } = fromCsv('Name,Categories\nA,Work\nB,work', [])
    expect(created).toEqual(['Work'])
    expect(categories).toHaveLength(1)
  })

  it('splits multiple categories on ; and |', () => {
    const { contacts, categories } = fromCsv('Name,Categories\nSam,Family; Work | Gym', [])
    expect(categories.map((c) => c.name)).toEqual(['Family', 'Work', 'Gym'])
    expect(contacts[0].categoryIds).toHaveLength(3)
  })

  it('skips rows with neither a name nor an email, and counts them', () => {
    const { contacts, skipped } = fromCsv('Name,Email,Categories,Frequency,Notes,Birthday\nSam,s@x.com,,,,\n,,,,a stray note,', [])
    expect(contacts).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('falls back to the email as the name when only an email is given', () => {
    const { contacts } = fromCsv('Name,Email\n,solo@x.com', [])
    expect(contacts[0].name).toBe('solo@x.com')
  })

  it('reads a headerless file positionally', () => {
    const { contacts } = fromCsv('Sam,s@x.com,Work,weekly,hi,1990-06-04', [])
    expect(contacts).toHaveLength(1)
    expect(contacts[0]).toMatchObject({
      name: 'Sam',
      email: 's@x.com',
      frequency: 'weekly',
      birthdate: '1990-06-04',
    })
  })

  it('still reads a headerless file written BEFORE the Birthday column existed', () => {
    // The reason Birthday was appended rather than inserted: a positional file
    // from an older build must not have every column after the insertion point
    // silently re-mapped.
    const { contacts } = fromCsv('Sam,s@x.com,Work,weekly,hi', [])
    expect(contacts[0]).toMatchObject({ name: 'Sam', email: 's@x.com', frequency: 'weekly', notes: 'hi' })
    expect(contacts[0].birthdate).toBeUndefined()
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

  it('round-trips a full export back to the same people and categories', () => {
    const categories = [cat('f', 'Family'), cat('w', 'Work')]
    const people = [
      contact({ id: '1', name: 'Alice', categoryIds: ['f'], frequency: 'weekly', notes: 'sister, twin', birthdate: '1990-06-04' }),
      contact({ id: '2', name: 'Bob', email: '', categoryIds: ['f', 'w'], frequency: 'big-news', notes: '', birthdate: '--12-25' }),
    ]
    const back = fromCsv(toCsv(people, categories), categories)
    expect(back.created).toEqual([])
    expect(
      back.contacts.map((c) => ({ name: c.name, frequency: c.frequency, notes: c.notes, birthdate: c.birthdate })),
    ).toEqual([
      { name: 'Alice', frequency: 'weekly', notes: 'sister, twin', birthdate: '1990-06-04' },
      // The year-less shape survives a full round trip, which it would not if
      // the export wrote the pretty "25 December" instead of the stored value.
      { name: 'Bob', frequency: 'big-news', notes: '', birthdate: '--12-25' },
    ])
    expect(back.contacts[1].categoryIds).toEqual(['f', 'w'])
  })
})
