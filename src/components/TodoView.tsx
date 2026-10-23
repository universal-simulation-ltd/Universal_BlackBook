import { useId, useMemo, useState, type FormEvent } from 'react'
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
import { useT } from '../i18n'
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
                colour={t.colour}
                selected={activeFilter.includes(t.id)}
                onClick={() =>
                  setTagFilter(
                    activeFilter.includes(t.id) ? activeFilter.filter((x) => x !== t.id) : [...activeFilter, t.id],
                  )
                }
              />
            )}
            suggestion={(t) => <TagChip name={t.name} colour={t.colour} />}
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
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {open.map((t) => (
            <li key={t.id}>
              <TodoRow todo={t} byId={byId} today={today} />
            </li>
          ))}
        </ul>
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
          {showDone && (
            <ul id={doneId} className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

function TodoRow({ todo, byId, today }: { todo: Todo; byId: Map<string, Tag>; today: ReturnType<typeof todayParts> }) {
  const t = useT()
  const setDone = useTodoStore((s) => s.setDone)
  const edit = useTodoStore((s) => s.edit)
  const done = todo.doneAt !== undefined
  const chips = todo.tagIds.map((id) => byId.get(id)).filter((t): t is Tag => Boolean(t) && !isList(t!))
  const days = todo.due ? daysUntil(todo.due, today) : null

  return (
    // The tick box is a SIBLING of the card button, never inside it — a button
    // in a button is invalid HTML (see ContactRow).
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => edit(todo.id)}
        className={`flex h-full w-full flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900 py-3 pl-12 pr-3.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
          done ? 'opacity-60' : ''
        }`}
      >
        <p className={`font-semibold text-slate-100 ${done ? 'line-through decoration-slate-500' : ''}`}>
          {todo.title || t('c.untitled')}
        </p>
        {todo.details && <p className="line-clamp-2 whitespace-pre-wrap text-sm text-slate-400">{todo.details}</p>}
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
              <TagChip key={t.id} name={t.name} colour={t.colour} />
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
