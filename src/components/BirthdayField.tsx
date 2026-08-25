import { useState } from 'react'
import { buildBirthday, daysInMonth, MONTH_OPTIONS, parseBirthday } from '../lib/birthday'
import { Dropdown } from './Dropdown'
import { btnSubtle, inputBase } from './ui'

/**
 * Day / Month / Year — three controls on ONE line, not an `<input type="date">`.
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
 * The year is a typed box rather than a fourth dropdown on purpose: a year list
 * is a hundred-odd options to scroll past, and "1962" is four keystrokes.
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

  /**
   * Keep the chosen day inside the chosen month.
   *
   * ⚠️ Called on a YEAR change as well as a month change, which is the half
   * that was missing and the bug people saw. 29 February with no year is
   * valid; type 1991 after it and February has 28 days, so the Day control was
   * left holding a value with no matching row — which showed as an EMPTY box —
   * while `buildBirthday` quietly refused the pair and wiped the birthday.
   * Both symptoms, one missing clamp.
   */
  const clampDay = (d: number, m: number, y: number | null) =>
    m && d > daysInMonth(m, y) ? daysInMonth(m, y) : d

  return (
    <div>
      <div className="flex items-center gap-2">
        {/* `Dropdown`, not `<select>` — see the warning at the top of
            Dropdown.tsx. This field lives inside the `<dialog>`, where a
            native select popup opens blank and stays blank until something
            forces the tab to repaint. */}
        <Dropdown
          className="min-w-0 flex-1"
          value={day ? String(day) : ''}
          placeholder="Day"
          ariaLabel="Day of birth"
          options={Array.from({ length: maxDay }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
          onChange={(next) => {
            const d = Number(next)
            setDay(d)
            emit(d, month, year)
          }}
        />

        <Dropdown
          className="min-w-0 flex-[2]"
          value={month ? String(month) : ''}
          placeholder="Month"
          ariaLabel="Month of birth"
          options={MONTH_OPTIONS.map((m) => ({ value: String(m.value), label: m.label }))}
          onChange={(next) => {
            const m = Number(next)
            const clamped = clampDay(day, m, year)
            setMonth(m)
            setDay(clamped)
            emit(clamped, m, year)
          }}
        />

        {/* `inputBase`, not `inputCls` — see the warning in ui.tsx. `inputCls`
            carries `w-full`, which beats `w-20` on CSS source order and would
            put this box on a line of its own. */}
        <input
          className={`${inputBase} w-20 shrink-0 text-center`}
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Year"
          aria-label="Year of birth (optional)"
          value={yearText}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
            // Only a complete four-digit year counts as one. Anything shorter
            // is somebody mid-keystroke, and reading "19" as a year would store
            // the year 19 between the 1 and the 9.
            const y = digits.length === 4 ? Number(digits) : null
            const clamped = clampDay(day, month, y)
            setYearText(digits)
            setDay(clamped)
            emit(clamped, month, y)
          }}
        />

        {(day || month || yearText) && (
          <button
            type="button"
            className={`${btnSubtle} shrink-0`}
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
