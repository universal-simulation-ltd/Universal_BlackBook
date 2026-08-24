import { useState } from 'react'
import { buildBirthday, daysInMonth, MONTH_OPTIONS, parseBirthday } from '../lib/birthday'
import { btnSubtle, inputCls, selectCls } from './ui'

/**
 * Day / Month / Year — three controls, not one `<input type="date">`.
 *
 * A native date picker cannot express "the 4th of June, year unknown", and
 * that is the commonest birthday in anybody's address book. Offered one, people
 * either leave the field empty or invent a year — and an invented year is
 * indistinguishable from a real one the moment it is saved. Three controls make
 * the year genuinely optional, which is the whole point of the field.
 *
 * It is also the pattern every signup form already uses, so nobody has to learn
 * it, and it sidesteps the native picker's own locale problem: `type="date"`
 * renders dd/mm/yyyy or mm/dd/yyyy depending on the browser's locale, and from
 * an empty field a user cannot tell which one they are looking at.
 *
 * ⚠️ **The three controls are LOCAL state, deliberately, and not derived from
 * `value` on every render.** A birthday is only a birthday once it has both a
 * day and a month, so a half-filled one has to serialise to `undefined` —
 * which means a year typed BEFORE the day and month would round-trip through
 * the parent as "no value" and be wiped from the box between keystrokes. The
 * controls hold what was typed; `value` holds what is storable.
 */
export function BirthdayField({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (next: string | undefined) => void
}) {
  const initial = parseBirthday(value)
  const [day, setDay] = useState(initial?.day ?? 0)
  const [month, setMonth] = useState(initial?.month ?? 0)
  const [yearText, setYearText] = useState(initial?.year != null ? String(initial.year) : '')

  const year = yearText.length === 4 ? Number(yearText) : null

  const emit = (d: number, m: number, y: number | null) => {
    onChange(d && m ? buildBirthday({ day: d, month: m, year: y }) : undefined)
  }

  // The day list follows the month, so 31 September is never offerable. With no
  // year February shows 29 — a leap-day birthday belongs to a real person, and
  // rejecting it because THIS year is not a leap year would be the app arguing
  // with a birth certificate.
  const maxDay = month ? daysInMonth(month, year) : 31

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectCls}
          value={day || ''}
          aria-label="Day of birth"
          onChange={(e) => {
            const d = Number(e.target.value)
            setDay(d)
            emit(d, month, year)
          }}
        >
          <option value="">Day</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={month || ''}
          aria-label="Month of birth"
          onChange={(e) => {
            const m = Number(e.target.value)
            // Moving 31 March to February would otherwise leave a pair that
            // `buildBirthday` silently refuses, clearing the field with no
            // explanation. Clamp to the last day of the new month instead.
            const clamped = m && day > daysInMonth(m, year) ? daysInMonth(m, year) : day
            setMonth(m)
            setDay(clamped)
            emit(clamped, m, year)
          }}
        >
          <option value="">Month</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <input
          className={`${inputCls} w-24`}
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Year"
          aria-label="Year of birth (optional)"
          value={yearText}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
            setYearText(digits)
            // Only a complete four-digit year counts as one. Anything shorter
            // is somebody mid-keystroke, and reading "19" as a year would store
            // the year 19 between the 1 and the 9.
            emit(day, month, digits.length === 4 ? Number(digits) : null)
          }}
        />

        {(day || month || yearText) && (
          <button
            type="button"
            className={btnSubtle}
            onClick={() => {
              setDay(0)
              setMonth(0)
              setYearText('')
              onChange(undefined)
            }}
          >
            Clear
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {day && month
          ? year === null
            ? "Year is optional — leave it blank if you don't know it."
            : ''
          : 'Optional. A day and a month are enough.'}
      </p>
    </div>
  )
}
