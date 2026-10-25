/* eslint-disable react-refresh/only-export-components -- the hook that gathers reminders lives beside the components that draw them */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { actionSwipe, deleteSwipe, SwipeGroup, SwipeItem, UndoBar, useUndo } from './SwipeActions'
import { newId } from '../lib/id'
import {
  defaultAt,
  formatWhen,
  isDue,
  isValidAt,
  lastOccurrence,
  nextOccurrence,
  REMINDER_LIMITS,
  REPEATS,
  type Reminder,
  type Repeat,
} from '../lib/reminders'
import { useBookStore } from '../stores/bookStore'
import { useNoteStore } from '../stores/noteStore'
import { useT, type Key } from '../i18n'
import { Modal } from './Modal'
import { usePhoneKit } from '../native/kit'
import { btnGhost, btnPrimary, btnSubtle, inputCls, label, radioCls } from './ui'

const REPEAT_KEY: Record<Repeat, Key> = { once: 'rem.once', monthly: 'rem.monthly', yearly: 'rem.yearly' }

/** "Add notification": a label, a date and time, and how often. */
export function ReminderEditor({ onSave, onClose, initial }: { onSave: (r: Reminder) => void; onClose: () => void; initial?: Reminder }) {
  const t = useT()
  const kit = usePhoneKit()
  const ids = useId()
  const start = initial?.at ?? defaultAt()
  const [text, setText] = useState(initial?.label ?? '')
  const [date, setDate] = useState(start.slice(0, 10))
  const [time, setTime] = useState(start.slice(11))
  const [repeat, setRepeat] = useState<Repeat>(initial?.repeat ?? 'once')
  const at = `${date}T${time}`
  const ok = isValidAt(at)
  return (
    <Modal phone="sheet" title={initial ? t('rem.edit') : t('rem.add')} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          // Edited: the same reminder, counting from now (so a time moved
          // into the past is not suddenly due).
          onSave({ id: initial?.id ?? newId(), label: text.trim(), at, repeat, createdAt: Date.now() })
        }}
      >
        <div>
          <label htmlFor={`${ids}-label`} className={label}>
            {t('rem.label')}
          </label>
          <input
            id={`${ids}-label`}
            className={inputCls}
            value={text}
            maxLength={REMINDER_LIMITS.label}
            placeholder={t('rem.label_placeholder')}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label htmlFor={`${ids}-date`} className={label}>
              {t('rem.date')}
            </label>
            <input
              id={`${ids}-date`}
              type="date"
              required
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor={`${ids}-time`} className={label}>
              {t('rem.time')}
            </label>
            <input
              id={`${ids}-time`}
              type="time"
              required
              className={inputCls}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <fieldset>
          <legend className={label}>{t('rem.repeat')}</legend>
          <div className="flex flex-col">
            {REPEATS.map((r) => (
              <label key={r} className="flex min-h-[40px] items-center gap-3 text-sm text-slate-200">
                <input
                  type="radio"
                  name={`${ids}-repeat`}
                  className={radioCls}
                  checked={repeat === r}
                  onChange={() => setRepeat(r)}
                />
                {t(REPEAT_KEY[r])}
              </label>
            ))}
          </div>
        </fieldset>
        {!kit && <p className="text-xs text-slate-500">{t('rem.web_note')}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnGhost} onClick={onClose}>
            {t('c.cancel')}
          </button>
          <button type="submit" className={btnPrimary} disabled={!ok}>
            {t('c.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** When it goes off next ("Next: Fri 3 Jun 2027, 09:00 · Every year"), or when it did. */
export function reminderLine(r: Reminder, t: ReturnType<typeof useT>, now = Date.now()): string {
  const next = nextOccurrence(r, now)
  const when = next !== null ? t('rem.next', { when: formatWhen(next, t.locale) }) : t('rem.past', { when: formatWhen(lastOccurrence(r, now) ?? now, t.locale) })
  return r.repeat === 'once' ? when : `${when} · ${t(REPEAT_KEY[r.repeat])}`
}

/**
 * A record's reminders. Swipe left to delete (with Undo), right to edit; the
 * ✕ and the focus buttons do the same without a swipe. Nothing at all when
 * there are none.
 */
export function ReminderList({ reminders, onChange }: { reminders?: Reminder[]; onChange: (next: Reminder[] | undefined) => void }) {
  const t = useT()
  const [editing, setEditing] = useState<Reminder | null>(null)
  const latest = useRef(reminders ?? [])
  latest.current = reminders ?? []
  const set = (next: Reminder[]) => onChange(next.length ? next : undefined)
  const undo = useUndo<Reminder>(async (r) => set([...latest.current.filter((x) => x.id !== r.id), r]))
  const remove = (r: Reminder) => {
    undo.deleted(r)
    set(latest.current.filter((x) => x.id !== r.id))
  }
  if (!reminders?.length && !undo.item) return null
  const sorted = [...(reminders ?? [])].sort((a, b) => (nextOccurrence(a, Date.now()) ?? Infinity) - (nextOccurrence(b, Date.now()) ?? Infinity))
  return (
    <div>
      {sorted.length > 0 && <span className={label}>{t('rem.section')}</span>}
      <SwipeGroup>
        <ul className="space-y-2">
          {sorted.map((r) => {
            const name = r.label || t('rem.untitled')
            return (
              <li key={r.id}>
                <SwipeItem
                  id={r.id}
                  left={actionSwipe('edit', t('rem.edit_short'), t('rem.edit_label', { label: name }), () => setEditing(r))}
                  right={deleteSwipe(name, () => remove(r))}
                  focus={[{ label: t('rem.edit_label', { label: name }), onClick: () => setEditing(r) }]}
                >
                  <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-slate-100">{name}</p>
                      <p className="text-xs text-slate-400">{reminderLine(r, t)}</p>
                    </div>
                    <button
                      type="button"
                      className="-my-1 -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      aria-label={t('rem.remove', { label: name })}
                      onClick={() => remove(r)}
                    >
                      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </SwipeItem>
              </li>
            )
          })}
        </ul>
      </SwipeGroup>
      {undo.item && <UndoBar title={undo.item.label || t('rem.untitled')} onUndo={() => void undo.undo()} />}
      {editing && (
        <ReminderEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            setEditing(null)
            set(latest.current.map((x) => (x.id === r.id ? r : x)))
          }}
        />
      )}
    </div>
  )
}

