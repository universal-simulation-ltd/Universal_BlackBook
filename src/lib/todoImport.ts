// Tune ▸ Import ▸ To-dos (James, 2026-10-26: "click import then choice of
// Contacts, Notes, ToDo, restore Blackbook Backup"). Several files at once,
// each read ON THE DEVICE into to-dos. Nothing is uploaded.
//
//   • Text and Markdown (.txt, .md): one to-do a line. Bullets ("- ", "* ",
//     "• ", "1. ") and check boxes come off; a ticked box ("[x]") comes in
//     done. A line indented under one is that to-do's details. Markdown
//     headings are section names, not jobs, and are left out.
//   • A spreadsheet (.csv, .tsv): a Title / Task / Content column (else the
//     first), with Notes / Description, Due / Deadline and Done / Completed /
//     Status read when they are there. Todoist's export is one of these: its
//     rows that are not tasks (sections, comments) are left out.
//   • A calendar file (.ics): its VTODOs — summary, description, due date and
//     whether it was completed. Thunderbird and most calendar apps export them.

import { parseCsv } from './csv'
import { decodeText, parseDateLine } from './noteImport'

export interface ImportedTodo {
  title: string
  details: string
  /** `YYYY-MM-DD`. */
  due?: string
  done: boolean
  /** Which file it came from (for the summary). */
  file: string
}

export interface TodoImportResult {
  todos: ImportedTodo[]
  /** Files that could not be read, and why. */
  skipped: { file: string; reason: 'type' | 'size' | 'empty' | 'damaged' }[]
}

const MAX_FILE = 20 * 1024 * 1024
const MAX_TODOS = 5_000
const MAX_TITLE = 1_000
const MAX_TEXT = 100_000

type Kind = 'txt' | 'md' | 'csv' | 'tsv' | 'ics'

export function todoKindOf(name: string): Kind | null {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'txt') return 'txt'
  if (ext === 'md' || ext === 'markdown') return 'md'
  if (ext === 'csv') return 'csv'
  if (ext === 'tsv') return 'tsv'
  if (ext === 'ics' || ext === 'ical') return 'ics'
  return null
}

export async function importTodoFiles(
  files: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }[],
): Promise<TodoImportResult> {
  const out: TodoImportResult = { todos: [], skipped: [] }
  for (const f of files) {
    const kind = todoKindOf(f.name)
    if (!kind) {
      out.skipped.push({ file: f.name, reason: 'type' })
      continue
    }
    if (f.size > MAX_FILE) {
      out.skipped.push({ file: f.name, reason: 'size' })
      continue
    }
    try {
      const todos = readTodos(kind, decodeText(new Uint8Array(await f.arrayBuffer())), f.name)
      if (todos.length === 0) out.skipped.push({ file: f.name, reason: 'empty' })
      else out.todos.push(...todos)
    } catch {
      out.skipped.push({ file: f.name, reason: 'damaged' })
    }
  }
  out.todos = out.todos.slice(0, MAX_TODOS)
  return out
}

export function readTodos(kind: Kind, text: string, file: string): ImportedTodo[] {
  const found =
    kind === 'csv' || kind === 'tsv' ? fromTable(kind === 'tsv' ? parseTsv(text) : parseCsv(text), file)
    : kind === 'ics' ? fromIcs(text, file)
    : fromLines(text, file)
  return found
    .map((t) => ({ ...t, title: t.title.trim().slice(0, MAX_TITLE), details: t.details.trim().slice(0, MAX_TEXT) }))
    .filter((t) => t.title)
}

// ── Lines ────────────────────────────────────────────────────────────────────

const BULLET = /^(?:[-*+•–]\s+|\d{1,3}[.)]\s+)/
const BOX = /^\[([ xX✓✔])\]\s*/

function indentOf(line: string): number {
  return (/^[ \t]*/.exec(line)?.[0] ?? '').replace(/\t/g, '    ').length
}

function fromLines(text: string, file: string): ImportedTodo[] {
  const out: ImportedTodo[] = []
  let current: { todo: ImportedTodo; indent: number } | null = null
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!raw.trim()) continue
    const indent = indentOf(raw)
    let line = raw.trim()
    if (/^#{1,6}\s/.test(line)) {
      current = null
      continue
    }
    // Deeper than the to-do above it: part of that one.
    if (current && indent > current.indent) {
      current.todo.details += (current.todo.details ? '\n' : '') + line.replace(BULLET, '• ').replace(BOX, '')
      continue
    }
    line = line.replace(BULLET, '')
    const box = BOX.exec(line)
    if (box) line = line.slice(box[0].length)
    if (!line) continue
    const todo: ImportedTodo = { title: line, details: '', done: Boolean(box && box[1] !== ' '), file }
    out.push(todo)
    current = { todo, indent }
  }
  return out
}

