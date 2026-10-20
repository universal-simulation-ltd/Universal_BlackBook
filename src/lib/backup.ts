// The backup file — "Save a backup" / "Open a backup" in Backup, import &
// export. It replaced the encrypted online vault on 2026-10-20 (James: no
// logins in the first iterations; where data has to move, a file instead —
// Docs_UNI_SIM/login-free-plan.md).
//
// The envelope is the suite's transfer file (`@unisim/sdk` transfer.ts):
// product 'blackbook', kind 'backup', schema 1, with the SDK's optional
// password (PBKDF2-SHA-256 → AES-256-GCM). What this file owns is `data`:
// EVERYTHING the app keeps about the book, so a backup brings back exactly
// what was there, which a CSV cannot (it has no to-dos and no lists' own tags).
//
//   { contacts, tags, todos, settings, view }
//
// Not in it: the PIN (a door on one device, not part of the book), the seed
// marker, the SDK's own preferences (language, default tab).
//
// ⚠️ A backup file is UNTRUSTED. Anyone can hand-edit one or make one from
// scratch, so `parseBackup` checks every field it keeps: types, lengths, array
// caps, ids, dates, colours. Nothing from a file is ever rendered as HTML (the
// app renders text through React only), and BlackBook keeps no photos, so
// there are no image bytes to check.

import { packTransfer, readTransfer, type PackedTransfer, type TransferErrorReason } from '@unisim/sdk'
import { isValidBirthday } from './birthday'
import { SORT_KEYS, UNTAGGED, type SortKey, type View } from './filter'
import { FORM_FIELDS, isFormField, type FormField } from './formFields'
import { mergeBooks } from './merge'
import { SWATCHES } from './palette'
import { toTodo, mergeTodos, type Todo } from './todos'
import type { Contact, Tag } from './types'

export const BACKUP_PRODUCT = 'blackbook'
export const BACKUP_KIND = 'backup'
export const BACKUP_SCHEMA = 1

/** The app's own switches that travel with a backup (stores/settingsStore.ts). */
export interface BackupSettings {
  emailLists: boolean
  todos: boolean
  shownFields: FormField[]
}

export interface BackupData {
  contacts: Contact[]
  tags: Tag[]
  todos: Todo[]
  settings: BackupSettings | null
  view: View | null
}

// ── Caps ─────────────────────────────────────────────────────────────────────
// Generous for a real book, small enough that a hostile file cannot make the
// app hold or draw millions of anything. The SDK caps the file at 40 MB.
export const LIMITS = {
  contacts: 20_000,
  tags: 2_000,
  todos: 20_000,
  tagIdsPerRecord: 500,
  id: 100,
  name: 500,
  email: 320,
  phone: 100,
  company: 300,
  address: 2_000,
  notes: 100_000,
  tagName: 100,
  todoTitle: 1_000,
  todoDetails: 20_000,
} as const

// ── Saving ───────────────────────────────────────────────────────────────────

export interface BackupSource {
  contacts: Contact[]
  tags: Tag[]
  todos: Todo[]
  settings: BackupSettings
  view: View
}

/** The file's `data`: a plain copy, so nothing live is handed to JSON. */
export function backupData(src: BackupSource): BackupData {
  return {
    contacts: src.contacts.map((c) => ({ ...c, tagIds: [...c.tagIds] })),
    tags: src.tags.map((t) => ({ ...t, ...(t.tagIds ? { tagIds: [...t.tagIds] } : {}) })),
    todos: src.todos.map((t) => ({ ...t, tagIds: [...t.tagIds] })),
    settings: { emailLists: src.settings.emailLists, todos: src.settings.todos, shownFields: [...src.settings.shownFields] },
    view: { tagIds: [...src.view.tagIds], hiddenTagIds: [...src.view.hiddenTagIds], sort: src.view.sort },
  }
}

export function packBackup(
  src: BackupSource,
  opts: { password?: string; version?: string; platform?: string; now?: Date } = {},
): Promise<PackedTransfer> {
  return packTransfer({
    product: BACKUP_PRODUCT,
    kind: BACKUP_KIND,
    schema: BACKUP_SCHEMA,
    data: backupData(src),
    app: { name: 'Universal BlackBook', ...(opts.version ? { version: opts.version } : {}), ...(opts.platform ? { platform: opts.platform } : {}) },
    password: opts.password || undefined,
    title: 'blackbook-backup',
    now: opts.now,
  })
}

// ── Opening ──────────────────────────────────────────────────────────────────

export type OpenResult =
  | { ok: true; data: BackupData; exportedAt: string | null; encrypted: boolean }
  | { ok: false; reason: TransferErrorReason }

/**
 * Read a file as a BlackBook backup. Never throws for a bad file: the reason
 * comes back, in the SDK's words (`transferErrorText`). A file whose envelope
 * is fine but whose `data` is not a book reads as 'damaged'.
 */
