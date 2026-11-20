import type { MouseEvent } from 'react'
import { useT } from '../i18n'

/**
 * A date as a calendar button (James, 2026-11-20: "for all the calendar
 * fields, instead have a calendar icon, and when you click it, it opens up
 * the selector"). It shows the date picked — "Fri 21 Nov 2026", or "Pick a
 * date" — beside a calendar icon, and a click anywhere on it opens the
 * device's own picker (the wheel on iOS, the calendar on Android and in the
 * browser).
 *
 * The real `<input type="date">` lies over the button, invisible, so a tap
 * on a phone opens its picker natively and the label, keyboard and screen
 * readers still reach a real date field. On a computer a click on a date
 * input only focuses it, so the click also calls `showPicker()`.
 */
export function DateField({
  id,
  value,
  onChange,
  min,
  required,
  className = '',
}: {
  id?: string
  /** YYYY-MM-DD, or '' for none. */
  value: string
  onChange: (value: string) => void
  min?: string
  required?: boolean
  className?: string
}) {
  const t = useT()
  const shown = value ? formatDay(value, t.locale) : t('date.pick')
  const open = (e: MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {
      /* not allowed here (or no picker): the input still takes focus */
    }
  }
  return (
    <span
      className={`relative inline-flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-orange-400 hover:border-slate-600 ${className}`}
    >
      <CalendarIcon className="h-5 w-5 shrink-0 text-orange-400" />
      <span className={`truncate ${value ? 'text-slate-100' : 'text-slate-500'}`} aria-hidden>
        {shown}
      </span>
      <input
        id={id}
        type="date"
        min={min}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={open}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:dark]"
      />
    </span>
  )
}

/** "Fri 21 Nov 2026" in the app's language. */
function formatDay(iso: string, locale: string): string {
  const d = new Date(`${iso}T12:00`)
  if (Number.isNaN(d.getTime())) return iso
  try {
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d.toDateString()
  }
}

export function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}
