import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react'
import { SwipeRow, type SwipeAction } from './SwipeRow'
import type { Side } from '../lib/swipe'
import { usePhoneKit } from '../native/kit'
import { todayParts } from '../lib/birthday'
import { isList } from '../lib/lists'
import { compareDone, compareOpen, daysUntil, dueLabel, matchesTodoTags, type Todo } from '../lib/todos'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { useTodoStore, type TodoDraft } from '../stores/todoStore'
import { Modal } from './Modal'
import { TagChip } from './TagChip'
import { TagPicker } from './TagPicker'
import { TagCombo } from './TagCombo'
import { AddTyped, ListSearch } from './ListSearch'
import { matchesNote } from '../lib/notes'
import { currentT, useT } from '../i18n'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls, label, textareaCls } from './ui'
import { autoFocusOK } from '../native/kit'
import { phoneScreens } from '../native/shell'

/**
 * The To-do tab (owner's request, 2026-09-27), there only with App
 * preferences ▸ To-do on. See lib/todos.ts for what a to-do is.
 *
 * Open ones by deadline, then a collapsed "N done" drawer. Tap the box to tick
 * one off, tap the card to edit it.
 */
export function TodoView() {
  const t = useT()
  const todos = useTodoStore((s) => s.todos)
  const loaded = useTodoStore((s) => s.loaded)
  const editing = useTodoStore((s) => s.editing)
  const edit = useTodoStore((s) => s.edit)
  const tagFilter = useTodoStore((s) => s.tagFilter)
  const setTagFilter = useTodoStore((s) => s.setTagFilter)
  const clearDone = useTodoStore((s) => s.clearDone)
  const tags = useBookStore((s) => s.tags)
  const [showDone, setShowDone] = useState(false)
  // The tab's search (James, 2026-10-23): pulled down on a phone, a box
  // elsewhere; never remembered.
  const [query, setQuery] = useState('')
  const startTodo = useTodoStore((s) => s.startTodo)
  const doneId = useId()
  const hintId = useId()
  const setPinned = useTodoStore((s) => s.setPinned)
  const move = useTodoStore((s) => s.move)
  const remove = useTodoStore((s) => s.remove)
  const restore = useTodoStore((s) => s.restore)
  const [openRow, setOpenRow] = useState<{ id: string; side: Side } | null>(null)
  // Delete, with Undo for a few seconds (James, 2026-10-25): the swipe and
  // the row's own Delete both come here; the form's Delete still asks.
  const [undo, setUndo] = useState<Todo | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const removeWithUndo = (x: Todo) => {
    setUndo(x)
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndo(null), 6000)
    void remove(x.id)
  }
  const restoreUndo = async () => {
    if (!undo) return
    clearTimeout(undoTimer.current)
    await restore(undo)
    setUndo(null)
  }
  const { drag, dragStart, gripDown } = useTodoDrag((id, target, after) => void move(id, target, after))
  // Once per mount, as in ContactList: a tab left open over midnight keeps
  // yesterday's "Due today" until it is reopened.
  const today = useMemo(() => todayParts(), [])

  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  // Only tags some to-do actually carries: a filter chip that can only ever
  // empty the list is not a filter.
  const usedTags = useMemo(() => {
    const used = new Set(todos.flatMap((t) => t.tagIds))
    return tags.filter((t) => !isList(t) && used.has(t.id))
  }, [todos, tags])
  // A filter tag nobody carries any more (the last one was edited off it)
  // would filter to nothing with no lit chip to explain why.
  const activeFilter = tagFilter.filter((id) => usedTags.some((t) => t.id === id))
  const open = useMemo(
    () =>
      todos
        .filter((t) => !t.doneAt && matchesTodoTags(t, activeFilter) && matchesNote(t, query))
        .sort(compareOpen),
    [todos, activeFilter, query],
  )
  const done = useMemo(
    () =>
      todos
        .filter((t) => t.doneAt && matchesTodoTags(t, activeFilter) && matchesNote(t, query))
        .sort(compareDone),
    [todos, activeFilter, query],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">{t('tab_todos')}</h1>
          <p className="text-sm text-slate-500">{t('todo.intro')}</p>
        </div>
        {/* On the phone the top bar's + does this. */}
        {!phoneScreens() && (
          <button type="button" className={btnPrimary} onClick={() => edit('new')}>
            {t('c.add_new')}
          </button>
        )}
      </div>

      <ListSearch value={query} onChange={setQuery} label={t('todo.search')} />
      {/* What was typed, as a new to-do's title. */}
      <AddTyped text={query} onAdd={(title) => startTodo(title)} />

      {usedTags.length > 0 && (
        <div role="group" aria-label={t('tags.filter_by')}>
          <TagCombo
            options={usedTags}
            isOn={(id) => activeFilter.includes(id)}
            chip={(t) => (
              <TagChip
                name={t.name}
                colour={t.colour} pattern={t.pattern}
                selected={activeFilter.includes(t.id)}
                onClick={() =>
                  setTagFilter(
                    activeFilter.includes(t.id) ? activeFilter.filter((x) => x !== t.id) : [...activeFilter, t.id],
                  )
                }
              />
            )}
            suggestion={(t) => <TagChip name={t.name} colour={t.colour} pattern={t.pattern} />}
            onPick={(id) => setTagFilter([...activeFilter, id])}
            placeholder={t('tags.filter_by')}
            fullLabel={t('tags.show_all')}
          />
          {activeFilter.length > 0 && (
            <button type="button" className={`${btnSubtle} mt-1.5`} onClick={() => setTagFilter([])}>
              {t('c.clear')}
            </button>
          )}
        </div>
      )}

      {loaded && todos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
          <p className="text-sm text-slate-400">{phoneScreens() ? t('todo.none_phone') : t('todo.none')}</p>
        </div>
      ) : open.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-800 px-6 py-8 text-center text-sm text-slate-400">
          {query.trim() ? t('todo.no_match') : activeFilter.length > 0 ? t('todo.none_tagged') : t('todo.all_done')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-describedby={hintId}>
          {open.map((x, i) => (
            <li
              key={x.id}
              data-todo={x.id}
              className={`bb-todo relative ${dropClass(drag, x.id)}`}
              style={drag?.id === x.id ? { transform: `translateY(${drag.dy}px)`, zIndex: 40 } : undefined}
            >
              <SwipeRow
                open={openRow?.id === x.id ? openRow.side : null}
                onOpenChange={(side) => setOpenRow(side ? { id: x.id, side } : null)}
                left={pinAction(x, () => {
                  setOpenRow(null)
                  void setPinned(x.id, !x.pinnedAt)
                })}
                right={deleteAction(x, () => {
                  setOpenRow(null)
                  removeWithUndo(x)
                })}
              >
                <TodoRow
                  todo={x}
                  byId={byId}
                  today={today}
                  lifted={drag?.id === x.id}
                  onTouchStart={dragStart(x.id)}
                  onGripDown={gripDown(x.id)}
                  extra={
                    <RowActions
                      todo={x}
                      up={i > 0 ? open[i - 1].id : null}
                      down={i < open.length - 1 ? open[i + 1].id : null}
                      onDelete={() => removeWithUndo(x)}
                    />
                  }
                />
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}
      <p id={hintId} className="sr-only">
        {t('todo.order_hint')}
      </p>
      {undo && <UndoBar todo={undo} onUndo={() => void restoreUndo()} />}

      {done.length > 0 && (
        <section className="border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              aria-controls={doneId}
              className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <svg
                viewBox="0 0 16 16"
                className={`h-3.5 w-3.5 transition-transform ${showDone ? 'rotate-90' : ''}`}
                fill="currentColor"
                aria-hidden
              >
                <path d="M6 3.5 10.5 8 6 12.5V3.5Z" />
              </svg>
              <span className="tabular-nums">{t('todo.done_count', { count: done.length })}</span>
            </button>
            {showDone && (
              <button type="button" className={btnSubtle} onClick={() => void clearDone()}>
                {t('todo.clear_done')}
              </button>
            )}
          </div>
          {showDone && (
            <ul id={doneId} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {done.map((t) => (
                <li key={t.id}>
                  <TodoRow todo={t} byId={byId} today={today} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editing && <TodoForm key={editing} id={editing} />}
    </div>
  )
}

type Drag = { id: string; dy: number; target: { id: string; after: boolean; across?: boolean } | null }

/** The orange line where a dragged to-do will land. */
function dropClass(drag: Drag | null, id: string): string {
  if (!drag || drag.target?.id !== id) return ''
  if (drag.target.across) return drag.target.after ? 'bb-drop-right' : 'bb-drop-left'
  return drag.target.after ? 'bb-drop-after' : 'bb-drop-before'
}

/**
 * Tap, hold and drag a to-do into a new order (James, 2026-10-25). On a touch
 * screen a hold of 0.4 s lifts the row and the finger moves it; on the website
 * the grip at the row's edge does the same with the mouse. Where it lands is
 * the row under the pointer: its top half puts it before, its bottom half
 * after (left and right halves where the cards sit side by side). The order is saved on the to-dos (lib/todos.ts ▸ moveTodo), so it
 * syncs and goes in the backup file. Move up / Move down on each row (for
 * VoiceOver, TalkBack and the keyboard, Alt+↑ / Alt+↓) do the same.
 */
function useTodoDrag(onDrop: (id: string, targetId: string, after: boolean) => void) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const st = useRef<{ id: string; x0: number; y0: number; active: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null)
  const dragRef = useRef<Drag | null>(null)
  dragRef.current = drag
  const dropRef = useRef(onDrop)
  dropRef.current = onDrop

  const targetAt = (x: number, y: number, id: string): Drag['target'] => {
    for (const el of document.querySelectorAll<HTMLElement>('li[data-todo]')) {
      if (el.dataset.todo === id) continue
      const r = el.getBoundingClientRect()
      // Cards side by side (the website's grid) go before or after by the
      // half the pointer is in across; one column, by the half down.
      const across = (el.parentElement?.clientWidth ?? r.width) > r.width * 1.5
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
        return { id: el.dataset.todo!, across, after: across ? x > r.left + r.width / 2 : y > r.top + r.height / 2 }
    }
    return dragRef.current?.target ?? null
  }

  const finish = useCallback(() => {
    const d = dragRef.current
    if (st.current?.timer) clearTimeout(st.current.timer)
    const wasActive = st.current?.active
    st.current = null
    setDrag(null)
    if (wasActive) {
      // The click that ends a drag must not open the to-do.
      const swallow = (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
      }
      document.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 400)
    }
    if (d?.target) dropRef.current(d.id, d.target.id, d.target.after)
  }, [])

  useEffect(() => {
    const move = (e: TouchEvent) => {
      const s = st.current
      if (!s) return
      const t = e.touches[0]
      if (!s.active) {
        if (Math.hypot(t.clientX - s.x0, t.clientY - s.y0) > 8) {
          clearTimeout(s.timer)
          st.current = null
        }
        return
      }
      // Lifted: the finger is ours — no scrolling, and the row's swipe is
      // not told (capture on the document, ahead of React's listeners).
      e.preventDefault()
      e.stopPropagation()
      setDrag({ id: s.id, dy: t.clientY - s.y0, target: targetAt(t.clientX, t.clientY, s.id) })
    }
    const end = (e: TouchEvent) => {
      if (st.current?.active) e.stopPropagation()
      finish()
    }
    document.addEventListener('touchmove', move, { passive: false, capture: true })
    document.addEventListener('touchend', end, { capture: true })
    document.addEventListener('touchcancel', end, { capture: true })
    return () => {
      document.removeEventListener('touchmove', move, { capture: true })
      document.removeEventListener('touchend', end, { capture: true })
      document.removeEventListener('touchcancel', end, { capture: true })
    }
  }, [finish])

  const dragStart = (id: string) => (e: ReactTouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    const s = { id, x0: t.clientX, y0: t.clientY, active: false } as NonNullable<typeof st.current>
    s.timer = setTimeout(() => {
      s.active = true
      navigator.vibrate?.(12)
      setDrag({ id, dy: 0, target: null })
    }, 400)
    st.current = s
  }

  const gripDown = (id: string) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    e.preventDefault()
    const y0 = e.clientY
    st.current = { id, x0: e.clientX, y0, active: true }
    setDrag({ id, dy: 0, target: null })
    const onMove = (m: PointerEvent) => setDrag({ id, dy: m.clientY - y0, target: targetAt(m.clientX, m.clientY, id) })
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      finish()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { drag, dragStart, gripDown }
}

const PinIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 3h6l-1 6 3 3H7l3-3-1-6ZM12 12v9" />
  </svg>
)
const BinIcon = (
  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M6.5 1a1 1 0 0 0-1 1v.5H2.75a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H10.5V2a1 1 0 0 0-1-1h-3ZM4.5 5.5h7l-.6 8.1a1.5 1.5 0 0 1-1.5 1.4H6.6a1.5 1.5 0 0 1-1.5-1.4L4.5 5.5Z" />
  </svg>
)

function pinAction(todo: Todo, onAction: () => void): SwipeAction {
  const t = currentT()
  return {
    text: todo.pinnedAt ? t('todo.unpin') : t('todo.pin'),
    label: todo.pinnedAt ? t('todo.unpin_label', { title: todo.title }) : t('todo.pin_label', { title: todo.title }),
    icon: PinIcon,
    tone: 'bg-orange-600 text-white focus-visible:ring-orange-200',
    onAction,
  }
}

function deleteAction(todo: Todo, onAction: () => void): SwipeAction {
  const t = currentT()
  return {
    text: t('c.delete'),
    label: t('todo.delete_label', { title: todo.title }),
    icon: BinIcon,
    tone: 'bg-rose-600 text-white focus-visible:ring-rose-200',
    onAction,
  }
}

/**
 * The swipe's and the drag's jobs as plain buttons: hidden until focused, so
 * VoiceOver, TalkBack and the keyboard reach Move up, Move down, Pin and
 * Delete without a gesture.
 */
function RowActions({ todo, up, down, onDelete }: { todo: Todo; up: string | null; down: string | null; onDelete: () => void }) {
  const t = useT()
  const move = useTodoStore((s) => s.move)
  const setPinned = useTodoStore((s) => s.setPinned)
  const cls =
    'sr-only focus:not-sr-only focus:absolute focus:bottom-1.5 focus:right-1.5 focus:z-10 focus:rounded-lg focus:bg-slate-800 focus:px-2.5 focus:py-1 focus:text-xs focus:font-semibold focus:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400'
  return (
    <>
      {up && (
        <button type="button" className={cls} onClick={() => void move(todo.id, up, false)}>
          {t('todo.move_up', { title: todo.title })}
        </button>
      )}
      {down && (
        <button type="button" className={cls} onClick={() => void move(todo.id, down, true)}>
          {t('todo.move_down', { title: todo.title })}
        </button>
      )}
      <button type="button" className={cls} onClick={() => void setPinned(todo.id, !todo.pinnedAt)}>
        {todo.pinnedAt ? t('todo.unpin_label', { title: todo.title }) : t('todo.pin_label', { title: todo.title })}
      </button>
      <button type="button" className={cls} onClick={onDelete}>
        {t('todo.delete_label', { title: todo.title })}
      </button>
    </>
  )
}

/** "Deleted “Book dentist”. Undo" — for six seconds, at the foot of the screen. */
function UndoBar({ todo, onUndo }: { todo: Todo; onUndo: () => void }) {
  const t = useT()
  const kit = usePhoneKit()
  return (
    <div
      role="status"
      className={
        kit
          ? 'bb-toast flex items-center gap-3 text-left'
          : 'fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-950 shadow-xl'
      }
    >
      <span className="min-w-0 truncate">{t('todo.deleted', { title: todo.title || t('c.untitled') })}</span>
      <button type="button" onClick={onUndo} className="shrink-0 font-semibold text-orange-600 underline-offset-2 hover:underline">
        {t('todo.undo')}
      </button>
    </div>
  )
}

function TodoRow({
  todo,
  byId,
  today,
  lifted = false,
  onTouchStart,
  onGripDown,
  extra,
}: {
  todo: Todo
  byId: Map<string, Tag>
  today: ReturnType<typeof todayParts>
  lifted?: boolean
  onTouchStart?: (e: ReactTouchEvent) => void
  onGripDown?: (e: React.PointerEvent) => void
  extra?: ReactNode
}) {
  const t = useT()
  const setDone = useTodoStore((s) => s.setDone)
  const edit = useTodoStore((s) => s.edit)
  const done = todo.doneAt !== undefined
  const chips = todo.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => Boolean(t) && !isList(t!))
  const days = todo.due ? daysUntil(todo.due, today) : null

  return (
    // The tick box is a SIBLING of the card button, never inside it — a button
    // in a button is invalid HTML (see ContactRow).
    <div className="relative h-full" onTouchStart={onTouchStart}>
      <button
        type="button"
        onClick={() => edit(todo.id)}
        onKeyDown={(e) => {
          // Alt+↑ / Alt+↓: the keyboard's drag.
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
          const li = (e.currentTarget.closest('li[data-todo]') as HTMLElement | null)
          const sib = (e.key === 'ArrowUp' ? li?.previousElementSibling : li?.nextElementSibling) as HTMLElement | null
          if (!sib?.dataset.todo) return
          e.preventDefault()
          void useTodoStore.getState().move(todo.id, sib.dataset.todo, e.key === 'ArrowDown')
          requestAnimationFrame(() => (document.querySelector(`li[data-todo="${todo.id}"] button`) as HTMLElement | null)?.focus())
        }}
        className={`flex h-full w-full flex-col gap-1.5 rounded-xl border bg-slate-900 py-3 pl-12 ${onGripDown ? 'pr-9' : 'pr-3.5'} text-left transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
          done ? 'opacity-60' : ''
        } ${lifted ? 'border-orange-400 shadow-2xl' : 'border-slate-800'}`}
      >
        <p className={`flex items-start gap-1.5 font-semibold text-slate-100 ${done ? 'line-through decoration-slate-500' : ''}`}>
          {todo.pinnedAt && !done && (
            <span className="mt-0.5 shrink-0 text-orange-400" title={t('todo.pinned')}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 3h6l-1 6 3 3H7l3-3-1-6ZM12 12v9" />
              </svg>
              <span className="sr-only">{t('todo.pinned')}</span>
            </span>
          )}
          <span className="min-w-0 break-words">{todo.title || t('c.untitled')}</span>
        </p>
        {todo.details && <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm text-slate-400">{todo.details}</p>}
        {todo.due && !done && (
          <p
            className={`text-sm font-medium tabular-nums ${
              days! < 0 ? 'text-rose-300' : days! <= 1 ? 'text-orange-300' : 'text-slate-400'
            }`}
          >
            {dueLabel(todo.due, today)}
          </p>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((t) => (
              <TagChip key={t.id} name={t.name} colour={t.colour} pattern={t.pattern} />
            ))}
          </div>
        )}
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? t('todo.mark_undone', { title: todo.title }) : t('todo.mark_done', { title: todo.title })}
        onClick={() => void setDone(todo.id, !done)}
        className="absolute left-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <span
          aria-hidden
          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
            done ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-500 bg-slate-950 hover:border-orange-400'
          }`}
        >
          {done && (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
      {/* The website's drag handle (mouse); a touch screen holds the row instead. */}
      {onGripDown && !done && (
        <span
          aria-hidden
          onPointerDown={onGripDown}
          className="bb-grip absolute right-1 top-1/2 hidden h-10 w-7 -translate-y-1/2 cursor-grab items-center justify-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-200 sm:flex"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <circle cx="5.5" cy="4" r="1.2" /><circle cx="10.5" cy="4" r="1.2" />
            <circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" />
            <circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="12" r="1.2" />
          </svg>
        </span>
      )}
      {extra}
    </div>
  )
}

/**
 * Add or edit one to-do: name, details, deadline, tags — the whole of it, on
 * purpose (owner's spec). Delete lives here for an existing one.
 */
function TodoForm({ id }: { id: string }) {
  const t = useT()
  const existing = useTodoStore((s) => (id === 'new' ? undefined : s.todos.find((t) => t.id === id)))
  const save = useTodoStore((s) => s.save)
  const remove = useTodoStore((s) => s.remove)
  const close = useTodoStore((s) => s.edit)
  const [draft, setDraft] = useState<TodoDraft>(() => ({
    id: existing?.id,
    title: existing?.title ?? useTodoStore.getState().prefillTitle ?? '',
    details: existing?.details ?? '',
    due: existing?.due,
    tagIds: existing?.tagIds ?? [],
  }))
  const [confirming, setConfirming] = useState(false)
  const titleId = useId()
  const detailsId = useId()
  const dueId = useId()
  const patch = (p: Partial<TodoDraft>) => setDraft((d) => ({ ...d, ...p }))
  const valid = draft.title.trim() !== ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) void save(draft)
  }

  return (
    <Modal title={existing ? t('todo.fine_tune') : t('add_todo')} onClose={() => close(null)}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={titleId} className={label}>
            {t('form.name')}
          </label>
          <input
            id={titleId}
            className={inputCls}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={t('todo.placeholder')}
            autoFocus={autoFocusOK()}
            required
          />
        </div>
        <div>
          <label htmlFor={detailsId} className={label}>
            {t('todo.details')}
          </label>
          <textarea
            id={detailsId}
            className={textareaCls}
            rows={3}
            value={draft.details}
            onChange={(e) => patch({ details: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={dueId} className={label}>
            {t('todo.deadline')}
          </label>
          <div className="flex items-center gap-2">
            {/* The browser's own date picker — the phone's wheel on iOS. */}
            <input
              id={dueId}
              type="date"
              className={`${inputCls} [color-scheme:dark]`}
              value={draft.due ?? ''}
              onChange={(e) => patch({ due: e.target.value || undefined })}
            />
            {draft.due && (
              <button type="button" className={btnSubtle} onClick={() => patch({ due: undefined })}>
                {t('c.clear')}
              </button>
            )}
          </div>
        </div>
        <div>
          <span className={label}>{t('field.tags')}</span>
          <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {existing ? (
            confirming ? (
              <button type="button" className={btnDanger} onClick={() => void remove(existing.id)}>
                {t('todo.really_delete')}
              </button>
            ) : (
              <button type="button" className={btnSubtle} onClick={() => setConfirming(true)}>
                {t('c.delete')}
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={() => close(null)}>
              {t('c.cancel')}
            </button>
            <button type="submit" className={btnPrimary} disabled={!valid}>
              {existing ? t('c.save') : t('todo.add')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
