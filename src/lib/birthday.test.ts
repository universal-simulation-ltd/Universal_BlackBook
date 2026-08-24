import { describe, expect, it } from 'vitest'
import {
  buildBirthday,
  daysInMonth,
  formatBirthday,
  isValidBirthday,
  parseBirthday,
  parseBirthdayInput,
} from './birthday'

describe('daysInMonth', () => {
  it('knows the ordinary months', () => {
    expect(daysInMonth(1, 1990)).toBe(31)
    expect(daysInMonth(4, 1990)).toBe(30)
  })

  it('handles leap years, including the century rules', () => {
    expect(daysInMonth(2, 1990)).toBe(28)
    expect(daysInMonth(2, 1992)).toBe(29)
    expect(daysInMonth(2, 1900)).toBe(28) // divisible by 100, not by 400
    expect(daysInMonth(2, 2000)).toBe(29) // divisible by 400
  })

  it('allows 29 February when the year is unknown', () => {
    // A leap-day birthday belongs to a real person; refusing it because we
    // don't know their birth year would be the app arguing with a certificate.
    expect(daysInMonth(2, null)).toBe(29)
  })
})

describe('buildBirthday', () => {
  it('builds a full date', () => {
    expect(buildBirthday({ year: 1990, month: 6, day: 4 })).toBe('1990-06-04')
  })

  it('builds a year-less date in the vCard shape', () => {
    expect(buildBirthday({ year: null, month: 6, day: 4 })).toBe('--06-04')
    expect(buildBirthday({ month: 6, day: 4 })).toBe('--06-04')
  })

  it('pads single digits', () => {
    expect(buildBirthday({ year: 2001, month: 1, day: 2 })).toBe('2001-01-02')
  })

  it('refuses a half-filled date', () => {
    expect(buildBirthday({ month: 6 })).toBeUndefined()
    expect(buildBirthday({ day: 4 })).toBeUndefined()
    expect(buildBirthday({ year: 1990 })).toBeUndefined()
    expect(buildBirthday({})).toBeUndefined()
  })

  it('refuses a day the month does not have', () => {
    expect(buildBirthday({ month: 2, day: 30, year: null })).toBeUndefined()
    expect(buildBirthday({ month: 2, day: 29, year: 1990 })).toBeUndefined()
    expect(buildBirthday({ month: 9, day: 31, year: 1990 })).toBeUndefined()
  })

  it('accepts 29 February with no year, and in a leap year', () => {
    expect(buildBirthday({ month: 2, day: 29, year: null })).toBe('--02-29')
    expect(buildBirthday({ month: 2, day: 29, year: 1992 })).toBe('1992-02-29')
  })

  it('refuses a nonsense month or a non-four-digit year', () => {
    expect(buildBirthday({ month: 13, day: 1, year: 1990 })).toBeUndefined()
    expect(buildBirthday({ month: 0, day: 1, year: 1990 })).toBeUndefined()
    expect(buildBirthday({ month: 1, day: 1, year: 19 })).toBeUndefined()
  })

  it('does not police whether a birth date is plausible', () => {
    // Not our business. A date for a baby due next week is the user's call.
    expect(buildBirthday({ year: 2099, month: 1, day: 1 })).toBe('2099-01-01')
  })
})

describe('parseBirthday', () => {
  it('round-trips both shapes', () => {
    expect(parseBirthday('1990-06-04')).toEqual({ year: 1990, month: 6, day: 4 })
    expect(parseBirthday('--06-04')).toEqual({ year: null, month: 6, day: 4 })
  })

  it('rejects anything that is not one of our two shapes', () => {
    for (const bad of ['', '1990-6-4', '04/06/1990', '1990-13-01', '1990-02-30', '--13-01', 'June', 'x']) {
      expect(parseBirthday(bad)).toBeNull()
    }
  })

  it('treats null and undefined as not recorded', () => {
    expect(parseBirthday(null)).toBeNull()
    expect(parseBirthday(undefined)).toBeNull()
    expect(isValidBirthday(undefined)).toBe(false)
  })
})

describe('formatBirthday', () => {
  it('reads as a person would say it', () => {
    expect(formatBirthday('1990-06-04')).toBe('4 June 1990')
    expect(formatBirthday('--06-04')).toBe('4 June')
    expect(formatBirthday('2000-12-25')).toBe('25 December 2000')
  })

  it('returns an empty string rather than throwing on junk', () => {
    expect(formatBirthday('nonsense')).toBe('')
    expect(formatBirthday(undefined)).toBe('')
  })

  it('does not shift the day near a timezone boundary', () => {
    // The regression this guards: routing through `new Date('1990-06-04')` and
    // a locale formatter prints 3 June anywhere west of UTC. There is no Date
    // in birthday.ts, and this asserts it stays that way.
    expect(formatBirthday('1990-01-01')).toBe('1 January 1990')
    expect(formatBirthday('1990-12-31')).toBe('31 December 1990')
  })
})

describe('parseBirthdayInput', () => {
  it('passes our own stored shapes straight through', () => {
    expect(parseBirthdayInput('1990-06-04')).toBe('1990-06-04')
    expect(parseBirthdayInput('--06-04')).toBe('--06-04')
  })

  it('strips the time a spreadsheet bolts on', () => {
    expect(parseBirthdayInput('1990-06-04T00:00:00.000Z')).toBe('1990-06-04')
    expect(parseBirthdayInput('1990-06-04 00:00')).toBe('1990-06-04')
  })

  it('reads the written forms, with and without a year', () => {
    expect(parseBirthdayInput('4 June 1990')).toBe('1990-06-04')
    expect(parseBirthdayInput('4 Jun 1990')).toBe('1990-06-04')
    expect(parseBirthdayInput('4th June')).toBe('--06-04')
    expect(parseBirthdayInput('June 4 1990')).toBe('1990-06-04')
    expect(parseBirthdayInput('June 4th, 1990')).toBe('1990-06-04')
    expect(parseBirthdayInput('Jun 4')).toBe('--06-04')
  })

  it('is case-insensitive about the month', () => {
    expect(parseBirthdayInput('4 JUNE 1990')).toBe('1990-06-04')
    expect(parseBirthdayInput('4 june 1990')).toBe('1990-06-04')
  })

  it('REFUSES an ambiguous slash date rather than guessing', () => {
    // 04/06/1990 is 4 June in the UK and 6 April in the US. Picking one is
    // wrong for half the users with nothing on screen to reveal it.
    expect(parseBirthdayInput('04/06/1990')).toBeUndefined()
    expect(parseBirthdayInput('4/6/90')).toBeUndefined()
  })

  it('returns undefined for blank and for junk', () => {
    expect(parseBirthdayInput('')).toBeUndefined()
    expect(parseBirthdayInput('   ')).toBeUndefined()
    expect(parseBirthdayInput('sometime in spring')).toBeUndefined()
    expect(parseBirthdayInput('4 Junuary 1990')).toBeUndefined()
    expect(parseBirthdayInput('31 February')).toBeUndefined()
  })
})
