import { describe, expect, it } from 'vitest'
import { compareOpen, daysUntil, dueLabel, groupProgress, mergeTodos, moveTodo, toTodo, toTodos, withItemDone, type Todo } from './todos'
import { parseBackup } from './backup'

const today = { year: 2026, month: 9, day: 27 }
const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 't1',
  title: 'Book the MOT',
  details: '',
  tagIds: [],
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

describe('reading a to-do back', () => {
  it('drops junk rows and bad dates rather than throwing', () => {
    expect(toTodos([null, { id: '' }, { id: 'a', title: 'x', due: '2026-02-30' }, 'nope'])).toEqual([
      expect.objectContaining({ id: 'a', due: undefined }),
    ])
    expect(toTodos(undefined)).toEqual([])
  })

  it('keeps a real deadline, tags and done', () => {
    expect(toTodo({ id: 'a', title: 'x', due: '2028-02-29', tagIds: ['g', 3], doneAt: 5 })).toMatchObject({
      due: '2028-02-29',
      tagIds: ['g'],
      doneAt: 5,
    })
  })
})

describe('deadlines', () => {
  it('counts days across a month end', () => {
    expect(daysUntil('2026-10-02', today)).toBe(5)
    expect(daysUntil('2026-09-25', today)).toBe(-2)
  })

  it('says it in words', () => {
    expect(dueLabel('2026-09-26', today)).toBe('Overdue by 1 day')
    expect(dueLabel('2026-09-27', today)).toBe('Due today')
    expect(dueLabel('2026-09-28', today)).toBe('Due tomorrow')
    expect(dueLabel('2026-10-04', today)).toBe('Due in 7 days')
    expect(dueLabel('2026-11-04', today)).toBe('Due 4 Nov')
    expect(dueLabel('2027-01-04', today)).toBe('Due 4 Jan 2027')
  })

  it('sorts soonest first, with no deadline last and newest first', () => {
    const list = [
      todo({ id: 'none-old', createdAt: 1 }),
      todo({ id: 'later', due: '2026-12-01' }),
      todo({ id: 'none-new', createdAt: 9 }),
      todo({ id: 'overdue', due: '2026-09-01' }),
    ].sort(compareOpen)
    expect(list.map((t) => t.id)).toEqual(['overdue', 'later', 'none-new', 'none-old'])
  })
})

describe('merging two devices', () => {
  it('keeps both sides, the newer edit winning, and follows a tag remap', () => {
    const online = [todo({ id: 'a', title: 'old', updatedAt: 1 }), todo({ id: 'b' })]
    const local = [todo({ id: 'a', title: 'new', updatedAt: 2 }), todo({ id: 'c', tagIds: ['local-fam'] })]
    const merged = mergeTodos(online, local, new Map([['local-fam', 'online-fam']]))
    expect(merged.map((t) => [t.id, t.title])).toEqual([
      ['a', 'new'],
      ['b', 'Book the MOT'],
      ['c', 'Book the MOT'],
    ])
    expect(merged[2].tagIds).toEqual(['online-fam'])
  })
})

const td = (id: string, p: Partial<Todo> = {}): Todo => ({ id, title: id, details: '', tagIds: [], createdAt: 1, updatedAt: 1, ...p })
const order = (list: Todo[]) => [...list].sort(compareOpen).map((t) => t.id)

describe('to-do order and pins (2026-10-25)', () => {
  it('pinned first, then never-dragged ones by deadline, then the hand-made order', () => {
    const list = [
      td('a', { rank: 1 }),
      td('b', { rank: 0 }),
      td('c', { due: '2026-11-01' }),
      td('d', { pinnedAt: 5 }),
      td('e', { pinnedAt: 9 }),
    ]
    expect(order(list)).toEqual(['e', 'd', 'c', 'b', 'a'])
  })

  it('moving one numbers its group afresh and leaves the other group alone', () => {
    const list = [td('a'), td('b', { createdAt: 2 }), td('c', { createdAt: 3 }), td('p', { pinnedAt: 4 })]
    // Shown: p | c b a (newest first). Drag a above c.
    const changed = moveTodo(list, 'a', 'c', false, 50)
    const next = list.map((t) => changed.find((x) => x.id === t.id) ?? t)
    expect(order(next)).toEqual(['p', 'a', 'c', 'b'])
    expect(changed.every((t) => t.updatedAt === 50)).toBe(true)
    expect(changed.some((t) => t.id === 'p')).toBe(false)
    // Into the pinned group it cannot go: it lands at the top of its own.
    const again = moveTodo(next, 'b', 'p', false, 60)
    const after = next.map((t) => again.find((x) => x.id === t.id) ?? t)
    expect(order(after)).toEqual(['p', 'b', 'a', 'c'])
    expect(moveTodo(next, 'a', 'a', true)).toEqual([])
  })

  it('pin and order survive storage and a backup file', () => {
    expect(toTodo({ id: 'x', title: 'X', pinnedAt: 7, rank: 2 })).toMatchObject({ pinnedAt: 7, rank: 2 })
    expect(toTodo({ id: 'x', title: 'X', pinnedAt: 'no', rank: NaN })).not.toHaveProperty('rank')
    const data = parseBackup({ contacts: [], todos: [{ id: 't1', title: 'T', pinnedAt: Date.UTC(2026, 0, 1), rank: 3 }] })!
    expect(data.todos[0]).toMatchObject({ pinnedAt: Date.UTC(2026, 0, 1), rank: 3 })
  })
})

describe('groups (2026-10-30)', () => {
  const group = todo({ items: [{ id: 'a', title: 'Bread' }, { id: 'b', title: 'Milk' }] })

  it('reads its items, and an ordinary to-do stays one', () => {
    const read = toTodo({ ...group, items: [...group.items!, { id: '', title: 'x' }, 'junk'] })!
    expect(read.items).toEqual(group.items)
    expect(toTodo(todo())).not.toHaveProperty('items')
    expect(toTodo({ ...todo(), items: [] })!.items).toEqual([])
  })

  it('the last item ticked ticks the group; unticking one opens it again', () => {
    const one = withItemDone(group, 'a', true, 10)
    expect(one.doneAt).toBeUndefined()
    expect(groupProgress(one)).toEqual({ done: 1, count: 2 })
    const both = withItemDone(one, 'b', true, 20)
    expect(both.doneAt).toBe(20)
    const reopened = withItemDone(both, 'a', false, 30)
    expect(reopened.doneAt).toBeUndefined()
    expect(reopened.items![0]).not.toHaveProperty('doneAt')
  })

  it('travels in a backup file', () => {
    const data = parseBackup({ contacts: [], todos: [group] })!
    expect(data.todos[0].items).toEqual(group.items)
  })
})
