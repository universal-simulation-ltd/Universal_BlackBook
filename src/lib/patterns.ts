// Tag patterns (James, 2026-10-25): "more tag colours — add patterns, dots,
// stripes, stars, combinable with the colours, so two tags with similar or the
// same colour can be told apart". A pattern is a SHAPE drawn in the tag's
// colour (TagMark), so it is told apart by form, not hue: colour-blind
// friendly, and readable on the light page and the dark one alike.
//
// Stored on the tag as a key (`Tag.pattern`), absent for the plain dot, so
// every tag made before reads as it always looked.

export const PATTERNS = ['dots', 'stripes', 'stars', 'rings', 'checks'] as const
export type Pattern = (typeof PATTERNS)[number]

export function isPattern(v: unknown): v is Pattern {
  return typeof v === 'string' && (PATTERNS as readonly string[]).includes(v)
}

/** Dark marks on a light colour, light marks on a dark one (WCAG relative luminance). */
export function inkFor(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L > 0.35 ? 'rgba(15,10,5,0.78)' : '#ffffff'
}
