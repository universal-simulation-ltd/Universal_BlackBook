import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react'
import { Button, GrowingTextarea, SelectCheckbox, SelectionBar, useDefaultView, useMediaQuery, useSelection, type UseDefaultView } from '@unisim/sdk'
import { SwipeRow } from './SwipeRow'
import { useMove } from './MoveTo'
import { actionSwipe, deleteSwipe, FocusActions, pinSwipe, SelectBar, SwipeGroup, SwipeItem, UndoBar, useAskDelete, useHold, useHoldSelect, useUndo, webSelBarWrap } from './SwipeActions'
import { usePhoneKit } from '../native/kit'
import type { Side } from '../lib/swipe'
import { todayParts } from '../lib/birthday'
import { isList } from '../lib/lists'
import { addDays, compareDone, compareOpen, compareSnoozed, daysUntil, dueLabel, dueShort, groupProgress, isSnoozed, matchesTodo, matchesTodoTags, shortDate, snoozeChoices, type Todo, type TodoItem } from '../lib/todos'
import { newId } from '../lib/id'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { useTodoStore, type TodoDraft } from '../stores/todoStore'
import { useSettingsStore } from '../stores/settingsStore'
import { listenForShake } from '../lib/shake'
import { Modal } from './Modal'
import { TagChip, TagDot } from './TagChip'
import { TagPicker } from './TagPicker'
import { TagCombo } from './TagCombo'
import { AddTyped, ListSearch } from './ListSearch'
import { Elsewhere } from './Elsewhere'
import { useT } from '../i18n'
import { btnDanger, emptyBox, orbitRow, btnGhost, btnPrimary, btnSubtle, inputCls, BtnKey, label, PlusIcon, tabHeading, textareaCls } from './ui'
import { autoFocusOK } from '../native/kit'
import { phoneScreens } from '../native/shell'
import { saveKeyLabel } from '../lib/saveKey'
import { isQuickTodo, TABLET_QUERY, TODO_LAYOUT_DEFAULT, TODO_LAYOUT_VIEW, TODO_LAYOUTS, type TodoLayout } from '../lib/todoLayout'

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
  const [showSnoozed, setShowSnoozed] = useState(false)
  // The to-dos the Snooze sheet is open on (a row's, the detail's, or a selection).
  const [snoozing, setSnoozing] = useState<string[] | null>(null)
  const snooze = useTodoStore((s) => s.snooze)
  // The tab's search (James, 2026-10-23): pulled down on a phone, a box
  // elsewhere; never remembered.
  const [query, setQuery] = useState('')
  const saveTodo = useTodoStore((s) => s.save)
  // What was typed in the search, added as it is (James, 2026-10-26: "it
  // should appear straight in the todo instead of the full add screen"), by
  // its Add button or Return. The search empties, so the new one shows; + at
  // the top is still the full form.
  const addTyped = (text: string) => {
    const title = text.trim().replace(/\s+/g, ' ')
    if (!title) return
    void saveTodo({ title, details: '', tagIds: [] })
    setQuery('')
  }
  const doneId = useId()
  const snoozedId = useId()
  const hintId = useId()
  const setPinned = useTodoStore((s) => s.setPinned)
  const setDone = useTodoStore((s) => s.setDone)
  const move = useTodoStore((s) => s.move)
  const remove = useTodoStore((s) => s.remove)
  const restore = useTodoStore((s) => s.restore)
  const [openRow, setOpenRow] = useState<{ id: string; side: Side } | null>(null)
  // Delete, with Undo for a few seconds (James, 2026-10-25): the swipe and
  // the row's own Delete both come here; the form's Delete still asks.
  const undo = useUndo<Todo[]>(async (xs) => {
    for (const x of xs) await restore(x)
  })
  const removeManyWithUndo = (xs: Todo[]) => {
    if (!xs.length) return
    undo.deleted(xs)
    for (const x of xs) void remove(x.id)
  }
  const removeWithUndo = (x: Todo) => removeManyWithUndo([x])
  // Select ▸ Move: to Contacts or Notes (MoveTo).
  const moveTo = useMove('todos')

  const { drag, dragStart, gripDown } = useTodoDrag(
    (id, target, after) => void move(id, target, after),
    // Held and let go without moving: that selects (James, 2026-10-25) — the
    // phone's select bar, or on a touch screen on the website the row's tick box.
    (id) => (web ? wsel.setMany([id], true) : openSel.start(id)),
  )
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
        .filter((t) => !t.doneAt && !isSnoozed(t, today) && matchesTodoTags(t, activeFilter) && matchesTodo(t, query, byId))
        .sort(compareOpen),
    [todos, activeFilter, query, byId, today],
  )
  // Snoozed ones wait in their own drawer until their day (James, 2026-11-19).
  const snoozed = useMemo(
    () =>
      todos
        .filter((t) => isSnoozed(t, today) && matchesTodoTags(t, activeFilter) && matchesTodo(t, query, byId))
        .sort(compareSnoozed),
    [todos, activeFilter, query, byId, today],
  )
  const done = useMemo(
    () =>
      todos
        .filter((t) => t.doneAt && matchesTodoTags(t, activeFilter) && matchesTodo(t, query, byId))
        .sort(compareDone),
    [todos, activeFilter, query, byId],
  )

  const kit = usePhoneKit()
  // Shake to clear the done ones (Tune this app, off to start), with Undo.
  const shakeClear = useSettingsStore((s) => s.shakeClear)
  const removeManyRef = useRef(removeManyWithUndo)
  removeManyRef.current = removeManyWithUndo
  useEffect(() => {
    if (!shakeClear || !kit) return
    return listenForShake(() => {
      const gone = useTodoStore.getState().todos.filter((x) => x.doneAt)
      if (!gone.length) return
      navigator.vibrate?.(30)
      removeManyRef.current(gone)
    })
  }, [shakeClear, kit])
  // The phone app's selection: hold a to-do, then the select bar (the
  // suite's phone rule), one per list. The website has tick boxes instead.
  const openSel = useHoldSelect(open.map((x) => x.id), Boolean(kit))
  const doneSel = useHoldSelect(done.map((x) => x.id), Boolean(kit))
  const snoozedSel = useHoldSelect(snoozed.map((x) => x.id), Boolean(kit))
  /**
   * The website's way to pick several (the suite rule, "Every list: select
   * several, then act"; @unisim/sdk 0.227), as on Contacts: a tick box beside
   * every to-do on show (the open ones, and the snoozed and done ones while
   * their drawers are open), Select all over the list, and once something is
   * ticked the count, Delete selected (asks, then Undo for six seconds), Pin,
   * Done / Not done, Snooze, Move and Clear. No mode: a to-do still opens with
   * a tap while others are ticked. Holding one on a touch screen ticks it.
   */
  const web = !phoneScreens()
  const onShow = [...open, ...(showSnoozed ? snoozed : []), ...(showDone ? done : [])]
  const wsel = useSelection(web ? onShow.map((x) => x.id) : [])
  const ticked = web ? onShow.filter((x) => wsel.has(x.id)) : []
  const tickedOpen = ticked.filter((x) => !x.doneAt)
  const tickedDone = ticked.filter((x) => x.doneAt)
  const holdTick = useHold((id) => wsel.setMany([id], true))
  const askDelete = useAskDelete(t('tsel.delete_title'), (n) => t.plural('tsel.delete_body', n))
  /**
   * A to-do with the website's tick box in a column of its own before it: the
   * row's own round box is Done, so the two must not share a corner. `hold`:
   * a touch screen's hold ticks it (the open ones' hold is the drag's).
   */
  const tickable = (x: Todo, look: Look, node: ReactNode, hold = false) =>
    web ? (
      <div className={`flex items-start gap-1 ${look === 'card' ? 'h-full' : ''}`} onTouchStart={hold ? holdTick(x.id) : undefined}>
        <SelectCheckbox
          checked={wsel.has(x.id)}
          onChange={() => wsel.toggle(x.id)}
          label={t('nsel.select_label', { title: x.title || t('c.untitled') })}
          className={`ml-1 shrink-0 ${look === 'card' ? 'mt-3' : 'mt-2.5'}`}
        />
        <div className={`min-w-0 flex-1 ${look === 'card' ? 'h-full' : ''}`}>{node}</div>
      </div>
    ) : (
      node
    )

  // The website's layout (lib/todoLayout.ts). Opens on the default; a tap on
  // another button is for this visit, a double tap makes it the default.
  const layoutDefault = useDefaultView<TodoLayout>(TODO_LAYOUT_VIEW, TODO_LAYOUT_DEFAULT, { views: TODO_LAYOUTS })
  const [layoutPick, setLayoutPick] = useState<TodoLayout>(layoutDefault.defaultView)
  // A default chosen in Tune this app while the tab is open shows at once.
  const shownDefault = useRef(layoutDefault.defaultView)
  useEffect(() => {
    if (shownDefault.current === layoutDefault.defaultView) return
    shownDefault.current = layoutDefault.defaultView
    setLayoutPick(layoutDefault.defaultView)
  }, [layoutDefault.defaultView])
  // The phone app on a tablet — an iPad, or a window that wide — has the
  // room for them too (James, 2026-11-18: "Yes, do the iPad"); a phone keeps
  // its own one-column list of cards.
  const tablet = useMediaQuery(TABLET_QUERY)
  const layouts = !phoneScreens() || tablet
  // The detail pane needs the room; narrower, that layout is the plain list.
  // The phone app has no sidebar beside it, so an iPad upright is wide enough.
  const wide = useMediaQuery(phoneScreens() ? TABLET_QUERY : '(min-width: 1024px)')
  const layout: Shown = !layouts ? 'grid' : layoutPick === 'detail' && !wide ? 'list' : layoutPick
  // List and detail: the to-do shown in full. The first one until one is picked,
  // and again once the picked one is ticked off, filtered out or deleted.
  const [picked, setPicked] = useState<string | null>(null)
  const current = layout === 'detail' ? (open.find((x) => x.id === picked) ?? open[0]) : undefined

  /** One open to-do, drawn the way `look` says; `list` is the run it sits in. */
  const openItem = (x: Todo, list: Todo[], i: number, look: Look) => (
    <li
      key={x.id}
      data-todo={x.id}
      className={`bb-todo relative ${itemClass(layout, look)} ${dropClass(drag, x.id)}`}
      style={drag?.id === x.id ? { transform: `translate(${drag.dx}px, ${drag.dy}px)`, zIndex: 40 } : undefined}
    >
      {openSel.selecting ? (
        <SwipeItem id={x.id} select={openSel} name={x.title}>
          <TodoRow todo={x} byId={byId} today={today} look={look} />
        </SwipeItem>
      ) : tickable(x, look,
        <SwipeRow
          open={openRow?.id === x.id ? openRow.side : null}
          onOpenChange={(side) => setOpenRow(side ? { id: x.id, side } : null)}
          left={pinSwipe(Boolean(x.pinnedAt), x.title, () => {
            setOpenRow(null)
            void setPinned(x.id, !x.pinnedAt)
          })}
          right={deleteSwipe(x.title, () => {
            setOpenRow(null)
            removeWithUndo(x)
          })}
        >
          <TodoRow
            todo={x}
            byId={byId}
            today={today}
            look={look}
            lifted={drag?.id === x.id}
            current={current?.id === x.id}
            brief={layout === 'detail'}
            onOpen={layout === 'detail' ? () => setPicked(x.id) : undefined}
            onTouchStart={dragStart(x.id)}
            onGripDown={gripDown(x.id)}
            extra={
              <RowActions
                todo={x}
                up={i > 0 ? list[i - 1].id : null}
                down={i < list.length - 1 ? list[i + 1].id : null}
                onDelete={() => removeWithUndo(x)}
                // The website's tick box is reachable by itself.
                onSelect={web ? undefined : () => openSel.start(x.id)}
                onSnooze={() => setSnoozing([x.id])}
              />
            }
          />
        </SwipeRow>,
      )}
    </li>
  )
  const openList = (list: Todo[], look: Look, cls: string) => (
    <ul className={cls} data-across={layout === 'grid' ? '' : undefined} aria-describedby={hintId}>
      {list.map((x, i) => openItem(x, list, i, look))}
    </ul>
  )
  const quick = layout === 'lanes' ? open.filter(isQuickTodo) : []
  const bigger = layout === 'lanes' ? open.filter((x) => !isQuickTodo(x)) : []
  // The done ones: rows, except where the open ones are cards.
  const doneLook: Look = layout === 'grid' || layout === 'cards' ? 'card' : 'row'
  const doneCls = listClass(layout === 'detail' || layout === 'lanes' ? 'list' : layout)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={phoneScreens() ? 'bb-h1' : tabHeading}>{t('tab_todos')}</h1>
          {!phoneScreens() && <p className="text-sm text-slate-500">{t('todo.intro')}</p>}
        </div>
        {layouts && (
          <div className="flex items-center gap-2">
            <LayoutButtons value={layoutPick} dv={layoutDefault} onChange={setLayoutPick} />
            {/* In the phone app the top bar's + does this. */}
            {!phoneScreens() && (
              <button type="button" className={btnPrimary} onClick={() => edit('new')}>
                <BtnKey>
                  <PlusIcon />
                </BtnKey>
                {t('c.add_new')}
              </button>
            )}
          </div>
        )}
      </div>

      <ListSearch
        value={query}
        onChange={setQuery}
        label={t('todo.search')}
        filtering={activeFilter.length > 0}
        onEnter={() => addTyped(query)}
      >
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
      </ListSearch>
      {/* What was typed, as a new to-do's title. */}
      <AddTyped text={query} onAdd={addTyped} />

      {web && (
        <div className={webSelBarWrap(wsel.count)}>
          <SelectionBar
            sel={wsel}
            confirm={askDelete.ask}
            onDelete={(ids) => removeManyWithUndo(todos.filter((x) => ids.includes(x.id)))}
            extra={
              <>
                {tickedOpen.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      for (const x of tickedOpen) void setPinned(x.id, true)
                      wsel.clear()
                    }}
                  >
                    {t('todo.pin')}
                  </Button>
                )}
                {tickedOpen.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      for (const x of tickedOpen) void setDone(x.id, true)
                      wsel.clear()
                    }}
                  >
                    {t('todo.mark_done_short')}
                  </Button>
                )}
                {tickedDone.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      for (const x of tickedDone) void setDone(x.id, false)
                      wsel.clear()
                    }}
                  >
                    {t('todo.not_done')}
                  </Button>
                )}
                {tickedOpen.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSnoozing(tickedOpen.map((x) => x.id))
                      wsel.clear()
                    }}
                  >
                    {t('todo.snooze')}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    moveTo.start(ticked.map((x) => x.id))
                    wsel.clear()
                  }}
                >
                  {t('sel.move')}
                </Button>
              </>
            }
          />
        </div>
      )}

      {loaded && todos.length === 0 ? (
        <div className={`${emptyBox} px-6 py-14 text-center`}>
          <p className="text-sm text-slate-400">{phoneScreens() ? t('todo.none_phone') : t('todo.none')}</p>
        </div>
      ) : open.length === 0 ? (
        <p className={`${emptyBox} px-6 py-8 text-center text-sm text-slate-400`}>
          {query.trim()
            ? t('todo.no_match')
            : activeFilter.length > 0
              ? t('todo.none_tagged')
              : snoozed.length > 0
                ? t('todo.nothing_today')
                : t('todo.all_done')}
        </p>
      ) : (
        <>
        <SelectBar
          select={openSel}
          total={open.length}
          actions={[
            { label: t('todo.pin'), onClick: (ids) => ids.forEach((id) => void setPinned(id, true)) },
            { label: t('todo.mark_done_short'), onClick: (ids) => ids.forEach((id) => void setDone(id, true)) },
            { label: t('todo.snooze'), onClick: (ids) => setSnoozing(ids) },
            { label: t('sel.move'), onClick: moveTo.start },
            { label: t('c.delete'), danger: true, onClick: (ids) => removeManyWithUndo(open.filter((x) => ids.includes(x.id))) },
          ]}
        />
        {layout === 'detail' ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-6">
            {openList(open, 'row', listClass('list'))}
            {/* Stays in sight while the list scrolls under it. */}
            <aside className="bb-detail sticky top-4" aria-live="polite">
              {current && <TodoDetail key={current.id} todo={current} byId={byId} today={today} onSnooze={() => setSnoozing([current.id])} />}
            </aside>
          </div>
        ) : layout === 'lanes' ? (
          // Only the lanes with something in them; one alone takes the width.
          <div className={`grid items-start gap-6 ${quick.length && bigger.length ? 'min-[700px]:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]' : ''}`}>
            {quick.length > 0 && (
              <section>
                <h2 className="mb-1 px-2 text-xs font-semibold text-slate-500">{t('todo.lane_quick')}</h2>
                {openList(quick, 'row', listClass('list'))}
              </section>
            )}
            {bigger.length > 0 && (
              <section>
                <h2 className="mb-1 px-1 text-xs font-semibold text-slate-500">{t('todo.lane_bigger')}</h2>
                {openList(bigger, 'card', 'space-y-2')}
              </section>
            )}
          </div>
        ) : (
          openList(open, layout === 'grid' || layout === 'cards' ? 'card' : 'row', listClass(layout))
        )}
        </>
      )}
      <p id={hintId} className="sr-only">
        {t('todo.order_hint')}
      </p>
      {moveTo.ui}
      {askDelete.ui}
      {undo.item && (
        <UndoBar
          title={undo.item.length === 1 ? undo.item[0].title : ''}
          text={undo.item.length === 1 ? undefined : t.plural('sel.deleted', undo.item.length)}
          onUndo={() => void undo.undo()}
        />
      )}

      {snoozed.length > 0 && (
        <section className="border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowSnoozed((v) => !v)}
            aria-expanded={showSnoozed}
            aria-controls={snoozedId}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 transition-transform ${showSnoozed ? 'rotate-90' : ''}`} fill="currentColor" aria-hidden>
              <path d="M6 3.5 10.5 8 6 12.5V3.5Z" />
            </svg>
            <span className="tabular-nums">{t('todo.snoozed_count', { count: snoozed.length })}</span>
          </button>
          {showSnoozed && (
            <SwipeGroup>
              {/* The phone's hold to select, as on the open and done ones. */}
              <div className="mt-2">
                <SelectBar
                  select={snoozedSel}
                  total={snoozed.length}
                  actions={[
                    { label: t('todo.wake'), onClick: (ids) => void snooze(ids, undefined) },
                    { label: t('todo.snooze'), onClick: (ids) => setSnoozing(ids) },
                    { label: t('sel.move'), onClick: moveTo.start },
                    { label: t('c.delete'), danger: true, onClick: (ids) => removeManyWithUndo(snoozed.filter((x) => ids.includes(x.id))) },
                  ]}
                />
              </div>
              {/* Asleep until their day: swipe right (or the hidden button)
                  wakes one now, left deletes it. */}
              <ul id={snoozedId} className={`mt-2 ${doneCls}`}>
                {snoozed.map((x) => (
                  <li key={x.id} className={itemClass(layout, doneLook)}>
                    {tickable(x, doneLook,
                    <SwipeItem
                      id={x.id}
                      name={x.title}
                      select={web ? undefined : snoozedSel}
                      left={actionSwipe('wake', t('todo.wake'), t('todo.wake_label', { title: x.title }), () => void snooze([x.id], undefined))}
                      right={deleteSwipe(x.title, () => removeWithUndo(x))}
                      focus={[
                        { label: t('todo.wake_label', { title: x.title }), onClick: () => void snooze([x.id], undefined) },
                        { label: t('todo.snooze_label', { title: x.title }), onClick: () => setSnoozing([x.id]) },
                        { label: t('todo.delete_label', { title: x.title }), onClick: () => removeWithUndo(x) },
                      ]}
                    >
                      <TodoRow todo={x} byId={byId} today={today} look={doneLook} />
                    </SwipeItem>,
                    true)}
                  </li>
                ))}
              </ul>
            </SwipeGroup>
          )}
        </section>
      )}

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
          {/* The last one ticked off stays in sight, struck through, under
              the closed Done drawer's title (James, 2026-11-12: "so it can be
              easily reverted"; 2026-11-18: "move the recently done item
              beneath the done collapsible") — tap its box, or swipe right,
              to put it back. Open the drawer and it is simply the first of
              the done ones. */}
          {!showDone && (
            <SwipeGroup>
              <div className={`mt-2 ${doneCls}`}>
                <SwipeItem
                  id={done[0].id}
                  name={done[0].title}
                  left={actionSwipe('undone', t('todo.not_done'), t('todo.mark_undone', { title: done[0].title }), () => void setDone(done[0].id, false))}
                  right={deleteSwipe(done[0].title, () => removeWithUndo(done[0]))}
                  focus={[{ label: t('todo.delete_label', { title: done[0].title }), onClick: () => removeWithUndo(done[0]) }]}
                >
                  <TodoRow todo={done[0]} byId={byId} today={today} look={doneLook} />
                </SwipeItem>
              </div>
            </SwipeGroup>
          )}
          {showDone && (
            <SwipeGroup>
            <div className="mt-2">
              <SelectBar
                select={doneSel}
                total={done.length}
                actions={[
                  { label: t('todo.not_done'), onClick: (ids) => ids.forEach((id) => void setDone(id, false)) },
                  { label: t('sel.move'), onClick: moveTo.start },
                  { label: t('c.delete'), danger: true, onClick: (ids) => removeManyWithUndo(done.filter((x) => ids.includes(x.id))) },
                ]}
              />
            </div>
            <ul id={doneId} className={`mt-2 ${doneCls}`}>
              {done.map((x) => (
                <li key={x.id} className={itemClass(layout, doneLook)}>
                  {/* Done ones swipe too: left deletes (with Undo), right
                      puts it back on the list. */}
                  {tickable(x, doneLook,
                  <SwipeItem
                    id={x.id}
                    select={web ? undefined : doneSel}
                    name={x.title}
                    left={actionSwipe('undone', t('todo.not_done'), t('todo.mark_undone', { title: x.title }), () => void setDone(x.id, false))}
                    right={deleteSwipe(x.title, () => removeWithUndo(x))}
                    focus={[{ label: t('todo.delete_label', { title: x.title }), onClick: () => removeWithUndo(x) }]}
                  >
                    <TodoRow todo={x} byId={byId} today={today} look={doneLook} />
                  </SwipeItem>,
                  true)}
                </li>
              ))}
            </ul>
            </SwipeGroup>
          )}
        </section>
      )}

      {/* Then what the same search finds on the other tabs (James, 2026-11-18). */}
      {!openSel.selecting && !doneSel.selecting && !snoozedSel.selecting && <Elsewhere here="todos" query={query} />}

      {editing && <TodoForm key={editing} id={editing} />}
      {snoozing && (
        <SnoozeSheet
          count={snoozing.length}
          today={today}
          current={snoozing.length === 1 ? todos.find((x) => x.id === snoozing[0])?.snoozedUntil : undefined}
          onPick={(until) => {
            void snooze(snoozing, until)
            setSnoozing(null)
          }}
          onClose={() => setSnoozing(null)}
        />
      )}
    </div>
  )
}

type Drag = { id: string; dx: number; dy: number; target: { id: string; after: boolean; across?: boolean } | null }

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
function useTodoDrag(onDrop: (id: string, targetId: string, after: boolean) => void, onHold?: (id: string) => void) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const st = useRef<{ id: string; x0: number; y0: number; active: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null)
  const dragRef = useRef<Drag | null>(null)
  dragRef.current = drag
  const dropRef = useRef(onDrop)
  dropRef.current = onDrop
  const holdRef = useRef(onHold)
  holdRef.current = onHold
  const moved = useRef(false)

  const targetAt = (x: number, y: number, id: string): Drag['target'] => {
    for (const el of document.querySelectorAll<HTMLElement>('li[data-todo]')) {
      if (el.dataset.todo === id) continue
      const r = el.getBoundingClientRect()
      // Cards side by side (the phone app's grid on a tablet) go before or
      // after by the half the pointer is in across; everything else, the
      // website's column layouts included, runs down, so by the half down.
      const across = el.parentElement?.dataset.across !== undefined && (el.parentElement?.clientWidth ?? r.width) > r.width * 1.5
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
    if (d?.target && moved.current) dropRef.current(d.id, d.target.id, d.target.after)
    else if (d && wasActive && !moved.current) holdRef.current?.(d.id)
    moved.current = false
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
      if (Math.abs(t.clientY - s.y0) > 6 || Math.abs(t.clientX - s.x0) > 6) moved.current = true
      setDrag({ id: s.id, dx: t.clientX - s.x0, dy: t.clientY - s.y0, target: targetAt(t.clientX, t.clientY, s.id) })
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
      setDrag({ id, dx: 0, dy: 0, target: null })
    }, 400)
    st.current = s
  }

  const gripDown = (id: string) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    e.preventDefault()
    const x0 = e.clientX
    const y0 = e.clientY
    st.current = { id, x0, y0, active: true }
    setDrag({ id, dx: 0, dy: 0, target: null })
    const onMove = (m: PointerEvent) => {
      moved.current = true
      setDrag({ id, dx: m.clientX - x0, dy: m.clientY - y0, target: targetAt(m.clientX, m.clientY, id) })
    }
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

/**
 * The swipe's and the drag's jobs as plain buttons: hidden until focused, so
 * VoiceOver, TalkBack and the keyboard reach Move up, Move down, Pin and
 * Delete without a gesture.
 */
function RowActions({ todo, up, down, onDelete, onSelect, onSnooze }: { todo: Todo; up: string | null; down: string | null; onDelete: () => void; onSelect?: () => void; onSnooze: () => void }) {
  const t = useT()
  const move = useTodoStore((s) => s.move)
  const setPinned = useTodoStore((s) => s.setPinned)
  return (
    <FocusActions
      actions={[
        ...(onSelect ? [{ label: t('nsel.select_label', { title: todo.title }), onClick: onSelect }] : []),
        ...(up ? [{ label: t('todo.move_up', { title: todo.title }), onClick: () => void move(todo.id, up, false) }] : []),
        ...(down ? [{ label: t('todo.move_down', { title: todo.title }), onClick: () => void move(todo.id, down, true) }] : []),
        {
          label: todo.pinnedAt ? t('todo.unpin_label', { title: todo.title }) : t('todo.pin_label', { title: todo.title }),
          onClick: () => void setPinned(todo.id, !todo.pinnedAt),
        },
        { label: t('todo.snooze_label', { title: todo.title }), onClick: onSnooze },
        { label: t('todo.delete_label', { title: todo.title }), onClick: onDelete },
      ]}
    />
  )
}

/** What the tab is showing: one of the website's layouts, or the phone's grid. */
type Shown = TodoLayout | 'grid'
/** A to-do drawn as a card (bordered box) or as a row of a list. */
type Look = 'card' | 'row'

/** The open (and done) list's own classes, per layout. */
function listClass(layout: Shown): string {
  switch (layout) {
    case 'grid':
      return 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'
    case 'columns':
      // Newspaper columns: the order runs down the first, then the next. The
      // phone app's tablet (no sidebar) splits sooner: an iPad upright has two.
      return phoneScreens() ? 'gap-x-8 min-[700px]:columns-2 xl:columns-3' : 'gap-x-8 lg:columns-2 2xl:columns-3'
    case 'cards':
      return 'gap-2 sm:columns-2 xl:columns-3'
    default:
      return 'max-w-4xl'
  }
}

/** One item's own classes: a row's rule under it, a column's no-split. */
function itemClass(layout: Shown, look: Look): string {
  if (look === 'row') return `border-b border-slate-800/70 ${layout === 'columns' ? 'break-inside-avoid' : ''}`
  return layout === 'cards' ? 'mb-2 break-inside-avoid' : ''
}

/**
 * The website's layout buttons, above the list (James, 2026-11-18). A tap
 * shows that layout; a double tap makes it the one the tab opens on, marked
 * with a dot — the suite's view-button rule (BRANDING.md, Jukebox's tabs).
 * Hidden on a narrow window, where every layout is one column anyway; in the
 * phone app, on a tablet only (TodoView doesn't draw them on a phone).
 */
function LayoutButtons({ value, dv, onChange }: { value: TodoLayout; dv: UseDefaultView<TodoLayout>; onChange: (v: TodoLayout) => void }) {
  const t = useT()
  return (
    <div role="group" aria-label={t('todo.layout')} className="hidden items-center rounded-xl border border-slate-800 p-0.5 min-[700px]:inline-flex">
      {TODO_LAYOUTS.map((v) => {
        const name = layoutName(t, v)
        const on = value === v
        return (
          <button
            key={v}
            type="button"
            {...dv.buttonProps(v, name)}
            aria-label={name}
            aria-pressed={on}
            onClick={() => {
              dv.tap(v)
              onChange(v)
            }}
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
              on ? 'bg-orange-500/15 text-orange-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutIcon kind={v} />
            {dv.defaultView === v && <span aria-hidden className="absolute bottom-0.5 h-1 w-1 rounded-full bg-orange-400" />}
          </button>
        )
      })}
    </div>
  )
}

function layoutName(t: ReturnType<typeof useT>, v: TodoLayout): string {
  return t(`todo.layout_${v}` as const)
}

/** Each layout's picture, drawn small: what the list will look like. */
function LayoutIcon({ kind }: { kind: TodoLayout }) {
  const p = {
    list: 'M3 4h10M3 8h10M3 12h10',
    columns: 'M2 4h5M2 8h5M2 12h5M9 4h5M9 8h5M9 12h5',
    cards: 'M2.5 2.5h5v6h-5zM2.5 11h5v2.5h-5zM9.5 2.5h4v3h-4zM9.5 8h4v5.5h-4z',
    detail: 'M2 4h4M2 8h4M2 12h4M8.5 2.5h5.5v11H8.5z',
    lanes: 'M2 4h4M2 8h4M2 12h4M8.5 2.5h5.5v4.5H8.5zM8.5 9.5h5.5v4H8.5z',
  }[kind]
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={p} />
    </svg>
  )
}

/**
 * List and detail: the picked to-do in full beside the list — every line of
 * its details, its group's items to tick, and Edit for the form.
 */
function TodoDetail({ todo, byId, today, onSnooze }: { todo: Todo; byId: Map<string, Tag>; today: ReturnType<typeof todayParts>; onSnooze: () => void }) {
  const t = useT()
  const setDone = useTodoStore((s) => s.setDone)
  const edit = useTodoStore((s) => s.edit)
  const chips = todo.tagIds.map((id) => byId.get(id)).filter((x): x is Tag => Boolean(x) && !isList(x!))
  const days = todo.due ? daysUntil(todo.due, today) : null
  const progress = groupProgress(todo)
  const grouped = Boolean(todo.items?.length)
  const title = todo.title || t('c.untitled')
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={false}
          aria-label={t('todo.mark_done', { title: todo.title })}
          onClick={() => void setDone(todo.id, true)}
          className="-m-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Tick on={false} />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="break-words text-lg font-semibold leading-snug text-slate-100">
            {todo.pinnedAt && <PinMark />}
            {title}
          </h2>
          {todo.due && (
            <p className={`text-sm font-medium tabular-nums ${days! < 0 ? 'text-rose-300' : days! <= 1 ? 'text-orange-300' : 'text-slate-400'}`}>
              {dueLabel(todo.due, today)}
            </p>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <TagChip key={c.id} name={c.name} colour={c.colour} pattern={c.pattern} />
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={btnGhost} onClick={onSnooze} aria-label={t('todo.snooze_label', { title })}>
            {t('todo.snooze')}
          </button>
          <button type="button" className={btnGhost} onClick={() => edit(todo.id)} aria-label={t('todo.edit_label', { title })}>
            {t('todo.edit')}
          </button>
        </div>
      </div>
      {todo.details && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{todo.details}</p>}
      {grouped && progress && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <p className="mb-1 px-2 text-xs font-medium tabular-nums text-slate-500">{t('todo.group_count', { done: progress.done, count: progress.count })}</p>
          <GroupItems todo={todo} />
        </div>
      )}
      {!todo.details && !grouped && <p className="mt-4 text-sm text-slate-500">{t('todo.detail_empty')}</p>}
    </div>
  )
}

/** The pin before a pinned to-do's name. */
function PinMark() {
  const t = useT()
  return (
    <span className="mr-1.5 inline-block align-[-2px] text-orange-400" title={t('todo.pinned')}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 3h6l-1 6 3 3H7l3-3-1-6ZM12 12v9" />
      </svg>
      <span className="sr-only">{t('todo.pinned')}</span>
    </span>
  )
}

function TodoRow({
  todo,
  byId,
  today,
  look = 'card',
  lifted = false,
  current = false,
  brief = false,
  onOpen,
  onTouchStart,
  onGripDown,
  extra,
}: {
  todo: Todo
  byId: Map<string, Tag>
  today: ReturnType<typeof todayParts>
  /** A bordered card (the phone, Cards, Two lanes' right side) or a list row. */
  look?: Look
  lifted?: boolean
  /** List and detail: this is the one shown in full. */
  current?: boolean
  /** List and detail: a group's items stay in the pane, its count in the row. */
  brief?: boolean
  /** In place of opening the form (List and detail picks it; a double click still edits). */
  onOpen?: () => void
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
  const progress = groupProgress(todo)
  // A group's items have tick boxes of their own, and a button cannot hold
  // them: the card is drawn by the box around both, the items under the button.
  const grouped = Boolean(todo.items?.length) && !brief
  const [folded, setFolded] = useFolded(todo.id)
  const edge = lifted ? 'border-orange-400 shadow-2xl' : 'border-slate-800'
  const row = look === 'row'
  const countText = brief && progress && progress.count > 0 && (
    <span className="text-xs font-medium tabular-nums text-slate-500">{t('todo.group_count', { done: progress.done, count: progress.count })}</span>
  )
  // Kept to one line (James, 2026-11-18: "do best to keep things on one
  // line … the due date could be a clock emoji and X day(s)"): ⏰ and the
  // days, the tags as their dots (TagDot opens out to the name on hover, and
  // says it on a long press), all on the name's line. The full deadline is
  // what a screen reader hears.
  const dueText = todo.due && !done && (
    <span
      title={dueLabel(todo.due, today)}
      className={`whitespace-nowrap text-xs font-medium tabular-nums ${days! < 0 ? 'text-rose-300' : days! <= 1 ? 'text-orange-300' : 'text-slate-400'}`}
    >
      <span aria-hidden>⏰ {dueShort(todo.due, today)}</span>
      <span className="sr-only">{dueLabel(todo.due, today)}</span>
    </span>
  )
  // 💤 and the day it wakes, while it is asleep.
  const sleepText = isSnoozed(todo, today) && (
    <span className="whitespace-nowrap text-xs font-medium tabular-nums text-sky-300">
      <span aria-hidden>💤 {shortDate(todo.snoozedUntil!, today)}</span>
      <span className="sr-only">{t('todo.snoozed_until', { date: shortDate(todo.snoozedUntil!, today) })}</span>
    </span>
  )
  const dots = chips.length > 0 && (
    <span className="flex flex-wrap items-center justify-end">
      {chips.map((t) => (
        <TagDot key={t.id} name={t.name} colour={t.colour} pattern={t.pattern} />
      ))}
    </span>
  )
  const name = (
    <span className={`min-w-0 flex-1 break-words font-semibold text-slate-100 ${done ? 'line-through decoration-slate-500' : ''}`}>
      {todo.pinnedAt && !done && <PinMark />}
      {todo.title || t('c.untitled')}
    </span>
  )
  // A group's fold sits at the end of its name's line, as a button of its own
  // beside the card's (a button cannot hold one); the name's button leaves it
  // the room.
  const foldRoom = grouped ? (onGripDown ? 'pr-[6.5rem]' : 'pr-[4.5rem]') : onGripDown ? 'pr-9' : row ? 'pr-2' : 'pr-3.5'

  return (
    // The tick box is a SIBLING of the card button, never inside it — a button
    // in a button is invalid HTML (see ContactRow).
    // A card opens the to-do: the suite's Orbit corner on the website
    // (BRANDING.md → Boxes, A), on the button, or on the box round a group's
    // button and its items. List rows stay plain.
    <div
      className={`relative ${row ? (lifted ? 'rounded-lg bg-slate-900 shadow-2xl ring-1 ring-orange-400' : '') : `h-full ${grouped ? `${orbitRow} flex flex-col border bg-slate-900 p-0 ${edge}` : ''}`}`}
      onTouchStart={onTouchStart}
    >
      <button
        type="button"
        onClick={() => (onOpen ? onOpen() : edit(todo.id))}
        onDoubleClick={onOpen ? () => edit(todo.id) : undefined}
        aria-current={current || undefined}
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
        className={
          row
            ? `flex w-full flex-col gap-0.5 rounded-lg py-2 pl-11 ${foldRoom} text-left transition-colors hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                current ? 'bg-slate-800' : ''
              } ${done ? 'opacity-60' : ''}`
            : `flex w-full flex-col gap-0.5 ${grouped ? 'rounded-xl' : orbitRow} py-2.5 pl-12 ${foldRoom} text-left transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                done ? 'opacity-60' : ''
              } ${grouped ? (folded ? '' : 'rounded-b-none') : `h-full border bg-slate-900 hover:border-slate-700 ${edge}`}`
        }
      >
        {/* The name, and on its right the deadline and the tags' dots; the
            details' first line under it. */}
        <span className={`flex items-center gap-2.5 ${row ? '' : 'min-h-[24px]'}`}>
          {name}
          {(sleepText || dueText || dots || countText) && (
            <span className="flex shrink-0 items-center justify-end gap-x-2">
              {countText}
              {sleepText}
              {dueText}
              {dots}
            </span>
          )}
        </span>
        {todo.details && <span className="line-clamp-1 break-words text-sm text-slate-400">{todo.details}</span>}
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? t('todo.mark_undone', { title: todo.title }) : t('todo.mark_done', { title: todo.title })}
        onClick={() => void setDone(todo.id, !done)}
        className={`absolute left-1.5 ${row ? 'top-0' : 'top-0.5'} flex h-10 w-10 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
      >
        <Tick on={done} />
      </button>
      {grouped && progress && (
        // The group's count is also its fold (James, 2026-11-11: "when there's
        // a grouped todo make it collapsible"), on the name's line since
        // 2026-11-18 ("the groups could just have the chevron on title line").
        // Remembered on this device.
        <button
          type="button"
          aria-expanded={!folded}
          aria-label={t(folded ? 'todo.group_show' : 'todo.group_hide', { title: todo.title || t('c.untitled') })}
          onClick={() => setFolded(todo.id, !folded)}
          className={`absolute ${row ? 'top-0' : 'top-0.5'} ${onGripDown ? 'right-9' : 'right-1.5'} flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-medium tabular-nums text-slate-500 hover:bg-slate-800 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${done ? 'opacity-60' : ''}`}
        >
          {progress.done}/{progress.count}
          <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 shrink-0 transition-transform ${folded ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
      )}
      {grouped && !folded && <GroupItems todo={todo} indent={row} />}
      {/* The website's drag handle (mouse); a touch screen holds the row instead. */}
      {onGripDown && !done && (
        <span
          aria-hidden
          onPointerDown={onGripDown}
          className={`bb-grip absolute right-1 hidden w-7 cursor-grab items-center justify-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-200 sm:flex ${
            row ? 'top-0 h-10' : 'top-1/2 h-10 -translate-y-1/2'
          }`}
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
 * Which groups are folded shut, on this device only: how the list looks here,
 * not something worth syncing. A Set in localStorage, shared by every row.
 */
const FOLD_KEY = 'bb.todo.folded'
function readFolded(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(FOLD_KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}
function useFolded(id: string): [boolean, (id: string, on: boolean) => void] {
  const [on, setOn] = useState(() => readFolded().has(id))
  const set = useCallback((which: string, value: boolean) => {
    const all = readFolded()
    if (value) all.add(which)
    else all.delete(which)
    try {
      localStorage.setItem(FOLD_KEY, JSON.stringify([...all]))
    } catch {
      /* private mode: folds for this visit only */
    }
    if (which === id) setOn(value)
  }, [id])
  return [on, set]
}

/**
 * A group's items, each with its own tick box, under the group's card
 * (2026-10-30). Ticking the last one ticks the group off.
 */
function GroupItems({ todo, indent = false }: { todo: Todo; indent?: boolean }) {
  const t = useT()
  const setItemDone = useTodoStore((s) => s.setItemDone)
  return (
    // A list row's items sit under its name, not under its tick box.
    <ul className={`space-y-0.5 pb-2 ${indent ? 'pl-9 pr-1.5' : 'px-1.5'} ${todo.doneAt ? 'opacity-60' : ''}`}>
      {todo.items!.map((item) => {
        const on = item.doneAt !== undefined
        return (
          <li key={item.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={on ? t('todo.mark_undone', { title: item.title }) : t('todo.mark_done', { title: item.title })}
              onClick={() => void setItemDone(todo.id, item.id, !on)}
              className={`flex ${indent ? 'min-h-[32px]' : 'min-h-[40px]'} w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
            >
              <Tick on={on} />
              <span className={`min-w-0 break-words ${on ? 'text-slate-500 line-through decoration-slate-500' : 'text-slate-200'}`}>{item.title}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** The tick box's square, for a to-do and for an item of a group. */
function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        on ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-500 bg-slate-950 hover:border-orange-400'
      }`}
    >
      {on && (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

/**
 * A group's items in the form (2026-10-30). No "Make it a group" button any
 * more (James, 2026-11-19: "show the first nested tick box and if they type it
 * in then it's a group and it shows the next tick box ready"): there is always
 * one empty tick box at the foot, and typing in it makes it an item with a
 * fresh empty box under it. No items, an ordinary to-do. Return goes to the
 * next box; Backspace in an emptied one takes it out.
 */
function GroupEditor({ items, onChange }: { items: TodoItem[]; onChange: (items: TodoItem[]) => void }) {
  const t = useT()
  // The empty box's id. Typing turns it into the item with this id, so React
  // keeps the same input — and the caret in it — and draws a new empty one.
  const [nextId, setNextId] = useState(newId)
  const listRef = useRef<HTMLUListElement>(null)
  const inputAt = (i: number) => listRef.current?.querySelectorAll('input')[i]
  // After a row is taken out, the next frame's list.
  const focusAt = (i: number) => requestAnimationFrame(() => inputAt(i)?.focus())
  const drop = (id: string) => onChange(items.filter((x) => x.id !== id))
  const rows: TodoItem[] = [...items, { id: nextId, title: '' }]
  return (
    <div>
      {items.length > 0 && <span className={label}>{t('todo.group_items')}</span>}
      <ul ref={listRef} className="space-y-1">
        {rows.map((item, i) => {
          const blank = item.id === nextId
          return (
            <li key={item.id} className="flex items-center gap-2.5 pl-1">
              <Tick on={item.doneAt !== undefined} />
              <input
                className={inputCls}
                value={item.title}
                placeholder={blank ? t('todo.group_add') : undefined}
                aria-label={blank ? t('todo.group_add') : t('todo.group_item_name')}
                enterKeyHint="next"
                onChange={(e) => {
                  const title = e.target.value
                  if (!blank) return onChange(items.map((x) => (x.id === item.id ? { ...x, title } : x)))
                  if (!title.trim()) return
                  onChange([...items, { id: nextId, title }])
                  setNextId(newId())
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter') {
                    // The next box, never the form's Save. It is already
                    // there, so at once: what is typed next goes in it.
                    e.preventDefault()
                    inputAt(i + 1)?.focus()
                  } else if (e.key === 'Backspace' && !blank && item.title === '') {
                    e.preventDefault()
                    drop(item.id)
                    focusAt(Math.max(0, i - 1))
                  }
                }}
                onBlur={() => {
                  if (!blank && !item.title.trim()) drop(item.id)
                }}
              />
              {blank ? (
                <span className="h-10 w-10 shrink-0" aria-hidden />
              ) : (
                <button
                  type="button"
                  className="h-10 w-10 shrink-0 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label={t('todo.group_remove', { title: item.title })}
                  onClick={() => drop(item.id)}
                >
                  <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The quick snoozes as buttons, each with the day it lands on. */
function SnoozeButtons({ today, value, onPick }: { today: ReturnType<typeof todayParts>; value?: string; onPick: (until: string) => void }) {
  const t = useT()
  return (
    <div className="flex flex-wrap gap-2">
      {snoozeChoices(today).map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={value === c.until}
          className={`${btnGhost} ${value === c.until ? '!border-orange-400 !text-orange-300' : ''}`}
          onClick={() => onPick(c.until)}
        >
          {t(`todo.snooze_${c.key}` as const)}
          <span className="text-slate-500">{shortDate(c.until, today)}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Snooze one or several to-dos (James, 2026-11-19): tomorrow, next week, next
 * month, or a day of your own. Gone from the list until that day.
 */
function SnoozeSheet({
  count,
  today,
  current,
  onPick,
  onClose,
}: {
  count: number
  today: ReturnType<typeof todayParts>
  current?: string
  onPick: (until: string | undefined) => void
  onClose: () => void
}) {
  const t = useT()
  // The date picker's day waits for Snooze: the phone's wheel changes it as it spins.
  const [day, setDay] = useState(current ?? '')
  const min = addDays(today, 1)
  const dayId = useId()
  return (
    <Modal title={count === 1 ? t('todo.snooze_until') : t.plural('todo.snooze_many', count)} onClose={onClose} phone="sheet">
      <div className="space-y-4">
        <SnoozeButtons today={today} value={current} onPick={onPick} />
        <div>
          <label htmlFor={dayId} className={label}>
            {t('todo.snooze_pick')}
          </label>
          <div className="flex items-center gap-2">
            <input id={dayId} type="date" min={min} className={`${inputCls} [color-scheme:dark]`} value={day} onChange={(e) => setDay(e.target.value)} />
            <button type="button" className={btnPrimary} disabled={!day || day < min} onClick={() => onPick(day)}>
              {t('todo.snooze')}
            </button>
          </div>
        </div>
        {current && current >= min && (
          <button type="button" className={btnSubtle} onClick={() => onPick(undefined)}>
            {t('todo.wake')}
          </button>
        )}
      </div>
    </Modal>
  )
}

/**
 * Add or edit one to-do. A new one asks for its name, its text and whether it
 * is a group; Fine-tune adds the deadline and the tags (James, 2026-10-30).
 * Delete lives here for an existing one.
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
    ...(existing?.items?.length ? { items: existing.items } : {}),
    ...(existing?.snoozedUntil ? { snoozedUntil: existing.snoozedUntil } : {}),
  }))
  // Once per open form, like the tab's own.
  const today = useMemo(() => todayParts(), [])
  const snoozeId = useId()
  const [confirming, setConfirming] = useState(false)
  // A new one opens on its name, details and tick boxes; More shows the
  // deadline, the snooze and the tags (James, 2026-11-19: "I want to add a
  // snooze until date during creation … it would be under more"). Fine-tune
  // shows them from the start.
  const [more, setMore] = useState(Boolean(existing))
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
          <GrowingTextarea
            id={detailsId}
            className={textareaCls}
            rows={3}
            value={draft.details}
            onChange={(e) => patch({ details: e.target.value })}
          />
        </div>
        <GroupEditor items={draft.items ?? []} onChange={(items) => patch({ items: items.length ? items : undefined })} />
        {/* A new one is its name, its text and maybe a group (James,
            2026-10-30); the deadline, snooze and tags wait under More. */}
        {!more ? (
          <button type="button" className={btnGhost} aria-expanded={false} onClick={() => setMore(true)}>
            {t('form.more')}
          </button>
        ) : (
        <>
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
          <label htmlFor={snoozeId} className={label}>
            {t('todo.snooze_until')}
          </label>
          <div className="space-y-2">
            <SnoozeButtons today={today} value={draft.snoozedUntil} onPick={(snoozedUntil) => patch({ snoozedUntil })} />
            <div className="flex items-center gap-2">
              <input
                id={snoozeId}
                type="date"
                min={addDays(today, 1)}
                className={`${inputCls} [color-scheme:dark]`}
                value={draft.snoozedUntil ?? ''}
                onChange={(e) => patch({ snoozedUntil: e.target.value || undefined })}
              />
              {draft.snoozedUntil && (
                <button type="button" className={btnSubtle} onClick={() => patch({ snoozedUntil: undefined })}>
                  {t('c.clear')}
                </button>
              )}
            </div>
          </div>
        </div>
        <div>
          <span className={label}>{t('field.tags')}</span>
          <TagPicker forTodos value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
        </div>
        </>
        )}

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
            <button type="submit" className={btnPrimary} disabled={!valid} title={saveKeyLabel()}>
              {existing ? t('c.save') : t('todo.add')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
