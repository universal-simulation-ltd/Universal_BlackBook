// Notes → Import (James, 2026-10-25: "Import from OneNote", by file): several
// files at once — Word (.docx), web pages (.html, .htm, and OneNote's Single
// File Web Page .mht), plain text (.txt) and Markdown (.md) — each read ON THE
// DEVICE into notes. Nothing is uploaded.
//
//   • One note per file, except a Word file holding several OneNote pages:
//     it is split on its page titles (paragraphs in the Title style, else
//     Heading 1), or failing those on page breaks.
//   • The title is the page title, else the first heading, else the file name.
//   • The text is plain: paragraphs kept as paragraphs, list items as "• …"
//     (indented a level at a time), headings as their words, tables as tab-
//     separated rows. No formatting, pictures or ink.
//   • OneNote puts the page's date (and time) under its title; when the line
//     after the title is a date in a suite language, it becomes the note's
//     created date and is taken out of the text. A web page's
//     <meta name="created"> does the same.
//
// The .docx reader is fflate's unzip (MIT, ~8 KB) and a small XML scanner of
// our own, so it runs the same in the browser, in the phone app and in tests.

import { unzipSync, strFromU8 } from 'fflate'

export interface ImportedNote {
  title: string
  details: string
  /** Epoch ms, when the file said when the page was made. */
  createdAt?: number
  /** Which file it came from (for the summary). */
  file: string
}

export interface ImportResult {
  notes: ImportedNote[]
  /** Files that could not be read, and why. */
  skipped: { file: string; reason: 'type' | 'size' | 'empty' | 'damaged' }[]
}

export const IMPORT_ACCEPT = '.docx,.html,.htm,.mht,.mhtml,.txt,.md,.markdown,text/plain,text/html,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_FILE = 20 * 1024 * 1024
const MAX_TEXT = 100_000
const MAX_TITLE = 1_000

type Kind = 'docx' | 'html' | 'mht' | 'txt' | 'md'

export function kindOf(name: string): Kind | null {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'docx') return 'docx'
  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'mht' || ext === 'mhtml') return 'mht'
  if (ext === 'txt') return 'txt'
  if (ext === 'md' || ext === 'markdown') return 'md'
  return null
}

/** "Holiday_ideas.final.docx" → "Holiday ideas.final". */
export function titleFromName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || name
}

/** Read every file; one that cannot be read is skipped and named, never thrown over. */
export async function importFiles(files: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }[]): Promise<ImportResult> {
  const out: ImportResult = { notes: [], skipped: [] }
  for (const f of files) {
    const kind = kindOf(f.name)
    if (!kind) {
      out.skipped.push({ file: f.name, reason: 'type' })
      continue
    }
    if (f.size > MAX_FILE) {
      out.skipped.push({ file: f.name, reason: 'size' })
      continue
    }
    try {
      const bytes = new Uint8Array(await f.arrayBuffer())
      const notes = readBytes(kind, bytes, f.name)
      if (notes.length === 0) out.skipped.push({ file: f.name, reason: 'empty' })
      else out.notes.push(...notes)
    } catch {
      out.skipped.push({ file: f.name, reason: 'damaged' })
    }
  }
  return out
}

export function readBytes(kind: Kind, bytes: Uint8Array, file: string): ImportedNote[] {
  if (kind === 'docx') return fromDocx(bytes, file)
  const text = decodeText(bytes)
  if (kind === 'html') return fromHtml(text, file)
  if (kind === 'mht') return fromMht(text, file)
  if (!text.trim()) return []
  if (kind === 'md') return finish([fromMarkdown(text, file)])
  return finish([{ title: titleFromName(file), details: tidy(text), file }])
}

function decodeText(bytes: Uint8Array): string {
  // UTF-16 with a byte-order mark (Windows' "Unicode" .txt), else UTF-8.
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '')
}

/** Line ends to \n, trailing spaces off, no more than one blank line in a row. */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\u00a0]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Caps, empties dropped, the title never longer than a title. */
function finish(notes: ImportedNote[]): ImportedNote[] {
  return notes
    .map((n) => ({ ...n, title: n.title.trim().slice(0, MAX_TITLE), details: tidy(n.details).slice(0, MAX_TEXT) }))
    .filter((n) => n.title || n.details)
}

