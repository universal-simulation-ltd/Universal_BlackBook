import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LinkifiedText } from '@unisim/sdk'
import { countdownLabel, currentAge, formatBirthday, nextBirthday, todayParts } from '../lib/birthday'
import { usePageScrollLock } from '../lib/scrollLock'
import { growToFit, useTypingRoom } from '../lib/typingRoom'
import { isList } from '../lib/lists'
import type { Tag } from '../lib/types'
import { useBookStore } from '../stores/bookStore'
import { useEffectiveTheme } from '../stores/themeStore'
import { autoFocusOK, usePhoneKit } from '../native/kit'
import { CloseGlyph } from './Modal'
import { BellGlyph, ContactMore, MoreRow } from './ContactMore'
import { ReminderEditor, ReminderList } from './Reminders'
import { LinkedNotes } from './NoteView'
import { formatWhen, nextOccurrence } from '../lib/reminders'
import { useNativeNav } from '../native/nav'
import { askForNotifications } from '../native/notify'
import { phoneScreens } from '../native/shell'
import { ListChip } from './ListChip'
import { TagChip } from './TagChip'
import { btnGhost, btnPrimary, inputCls, label } from './ui'
import { fieldLabel } from '../lib/formFields'
import { useT } from '../i18n'

/**
 * One person, filling the screen, with an Edit button (owner's request,
 * 2026-09-11).
 *
 * ⚠️ **Tapping a card used to open the EDIT FORM.** That put a form between
 * somebody and the thing they tapped to read — a note two lines deep in a
 * four-row textarea, an email address in a box, a Save button on a screen where
 * nothing had been typed. Looking at a contact is what an address book is for
 * and editing one is the occasional act, so the tap now opens this and the form
 * is one button away.
 *
 * ⚠️ **A `<dialog>` of its own rather than `Modal`**, for the same two reasons
 * NotesFullscreen has one: Modal is a capped centred box and this is the whole
 * screen, and Modal hardcodes `id="modal-title"`, which cannot be on screen
 * twice — and this view is very often open UNDERNEATH the edit form. The
 * stacking is deliberate and it is what the top layer is for: Edit opens the
 * form above this, Escape goes to the form because it is topmost, and closing
 * it puts you back on the card you were reading rather than in the list.
 *
 * ⚠️ **The phone number and the email are LINKS here**, which they are not on
 * the card in the list — there the whole card is a button and an anchor inside
 * a button is invalid HTML that behaves differently in every engine (see
 * ContactList). This view is the place that comment promised: one tap to ring
 * them, one to write to them.
 */
