// Which to-do groups are folded shut (2026-11-11), on this device only: how
// the list looks here, not something worth syncing. One Set in localStorage,
// and one copy of it in memory that every row and the tab's "Collapse all /
// Open all" button (owner, 2026-11-23: "have a collapse / open all button")
// read, so folding them all moves every row at once.

import { useCallback, useSyncExternalStore } from 'react'

const FOLD_KEY = 'bb.todo.folded'

function read(): ReadonlySet<string> {
  try {
    const v = JSON.parse(localStorage.getItem(FOLD_KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

let folded: ReadonlySet<string> | null = null
const listeners = new Set<() => void>()
const current = () => (folded ??= read())

/** `ids` folded shut (`on`) or opened, the rest left as they are. */
export function withFolds(set: ReadonlySet<string>, ids: readonly string[], on: boolean): ReadonlySet<string> {
  const next = new Set(set)
  for (const id of ids) {
    if (on) next.add(id)
    else next.delete(id)
  }
  return next
}

/**
 * What the button does for these groups: fold them all while any is open,
 * open them all once every one is folded. Null with no group to fold.
 */
export function foldAllAction(groupIds: readonly string[], set: ReadonlySet<string>): 'collapse' | 'open' | null {
  if (groupIds.length === 0) return null
  return groupIds.some((id) => !set.has(id)) ? 'collapse' : 'open'
}

export function setFolds(ids: readonly string[], on: boolean) {
  folded = withFolds(current(), ids, on)
  try {
    localStorage.setItem(FOLD_KEY, JSON.stringify([...folded]))
  } catch {
    /* private mode: folds for this visit only */
  }
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Every folded group's id; re-renders when any fold changes. */
export function useFolds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, current, current)
}

/** One group: whether it is folded, and the way to fold or open it. */
export function useFolded(id: string): [boolean, (on: boolean) => void] {
  const set = useFolds()
  return [set.has(id), useCallback((on: boolean) => setFolds([id], on), [id])]
}
