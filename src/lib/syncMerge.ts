// Merging this device's book with a newer online copy, when a save finds that
// another device saved first (James, 2026-11-11: "when there's a clash between
// last synced just merge them, don't ask user to pick unless there's a need
// to, in which case show them the diff so they can pick").
//
// A THREE-WAY merge. The third copy is the BASE: what the book looked like the
// last time this device matched the online copy, kept as one short signature
// per entry (`SyncBase`, never the entries themselves, so no second copy of
// anybody's details sits on the disk). Against it, each entry was either
// changed here, changed there, both, or neither:
//
//   changed on one side only   → that side's version, no question
//   added on either side       → kept
//   deleted on one side, untouched on the other → stays deleted
//   deleted on one side, edited on the other    → the edit is kept (nothing lost)
//   edited on BOTH sides, differently           → a CONFLICT: the only case
//                                                 that asks, with the diff
//
// Without a base (a device that last synced on an older build) there is no way
// to tell a deletion from an addition, so it falls back to the older rule:
// everything from both sides, the newer edit winning, nothing asked. A deleted
// entry may come back, which is recoverable; a lost one is not.

import type { Contact, Tag } from './types'
import type { Todo } from './todos'
import type { Note } from './notes'
import type { NoteTemplate } from './templates'

/** The collections a vault holds, by their payload names. */
export const KINDS = ['contacts', 'tags', 'todos', 'pages', 'templates'] as const
export type Kind = (typeof KINDS)[number]

/** One entry's signature per id, per collection, at the last sync. */
export type SyncBase = Partial<Record<Kind, Record<string, string>>>

export interface MergeInput {
  contacts: Contact[]
  tags: Tag[]
  todos?: Todo[]
  pages?: Note[]
  templates?: NoteTemplate[]
}

type Entry = { id: string; updatedAt?: number }

/** Both sides changed this entry since the base, differently. */
export interface Conflict {
  kind: Kind
  id: string
  local: Entry
  online: Entry
}

export interface MergeResult {
  merged: MergeInput
  conflicts: Conflict[]
}

/** A short, stable signature of an entry: FNV-1a over its JSON with sorted keys. */
export function signature(entry: unknown): string {
  const json = stable(entry)
  let h = 0x811c9dc5
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36) + json.length.toString(36)
}