// ── Dates under a OneNote page title ─────────────────────────────────────────

const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'pt', 'tr']
let MONTHS: Map<string, number> | null = null

/** Month names (long and short) in every suite language → 0–11. */
function months(): Map<string, number> {
  if (MONTHS) return MONTHS
  const map = new Map<string, number>()
  for (const loc of LOCALES) {
    for (const style of ['long', 'short'] as const) {
      const fmt = new Intl.DateTimeFormat(loc, { month: style, timeZone: 'UTC' })
      for (let m = 0; m < 12; m++) {
        const name = fmt.format(new Date(Date.UTC(2026, m, 15))).toLowerCase().replace(/\.$/, '')
        if (name && !/^\d/.test(name)) map.set(fold(name), m)
      }
    }
  }
  MONTHS = map
  return map
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** "Saturday, 25 October 2026", "October 25, 2026", "25. Oktober 2026", "2026-10-25" → [y, m, d]. */
export function parseDateLine(line: string): [number, number, number] | null {
  const s = line.trim()
  if (s.length > 60) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) return valid(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const words = fold(s).split(/[\s,.]+|(?<=\d)(?=[a-z])/).filter(Boolean).filter((w) => w !== 'de' && w !== 'of')
  if (words.length < 3 || words.length > 5) return null
  let y = -1
  let m = -1
  let d = -1
  let other = 0
  for (const w of words) {
    if (/^\d{4}$/.test(w)) y = Number(w)
    else if (/^\d{1,2}(st|nd|rd|th|er|º|°)?$/.test(w)) d = parseInt(w, 10)
    else if (months().has(w)) m = months().get(w)!
    else other++
  }
  // One word may be left over: the weekday.
  return y > 0 && m >= 0 && d > 0 && other <= 1 ? valid(y, m, d) : null
}

function valid(y: number, m: number, d: number): [number, number, number] | null {
  const t = new Date(y, m, d)
  return y >= 1990 && y <= 2200 && t.getMonth() === m && t.getDate() === d ? [y, m, d] : null
}

/** "10:32", "10.32", "10:32 PM" → [h, min]. */
export function parseTimeLine(line: string): [number, number] | null {
  const t = /^(\d{1,2})[:.](\d{2})\s*([ap]\.?\s?m\.?)?$/i.exec(line.trim())
  if (!t) return null
  let h = Number(t[1])
  const min = Number(t[2])
  if (t[3]) {
    const pm = /^p/i.test(t[3])
    if (h === 12) h = pm ? 12 : 0
    else if (pm) h += 12
  }
  return h <= 23 && min <= 59 ? [h, min] : null
}

/**
 * Take the date (and the time under it) off the top of a page's lines, if
 * that is what is there. Blank lines before them are skipped.
 */
function takeDate(lines: string[]): { lines: string[]; createdAt?: number } {
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  const date = i < lines.length ? parseDateLine(lines[i]) : null
  if (!date) return { lines }
  let j = i + 1
  while (j < lines.length && !lines[j].trim() && j < i + 2) j++
  const time = j < lines.length ? parseTimeLine(lines[j]) : null
  const createdAt = new Date(date[0], date[1], date[2], time?.[0] ?? 0, time?.[1] ?? 0).getTime()
  return { lines: lines.slice(time ? j + 1 : i + 1), createdAt }
}

// ── Word (.docx) ─────────────────────────────────────────────────────────────

interface Para {
  text: string
  /** 'title', 'h1', 'h' (other heading) or '' */
  role: string
  list: number
  pageBreakBefore: boolean
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

/** styleId → what it is, from word/styles.xml: the ids are localised ("berschrift1"), the names are not. */
function styleRoles(xml: string | undefined): Map<string, string> {
  const roles = new Map<string, string>()
  if (!xml) return roles
  for (const m of xml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const name = /<w:name\s+w:val="([^"]+)"/.exec(m[2])?.[1].toLowerCase() ?? ''
    const role = name === 'title' ? 'title' : name === 'heading 1' ? 'h1' : /^heading [2-9]$/.test(name) ? 'h' : ''
    if (role) roles.set(m[1], role)
  }
  return roles
}