// ── Tables ───────────────────────────────────────────────────────────────────

function parseTsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.split('\t'))
}

const HEAD = {
  title: ['title', 'task', 'tasks', 'content', 'name', 'to-do', 'todo', 'subject', 'item', 'summary'],
  details: ['details', 'notes', 'note', 'description', 'body', 'comments'],
  due: ['due', 'due date', 'deadline', 'date', 'due on'],
  done: ['done', 'completed', 'complete', 'status', 'checked'],
  type: ['type'],
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[_]+/g, ' ')

function fromTable(rows: string[][], file: string): ImportedTodo[] {
  if (rows.length === 0) return []
  const header = rows[0].map(norm)
  const col = (names: string[]) => header.findIndex((h) => names.includes(h))
  const title = col(HEAD.title)
  const hasHeader = title >= 0 || [HEAD.details, HEAD.due, HEAD.done].some((n) => col(n) >= 0)
  const at = {
    title: title >= 0 ? title : 0,
    details: hasHeader ? col(HEAD.details) : 1,
    due: hasHeader ? col(HEAD.due) : -1,
    done: hasHeader ? col(HEAD.done) : -1,
    type: hasHeader ? col(HEAD.type) : -1,
  }
  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')
  return (hasHeader ? rows.slice(1) : rows)
    .filter((row) => {
      const type = norm(cell(row, at.type))
      return !type || type === 'task'
    })
    .map((row) => ({
      title: cell(row, at.title),
      details: cell(row, at.details),
      due: toDue(cell(row, at.due)),
      done: isDone(cell(row, at.done)),
      file,
    }))
}

function isDone(v: string): boolean {
  return ['x', 'yes', 'y', 'true', '1', 'done', 'completed', 'complete', '✓', '✔'].includes(norm(v))
}

/**
 * "2026-10-25", "2026-10-25T09:00", "25 October 2026" → `YYYY-MM-DD`. A date
 * written 04/06/2026 is left out on purpose, as it is for a CSV's birthdays
 * (lib/csv.ts): the 4th of June in the UK, the 6th of April in the US, and a
 * deadline guessed wrong is worse than none — the to-do still comes in.
 */
export function toDue(v: string): string | undefined {
  const s = v.trim()
  if (!s) return undefined
  const p = (n: number) => String(n).padStart(2, '0')
  const iso = /^(\d{4})-?(\d{2})-?(\d{2})(?:[T ].*)?$/.exec(s)
  const ymd = iso ? valid(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : parseDateLine(s)
  return ymd ? `${ymd[0]}-${p(ymd[1] + 1)}-${p(ymd[2])}` : undefined
}

function valid(y: number, m: number, d: number): [number, number, number] | null {
  const t = new Date(y, m, d)
  return y >= 1990 && y <= 2200 && t.getMonth() === m && t.getDate() === d ? [y, m, d] : null
}

// ── Calendar files ───────────────────────────────────────────────────────────

function icsText(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')
}

function fromIcs(text: string, file: string): ImportedTodo[] {
  // Unfold: a line starting with a space or tab carries on the one above.
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const out: ImportedTodo[] = []
  let cur: ImportedTodo | null = null
  for (const line of lines) {
    if (line === 'BEGIN:VTODO') cur = { title: '', details: '', done: false, file }
    else if (line === 'END:VTODO') {
      if (cur) out.push(cur)
      cur = null
    } else if (cur) {
      const colon = line.indexOf(':')
      if (colon < 0) continue
      const name = line.slice(0, colon).split(';')[0].toUpperCase()
      const value = line.slice(colon + 1)
      if (name === 'SUMMARY') cur.title = icsText(value)
      else if (name === 'DESCRIPTION') cur.details = icsText(value)
      else if (name === 'DUE') cur.due = toDue(value.slice(0, 8))
      else if (name === 'STATUS') cur.done = value.trim().toUpperCase() === 'COMPLETED'
      else if (name === 'COMPLETED') cur.done = true
    }
  }
  return out
}
