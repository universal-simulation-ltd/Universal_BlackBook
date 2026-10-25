// Note templates (James, 2026-10-25, chosen over custom tabs): a template is a
// name and a few named fields — text, a date, a number or a link — and a note
// made from one fills them in. "Book: Title, Author, Date read". The Notes tab
// filters by template, and search looks in the fields' values.
//
// Templates belong to the book, not to one device: they live in this device's
// IndexedDB beside the notes (lib/store.ts 'templates'), in the encrypted
// online copy (VaultPayload.templates) and in a backup file (schema 3). A note
// keeps its own values (Note.fields, by field id), so renaming a field renames
// it on every note; removing a field, or the whole template, moves the values
// into the notes' text first (`retireFields`) so nothing typed is lost.

import type { Note } from './notes'

export type FieldType = 'text' | 'date' | 'number' | 'link'
export const FIELD_TYPES: readonly FieldType[] = ['text', 'date', 'number', 'link']

export interface TemplateField {
  id: string
  label: string
  type: FieldType
}

export interface NoteTemplate {
  id: string
  name: string
  fields: TemplateField[]
  createdAt: number
  updatedAt: number
}

export const TEMPLATE_LIMITS = { templates: 100, fields: 30, name: 100, label: 100, value: 2000 } as const

/** The example one a book starts with — a fixed id, so two devices seeding it make one, not two. */
export const BOOK_TEMPLATE_ID = 'tpl-book'

const ID = /^[A-Za-z0-9_-]{1,100}$/

function toField(raw: unknown): TemplateField | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !ID.test(r.id)) return null
  const label = typeof r.label === 'string' ? r.label.slice(0, TEMPLATE_LIMITS.label) : ''
  return { id: r.id, label, type: FIELD_TYPES.includes(r.type as FieldType) ? (r.type as FieldType) : 'text' }
}

/** One template from storage, the vault or a file, or null. One bad field is dropped. */
export function toTemplate(raw: unknown): NoteTemplate | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !ID.test(r.id)) return null
  const name = typeof r.name === 'string' ? r.name.slice(0, TEMPLATE_LIMITS.name).trim() : ''
  if (!name) return null
  const fields: TemplateField[] = []
  const seen = new Set<string>()
  for (const f of Array.isArray(r.fields) ? r.fields.slice(0, TEMPLATE_LIMITS.fields * 2) : []) {
    const x = toField(f)
    if (x && !seen.has(x.id)) {
      fields.push(x)
      seen.add(x.id)
    }
    if (fields.length >= TEMPLATE_LIMITS.fields) break
  }
  const time = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
  return { id: r.id, name, fields, createdAt: time(r.createdAt), updatedAt: time(r.updatedAt) }
}

export function toTemplates(raw: unknown): NoteTemplate[] {
  if (!Array.isArray(raw)) return []
  const out: NoteTemplate[] = []
  const seen = new Set<string>()
  for (const r of raw.slice(0, TEMPLATE_LIMITS.templates * 2)) {
    const t = toTemplate(r)
    if (t && !seen.has(t.id)) {
      out.push(t)
      seen.add(t.id)
    }
    if (out.length >= TEMPLATE_LIMITS.templates) break
  }
  return out
}

/** A note's field values from storage or a file: string values only, capped, by valid id. */
export function toFieldValues(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Record<string, string> = {}
  let n = 0
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ID.test(k) || typeof v !== 'string' || !v.trim()) continue
    out[k] = v.slice(0, TEMPLATE_LIMITS.value)
    if (++n >= TEMPLATE_LIMITS.fields * 2) break
  }
  return n ? out : undefined
}

/** Two lists into one, by id, the newer edit winning (as notes and to-dos). */
export function mergeTemplates(online: NoteTemplate[], local: NoteTemplate[]): NoteTemplate[] {
  const out = [...online]
  const at = new Map(out.map((t, i) => [t.id, i]))
  for (const t of local) {
    const i = at.get(t.id)
    if (i === undefined) {
      at.set(t.id, out.length)
      out.push(t)
    } else if (t.updatedAt > out[i].updatedAt) out[i] = t
  }
  return out
}

/** The example "Book" template, in the language on screen when it is made. */
export function bookTemplate(words: { name: string; title: string; author: string; read: string }, now = Date.now()): NoteTemplate {
  return {
    id: BOOK_TEMPLATE_ID,
    name: words.name,
    fields: [
      { id: 'f-title', label: words.title, type: 'text' },
      { id: 'f-author', label: words.author, type: 'text' },
      { id: 'f-read', label: words.read, type: 'date' },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

/** A field's value for the eye: a date in the language on screen, the rest as typed. */
export function showValue(type: FieldType, value: string, locale: string): string {
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
  return value
}

/**
 * Fields leaving a template (removed from it, or the template deleted): each
 * note that had a value for one gets "Label: value" added to its text and the
 * value dropped, so what was typed stays readable. `dropTemplate` also takes
 * the notes off the template. Returns only the notes that changed.
 */
export function retireFields(notes: Note[], template: NoteTemplate, fieldIds: string[], dropTemplate: boolean, now = Date.now()): Note[] {
  const leaving = template.fields.filter((f) => fieldIds.includes(f.id))
  const changed: Note[] = []
  for (const n of notes) {
    if (n.templateId !== template.id) continue
    const lines = leaving.filter((f) => n.fields?.[f.id]?.trim()).map((f) => `${f.label || '…'}: ${n.fields![f.id]}`)
    const rest = { ...(n.fields ?? {}) }
    for (const f of leaving) delete rest[f.id]
    if (!lines.length && !dropTemplate) continue
    const details = lines.length ? [n.details.replace(/\s+$/, ''), lines.join('\n')].filter(Boolean).join('\n\n') : n.details
    const next: Note = { ...n, details, fields: Object.keys(rest).length ? rest : undefined, updatedAt: now }
    if (dropTemplate) {
      delete next.templateId
      delete next.fields
    }
    changed.push(next)
  }
  return changed
}
