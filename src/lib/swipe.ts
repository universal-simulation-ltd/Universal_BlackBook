// The geometry behind swipe-left-to-delete (components/SwipeToDelete.tsx).
//
// Kept out of the component because it is the part that can be wrong in a way
// nobody notices: the numbers decide whether a gesture people make with their
// thumb, without looking, does what they meant. The component owns the touch
// events; this file owns what the numbers mean.

/**
 * How much of the row is taken by the Delete button when it is open, in px.
 *
 * ⚠️ Comfortably over the 44px minimum touch target, because this button
 * deletes something. It is also why the action is only REVEALED and never
 * triggered by the swipe itself: a full-swipe-to-delete would put an
 * irreversible action one thumb flick away, and the confirmation that follows
 * is the second half of the same decision.
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
 * Where the row sits mid-drag: `base` (0 closed, -ACTION_WIDTH open) plus the
 * finger, clamped to the track.
 *
 * No rubber-banding past either end. Dragging further left than the button is
 * wide would only suggest that carrying on does something more, and it does
 * not — see ACTION_WIDTH.
 */
export function dragOffset(base: number, dx: number, width = ACTION_WIDTH): number {
  return Math.min(0, Math.max(-width, base + dx))
}

/**
 * On release: open or closed?
 *
 * Half the action's width, whichever direction the finger was going, so the
 * same gesture opens and closes and there is no dead zone in the middle.
 */
export function settlesOpen(offset: number, width = ACTION_WIDTH): boolean {
  return offset <= -width / 2
}
