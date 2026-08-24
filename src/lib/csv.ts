// CSV in and out — the app's only door.
//
// There is no account and no sync, so this file IS the backup story, the
// device-to-device move and the way out to any other address book. It gets a
// real RFC 4180 parser rather than a `split(',')` for that reason: notes are
// free text, and the first note anybody writes with a comma in it would
// otherwise silently shear the row.

import type { Category, Contact, Frequency } from './types'
import { DEFAULT_FREQUENCY, FREQUENCIES, isFrequency } from './frequency'
import { parseBirthdayInput } from './birthday'
import { newId } from './id'
import { nextSwatch } from './palette'

// ⚠️ APPEND ONLY. A headerless file is read positionally against this order
// (see `fromCsv`), so inserting a column in the middle would silently re-map
// every column after it in files exported before the change. Birthday went on
// the end for exactly that reason, not because it belongs there.
export const COLUMNS = ['Name', 'Email', 'Categories', 'Frequency', 'Notes', 'Birthday'] as const

/** Categories share one cell, so they need a separator the delimiter is not. */
const CATEGORY_SEPARATOR = '; '

// ─────────────────────────────────────────────────────────────── write

function escapeCell(value: string): string {
  // Quote only when required, so a plain file stays readable in a text editor.
  // A quote inside a quoted field is doubled — that is the escape, not a
  // backslash, and getting it wrong is the classic way a name like
  // O"Brien-Smith swallows the rest of the row.
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Serialise the whole book.
 *
 * ⚠️ Deliberately NOT sanitised against spreadsheet formula injection (a cell
 * beginning `=`, `+`, `-` or `@`). The usual guard prefixes an apostrophe,
 * which corrupts the value on the way back in — and this file's primary job is
 * to be re-imported by the same person who exported it. The data is the user's
 * own, going back to the user. If BlackBook ever accepts a file from a third
 * party and re-exports it, revisit this.
 *
 * CRLF and a UTF-8 BOM are both for Excel: without the BOM it reads the file
 * as the local ANSI codepage and every accented name arrives mojibaked.
 */
export function toCsv(contacts: Contact[], categories: Category[]): string {
  const nameById = new Map(categories.map((c) => [c.id, c.name]))
  const rows = [
    COLUMNS.join(','),
    ...contacts.map((c) =>
      [
        c.name,
        c.email,
        c.categoryIds
          .map((id) => nameById.get(id))
          .filter((n): n is string => Boolean(n))
          .join(CATEGORY_SEPARATOR),
        c.frequency,
        c.notes,
        // The stored string, not the pretty one: `--06-04` round-trips and
        // "4 June" does not survive a trip through a spreadsheet's date
        // handling. `formatBirthday` is for screens.
        c.birthdate ?? '',
      ]
        .map(escapeCell)
        .join(','),
    ),
  ]
  // The BOM is written as the \ufeff ESCAPE, never as a literal character:
  // eslint's no-irregular-whitespace rejects the literal, and it is invisible
  // in every editor and every diff — exactly the property you do not want in
  // the one byte deciding whether Excel reads this as UTF-8 or as cp1252.
  return `\ufeff${rows.join('\r\n')}\r\n`
}

// ─────────────────────────────────────────────────────────────── read

/**
 * RFC 4180 parser. Returns rows of cells; blank trailing lines are dropped.
 *
 * Written as a character loop rather than a regex because the quoting rules
 * are stateful: a comma inside quotes is data, a comma outside is a delimiter,
 * and no regex tells those apart without lookbehind gymnastics that fail on
 * the first doubled quote.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\ufeff/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let i = 0

  const endCell = () => {
    row.push(cell)
    cell = ''
  }
  const endRow = () => {
    endCell()
    // A file ending in a newline yields a final [''] row; so does a blank line
    // in the middle. Neither is a record.
    if (!(row.length === 1 && row[0] === '')) rows.push(row)
    row = []
  }

  while (i < src.length) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        continue
      }
      cell += ch
      i++
      continue
    }
    if (ch === '"' && cell === '') {
      quoted = true
      i++
      continue
    }
    if (ch === ',') {
      endCell()
      i++
      continue
    }
    if (ch === '\r' || ch === '\n') {
      endRow()
      // Consume CRLF as ONE terminator, or every row is followed by a blank.
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1
      continue
    }
    cell += ch
    i++
  }
  if (cell !== '' || row.length > 0) endRow()
  return rows
}

type Column = 'name' | 'email' | 'categories' | 'frequency' | 'notes' | 'birthday'

/**
 * What a header cell may be called.
 *
 * An explicit table rather than a de-pluralising rule. The rule is what was
 * here first, and `'categories'.replace(/s$/, '')` yields `'categorie'` — so
 * the app's OWN export header did not match its own importer, and every
 * category in a round-tripped file was silently dropped. Five tests caught it;
 * nothing about the app's behaviour would have.
 *
 * The extra spellings are the ones people actually arrive with — Google
 * Contacts and Outlook both export "E-mail Address", and "Tags" and "Groups"
 * are what other address books call categories.
 */
const HEADER_ALIASES: Record<string, Column> = {
  'name': 'name',
  'full name': 'name',
  'display name': 'name',
  'contact': 'name',
  'email': 'email',
  'emails': 'email',
  'e-mail': 'email',
  'email address': 'email',
  'e-mail address': 'email',
  'category': 'categories',
  'categories': 'categories',
  'group': 'categories',
  'groups': 'categories',
  'tag': 'categories',
  'tags': 'categories',
  'labels': 'categories',
  'frequency': 'frequency',
  'contact frequency': 'frequency',
  'how often': 'frequency',
  'cadence': 'frequency',
  'note': 'notes',
  'notes': 'notes',
  'comment': 'notes',
  'comments': 'notes',
  'birthday': 'birthday',
  'birthdate': 'birthday',
  'birth date': 'birthday',
  'date of birth': 'birthday',
  'dob': 'birthday',
  'born': 'birthday',
}

/**
 * Map each known column to its position, or -1.
 *
 * First match wins: a file with both "Email" and "E-mail Address" columns
 * takes the leftmost, which is the one a spreadsheet's own export puts the
 * primary value in.
 */
function headerIndex(header: string[]): Record<Column, number> {
  const out: Record<Column, number> = { name: -1, email: -1, categories: -1, frequency: -1, notes: -1, birthday: -1 }
  header.forEach((h, i) => {
    const column = HEADER_ALIASES[h.trim().toLowerCase()]
    if (column && out[column] === -1) out[column] = i
  })
  return out
}

/**
 * Frequency values are round-tripped as their stored keys, but a file touched
 * by a human will have the LABEL in it instead — so accept both, plus a few
 * spellings people actually type. Anything unrecognised falls back to the
 * default rather than rejecting the row: losing one person's cadence is a
 * smaller harm than losing the person.
 */
const FREQUENCY_ALIASES: Record<string, Frequency> = {
  ...Object.fromEntries(FREQUENCIES.map((f) => [f.label.toLowerCase(), f.value])),
  ...Object.fromEntries(FREQUENCIES.map((f) => [f.short.toLowerCase(), f.value])),
  week: 'weekly',
  fortnight: 'fortnightly',
  month: 'monthly',
  quarter: 'quarterly',
  '6 months': 'biannually',
  'six months': 'biannually',
  'every 6 months': 'biannually',
  'half yearly': 'biannually',
  year: 'yearly',
  annually: 'yearly',
  'big news': 'big-news',
  none: 'big-news',
  never: 'big-news',
  // 'n/a' and 'na' already resolve — the first through the short label, the
  // second because `na` IS the stored key. These are the longhand ways people
  // write the same thing in a spreadsheet.
  'not specified': 'na',
  'not set': 'na',
  'unspecified': 'na',
  'no set frequency': 'na',
}

export function parseFrequency(raw: string): Frequency {
  const value = raw.trim().toLowerCase()
  if (isFrequency(value)) return value
  return FREQUENCY_ALIASES[value] ?? DEFAULT_FREQUENCY
}

export interface ImportResult {
  contacts: Contact[]
  /** Existing categories plus any the file mentioned that did not exist yet. */
  categories: Category[]
  /** Categories created by this import — surfaced so the user is told. */
  created: string[]
  /** Rows skipped for having no name AND no email. */
  skipped: number
}

/**
 * Turn a CSV into contacts, creating categories as needed.
 *
 * Matching an existing category is by folded NAME, not by id: the file came
 * from a human or from another device, and neither knows our ids. That means
 * importing "Family" twice merges into one category rather than making a
 * second one that looks identical and behaves differently — the single most
 * annoying failure an address-book import has.
 */
export function fromCsv(text: string, existing: Category[]): ImportResult {
  const rows = parseCsv(text)
  if (rows.length === 0) return { contacts: [], categories: existing, created: [], skipped: 0 }

  const idx = headerIndex(rows[0])
  // No recognisable header row → assume the file is headerless and positional,
  // in this app's own export order. Keyed on name/email specifically: a file
  // whose first row happens to say "Notes" and nothing else is far more likely
  // to be a headerless row of data than a header.
  const hasHeader = idx.name >= 0 || idx.email >= 0
  const at = hasHeader ? idx : { name: 0, email: 1, categories: 2, frequency: 3, notes: 4, birthday: 5 }

  const categories = [...existing]
  const byFoldedName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]))
  const created: string[] = []

  const ensureCategory = (name: string): string => {
    const key = name.trim().toLowerCase()
    const found = byFoldedName.get(key)
    if (found) return found.id
    const category: Category = {
      id: newId(),
      name: name.trim(),
      colour: nextSwatch(categories.map((c) => c.colour)),
    }
    categories.push(category)
    byFoldedName.set(key, category)
    created.push(category.name)
    return category.id
  }

  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')

  const contacts: Contact[] = []
  let skipped = 0
  const now = Date.now()

  for (const row of rows.slice(hasHeader ? 1 : 0)) {
    const name = cell(row, at.name)
    const email = cell(row, at.email)
    // A row with neither is not a person. Notes-only rows are the usual cause
    // — a spreadsheet where somebody left a comment under the last entry.
    if (!name && !email) {
      skipped++
      continue
    }
    contacts.push({
      id: newId(),
      name: name || email,
      email,
      categoryIds: cell(row, at.categories)
        .split(/[;|]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(ensureCategory),
      frequency: parseFrequency(cell(row, at.frequency)),
      // Unparseable birthdays are dropped, not rejected — losing one person's
      // birthday is a far smaller harm than refusing to import the person, and
      // `parseBirthdayInput` deliberately declines ambiguous forms like
      // 04/06/1990 rather than guessing at a day/month order.
      birthdate: parseBirthdayInput(cell(row, at.birthday)),
      notes: at.notes >= 0 ? (row[at.notes] ?? '') : '',
      createdAt: now,
      updatedAt: now,
    })
  }

  return { contacts, categories, created, skipped }
}
