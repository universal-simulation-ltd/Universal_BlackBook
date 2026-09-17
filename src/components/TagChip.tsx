import type { CSSProperties, ReactNode } from 'react'
import { accessibleColor, Chip, ChipToggle } from '@unisim/sdk'
import { swatch } from '../lib/palette'

// The suite's dark page, which the selected chip's label has to be read on.
const DARK_GROUND = '#0a0e16'

/**
 * A tag, as the suite's Orbit chip — a `ChipToggle` when it can be clicked.
 *
 * The tag's colour comes from user data at runtime, so it reaches the chip
 * through the chip's own knobs rather than Tailwind classes (Tailwind only
 * emits classes it can see in the source at build time). The swatch paints the
 * arc; a selected chip's label is the same hue run through `accessibleColor`,
 * so it clears 4.5:1 whichever swatch it came from. This app is dark-only and
 * sets no `.dark` class, so the chip is told its ground outright.
 *
 * Every chip carries the coloured DOT as well as the arc. Colour alone is not
 * a label: seven swatches at chip size are hard to tell apart for anyone with
 * a colour-vision deficiency, and the name is always present beside it — the
 * dot is the quick scan, the name is the answer. (A selected toggle swaps the
 * dot for a tick, as every suite filter chip does; the arc and the tinted
 * label keep the colour.)
 */
export function TagChip({
  name,
  colour,
  onClick,
  selected,
  hidden,
  list,
  title,
  trailing,
}: {
  name: string
  colour: string
  onClick?: () => void
  selected?: boolean
  /**
   * The filter's third state: people with this tag are kept OUT of the list.
   * An eye with a line through it in place of the dot, and the name struck
   * through — so it can't be mistaken for "off" at a glance.
   */
  hidden?: boolean
  /**
   * Draw it as a LIST (Tag.kind): three lines in place of the colour dot, so a
   * list and a tag of the same colour never read as the same thing. The arc
   * and the tinted label still carry the colour.
   */
  list?: boolean
  title?: string
  trailing?: ReactNode
}) {
  const s = swatch(colour)
  const style = {
    '--u-chip-accent-dark': s.dot,
    '--u-chip-accent-text-dark': accessibleColor(s.dot, { against: DARK_GROUND }) ?? s.text,
  } as CSSProperties
  // An 8px dot centred in the chip's 14px icon box, so it sits where the
  // selected tick will and the chip's width holds.
  const dot = (
    <svg viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="4" fill={s.dot} />
    </svg>
  )
  const listGlyph = (
    <svg viewBox="0 0 14 14" fill="none" stroke={s.dot} strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 4h8M3 7h8M3 10h5" />
    </svg>
  )
  const mark = list ? listGlyph : dot
  const eyeOff = (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M1.5 7s2-3.5 5.5-3.5S12.5 7 12.5 7s-2 3.5-5.5 3.5S1.5 7 1.5 7Z" />
      <circle cx="7" cy="7" r="1.6" />
      <path d="m2.5 2.5 9 9" />
    </svg>
  )
  const body = (
    <>
      <span className={`min-w-0 truncate ${hidden ? 'line-through opacity-60' : ''}`}>{name}</span>
      {hidden && <span className="sr-only"> (hidden from the list)</span>}
      {trailing}
    </>
  )

  if (!onClick) {
    return (
      <Chip ground="dark" icon={mark} title={title} style={style} className="max-w-full">
        {body}
      </Chip>
    )
  }
  return (
    <ChipToggle
      ground="dark"
      selected={selected === true}
      onClick={onClick}
      icon={hidden ? eyeOff : mark}
      title={title}
      style={style}
      className="max-w-full"
    >
      {body}
    </ChipToggle>
  )
}
