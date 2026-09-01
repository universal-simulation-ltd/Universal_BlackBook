// CSV in and out — the app's only door.
//
// There is no account and no sync, so this file IS the backup story, the
// device-to-device move and the way out to any other address book. It gets a
// real RFC 4180 parser rather than a `split(',')` for that reason: notes are
// free text, and the first note anybody writes with a comma in it would
// otherwise silently shear the row.

import type { Contact, Tag } from './types'
import { parseBirthdayInput } from './birthday'
import { newId } from './id'
import { nextSwatch } from './palette'

// ⚠️ APPEND ONLY, with ONE historical exception. A headerless file is read
// positionally against this order (see `fromCsv`), so inserting a column in
// the middle silently re-maps every column after it in files exported before
// the change. Birthday went on the end for exactly that reason.
//
// The exception: `Frequency` used to sit between Tags and Notes, and was
// removed when the field was (2026-08-24). That leaves TWO positional layouts
// in the wild, and a headerless file cannot say which it is — so `fromCsv`
// decides on the CELL COUNT: six columns is the old layout with the frequency
// hole, five is this one. That is the only reason `LEGACY_COLUMN_COUNT`
// exists, and removing it would silently shift Notes and Birthday one column
// left in every old headerless export.
// Phone was appended on 2026-08-30, under that same rule — it reads AFTER
// Birthday in the file even though it sits under Email in the form, because
// where a column lives on screen and where it lives in the file are two
// different questions and only one of them is a wire format.
//
// `Hide birthday` was appended on 2026-09-01, same rule again. It is the one
// column that is not a fact about the person — it is a view preference (see
// Contact.hideBirthday) — and it is here anyway because this file is the
// backup and the device-to-device move, and a backup that quietly drops a
// setting restores a book that is subtly not the one you saved.
//
// ⚠️ It also makes a SEVENTH cell a fact worth having: seven cells cannot be
// the legacy layout, which had exactly six, so a headerless file that wide
// needs none of the guessing `positionalMap` does below.
export const COLUMNS = ['Name', 'Email', 'Tags', 'Notes', 'Birthday', 'Phone', 'Hide birthday'] as const

const LEGACY_COLUMN_COUNT = 6

/**
 * What counts as "yes" in the Hide birthday column.
 *
 * ⚠️ An allowlist, and everything else — a stray word, a foreign export's own
 * column that happened to match the header, a corrupted cell — reads as SHOWN.
 * The failure mode of this field has to be a visible birthday, never a
 * silently missing one; `toContact` in lib/store.ts takes the same line with
 * the same reasoning.
 */
const HIDDEN_VALUES = new Set(['yes', 'y', 'true', '1', 'hidden'])

/** What `toCsv` writes. A word rather than `1`, because a person may read it. */
const HIDDEN_CELL = 'yes'

