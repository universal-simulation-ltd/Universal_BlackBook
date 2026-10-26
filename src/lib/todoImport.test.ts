import { describe, expect, it } from 'vitest'
import { importTodoFiles, readTodos, toDue } from './todoImport'

const file = (name: string, text: string) => {
  const bytes = new TextEncoder().encode(text)
  return { name, size: bytes.length, arrayBuffer: async () => bytes.buffer as ArrayBuffer }
}

describe('importing to-dos', () => {
  it('reads a Markdown list: one a line, ticked boxes done, indented lines as details, headings left out', () => {
    const todos = readTodos('md', '# Shopping\n- [ ] Milk\n- [x] Bread\n  - wholemeal\n  ask at the counter\n1. Call Sam\n\n* Book MOT', 'list.md')
    expect(todos.map((t) => [t.title, t.done])).toEqual([
      ['Milk', false],
      ['Bread', true],
      ['Call Sam', false],
      ['Book MOT', false],
    ])
    expect(todos[1].details).toBe('• wholemeal\nask at the counter')
  })

  it('reads a CSV by its headers — Todoist’s, with its sections left out', () => {
    const todos = readTodos(
      'csv',
      'TYPE,CONTENT,DESCRIPTION,PRIORITY,DATE\nsection,Home,,,\ntask,Fix the gate,Hinge is loose,1,2026-11-02\ntask,Pay council tax,,4,',
      'todoist.csv',
    )
    expect(todos).toEqual([
      { title: 'Fix the gate', details: 'Hinge is loose', due: '2026-11-02', done: false, file: 'todoist.csv' },
      { title: 'Pay council tax', details: '', due: undefined, done: false, file: 'todoist.csv' },
    ])
  })

  it('a CSV with no headers it knows is title, then details', () => {
    expect(readTodos('csv', 'Water plants,the ferns\nRenew passport', 'x.csv').map((t) => [t.title, t.details])).toEqual([
      ['Water plants', 'the ferns'],
      ['Renew passport', ''],
    ])
  })

  it('reads a calendar file’s VTODOs', () => {
    const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VTODO\r\nSUMMARY:Send the\r\n  invoice\r\nDESCRIPTION:Line one\\nLine two\r\nDUE;VALUE=DATE:20261105\r\nEND:VTODO\r\nBEGIN:VTODO\r\nSUMMARY:Done one\r\nSTATUS:COMPLETED\r\nEND:VTODO\r\nEND:VCALENDAR'
    expect(readTodos('ics', ics, 'tasks.ics')).toEqual([
      { title: 'Send the invoice', details: 'Line one\nLine two', due: '2026-11-05', done: false, file: 'tasks.ics' },
      { title: 'Done one', details: '', done: true, file: 'tasks.ics' },
    ])
  })

  it('understands the usual ways of writing a due date', () => {
    expect(toDue('2026-10-25T09:00:00Z')).toBe('2026-10-25')
    expect(toDue('25 October 2026')).toBe('2026-10-25')
    // Day or month first? Not guessed (lib/csv.ts does the same for birthdays).
    expect(toDue('04/06/2026')).toBeUndefined()
    expect(toDue('2026-02-31')).toBeUndefined()
    expect(toDue('soon')).toBeUndefined()
  })

  it('says which files it could not use', async () => {
    const result = await importTodoFiles([file('a.txt', 'One\nTwo'), file('b.pdf', 'x'), file('c.txt', '   \n')])
    expect(result.todos.map((t) => t.title)).toEqual(['One', 'Two'])
    expect(result.skipped).toEqual([
      { file: 'b.pdf', reason: 'type' },
      { file: 'c.txt', reason: 'empty' },
    ])
  })
})