export function ContactView({ id }: { id: string }) {
  const t = useT()
  const contact = useBookStore((s) => s.contacts.find((c) => c.id === id))
  const tags = useBookStore((s) => s.tags)
  const close = useBookStore((s) => s.view)
  const edit = useBookStore((s) => s.edit)
  const addToContacts = useBookStore((s) => s.addToContacts)
  const setNotes = useBookStore((s) => s.setNotes)
  const patchContact = useBookStore((s) => s.patchContact)
  // Made a moment ago by New contact (bookStore.newContact): the name is typed
  // here, at the top of the clean view, rather than in the full form.
  const isFresh = useBookStore((s) => s.fresh === id)
  const [more, setMore] = useState(false)
  const [remind, setRemind] = useState(false)
  const say = useNativeNav((s) => s.say)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const kit = usePhoneKit()

  usePageScrollLock()

  // ⚠️ Read through a ref so the effect below can keep an EMPTY dependency
  // list. `close` is stable here (it is the store's own action) but the
  // sibling component that made this mistake — NotesFullscreen — is one file
  // away, and an effect that tears down and reopens a dialog is the kind of
  // bug that only shows up once somebody passes an inline arrow in.
  const closeRef = useRef(close)
  closeRef.current = close

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // `.open` guard: StrictMode double-invokes this in development, and
    // showModal() on an already-open dialog throws. Same as Modal.
    if (!el.open) el.showModal()
    const onCancel = (e: Event) => {
      e.preventDefault()
      closeRef.current(null)
    }
    el.addEventListener('cancel', onCancel)
    return () => {
      el.removeEventListener('cancel', onCancel)
      // Closing before React drops the node hands focus back to the card that
      // opened this, rather than to the top of the list.
      if (el.open) el.close()
    }
  }, [])

  // The note is typed straight into this view (owner's request, 2026-10-08) —
  // no trip to the form to fix a word. A local draft, saved half a second
  // after typing stops, on blur, and before anything else can read the store:
  // Fine-tune (the form reads `contact.notes` when it mounts) and closing.
  const [notes, setDraft] = useState(contact?.notes ?? '')
  // Made from a search: the note is typed into at once (see the effect below).
  const [typeNote] = useState(() => useBookStore.getState().typeNote === id)
  const [typing, setTyping] = useState(typeNote)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const draftRef = useRef(notes)
  draftRef.current = notes
  const flush = () => {
    clearTimeout(timer.current)
    timer.current = undefined
    void setNotes(id, draftRef.current)
  }
  const flushRef = useRef(flush)
  flushRef.current = flush
  // Saved from the form on top of this, or by a sync: take the new text, but
  // never while a keystroke of ours is still waiting to be saved.
  const stored = contact?.notes ?? ''
  useEffect(() => {
    if (timer.current === undefined) setDraft(stored)
  }, [stored])
  // Unmounting (closed, or the contact deleted) must not drop the last word.
  useEffect(() => () => {
    if (timer.current !== undefined) flushRef.current()
  }, [])
  // Grows with its text, so the view keeps ONE scroll — the page's — rather
  // than a box inside it. `field-sizing: content` would do this, but not on
  // the iOS Safari this mostly runs on.
  useLayoutEffect(() => {
    if (notesRef.current) growToFit(notesRef.current)
  }, [notes, typing])
  useTypingRoom(notesRef, phoneScreens())
  // After the effect above that opens the dialog, which moves the focus: the
  // caller flushes this inside the key press, so on the phone the keyboard
  // goes straight from the search to the note.
  useEffect(() => {
    if (!typeNote) return
    // Typing on again too: a dialog closed and reopened under it (StrictMode
    // does exactly that in development) blurs the box, which stops typing.
    setTyping(true)
    notesRef.current?.focus()
    useBookStore.setState({ typeNote: null })
  }, [typeNote])

  const today = useMemo(() => todayParts(), [])
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  // Deleted from the form that opened on top of this, or replaced by an
  // import. The store clears `viewing` in both cases, so this is belt and
  // braces rather than a state anybody should reach — but a card rendering a
  // person the book no longer holds is not a thing to leave to chance.
  if (!contact) return null

  const chips = contact.tagIds.map((t) => byId.get(t)).filter((t): t is Tag => Boolean(t))
  const tagChips = chips.filter((t) => !isList(t))
  const listChips = chips.filter(isList)
  const next = nextBirthday(contact.birthdate, today)
  const age = currentAge(contact.birthdate, today)
  const bare =
    !contact.email.trim() &&
    !contact.phone.trim() &&
    !contact.company?.trim() &&
    !contact.address?.trim() &&
    !contact.birthdate &&
    chips.length === 0 &&
    !notes.trim()

  const details = (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {isFresh && (
        <div>
          <label htmlFor={`${titleId}-name`} className={label}>
            {t('form.name')}
          </label>
          <input
            id={`${titleId}-name`}
            className={`${inputCls} text-lg font-semibold`}
            value={contact.name}
            placeholder={t('view.name_placeholder')}
            autoComplete="off"
            autoFocus={autoFocusOK() && !typeNote}
            onChange={(e) => void patchContact(contact.id, { name: e.target.value })}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v !== e.target.value) void patchContact(contact.id, { name: v })
            }}
          />
        </div>
      )}
      {contact.listOnly && listChips.length > 0 && (
        // Somebody who came in on a list and is not in Contacts — say so,
        // and offer the one tap that makes them a contact.
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
          <p className="text-sm text-slate-400">{listChips.length === 1 ? t('view.only_list') : t('view.only_lists')}</p>
          <button type="button" className={btnGhost} onClick={() => void addToContacts(contact.id)}>
            {t('view.add_to_contacts')}
          </button>
        </div>
      )}

      {contact.email.trim() && (
        <Row name={fieldLabel('email')}>
          <a
            href={`mailto:${contact.email.trim()}`}
            className="break-all text-base text-orange-300 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {contact.email}
          </a>
        </Row>
      )}

      {contact.company?.trim() && (
        <Row name={fieldLabel('company')}>
          <p className="break-words text-base text-slate-200"><Linked text={contact.company} /></p>
        </Row>
      )}

      {contact.phone.trim() && (
        <Row name={fieldLabel('phone')}>
          {/* The stored string is what is SHOWN — spacing, brackets and all
              (see Contact.phone) — and the digits are what is dialled. A
              `tel:` href keeps the punctuation the phone would choke on out
              of the URL without rewriting what the user typed. */}
          <a
            href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
            className="text-base tabular-nums text-orange-300 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {contact.phone}
          </a>
        </Row>
      )}

      {contact.address?.trim() && (
        <Row name={fieldLabel('address')}>
          {/* `pre-line`: the line breaks are the address. */}
          <p className="whitespace-pre-line break-words text-base text-slate-200"><Linked text={contact.address.trim()} /></p>
        </Row>
      )}

      {contact.birthdate && (
        <Row name={fieldLabel('birthday')}>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base text-slate-200">
            <span>{formatBirthday(contact.birthdate)}</span>
            {age !== null && <span className="text-sm text-slate-500 tabular-nums">{t('view.age', { age })}</span>}
          </p>
          {/* The countdown is here on every contact, not only in the
              birthdays view: "in 9 days" is the reason to have opened
              somebody's card at all in the week before it. */}
          {next && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-orange-300/90">
              <span aria-hidden>{next.inDays === 0 ? '🎉' : '🎂'}</span>
              <span>{countdownLabel(next.inDays)}</span>
              {next.turning !== null && (
                <>
                  <span aria-hidden className="text-slate-600">·</span>
                  <span className="tabular-nums">{t('bday.turning', { age: next.turning })}</span>
                </>
              )}
            </p>
          )}
        </Row>
      )}

      {tagChips.length > 0 && (
        <Row name={fieldLabel('tags')}>
          <div className="flex flex-wrap gap-1.5">
            {tagChips.map((t) => (
              <TagChip key={t.id} name={t.name} colour={t.colour} pattern={t.pattern} />
            ))}
          </div>
        </Row>
      )}

      {listChips.length > 0 && (
        <Row name={fieldLabel('lists')}>
          <div className="flex flex-wrap gap-1.5">
            {listChips.map((t) => (
              <ListChip key={t.id} name={t.name} />
            ))}
          </div>
        </Row>
      )}

      <div>
        {/* A real `<label>` here, unlike `Row`: this one has a control. */}
        <label htmlFor={`${titleId}-notes`} className={label}>
          {t('form.notes')}
        </label>
        {typing ? (
          // Typed into directly (owner's request, 2026-10-08). Borderless,
          // so a note still reads as a note and not as a form; no clamp
          // and no inner scroll (see the height effect above).
          <textarea
            id={`${titleId}-notes`}
            ref={notesRef}
            rows={3}
            autoFocus
            // The caret goes to the END: the usual reason to tap a note is to
            // add the next entry under the last one, as in the dated log
            // that prompted this.
            onFocus={(e) => {
              const end = e.currentTarget.value.length
              e.currentTarget.setSelectionRange(end, end)
            }}
            value={notes}
            onChange={(e) => {
              const v = e.target.value
              setDraft(v)
              draftRef.current = v
              clearTimeout(timer.current)
              timer.current = setTimeout(() => flushRef.current(), 500)
            }}
            onBlur={() => {
              if (timer.current !== undefined) flush()
              setTyping(false)
            }}
            placeholder={t('form.notes_placeholder')}
            className="-mx-2 block w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg border-0 bg-slate-900 px-2 py-1 text-base leading-7 text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          />
        ) : (
          // ⚠️ Read with its links live until tapped — a textarea cannot
          // hold a link, and the links in a note are half of why it is
          // opened. A tap on the words (not on a link) starts typing; the
          // keyboard only comes up then, never just for opening somebody.
          // A div and not a button: a button may not hold links.
          <div
            id={`${titleId}-notes`}
            role="textbox"
            aria-multiline="true"
            aria-readonly="false"
            tabIndex={0}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a, button')) return
              setTyping(true)
            }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setTyping(true)
              }
            }}
            className="-mx-2 cursor-text rounded-lg px-2 py-1 hover:bg-slate-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            {notes.trim() ? (
              <p className="whitespace-pre-wrap break-words text-base leading-7 text-slate-200">
                <Linked text={notes} />
              </p>
            ) : (
              <p className="text-base leading-7 text-slate-500">{t('view.nothing_yet')}</p>
            )}
          </div>
        )}
      </div>

      <LinkedNotes contactId={contact.id} />

      <ReminderList reminders={contact.reminders} onChange={(next) => void patchContact(contact.id, { reminders: next })} />

      {isFresh ? (
        <p className="text-sm text-slate-500">{kit ? t('view.fresh_phone') : t('view.fresh_web')}</p>
      ) : (
        bare && <p className="text-sm text-slate-500">{t('view.bare')}</p>
      )}
    </div>
  )

  // The phone screens: the person as a PAGE (back to the list with the back
  // button or a swipe from the left edge), with the emoji buttons across the
  // top (Call · Message · Share · "+", the person's to arrange). The name is
  // typed into the bar with a tap; Fine-tune is beside it.
  if (kit) {
    return (
      <kit.Page
        title={contact.name || (isFresh ? kit.t('add_new_contact') : t('c.unnamed'))}
        editTitle={{
          value: contact.name,
          label: t('form.name'),
          placeholder: t('view.name_placeholder'),
          onSave: (name) => void patchContact(contact.id, { name }),
        }}
        backLabel={kit.t('contact_back')}
        onBack={() => {
          flush()
          close(null)
        }}
        actions={
          <button
            type="button"
            className="min-h-[44px] px-2 text-[16px] font-semibold text-orange-400"
            onClick={() => {
              flush()
              edit(contact.id)
            }}
          >
            {kit.t('fine_tune')}
          </button>
        }
      >
        <div className="mx-auto w-full max-w-2xl">
          <kit.ContactActions contact={contact} onRemind={() => setRemind(true)} />
        </div>
        {details}
        {remind && (
          <ReminderEditor
            onClose={() => setRemind(false)}
            onSave={(r) => {
              setRemind(false)
              void patchContact(contact.id, { reminders: [...(contact.reminders ?? []), r] })
              if (kit) {
                void askForNotifications().then((ok) => {
                  const next = nextOccurrence(r, Date.now())
                  say(ok ? t('rem.set', { when: next ? formatWhen(next, t.locale) : '' }) : t('rem.denied'))
                })
              }
            }}
          />
        )}
      </kit.Page>
    )
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Every default the UA puts on a modal dialog is in the way: `m-auto`
      // centres a box, the max sizes cap it well short of the screen, and the
      // border draws a card edge around something that has no edge. `h-[100dvh]`
      // and not vh — the dynamic unit is the one that shrinks for the iOS
      // keyboard and the browser's own chrome.
      className="m-0 flex h-[100dvh] max-h-none w-screen max-w-none flex-col rounded-none border-0 bg-slate-950 p-0 text-slate-200 backdrop:bg-slate-950"
    >
      <div
        className="shrink-0 border-b border-slate-800 px-4 py-3"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        }}
      >
        {/* The same capped, centred column as the body below — the rule is on
            the row so the hairline still spans the screen, and the name sits
            directly over the fields it belongs to at every width. */}
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold text-slate-100">
            {contact.name || (isFresh ? t('add_new_contact') : t('c.unnamed'))}
          </h2>
          {/* The Edit button is FIRST of the two and the primary one: it is the
              thing this screen exists to offer that the list could not. Close is
              beside it because Escape and the back gesture are not discoverable
              and not available to every input. */}
          {/* "Fine-tune", not "Edit" — the suite's word for adjusting one entry;
              Tune this app stays for the app-wide dialog (owner, 2026-10-09). Any typed note is
              saved first, because the form reads it when it opens. */}
          <button
            type="button"
            className={`${btnPrimary} shrink-0`}
            onClick={() => {
              flush()
              edit(contact.id)
            }}
          >
            {t('row.fine_tune')}
          </button>
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-label={t('more.label')}
            aria-haspopup="dialog"
            title={t('more.label')}
            className="shrink-0 rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <circle cx="5.5" cy="12" r="1.9" />
              <circle cx="12" cy="12" r="1.9" />
              <circle cx="18.5" cy="12" r="1.9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              flush()
              close(null)
            }}
            aria-label={t('c.close')}
            className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <CloseGlyph />
          </button>
        </div>
      </div>

      {/* `flex-auto` and `min-h-0`, never `flex-1` — a zero flex-basis is what
          collapsed every dialog in this app on WebKit (see Modal). The column
          is capped and centred: a full-width line of notes on a desktop is a
          40-word measure nobody can read. */}
      <div
        className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 py-5"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        }}
      >
        {details}
      </div>
      {more && (
          <ContactMore
            contact={contact}
            onClose={() => setMore(false)}
            extraRows={(closeMore) => (
              <MoreRow
                icon={<BellGlyph />}
                onClick={() => {
                  closeMore()
                  setRemind(true)
                }}
              >
                {t('rem.add')}
              </MoreRow>
            )}
          />
        )}
        {remind && (
          <ReminderEditor
            onClose={() => setRemind(false)}
            onSave={(r) => {
              setRemind(false)
              void patchContact(contact.id, { reminders: [...(contact.reminders ?? []), r] })
              if (kit) {
                void askForNotifications().then((ok) => {
                  const next = nextOccurrence(r, Date.now())
                  say(ok ? t('rem.set', { when: next ? formatWhen(next, t.locale) : '' }) : t('rem.denied'))
                })
              }
            }}
          />
        )}
    </dialog>
  )
}

