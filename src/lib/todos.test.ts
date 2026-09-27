import { describe, expect, it } from 'vitest'
import { compareOpen, daysUntil, dueLabel, mergeTodos, toTodo, toTodos, type Todo } from './todos'

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
