import { describe, expect, it } from 'vitest'
import { isDue, isValidAt, lastOccurrence, nextOccurrence, notificationId, occurrence, toReminders, upcoming, type Reminder } from './reminders'

const at = (s: string) => new Date(s).getTime()
const r = (p: Partial<Reminder>): Reminder => ({ id: 'r1', label: '', at: '2026-01-31T09:00', repeat: 'once', createdAt: 0, ...p })

describe('reminders', () => {
  it('checks the stored time strictly', () => {
    expect(isValidAt('2026-02-28T23:59')).toBe(true)
    expect(isValidAt('2026-02-29T09:00')).toBe(false)
    expect(isValidAt('2028-02-29T09:00')).toBe(true)
    expect(isValidAt('2026-02-28 09:00')).toBe(false)
    expect(isValidAt(42)).toBe(false)
  })

  it('a monthly reminder on the 31st falls on the last day of a short month', () => {
    const m = r({ repeat: 'monthly' })
    expect(new Date(occurrence(m, 1)).getDate()).toBe(28) // Feb 2026
    expect(new Date(occurrence(m, 2)).getDate()).toBe(31) // Mar 2026
    expect(new Date(occurrence(m, 3)).getDate()).toBe(30) // Apr 2026
  })

  it('a yearly one on 29 February falls on the 28th in other years', () => {
    const y = r({ at: '2028-02-29T08:30', repeat: 'yearly' })
    const d = new Date(occurrence(y, 1))
    expect([d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([1, 28, 8, 30])
    expect(new Date(occurrence(y, 4)).getDate()).toBe(29)
  })

  it('finds the next and the last occurrence', () => {
    const y = r({ at: '2015-06-03T09:00', repeat: 'yearly' })
    expect(nextOccurrence(y, at('2026-07-01T00:00'))).toBe(at('2027-06-03T09:00'))
    expect(lastOccurrence(y, at('2026-07-01T00:00'))).toBe(at('2026-06-03T09:00'))
    const once = r({ at: '2026-05-01T10:00' })
    expect(nextOccurrence(once, at('2026-05-02T00:00'))).toBeNull()
    expect(upcoming(r({ at: '2026-01-31T09:00', repeat: 'monthly' }), at('2026-01-01T00:00'), 3)).toEqual([
      at('2026-01-31T09:00'),
      at('2026-02-28T09:00'),
      at('2026-03-31T09:00'),
    ])
  })

  it('is due once it has gone off after it was made, until marked done', () => {
    const y = r({ at: '2015-06-03T09:00', repeat: 'yearly', createdAt: at('2026-07-01T00:00') })
    // Made in July: June has passed, so not due until next June.
    expect(isDue(y, at('2026-07-02T00:00'))).toBe(false)
    expect(isDue(y, at('2027-06-03T09:01'))).toBe(true)
    expect(isDue({ ...y, ackAt: at('2027-06-03T10:00') }, at('2027-06-04T00:00'))).toBe(false)
    expect(isDue({ ...y, ackAt: at('2027-06-03T10:00') }, at('2028-06-03T09:01'))).toBe(true)
  })

  it('reads stored data tolerantly', () => {
    expect(toReminders(undefined)).toBeUndefined()
    expect(toReminders([])).toBeUndefined()
    expect(toReminders([{ id: 'a', at: '2026-01-01T00:00' }, { id: 'a', at: '2026-01-01T00:00' }, null])).toEqual([
      { id: 'a', label: '', at: '2026-01-01T00:00', repeat: 'once', createdAt: 0 },
    ])
  })

  it('gives each occurrence its own positive 31-bit notification id', () => {
    const a = notificationId('r1', 1)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(2 ** 31)
    expect(notificationId('r1', 2)).not.toBe(a)
  })
})