/**
 * One labelled block. A `<span>` heading and not a `<label>`: there is no form
 * control on this screen for a label to point at, and a `<label>` pointing at
 * nothing is worse for a screen reader than a plain heading is — the same rule
 * as ContactForm's `Field`.
 */
function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <span className={label}>{name}</span>
      {children}
    </div>
  )
}

/**
 * Typed text with its web links made tappable — notes, company, address.
 *
 * Through the suite's shared link check (@unisim/sdk's LinkifiedText, lifted
 * from Universal QR's scanner): an ordinary link opens in a new tab; one that
 * hides where it goes (`bank.com@evil.example`, letters from another alphabet,
 * a bare IP address, a shortener, plain http) stops first and names the
 * website it really opens. Only `http(s)://` and `www.` become links, so a
 * `javascript:` pasted into a note from a CSV import stays text. The words
 * read exactly as typed; the link takes the email row's orange.
 */
function Linked({ text }: { text: string }) {
  const theme = useEffectiveTheme()
  const kit = usePhoneKit()
  const linkClassName =
    'break-all text-orange-300 underline underline-offset-4 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
  // The phone guards the same way but warns in a bottom sheet, not a dialog.
  if (kit) return <kit.Linkified text={text} linkClassName={linkClassName} />
  return (
    <LinkifiedText
      text={text}
      theme={theme}
      linkClassName="break-all text-orange-300 underline underline-offset-4 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    />
  )
}