export async function openBackup(input: Blob | string, password?: string): Promise<OpenResult> {
  const read = await readTransfer(input, {
    product: BACKUP_PRODUCT,
    kinds: { [BACKUP_KIND]: { schema: BACKUP_SCHEMA } },
    password: password || undefined,
  })
  if (!read.ok) return { ok: false, reason: read.reason }
  const data = parseBackup(read.data)
  if (!data) return { ok: false, reason: 'damaged' }
  return { ok: true, data, exportedAt: read.exportedAt, encrypted: read.encrypted }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** A string within `max`, trimmed of nothing (notes keep their spacing); else ''. */
function str(v: unknown, max: number): string {
  return typeof v === 'string' && v.length <= max ? v : ''
}

function optStr(v: unknown, max: number): string | undefined {
  const s = str(v, max)
  return s ? s : undefined
}

const ID = /^[A-Za-z0-9_-]+$/

function id(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= LIMITS.id && ID.test(v) ? v : null
}

/** 2000-01-01, the earliest time a file may claim. */
const EARLIEST = 946_684_800_000

/** Epoch ms between 2000 and a year from now; else `fallback`. */
function time(v: unknown, fallback: number): number {
  const max = Date.now() + 366 * 86_400_000
  return typeof v === 'number' && Number.isFinite(v) && v >= EARLIEST && v <= max ? Math.round(v) : fallback
}

function optTime(v: unknown): number | undefined {
  const t = time(v, -1)
  return t === -1 ? undefined : t
}

/** Ids from a list, valid and known, de-duplicated and capped. */
function ids(v: unknown, known: Set<string>): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v.slice(0, LIMITS.tagIdsPerRecord * 2)) {
    const i = id(x)
    if (i && known.has(i) && !out.includes(i)) out.push(i)
    if (out.length >= LIMITS.tagIdsPerRecord) break
  }
  return out
}

const COLOURS = new Set(SWATCHES.map((s) => s.key))

function parseTag(raw: unknown): Tag | null {
  if (!isRecord(raw)) return null
  const tagId = id(raw.id)
  const name = str(raw.name, LIMITS.tagName).trim()
  if (!tagId || !name) return null
  return {
    id: tagId,
    name,
    colour: typeof raw.colour === 'string' && COLOURS.has(raw.colour) ? raw.colour : SWATCHES[0].key,
    ...(raw.kind === 'list' ? { kind: 'list' as const, tagIds: [] } : {}),
  }
}

function parseContact(raw: unknown, known: Set<string>): Contact | null {
  if (!isRecord(raw)) return null
  const contactId = id(raw.id)
  if (!contactId) return null
  const name = str(raw.name, LIMITS.name)
  const email = str(raw.email, LIMITS.email)
  const phone = str(raw.phone, LIMITS.phone)
  const company = optStr(raw.company, LIMITS.company)
  const address = optStr(raw.address, LIMITS.address)
  const notes = str(raw.notes, LIMITS.notes)
  // A record with nothing in it at all is junk, not a person.
  if (![name, email, phone, company ?? '', address ?? '', notes].some((v) => v.trim())) return null
  // ⚠️ A missing or impossible time reads as the OLDEST, never as now: in
  // "Add to what's here" the newer edit wins, and an undated record from a
  // file must not beat a real edit made on this device.
  const createdAt = time(raw.createdAt, EARLIEST)
  return {
    id: contactId,
    name,
    email,
    phone,
    company,
    address,
    tagIds: ids(raw.tagIds, known),
    birthdate: typeof raw.birthdate === 'string' && raw.birthdate.length <= 10 && isValidBirthday(raw.birthdate) ? raw.birthdate : undefined,
    hideBirthday: raw.hideBirthday === true ? true : undefined,
    hideFromList: raw.hideFromList === true ? true : undefined,
    pinnedAt: optTime(raw.pinnedAt),
    listOnly: raw.listOnly === true ? true : undefined,
    notes,
    createdAt,
    updatedAt: time(raw.updatedAt, createdAt),
  }
}

function parseTodo(raw: unknown, known: Set<string>): Todo | null {
  if (!isRecord(raw)) return null
  const todoId = id(raw.id)
  const title = str(raw.title, LIMITS.todoTitle)
  if (!todoId || !title.trim()) return null
  // toTodo checks the deadline is a real calendar date; the rest is ours.
  const base = toTodo({ id: todoId, title, due: raw.due })
  const createdAt = time(raw.createdAt, EARLIEST)
  return {
    id: todoId,
    title,
    details: str(raw.details, LIMITS.todoDetails),
    due: base?.due,
    tagIds: ids(raw.tagIds, known),
    doneAt: optTime(raw.doneAt),
    createdAt,
    updatedAt: time(raw.updatedAt, createdAt),
  }
}

function parseSettings(raw: unknown): BackupSettings | null {
  if (!isRecord(raw)) return null
  const shown = Array.isArray(raw.shownFields) ? raw.shownFields.slice(0, 50).filter(isFormField) : []
  return {
    emailLists: raw.emailLists === true,
    todos: raw.todos === true,
    shownFields: FORM_FIELDS.filter((f) => shown.includes(f)),
  }
}

