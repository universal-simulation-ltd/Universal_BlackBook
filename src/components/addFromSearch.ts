import { flushSync } from 'react-dom'
import { searchSeed } from '../lib/filter'
import { useBookStore } from '../stores/bookStore'

/**
 * What was typed in the contact search, as a new contact — by the Add "…"
 * row or the search's Return. The text goes into whichever field it looks
 * like (`searchSeed`).
 */
export function addContactFromSearch(text: string) {
  const seed = searchSeed(text)
  if (!seed.value) return
  // Flushed inside the tap or the search's Return (James, 2026-10-30), so the
  // view opens with its note focused and the phone's keyboard moves to it.
  flushSync(() => void useBookStore.getState().newContact({ [seed.field]: seed.value }, { typeNote: true }))
  // Added: the search has done its job (James, 2026-10-26).
  useBookStore.getState().setQuery({ text: '' })
}
