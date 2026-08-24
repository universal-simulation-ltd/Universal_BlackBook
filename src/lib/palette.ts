// Category swatches.
//
// A category stores a swatch KEY ('amber'), never a hex value. Two reasons,
// and the second is the one that bites:
//
//  1. Every swatch is picked to clear 4.5:1 against the app's one background.
//     A free colour picker cannot promise that, and a category nobody can read
//     is worse than one with a colour they did not choose.
//  2. This app is dark-only TODAY. Storing hexes would bake that decision into
//     every user's saved data, so a light mode later would need a migration
//     over records we have no copy of — they live in the user's browser and
//     nowhere else. A key is re-resolvable; a hex is a one-way door.
//
// Tailwind is not consulted at runtime here: these are literal values because
// the chips are rendered with inline styles from user data, and Tailwind can
// only see class names it finds in the source at build time.

export interface Swatch {
  key: string
  label: string
  /** The solid dot beside the category name. */
  dot: string
  /** Chip background — a low-alpha wash of the dot, so chips never shout. */
  bg: string
  /** Chip border. */
  border: string
  /** Chip text. Lighter than `dot`: the dot is a shape, this has to be read. */
  text: string
}

export const SWATCHES: Swatch[] = [
  { key: 'amber',   label: 'Amber',   dot: '#fe8c01', bg: 'rgba(254,140,1,0.14)',   border: 'rgba(254,140,1,0.38)',   text: '#fdba74' },
  { key: 'rose',    label: 'Rose',    dot: '#f43f5e', bg: 'rgba(244,63,94,0.14)',   border: 'rgba(244,63,94,0.38)',   text: '#fda4af' },
  { key: 'violet',  label: 'Violet',  dot: '#a78bfa', bg: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.38)', text: '#c4b5fd' },
  { key: 'sky',     label: 'Sky',     dot: '#38bdf8', bg: 'rgba(56,189,248,0.14)',  border: 'rgba(56,189,248,0.38)',  text: '#7dd3fc' },
  { key: 'emerald', label: 'Emerald', dot: '#34d399', bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.38)',  text: '#6ee7b7' },
  { key: 'lime',    label: 'Lime',    dot: '#a3e635', bg: 'rgba(163,230,53,0.14)',  border: 'rgba(163,230,53,0.38)',  text: '#bef264' },
  { key: 'slate',   label: 'Slate',   dot: '#94a3b8', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.38)', text: '#cbd5e1' },
]

const FALLBACK = SWATCHES[0]
const BY_KEY = new Map(SWATCHES.map((s) => [s.key, s]))

/**
 * Never throws and never returns undefined. A category carrying an unknown
 * swatch — hand-edited, imported from a newer build, or written by a version
 * of this app that had a colour we since dropped — renders in amber rather
 * than crashing the list it appears in.
 */
export function swatch(key: string): Swatch {
  return BY_KEY.get(key) ?? FALLBACK
}

/** The swatch to offer next, given what is already used. Falls back to cycling. */
export function nextSwatch(usedKeys: string[]): string {
  const unused = SWATCHES.find((s) => !usedKeys.includes(s.key))
  return (unused ?? SWATCHES[usedKeys.length % SWATCHES.length]).key
}
