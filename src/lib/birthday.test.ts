import { describe, expect, it } from 'vitest'
import {
  buildBirthday,
  countdownLabel,
  currentAge,
  daysInMonth,
  formatBirthday,
  isValidBirthday,
  nextBirthday,
  parseBirthday,
  parseBirthdayInput,
  todayParts,
  type Today,
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

describe('nextBirthday', () => {
  // Fixed dates throughout. A test that asks the clock what today is passes on
  // the day it was written and starts failing on some later Tuesday.
  const AUG_24_2026: Today = { year: 2026, month: 8, day: 24 }

  it('counts today as today, not as a year away', () => {
    // The whole reason somebody opens the birthdays list is that one of them
    // is today. An off-by-one here hides exactly the person it exists for.
    expect(nextBirthday('--08-24', AUG_24_2026)?.inDays).toBe(0)
  })

  it('counts tomorrow as one day', () => {
    expect(nextBirthday('--08-25', AUG_24_2026)?.inDays).toBe(1)
  })

  it('wraps a date already past into next year', () => {
    const next = nextBirthday('--08-23', AUG_24_2026)
    expect(next?.year).toBe(2027)
    expect(next?.inDays).toBe(364)
  })

  it('gives the age they will TURN, not the age they are', () => {
    // Born 4 June 1990, asked on 24 August 2026: 4 June has gone, so the next
    // one is in 2027 and they turn 37 — not the 36 they are today.
    const next = nextBirthday('1990-06-04', AUG_24_2026)
    expect(next?.year).toBe(2027)
    expect(next?.turning).toBe(37)
  })

  it('turns them a year older on the day itself', () => {
    expect(nextBirthday('1990-08-24', AUG_24_2026)?.turning).toBe(36)
  })

  it('has no age at all when the year is unknown', () => {
    expect(nextBirthday('--06-04', AUG_24_2026)?.turning).toBeNull()
  })

  it('rolls 29 February to 1 March in a non-leap year', () => {
    // Stated rather than assumed: 28 February is equally defensible and the
    // two disagree three years in four.
    const next = nextBirthday('2000-02-29', { year: 2027, month: 1, day: 1 })
    expect(next?.year).toBe(2027)
    expect(next?.inDays).toBe(59) // 31 January days + 28 February days
    expect(next?.turning).toBe(27)
  })

  it('keeps 29 February on the day in a leap year', () => {
    expect(nextBirthday('--02-29', { year: 2028, month: 2, day: 29 })?.inDays).toBe(0)
  })

  it('crosses a year boundary correctly', () => {
    expect(nextBirthday('--01-01', { year: 2026, month: 12, day: 31 })?.inDays).toBe(1)
  })

  it('is null for a contact with no birthday, and for junk', () => {
    expect(nextBirthday(undefined, AUG_24_2026)).toBeNull()
    expect(nextBirthday('sometime in June', AUG_24_2026)).toBeNull()
  })
})

describe('currentAge', () => {
  const AUG_24_2026: Today = { year: 2026, month: 8, day: 24 }

  it('is the age they are now, not the one they are heading for', () => {
    // Born 4 June 1990, asked on 24 August 2026. `nextBirthday` says they are
    // TURNING 37; today they are 36.
    expect(currentAge('1990-06-04', AUG_24_2026)).toBe(36)
  })

  it('counts the year up on the day itself', () => {
    expect(currentAge('1990-08-24', AUG_24_2026)).toBe(36)
  })

  it('has not counted it up the day before', () => {
    expect(currentAge('1990-08-25', AUG_24_2026)).toBe(35)
  })

  it('is null when the year is unknown', () => {
    // The whole point of the year-less shape: no year, no age, and no guess.
    expect(currentAge('--06-04', AUG_24_2026)).toBeNull()
  })

  it('is null for a birthday in the future rather than a negative age', () => {
    // `buildBirthday` accepts a date for a baby due next week on purpose, so
    // this case reaches here. "(Age -1)" would be the app talking nonsense.
    expect(currentAge('2026-09-15', AUG_24_2026)).toBeNull()
  })

  it('says 0 for a baby already born this year', () => {
    expect(currentAge('2026-01-01', AUG_24_2026)).toBe(0)
  })

  it('agrees with the 29 February roll-forward rule', () => {
    // Born on a leap day, asked on 28 February in a non-leap year: their
    // birthday lands on 1 March, so it has NOT happened yet and they are 26.
    expect(currentAge('2000-02-29', { year: 2027, month: 2, day: 28 })).toBe(26)
    expect(currentAge('2000-02-29', { year: 2027, month: 3, day: 1 })).toBe(27)
  })

  it('is null for no birthday and for junk', () => {
    expect(currentAge(undefined, AUG_24_2026)).toBeNull()
    expect(currentAge('sometime in June', AUG_24_2026)).toBeNull()
  })
})

describe('countdownLabel', () => {
  it('names today and tomorrow rather than counting them', () => {
    expect(countdownLabel(0)).toBe('Today')
    expect(countdownLabel(1)).toBe('Tomorrow')
    expect(countdownLabel(12)).toBe('in 12 days')
  })
})

describe('todayParts', () => {
  it('reads LOCAL date parts, not UTC ones', () => {
    // 1 January 2026 at 00:30 local. Read through UTC in any timezone behind
    // it, this is still 31 December — and everybody's birthday would be a day
    // out for half the day.
    const local = new Date(2026, 0, 1, 0, 30)
    expect(todayParts(local)).toEqual({ year: 2026, month: 1, day: 1 })
  })
})
