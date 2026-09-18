import type { ReactNode } from 'react'
import { ValueChip } from '@unisim/sdk'

/**
 * An Email list's name, as the suite's VALUE chip — a solid key holding a list
 * glyph, then the name (owner's request, 2026-09-18: "create a new type of
 * chip for list names, don't want to pollute the tags lists").
 *
 * ⚠️ Deliberately NOT a TagChip. A list used to be drawn as a tag with the
 * colour dot swapped for three lines, which at chip size read as one more tag.
 * The value chip is a different SHAPE — a filled key, no arc, no colour of the
 * list's own — so a list and a tag are told apart before either is read. A
 * list's stored `colour` is simply not drawn.
 *
 * Clickable when given `onClick`: a real `<button>` with `aria-pressed`, the
 * key turning into a tick when selected — the same cue the tag chips use.
 */
export function ListChip({
  name,
  onClick,
  selected,
  trailing,
}: {
  name: string
  onClick?: () => void
  selected?: boolean
  trailing?: ReactNode
}) {
  const chip = (
    <ValueChip ground="dark" label={selected ? <Tick /> : <ListGlyph />} className="max-w-full">
      <span className="min-w-0 truncate">{name}</span>
      {trailing}
    </ValueChip>
  )
  if (!onClick) return chip
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected === true}
      className={`max-w-full rounded-md transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
        selected ? '' : 'opacity-60 hover:opacity-100'
      }`}
    >
      {chip}
    </button>
  )
}

export function ListGlyph() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M3 4h8M3 7h8M3 10h5" />
    </svg>
  )
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}