function paragraphs(xml: string, roles: Map<string, string>): Para[] {
  const body = /<w:body>([\s\S]*)<\/w:body>/.exec(xml)?.[1] ?? xml
  const out: Para[] = []
  let breakNext = false
  // Table cells: each row's cells on one line, separated by tabs.
  const rows = body.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (row) => {
    const cells = [...row.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) =>
      [...c[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((t) => decodeXml(t[1])).join(' ').trim(),
    )
    return `<w:p><w:r><w:t>${cells.join('\t').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`
  })
  for (const m of rows.matchAll(/<w:p\b(?:[^>]*)?(?:\/>|>([\s\S]*?)<\/w:p>)/g)) {
    const p = m[1] ?? ''
    const styleId = /<w:pStyle\s+w:val="([^"]+)"/.exec(p)?.[1] ?? ''
    const ilvl = /<w:numPr>[\s\S]*?<w:ilvl\s+w:val="(\d+)"/.exec(p)
    const isList = /<w:numPr>/.test(p)
    const hasBreak = /<w:br\b[^>]*w:type="page"/.test(p) || /<w:pageBreakBefore\b(?![^>]*w:val="(?:0|false)")/.test(p)
    let text = ''
    for (const r of p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\b(?![^>]*type="page")[^>]*\/>|<w:br\b[^>]*type="page"[^>]*\/>/g)) {
      if (r[1] !== undefined) text += decodeXml(r[1])
      else if (r[0].startsWith('<w:tab')) text += '\t'
      else if (!/type="page"/.test(r[0])) text += '\n'
    }
    out.push({
      text,
      role: roles.get(styleId) ?? (/^title$/i.test(styleId) ? 'title' : /^heading1$/i.test(styleId) ? 'h1' : /^heading\d$/i.test(styleId) ? 'h' : ''),
      list: isList ? Number(ilvl?.[1] ?? 0) + 1 : 0,
      pageBreakBefore: breakNext || (hasBreak && !text.trim()),
    })
    // A page break inside a paragraph starts the NEXT one on a new page.
    breakNext = hasBreak && Boolean(text.trim())
  }
  return out
}

function asLine(p: Para): string {
  return p.list ? `${'  '.repeat(p.list - 1)}• ${p.text.trim()}` : p.text.replace(/\s+$/, '')
}

function fromDocx(bytes: Uint8Array, file: string): ImportedNote[] {
  const zip = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' || f.name === 'word/styles.xml' })
  const doc = zip['word/document.xml']
  if (!doc) throw new Error('not a Word file')
  const paras = paragraphs(strFromU8(doc), styleRoles(zip['word/styles.xml'] ? strFromU8(zip['word/styles.xml']) : undefined))
  // Split on page titles: the Title style if there are two or more, else
  // Heading 1, else page breaks, else the whole file is one note.
  const titles = paras.filter((p) => p.role === 'title' && p.text.trim()).length
  const h1s = paras.filter((p) => p.role === 'h1' && p.text.trim()).length
  const splitRole = titles >= 2 ? 'title' : titles === 0 && h1s >= 2 ? 'h1' : null
  const breaks = paras.some((p) => p.pageBreakBefore)
  const chunks: Para[][] = []
  for (const p of paras) {
    const starts = splitRole ? p.role === splitRole && p.text.trim() !== '' : breaks && p.pageBreakBefore
    if (starts || chunks.length === 0) chunks.push([])
    chunks[chunks.length - 1].push(p)
  }
  return finish(
    chunks.map((chunk) => {
      const first = chunk.findIndex((p) => p.text.trim())
      const head = first >= 0 ? chunk[first] : undefined
      const titled = head && (head.role !== '' || splitRole !== null || breaks)
      const title = titled && head && head.text.trim().length <= 200 ? head.text.trim() : titleFromName(file)
      const rest = titled && head && title === head.text.trim() ? chunk.slice(first + 1) : chunk
      const { lines, createdAt } = takeDate(rest.map(asLine))
      return { title, details: lines.join('\n'), file, ...(createdAt ? { createdAt } : {}) }
    }),
  )
}

// ── Web pages (.html, .htm, .mht) ────────────────────────────────────────────

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', copy: '©' }

function decodeHtml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m,
  )
}