function parseView(raw: unknown, known: Set<string>): View | null {
  if (!isRecord(raw)) return null
  if (!SORT_KEYS.includes(raw.sort as SortKey)) return null
  const pick = (v: unknown) => {
    if (!Array.isArray(v)) return []
    const out: string[] = []
    for (const x of v.slice(0, LIMITS.tags)) {
      if (x === UNTAGGED || (typeof x === 'string' && known.has(x))) if (!out.includes(x)) out.push(x)
    }
    return out
  }
  return { tagIds: pick(raw.tagIds), hiddenTagIds: pick(raw.hiddenTagIds), sort: raw.sort as SortKey }
}

/**
 * A backup's `data`, checked field by field, or null if it is not a book at
 * all. One bad record is dropped, never thrown over (the same rule as
 * lib/store.ts); a duplicate id keeps the first.
 */
export function parseBackup(raw: unknown): BackupData | null {
  if (!isRecord(raw) || !Array.isArray(raw.contacts)) return null
  if (raw.contacts.length > LIMITS.contacts) return null
  const rawTags = Array.isArray(raw.tags) ? raw.tags : []
  const rawTodos = Array.isArray(raw.todos) ? raw.todos : []
  if (rawTags.length > LIMITS.tags || rawTodos.length > LIMITS.todos) return null

  const tags: Tag[] = []
  const tagIds = new Set<string>()
  for (const r of rawTags) {
    const t = parseTag(r)
    if (t && !tagIds.has(t.id)) {
      tags.push(t)
      tagIds.add(t.id)
    }
  }
  // A list's own tags, once every tag is known: ordinary tags only.
  const plain = new Set(tags.filter((t) => t.kind !== 'list').map((t) => t.id))
  rawTags.forEach((r) => {
    if (!isRecord(r)) return
    const t = tags.find((x) => x.id === r.id)
    if (t?.kind === 'list') t.tagIds = ids(r.tagIds, plain)
  })

  const contacts: Contact[] = []
  const seen = new Set<string>()
  for (const r of raw.contacts) {
    const c = parseContact(r, tagIds)
    if (c && !seen.has(c.id)) {
      contacts.push(c)
      seen.add(c.id)
    }
  }

  // To-dos never carry lists (lib/todos.ts).
  const todos: Todo[] = []
  const seenTodos = new Set<string>()
  for (const r of rawTodos) {
    const t = parseTodo(r, plain)
    if (t && !seenTodos.has(t.id)) {
      todos.push(t)
      seenTodos.add(t.id)
    }
  }

  return { contacts, tags, todos, settings: parseSettings(raw.settings), view: parseView(raw.view, tagIds) }
}

// ── Merging ──────────────────────────────────────────────────────────────────

export interface MergedBackup {
  contacts: Contact[]
  tags: Tag[]
  todos: Todo[]
  /** People and to-dos from the file that were not here. */
  added: number
  /** Ones in both, where the file's copy was edited later. */
  updated: number
}

/**
 * "Add to what's here": the book on this device is the base and the file is
 * folded in (lib/merge.ts for the rules). By id, the newer `updatedAt` wins;
 * a person already here by name + email or name + phone is not added again;
 * a to-do with a new id but the same title, details and deadline as one here
 * is not added again either. So opening the same backup twice adds nothing.
 */
export function mergeBackup(here: { contacts: Contact[]; tags: Tag[]; todos: Todo[] }, file: BackupData): MergedBackup {
  const book = mergeBooks({ contacts: here.contacts, tags: here.tags }, { contacts: file.contacts, tags: file.tags })
  const sameTodo = (t: Todo) => `${t.title.trim()}\u0000${t.details.trim()}\u0000${t.due ?? ''}`
  const hereIds = new Set(here.todos.map((t) => t.id))
  const hereKeys = new Set(here.todos.map(sameTodo))
  const incoming = file.todos.filter((t) => hereIds.has(t.id) || !hereKeys.has(sameTodo(t)))
  const todos = mergeTodos(here.todos, incoming, book.remap)
  const before = new Map(here.todos.map((t) => [t.id, t.updatedAt]))
  let todosAdded = 0
  let todosUpdated = 0
  for (const t of todos) {
    const was = before.get(t.id)
    if (was === undefined) todosAdded++
    else if (t.updatedAt > was) todosUpdated++
  }
  // A list from the file keeps pointing at its own tags where they were
  // folded into one of the same name here.
  const tags = book.remap.size
    ? book.tags.map((t) => (t.kind === 'list' && t.tagIds ? { ...t, tagIds: [...new Set(t.tagIds.map((x) => book.remap.get(x) ?? x))] } : t))
    : book.tags
  return {
    contacts: book.contacts,
    tags,
    todos,
    added: book.added + todosAdded,
    updated: book.updated + todosUpdated,
  }
}
