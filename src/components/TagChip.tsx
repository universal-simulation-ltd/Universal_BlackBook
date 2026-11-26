import type { CSSProperties, ReactNode } from 'react'
import { accessibleColor, Chip, ChipToggle } from '@unisim/sdk'
import { swatch, type Swatch } from '../lib/palette'
import type { Pattern } from '../lib/patterns'
import { TagMark } from './TagMark'
import { useEffectiveTheme } from '../stores/themeStore'
import { currentT } from '../i18n'

// The grounds a selected chip's label has to be read on: the suite's dark page,
// and white (the light theme's cards and page).
const DARK_GROUND = '#0a0e16'
const LIGHT_GROUND = '#ffffff'

/** A swatch's colour as readable text on the current theme's ground. */
function readable(s: Swatch, theme: 'light' | 'dark'): string {
  return theme === 'dark'
    ? accessibleColor(s.dot, { against: DARK_GROUND }) ?? s.text
    : accessibleColor(s.dot, { against: LIGHT_GROUND }) ?? s.dot
}

/**
 * A tag, as the suite's Orbit chip — a `ChipToggle` when it can be clicked.
 *
 * The tag's colour comes from user data at runtime, so it reaches the chip
 * through the chip's own knobs rather than Tailwind classes (Tailwind only
 * emits classes it can see in the source at build time). The swatch paints the
 * arc; a selected chip's label is the same hue run through `accessibleColor`,
 * so it clears 4.5:1 whichever swatch it came from, on the light ground or the
 * dark one (the chip is told which outright).
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
  pattern,
  onClick,
  selected,
  hidden,
  title,
  trailing,
}: {
  name: string
  colour: string
  /** Dots, stripes, a star… in the colour (lib/patterns.ts); absent = the plain dot. */
  pattern?: Pattern
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
  const ground = useEffectiveTheme()
  const style = {
    '--u-chip-accent': s.dot,
    '--u-chip-accent-text': readable(s, 'light'),
    '--u-chip-accent-dark': s.dot,
    '--u-chip-accent-text-dark': readable(s, 'dark'),
  } as CSSProperties
  // An 8px dot centred in the chip's 14px icon box, so it sits where the
  // selected tick will and the chip's width holds.
  const dot = <TagMark colour={s.dot} pattern={pattern} />
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
      {hidden && <span className="sr-only"> {currentT()('chip.hidden')}</span>}
      {trailing}
    </>
  )

  if (!onClick) {
    return (
      <Chip ground={ground} icon={mark} title={title} style={style} className="max-w-full">
        {body}
      </Chip>
    )
  }
  return (
    <ChipToggle
      ground={ground}
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
 * control inside it is invalid HTML. The name is always in the DOM — see-through
 * until hovered, not removed — so a screen reader still hears every tag, and
 * `title` answers on a long press where there is no hover.
 */
export function TagDot({ name, colour, pattern }: { name: string; colour: string; pattern?: Pattern }) {
  const s = swatch(colour)
  const theme = useEffectiveTheme()
  // The chip's tint over the card's own ground, so it hides what it covers.
  const style = { '--tag-bg': s.bg, '--tag-border': s.border, background: 'linear-gradient(var(--tag-bg), var(--tag-bg)), var(--color-slate-900)' } as CSSProperties
  const mark = pattern ? (
    <TagMark colour={s.dot} pattern={pattern} className="h-3.5 w-3.5 shrink-0" />
  ) : (
    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0" aria-hidden>
      <circle cx="5" cy="5" r="4" fill={s.dot} />
    </svg>
  )
  return (
    // The light keeps its own small room; the chip opens OVER the card,
    // leftwards from the light, and never takes room of its own (owner,
    // 2026-11-26: hover must never change the layout — a light that widened
    // squeezed a to-do's name onto more lines, the card grew, and the To-do
    // columns re-flowed under the pointer).
    <span title={name} className="group/dot relative inline-flex items-center rounded-full border border-transparent px-1 py-0.5">
      <span aria-hidden className="inline-flex">{mark}</span>
      <span
        style={style}
        className="pointer-events-none absolute right-0 top-1/2 z-10 inline-flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--tag-border)] px-1 py-0.5 opacity-0 transition-opacity duration-150 group-hover/dot:opacity-100"
      >
        <span style={{ color: readable(s, theme) }} className="text-xs font-medium">
          {name}
        </span>
        <span aria-hidden className="inline-flex">{mark}</span>
      </span>
    </span>
  )
}