/** A web page's words as plain text, keeping paragraphs and list items. */
export function htmlToText(html: string): string {
  let depth = 0
  const out = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|title|noscript|template)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/\s+/g, ' ')
    // Lists in one pass, so each item knows how deep it is.
    .replace(/<(\/?)(ul|ol|li)\b[^>]*>/gi, (_, close: string, tag: string) => {
      if (tag.toLowerCase() === 'li') return close ? '\n' : `\n${'\uE000'.repeat(Math.max(0, depth - 1))}• `
      depth = Math.max(0, depth + (close ? -1 : 1))
      return '\n'
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(/<\/?(p|div|h[1-6]|tr|table|blockquote|pre|section|article|header|footer|li|dt|dd)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // Tags next to each other are one line break, not a blank line; an empty
    // paragraph (OneNote's &nbsp;) still is one.
    .replace(/\n[ \t]*(?=\n)/g, '')
  return tidy(
    decodeHtml(out)
      .split('\n')
      .map((l) => l.replace(/[ \t]+/g, (w) => (w.includes('\t') ? '\t' : ' ')).trim().replace(/\uE000/g, '  '))
      .join('\n'),
  )
}

function fromHtml(html: string, file: string): ImportedNote[] {
  const title = decodeHtml(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').replace(/\s+/g, ' ').trim()
  const h1 = decodeHtml((/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
  const meta = /<meta\s+[^>]*name=["']created["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1] ?? /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']created["']/i.exec(html)?.[1]
  const parsed = meta ? Date.parse(meta) : NaN
  let lines = htmlToText(html).split('\n')
  const name = title || h1 || titleFromName(file)
  // The page title usually also opens the page's text: once is enough.
  const firstText = lines.findIndex((l) => l.trim())
  if (firstText >= 0 && lines[firstText].trim() === name) lines = lines.slice(firstText + 1)
  const dated = takeDate(lines)
  const createdAt = Number.isFinite(parsed) ? parsed : dated.createdAt
  return finish([{ title: name, details: dated.lines.join('\n'), file, ...(createdAt ? { createdAt } : {}) }])
}

/** OneNote's "Single File Web Page": a MIME message; its HTML part is the page. */
function fromMht(text: string, file: string): ImportedNote[] {
  const boundary = /boundary="?([^";\r\n]+)"?/i.exec(text)?.[1]
  const parts = boundary ? text.split(`--${boundary}`) : [text]
  const part = parts.find((p) => /content-type:\s*text\/html/i.test(p))
  if (!part) throw new Error('no page in this file')
  const split = part.search(/\r?\n\r?\n/)
  const headers = part.slice(0, split)
  let body = part.slice(split).trim()
  if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    const bytes = body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    body = new TextDecoder('utf-8').decode(Uint8Array.from(bytes, (c) => c.charCodeAt(0) & 0xff))
  } else if (/content-transfer-encoding:\s*base64/i.test(headers)) {
    body = new TextDecoder('utf-8').decode(Uint8Array.from(atob(body.replace(/\s+/g, '')), (c) => c.charCodeAt(0)))
  }
  return fromHtml(body, file)
}

// ── Markdown (.md) ───────────────────────────────────────────────────────────

function fromMarkdown(md: string, file: string): ImportedNote {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const h = lines.findIndex((l) => /^#\s+\S/.test(l))
  const firstText = lines.findIndex((l) => l.trim())
  const title = h >= 0 && h === firstText ? lines[h].replace(/^#\s+/, '').replace(/\s+#+\s*$/, '').trim() : titleFromName(file)
  const rest = h >= 0 && h === firstText ? lines.slice(h + 1) : lines
  const body = rest
    .map((l) =>
      l
        .replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, '$1• ')
        .replace(/^(\s*)[-*+]\s+/, '$1• ')
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s?/, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, t: string, u: string) => (t === u ? u : `${t} (${u})`))
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(^|[^*\w])[*_]([^*_\n]+)[*_](?=[^*\w]|$)/g, '$1$2')
        .replace(/`([^`]+)`/g, '$1'),
    )
    .filter((l) => !/^(```|~~~|-{3,}|\*{3,}|_{3,})\s*$/.test(l.trim()))
  return { title, details: body.join('\n'), file }
}
