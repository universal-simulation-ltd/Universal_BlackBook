// The phone screens' icons. SVG, never emoji or symbol codepoints — several
// (✕, 📇, ⤢) have no glyph in iOS's system font and draw as a hollow box
// (Modal's CloseGlyph says more).

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconBack() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" {...stroke} strokeWidth={2.4} aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function IconChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" {...stroke} strokeWidth={2.4} aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

/** Contacts: the little black book itself, a ribbon hanging out of it. */
export function IconBook() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke} aria-hidden>
      <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M8 3.5v17" />
      <path d="M13 20.5v2l1.25-1 1.25 1v-2" />
      <circle cx="13.25" cy="10" r="2" />
      <path d="M10.5 15c.5-1.5 1.5-2.2 2.75-2.2S15.5 13.5 16 15" />
    </svg>
  )
}

export function IconLists() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke} aria-hidden>
      <path d="M8 6.5h12M8 12h12M8 17.5h8" />
      <circle cx="4.25" cy="6.5" r="1" fill="currentColor" />
      <circle cx="4.25" cy="12" r="1" fill="currentColor" />
      <circle cx="4.25" cy="17.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconTodo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
    </svg>
  )
}

/** Tune: the suite's two sliders (ui.tsx's TuneGlyph). */
export function IconTune() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke} aria-hidden>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </svg>
  )
}

export function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke} strokeWidth={2.2} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke} aria-hidden>
      <path d="M6.5 3.5h2.2l1.4 4-2 1.3a11 11 0 0 0 5.1 5.1l1.3-2 4 1.4v2.2a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  )
}

export function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke} aria-hidden>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5h0a1.5 1.5 0 0 1-1.5-1.5Z" />
    </svg>
  )
}

export function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke} aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  )
}

export function IconMap() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" {...stroke} aria-hidden>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4ZM9 4v14M15 6v14" />
    </svg>
  )
}

export function IconBin() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" {...stroke} aria-hidden>
      <path d="M4 7h16M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7l1 12.2A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.8L18 7M10 11v6M14 11v6" />
    </svg>
  )
}

export function IconMore() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="18.5" cy="12" r="1.9" />
    </svg>
  )
}

export function IconShare() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke} aria-hidden>
      <path d="M12 3.5v11M8 7.5l4-4 4 4" />
      <path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1" />
    </svg>
  )
}

export function IconContactsBook() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M4 2.5A1.5 1.5 0 0 0 2.5 4v12A1.5 1.5 0 0 0 4 17.5h12a1.5 1.5 0 0 0 1.5-1.5V4A1.5 1.5 0 0 0 16 2.5H4ZM4 4h12v12H4V4Z" />
      <path d="M10 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 5c2.2 0 4 1.2 4 2.6v.9H6v-.9C6 12.2 7.8 11 10 11Z" />
    </svg>
  )
}

/** Notes: a page with its lines, a corner turned down. */
export function IconNote() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke} aria-hidden>
      <path d="M6 3.5h8.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M14.5 3.5V8H19M8.5 12h7M8.5 15.5h7M8.5 9h3" />
    </svg>
  )
}

/** A new person: a head and shoulders with a small plus. */
export function IconPerson() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke} aria-hidden>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 19.5c.8-3.4 3.4-5.5 6.5-5.5 1.6 0 3 .5 4.1 1.4" />
      <path d="M18 14v6M15 17h6" />
    </svg>
  )
}

/** A file coming in: a page with an arrow into it. */
export function IconFile() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke} aria-hidden>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8Z" />
      <path d="M14 3.5V8h4.5M12 10.5v6M9.5 14l2.5 2.5 2.5-2.5" />
    </svg>
  )
}

/** The ribbon, the phone app's mark beside its name. */
export function Ribbon({ className = 'h-5 w-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 20" className={className} aria-hidden>
      <path d="M1 0h10v19l-5-4-5 4Z" fill="var(--color-orange-500)" />
    </svg>
  )
}
