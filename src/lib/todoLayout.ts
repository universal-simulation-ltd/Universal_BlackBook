import type { Todo } from './todos'

/**
 * How the website lays out the To-do tab (James, 2026-11-18: the grid "doesn't
 * work well when some are simple one-liners and others have details and a
 * group of tasks"). Chosen with the layout buttons above the list; a double tap
 * makes one the default (the SDK's useDefaultView, id `todo-layout`), and so
 * does Tune this app ▸ To-do layout. The phone keeps its own one-column list.
 *
 * - list:    one column of rows, each only as tall as what is in it
 * - columns: the same rows, flowed into two or three columns
 * - cards:   the old cards, packed into columns at their own height (masonry)
 * - detail:  rows on the left, the picked to-do in full on the right
 * - lanes:   one-liners as a checklist on the left, the rest as cards
 */
export const TODO_LAYOUTS = ['list', 'columns', 'cards', 'detail', 'lanes'] as const
export type TodoLayout = (typeof TODO_LAYOUTS)[number]
export const TODO_LAYOUT_DEFAULT: TodoLayout = 'list'
/** The useDefaultView id the buttons and the Tune row share. */
export const TODO_LAYOUT_VIEW = 'todo-layout'

/** Two lanes: a one-liner is the Quick lane's; details or a group, the other. */
export function isQuickTodo(todo: Todo): boolean {
  return !todo.details.trim() && !todo.items?.length
}