/** One reminder, with what it is about. */
export interface ReminderEntry {
  kind: 'contact' | 'note'
  ownerId: string
  owner: string
  reminder: Reminder
}

/** Every reminder in the book: on contacts, and on notes. */
export function useAllReminders(): ReminderEntry[] {
  const contacts = useBookStore((s) => s.contacts)
  const notes = useNoteStore((s) => s.notes)
  const t = useT()
  return useMemo(() => {
    const out: ReminderEntry[] = []
    for (const c of contacts) for (const r of c.reminders ?? []) out.push({ kind: 'contact', ownerId: c.id, owner: c.name || t('c.unnamed'), reminder: r })
    for (const n of notes) for (const r of n.reminders ?? []) out.push({ kind: 'note', ownerId: n.id, owner: n.title || t('c.untitled'), reminder: r })
    return out
  }, [contacts, notes, t])
}

/** Re-render once a minute, so a reminder becomes due while the app is open. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}

/** Mark one reminder done, on whichever record holds it. */
export function useAckReminder() {
  const patchContact = useBookStore((s) => s.patchContact)
  const patchNote = useNoteStore((s) => s.patch)
  return (e: ReminderEntry) => {
    const now = Date.now()
    if (e.kind === 'contact') {
      const c = useBookStore.getState().contacts.find((x) => x.id === e.ownerId)
      if (c) void patchContact(c.id, { reminders: (c.reminders ?? []).map((r) => (r.id === e.reminder.id ? { ...r, ackAt: now } : r)) })
    } else {
      const n = useNoteStore.getState().notes.find((x) => x.id === e.ownerId)
      if (n) void patchNote(n.id, { reminders: (n.reminders ?? []).map((r) => (r.id === e.reminder.id ? { ...r, ackAt: now } : r)) })
    }
  }
}

/**
 * The reminders that have gone off and not been marked done, at the top of
 * the app while it is open — the website's whole way of reminding (it has no
 * notifications), and the phone's for anything that fired while notifications
 * were off. Open goes to the contact or note; Done puts it away until its next
 * time.
 */
export function DueReminders() {
  const t = useT()
  const all = useAllReminders()
  const now = useMinute()
  const ack = useAckReminder()
  const view = useBookStore((s) => s.view)
  const viewNote = useNoteStore((s) => s.view)
  const due = all.filter((e) => isDue(e.reminder, now))
  if (due.length === 0) return null
  return (
    <section aria-label={t('rem.due_title')} className="mb-4 space-y-2" role="status">
      {due.map((e) => (
        <div
          key={`${e.ownerId}-${e.reminder.id}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-orange-900/60 bg-orange-950/30 px-4 py-3 text-sm text-orange-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0" />
          </svg>
          <p className="min-w-0 flex-1 break-words">
            <span className="font-semibold">{e.owner}</span>
            {e.reminder.label ? ` · ${e.reminder.label}` : ''}
            <span className="block text-xs opacity-80">{formatWhen(lastOccurrence(e.reminder, now) ?? now, t.locale)}</span>
          </p>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className={btnSubtle}
              onClick={() => (e.kind === 'contact' ? view(e.ownerId) : viewNote(e.ownerId))}
            >
              {t('rem.open')}
            </button>
            <button type="button" className={btnGhost} onClick={() => ack(e)}>
              {t('rem.done')}
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
