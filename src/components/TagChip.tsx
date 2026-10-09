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
  // Lists are never drawn with this — see ListChip.
  const mark = dot
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

/**
 * A tag as just its LIGHT, inline with a contact card's name, that opens out
 * into the chip on hover (owner's request, 2026-10-09: "don't show category
 * chips, just the lights inline with the title and if hovering expand it to
 * the chip to see what it is"). The card is for scanning; the full chips are
 * one tap away on the contact's own screen.
 *
 * Not focusable and not a button: the whole card is already a button, and a
 * control inside it is invalid HTML. The name is always in the DOM — squeezed
 * to zero width, not removed — so a screen reader still hears every tag, and
 * `title` answers on a long press where there is no hover.
 */
export function TagDot({ name, colour }: { name: string; colour: string }) {
  const s = swatch(colour)
  const style = { '--tag-bg': s.bg, '--tag-border': s.border } as CSSProperties
  return (
    <span
      title={name}
      style={style}
      className="group/dot inline-flex min-w-0 items-center rounded-full border border-transparent px-1 py-0.5 transition-[background-color,border-color] duration-150 hover:border-[var(--tag-border)] hover:bg-[var(--tag-bg)]"
    >
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0" aria-hidden>
        <circle cx="5" cy="5" r="4" fill={s.dot} />
      </svg>
      <span
        style={{ color: s.text }}
        className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-[max-width,opacity,margin] duration-150 group-hover/dot:ml-1 group-hover/dot:max-w-40 group-hover/dot:opacity-100"
      >
        {name}
      </span>
    </span>
  )
}
