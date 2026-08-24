import type { CSSProperties, ReactNode } from 'react'
import { swatch } from '../lib/palette'

/**
 * A tag, as a chip.
 *
 * Rendered with inline styles rather than Tailwind classes because the colour
 * comes from user data at runtime — Tailwind only emits classes it can see in
 * the source at build time, so `bg-${colour}-500` compiles to nothing. The
 * values themselves are still centralised, in lib/palette.ts.
 *
 * Every chip carries the coloured DOT as well as the tint. Colour alone is not
 * a label: seven swatches at chip size are hard to tell apart for anyone with
 * a colour-vision deficiency, and the name is always present beside it — the
 * dot is the quick scan, the name is the answer.
 */
export function TagChip({
  name,
  colour,
  onClick,
  selected,
  title,
  trailing,
}: {
  name: string
  colour: string
  onClick?: () => void
  selected?: boolean
  title?: string
  trailing?: ReactNode
}) {
  const s = swatch(colour)
  const style: CSSProperties = {
    background: selected === false ? 'transparent' : s.bg,
    borderColor: selected === false ? 'rgb(51 65 85)' : s.border,
    color: selected === false ? 'rgb(148 163 184)' : s.text,
  }
  const className =
    'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors'

  const body = (
    <>
      <span
        aria-hidden
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: selected === false ? 'rgb(71 85 105)' : s.dot }}
      />
      <span className="truncate">{name}</span>
      {trailing}
    </>
  )

  if (!onClick) {
    return (
      <span className={className} style={style} title={title}>
        {body}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      className={`${className} cursor-pointer hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
      style={style}
    >
      {body}
    </button>
  )
}