function stable(v: unknown): string {
  if (v === undefined) return 'null'
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`
}

/** The base to keep after a sync: the signatures of the book as it now stands online. */
export function baseOf(book: MergeInput): SyncBase {
  const out: SyncBase = {}
  for (const kind of KINDS) {
    const list = book[kind] as Entry[] | undefined
    if (!Array.isArray(list)) continue
    out[kind] = Object.fromEntries(list.map((e) => [e.id, signature(e)]))
  }
  return out
}

/** Three-way merge of one collection. `base` null: no base, the old union rule. */
export function mergeList<T extends Entry>(kind: Kind, base: Record<string, string> | null, local: T[], online: T[]): { merged: T[]; conflicts: Conflict[] } {
  const conflicts: Conflict[] = []
  const there = new Map(online.map((e) => [e.id, e]))
  const here = new Map(local.map((e) => [e.id, e]))
  const merged: T[] = []
  // The online copy's order first (it is what other devices see), then what
  // only this device has, in its own order.
  for (const o of online) {
    const l = here.get(o.id)
    const was = base?.[o.id]
    if (!l) {
      // Not here. Deleted here (it was in the base, unchanged online), or new
      // online / edited online since — then it stays.
      if (base && was !== undefined && signature(o) === was) continue
      merged.push(o)
      continue
    }
    const ls = signature(l)
    const os = signature(o)
    if (ls === os) merged.push(l)
    else if (!base || was === undefined) {
      // No base to judge by (or both added the same id): the newer edit.
      merged.push((l.updatedAt ?? 0) > (o.updatedAt ?? 0) ? l : o)
    } else if (ls === was) merged.push(o)
    else if (os === was) merged.push(l)
    else {
      // Edited on both sides: the newer for now, and asked — unless all
      // they differ in is bookkeeping nobody sees (an edit time, an order).
      merged.push((l.updatedAt ?? 0) > (o.updatedAt ?? 0) ? l : o)
      if (diffEntries(l, o).length) conflicts.push({ kind, id: o.id, local: l, online: o })
    }
  }
  for (const l of local) {
    if (there.has(l.id)) continue
    const was = base?.[l.id]
    // Deleted online and untouched here: stays deleted. Edited here since: kept.
    if (base && was !== undefined && signature(l) === was) continue
    merged.push(l)
  }
  return { merged, conflicts }
}

/**
 * The whole book. A collection the online copy says nothing about (absent:
 * an older build wrote it) is this device's as it stands, as `adopt` treats it.
 */
export function mergeVault(base: SyncBase | null, local: MergeInput, online: MergeInput): MergeResult {
  const conflicts: Conflict[] = []
  const merged: MergeInput = { contacts: [], tags: [] }
  for (const kind of KINDS) {
    const mine = local[kind] as Entry[] | undefined
    const theirs = online[kind] as Entry[] | undefined
    if (!Array.isArray(theirs)) {
      if (Array.isArray(mine)) (merged as unknown as Record<Kind, Entry[]>)[kind] = mine
      continue
    }
    if (!Array.isArray(mine)) {
      ;(merged as unknown as Record<Kind, Entry[]>)[kind] = theirs
      continue
    }
    const r = mergeList(kind, base ? (base[kind] ?? {}) : null, mine, theirs)
    ;(merged as unknown as Record<Kind, Entry[]>)[kind] = r.merged
    conflicts.push(...r.conflicts)
  }
  return { merged, conflicts }
}

/** Put the chosen side of each conflict into the merged book. */
export function resolve(result: MergeResult, keepLocal: (c: Conflict) => boolean): MergeInput {
  const out: MergeInput = { ...result.merged }
  for (const c of result.conflicts) {
    const list = out[c.kind] as Entry[] | undefined
    if (!list) continue
    const pick = keepLocal(c) ? c.local : c.online
    ;(out as unknown as Record<Kind, Entry[]>)[c.kind] = list.map((e) => (e.id === c.id ? pick : e))
  }
  return out
}

/** Bookkeeping fields a person never sees, left out of a diff. */
const QUIET = new Set(['id', 'createdAt', 'updatedAt', 'rank'])

/**
 * Where two versions of one entry differ, for the conflict's diff: each
 * field that is not the same, with both values as plain text.
 */
export function diffEntries(local: Entry, online: Entry): { field: string; local: string; online: string }[] {
  const a = local as unknown as Record<string, unknown>
  const b = online as unknown as Record<string, unknown>
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !QUIET.has(k))
  return keys
    .filter((k) => stable(a[k]) !== stable(b[k]))
    .map((k) => ({ field: k, local: plain(a[k]), online: plain(b[k]) }))
}

function plain(v: unknown): string {
  if (v === undefined || v === null || v === '') return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x ? itemName(x) : plain(x))).filter(Boolean).join(', ')
  if (typeof v === 'object') return itemName(v as object) || stable(v)
  return String(v)
}

/** The readable part of a nested record: a title, a name, a value. */
function itemName(o: object): string {
  const r = o as Record<string, unknown>
  for (const k of ['title', 'name', 'label', 'value', 'number', 'address', 'place']) if (typeof r[k] === 'string' && r[k]) return r[k] as string
  return Object.values(r)
    .filter((x) => typeof x === 'string' && x)
    .join(' ')
}

/** An entry's name for the conflict list: a contact's name, a note's title. */
export function entryName(e: Entry): string {
  const r = e as unknown as Record<string, unknown>
  return (typeof r.name === 'string' && r.name) || (typeof r.title === 'string' && r.title) || ''
}
