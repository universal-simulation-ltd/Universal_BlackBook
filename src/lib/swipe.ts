// The geometry behind swiping a row sideways (components/SwipeRow.tsx).
//
// Kept out of the component because it is the part that can be wrong in a way
// nobody notices: the numbers decide whether a gesture people make with their
// thumb, without looking, does what they meant. The component owns the touch
// events; this file owns what the numbers mean.
//
// ⚠️ Two directions, and they are named by the EDGE the button sits on, never
// by the way the finger moves — the two are opposites and mixing them up is
// the bug this convention exists to prevent. Swiping LEFT moves the row left
// and uncovers the button on the RIGHT edge; swiping RIGHT uncovers the LEFT.

/**
 * How much of the row an action takes when it is open, in px.
 *
 * ⚠️ Comfortably over the 44px minimum touch target, because one of these
 * deletes something. It is also why an action is only REVEALED and never
 * triggered by the swipe itself: a full-swipe-to-delete would put an
 * irreversible action one thumb flick away, and the confirmation that follows
 * is the second half of the same decision. Since 2026-11-11 that second half
 * can also be a second swipe the same way (FIRE_DISTANCE), never the first.
 */
export const ACTION_WIDTH = 96

/**
 * How far a finger travels before the gesture commits to an axis.
 *
 * Below this nothing moves at all, which is what keeps a tap — never perfectly
 * still on a phone — from nudging the row, and what lets a vertical scroll
 * that starts with a few pixels of sideways drift stay a scroll.
 */
export const AXIS_SLOP = 8

export type Axis = 'none' | 'x' | 'y'

/** Which edge an action sits on, and so which one is showing. */
export type Side = 'left' | 'right'

/**
 * How far the row may travel each way. A side with no action is 0, which is
 * what makes an absent action a hard wall rather than an empty gap: a row that
 * slid open onto nothing would be a promise the app cannot keep.
 */
export interface Widths {
  left: number
  right: number
}

/** No left action; a delete on the right. The shape of an ordinary list row. */
export const RIGHT_ONLY: Widths = { left: 0, right: ACTION_WIDTH }

/**
 * Which way is this gesture going? Decided ONCE per touch, at the first
 * movement past the slop, and never revisited — a gesture that could change
 * its mind mid-drag would fight the page's scrolling.
 */
export function decideAxis(dx: number, dy: number): Axis {
  if (Math.abs(dx) < AXIS_SLOP && Math.abs(dy) < AXIS_SLOP) return 'none'
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
}

/**
 * Where the row sits mid-drag: `base` plus the finger, clamped to the track.
 *
 * A positive offset means the row has moved right and the LEFT edge's action is
 * showing; negative is the mirror. No rubber-banding past either end — dragging
 * further than the button is wide would only suggest that carrying on does
 * something more, and it does not (see ACTION_WIDTH).
 */
export function dragOffset(base: number, dx: number, widths: Widths = RIGHT_ONLY): number {
  return Math.min(widths.left, Math.max(-widths.right, base + dx))
}

/**
 * On release: which action is left showing, if any?
 *
 * Half the action's own width, so the same gesture opens and closes and there
 * is no dead zone in the middle. Measured against the width of the side being
 * opened rather than a shared constant, so the two sides stay independent.
 */
export function settles(offset: number, widths: Widths = RIGHT_ONLY): Side | null {
  if (offset <= -widths.right / 2 && widths.right > 0) return 'right'
  if (offset >= widths.left / 2 && widths.left > 0) return 'left'
  return null
}

/** Where a row rests for a given open side. The inverse of `settles`. */
export function restingOffset(open: Side | null, widths: Widths = RIGHT_ONLY): number {
  if (open === 'right') return -widths.right
  if (open === 'left') return widths.left
  return 0
}

/**
 * How much further a finger must travel, past an action that is already
 * showing, to run it. James, 2026-11-11: "if you swipe again in that direction
 * then do that action e.g. delete".
 *
 * ⚠️ Only a SECOND swipe, on a row already open on that side. A single long
 * flick from closed still only reveals (see ACTION_WIDTH): the first swipe is
 * the "are you sure", the second is the yes, exactly as tapping the revealed
 * button is. Every delete it can reach already has Undo.
 */
export const FIRE_DISTANCE = 56

/** How far past its open position the row may be dragged to show it will fire. */
export const FIRE_TRAVEL = 40

/**
 * Does this release run the action showing on `open`'s side? Only when the
 * touch began with that side already open and the finger carried on the same
 * way by FIRE_DISTANCE.
 */
export function firesOnRelease(open: Side | null, dx: number, widths: Widths = RIGHT_ONLY): Side | null {
  if (open === 'right' && widths.right > 0 && dx <= -FIRE_DISTANCE) return 'right'
  if (open === 'left' && widths.left > 0 && dx >= FIRE_DISTANCE) return 'left'
  return null
}

/**
 * Where the row sits mid-drag when it started open: like dragOffset, but it
 * may carry on past the open edge by up to FIRE_TRAVEL (at half the finger's
 * speed), so the second swipe visibly goes somewhere.
 */
export function dragOffsetFromOpen(open: Side | null, base: number, dx: number, widths: Widths = RIGHT_ONLY): number {
  const raw = base + dx
  if (open === 'right' && raw < -widths.right) return -widths.right - Math.min(FIRE_TRAVEL, (-widths.right - raw) / 2)
  if (open === 'left' && raw > widths.left) return widths.left + Math.min(FIRE_TRAVEL, (raw - widths.left) / 2)
  return dragOffset(base, dx, widths)
}