/** Tags share one cell, so they need a separator the delimiter is not. */
const TAG_SEPARATOR = '; '

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
export function toCsv(contacts: Contact[], tags: Tag[]): string {
  const nameById = new Map(tags.map((t) => [t.id, t.name]))
  const rows = [
    COLUMNS.join(','),
    ...contacts.map((c) =>
      [
        c.name,
        c.email,
        c.tagIds
          .map((id) => nameById.get(id))
          .filter((n): n is string => Boolean(n))
          .join(TAG_SEPARATOR),
        c.notes,
        // The stored string, not the pretty one: `--06-04` round-trips and
        // "4 June" does not survive a trip through a spreadsheet's date
        // handling. `formatBirthday` is for screens.
        c.birthdate ?? '',
        // Exactly as typed, `+` and spacing intact. A spreadsheet will read a
        // bare `07700900123` as a number and eat the leading zero, which is
        // the user's problem to notice — writing it back mangled, or prefixed
        // with an apostrophe to stop that, would be ours.
        c.phone,
        // Empty for the great majority, which keeps a hand-read file quiet:
        // the column only says anything about the people it applies to.
        c.hideBirthday ? HIDDEN_CELL : '',
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

type Column = 'name' | 'email' | 'tags' | 'notes' | 'birthday' | 'phone' | 'hideBirthday'

/**
 * What a header cell may be called.
 *
 * An explicit table rather than a de-pluralising rule. The rule is what was
 * here first, and `'categories'.replace(/s$/, '')` yielded `'categorie'` — so
 * the app's OWN export header did not match its own importer, and every tag in
 * a round-tripped file was silently dropped. Five tests caught it; nothing
 * about the app's behaviour would have.
 *
 * The extra spellings are the ones people actually arrive with — Google
 * Contacts and Outlook both export "E-mail Address", and "Groups" and "Labels"
 * are what other address books call tags. `Categories` is in here twice over:
 * it is what other address books say AND what this app's own exports said
 * before 2026-08-24, so an old BlackBook file still imports its tags.
 *
 * ⚠️ There are no `frequency` aliases any more, and their absence is the whole
 * migration for a HEADED file: an old export's `Frequency` column matches
 * nothing, so it is ignored rather than mis-read as Notes.
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
  'tag': 'tags',
  'tags': 'tags',
  'category': 'tags',
  'categories': 'tags',
  'group': 'tags',
  'groups': 'tags',
  'label': 'tags',
  'labels': 'tags',
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
  'phone': 'phone',
  'phones': 'phone',
  'phone number': 'phone',
  'telephone': 'phone',
  'tel': 'phone',
  'mobile': 'phone',
  'mobile phone': 'phone',
  'mobile number': 'phone',
  'cell': 'phone',
  'cell phone': 'phone',
  'primary phone': 'phone',
  'home phone': 'phone',
  'work phone': 'phone',
  'business phone': 'phone',
  // Google Contacts' own header. It exports one column PER number —
  // "Phone 1 - Value", "Phone 2 - Value" — and only the first is taken,
  // because this app holds one number per person and silently concatenating
  // somebody's mobile onto their fax is worse than dropping the fax.
  //
  // ⚠️ The neighbouring `Phone 1 - Type` column is deliberately absent from
  // this table: it holds "Mobile", not a number. The lookup is exact, so it
  // simply misses — which is the right answer and the reason this table is
  // spellings rather than a de-suffixing rule that would catch both.
  'phone 1 - value': 'phone',
  // Ours alone. No other address book has this column, so there is nothing to
  // be compatible WITH — the spellings here are just the ones a person might
  // type after editing the export in a spreadsheet.
  'hide birthday': 'hideBirthday',
  'hide birthdays': 'hideBirthday',
  'hidden birthday': 'hideBirthday',
  'hide from birthdays': 'hideBirthday',
}

/**
 * Map each known column to its position, or -1.
 *
 * First match wins: a file with both "Email" and "E-mail Address" columns
 * takes the leftmost, which is the one a spreadsheet's own export puts the
 * primary value in.
 */
function headerIndex(header: string[]): Record<Column, number> {
  const out: Record<Column, number> = {
    name: -1,
    email: -1,
    tags: -1,
    notes: -1,
    birthday: -1,
    phone: -1,
    hideBirthday: -1,
  }
  header.forEach((h, i) => {
    const column = HEADER_ALIASES[h.trim().toLowerCase()]
    if (column && out[column] === -1) out[column] = i
  })
  return out
}

export interface ImportResult {
  contacts: Contact[]
  /** Existing tags plus any the file mentioned that did not exist yet. */
  tags: Tag[]
  /** Tags created by this import — surfaced so the user is told. */
  created: string[]
  /** Rows skipped for having no name AND no email. */
  skipped: number
}

/**
 * The positional map for a HEADERLESS file.
 *
 * ⚠️ Five cells is unambiguous — Name, Email, Tags, Notes, Birthday, and no
 * phone column at all. Six is not, and stopped being so on 2026-08-30:
 *
 *   legacy (pre-2026-08-24)   Name, Email, Tags, **Frequency**, Notes, Birthday
 *   today                     Name, Email, Tags, Notes, Birthday, **Phone**
 *
 * The cell COUNT used to tell those apart and cannot any more, so the file's
 * own content decides: Birthday sits at index 5 in one layout and index 4 in
 * the other, and `parseBirthdayInput` is strict enough (it refuses `04/06/1990`
 * outright) that whichever column yields more real dates is the birthday
 * column. Reading it the wrong way round is not a cosmetic error — it puts a
 * cadence word into Notes and a note into Birthday for every row, silently,
 * because both fields accept anything and an unparseable birthday is dropped.
 *
 * ⚠️ A TIE goes to legacy, which includes the common case of a file with no
 * birthdays in it at all. That is the pre-existing behaviour, kept deliberately
 * rather than reasoned about afresh: an old headerless export is a file that
 * definitely exists somewhere, and a NEW headerless one only exists if
 * somebody deleted the header row from this week's export. When the tie is
 * wrong, the cost is Notes read from the empty frequency column — recoverable
 * by re-exporting with the header, which is what every export writes.
 *
 * ⚠️ SEVEN cells short-circuits all of that, from 2026-09-01. The legacy layout
 * had exactly six columns and can never be wider, so a seven-cell file is this
 * app's current layout and nothing else — no heuristic, and no tie to lose. It
 * is the only width here that is known rather than inferred.
 */
function positionalMap(rows: string[][]): Record<Column, number> {
  const width = Math.max(...rows.map((r) => r.length))
  if (width > LEGACY_COLUMN_COUNT) {
    return { name: 0, email: 1, tags: 2, notes: 3, birthday: 4, phone: 5, hideBirthday: 6 }
  }
  if (width < LEGACY_COLUMN_COUNT) {
    return { name: 0, email: 1, tags: 2, notes: 3, birthday: 4, phone: -1, hideBirthday: -1 }
  }
  const dates = (i: number) => rows.filter((r) => parseBirthdayInput((r[i] ?? '').trim())).length
  return dates(4) > dates(5)
    ? { name: 0, email: 1, tags: 2, notes: 3, birthday: 4, phone: 5, hideBirthday: -1 }
    : { name: 0, email: 1, tags: 2, notes: 4, birthday: 5, phone: -1, hideBirthday: -1 }
}

/**
 * Turn a CSV into contacts, creating tags as needed.
 *
 * Matching an existing tag is by folded NAME, not by id: the file came from a
 * human or from another device, and neither knows our ids. That means
 * importing "Family" twice merges into one tag rather than making a second one
 * that looks identical and behaves differently — the single most annoying
 * failure an address-book import has.
 */
export function fromCsv(text: string, existing: Tag[]): ImportResult {
  const rows = parseCsv(text)
  if (rows.length === 0) return { contacts: [], tags: existing, created: [], skipped: 0 }

  const idx = headerIndex(rows[0])
  // No recognisable header row → assume the file is headerless and positional,
  // in one of this app's own export orders. Keyed on name/email specifically: a
  // file whose first row happens to say "Notes" and nothing else is far more
  // likely to be a headerless row of data than a header.
  const hasHeader = idx.name >= 0 || idx.email >= 0
  const at = hasHeader ? idx : positionalMap(rows)

  const tags = [...existing]
  const byFoldedName = new Map(tags.map((t) => [t.name.trim().toLowerCase(), t]))
  const created: string[] = []

  const ensureTag = (name: string): string => {
    const key = name.trim().toLowerCase()
    const found = byFoldedName.get(key)
    if (found) return found.id
    const tag: Tag = {
      id: newId(),
      name: name.trim(),
      colour: nextSwatch(tags.map((t) => t.colour)),
    }
    tags.push(tag)
    byFoldedName.set(key, tag)
    created.push(tag.name)
    return tag.id
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
    // Unparseable birthdays are dropped, not rejected — losing one person's
    // birthday is a far smaller harm than refusing to import the person, and
    // `parseBirthdayInput` deliberately declines ambiguous forms like
    // 04/06/1990 rather than guessing at a day/month order.
    const birthdate = parseBirthdayInput(cell(row, at.birthday))
    contacts.push({
      id: newId(),
      name: name || email,
      email,
      tagIds: cell(row, at.tags)
        .split(/[;|]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(ensureTag),
      phone: cell(row, at.phone),
      birthdate,
      // ⚠️ Only alongside a birthday that actually parsed. A row flagged hidden
      // whose date was unreadable would otherwise land a flag on somebody with
      // no date at all — invisible until they were given one, at which point
      // they would be silently absent from the birthdays view for a reason
      // written into a CSV weeks earlier. `undefined` and not `false` for the
      // shown case, matching what the store writes.
      hideBirthday:
        birthdate && HIDDEN_VALUES.has(cell(row, at.hideBirthday).toLowerCase()) ? true : undefined,
      notes: at.notes >= 0 ? (row[at.notes] ?? '') : '',
      createdAt: now,
      updatedAt: now,
    })
  }

  return { contacts, tags, created, skipped }
}
