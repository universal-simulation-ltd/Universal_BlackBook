import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { GrowingTextarea } from './GrowingTextarea'
import { blankDraft, draftIsEmpty, useBookStore, type ContactDraft } from '../stores/bookStore'
import { useSettingsStore } from '../stores/settingsStore'
import { isList, listIdsOf } from '../lib/lists'
import { locationText } from '../lib/geo'
import { formatBirthday } from '../lib/birthday'
import { ABOVE_NOTES, fieldLabel, FORM_FIELDS, type FormField } from '../lib/formFields'
import { useT } from '../i18n'
import type { Tag } from '../lib/types'
import { BirthdayField } from './BirthdayField'
import { EmailListForm } from './EmailListForm'
import { TagPicker } from './TagPicker'
import { PhoneContactLink } from './PhoneContactLink'
import { LocationFields } from './LocationFields'
import { newLocation, useCurrentLocation } from './currentLocation'
import { Modal } from './Modal'
import { ExpandGlyph, NotesFullscreen } from './NotesFullscreen'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls, label, PinGlyph, textareaCls } from './ui'
import { autoFocusOK, usePhoneKit } from '../native/kit'

/**
 * Add or edit one person. Six fields, in the order they matter — but on a blank
 * form only TWO of them are showing.
 *
 * ⚠️ **Notes sits directly under Name**, above everything else that is
 * showing. It is the field with the most in it and the one people came to
 * write — "met at the Leeds conference, two kids" is why they opened the form
 * — and it used to be last, below both pickers, which put the main event below
 * the fold on a phone. On a blank form it is now the SECOND thing on screen.
 *
 * ⚠️ **Notes has a "Full screen" button on its label** (owner's request,
 * 2026-08-31), which opens NotesFullscreen — a second dialog on top of this
 * one, holding nothing but the note. Seven rows is the right size for the field
 * in a form and the wrong size for reading a note that has grown, and on a
 * phone reading one means scrolling a box inside a scrolling form.
 *
 * ⚠️ **Tags are LAST, below the birthday** (owner's call, 2026-08-30). They
 * were above it, which is the wrong way round for how the form is actually
 * filled in: a birthday is a fact you either have to hand or do not, and tags
 * are a decision — and a decision that opens a picker, adds rows to the
 * dialog, and can create a tag mid-form has no business standing between the
 * typing and the Save button.
 *
 * ⚠️ **FOUR of the six are folded behind "More" unless they hold something** —
 * email, phone, birthday and tags (owner's call, 2026-08-30, extended from two
 * to four on 2026-08-30). Only Name and Notes are unconditional, and that is
 * the app in one line: the name of a person, and the private thing you know
 * about them. Everything else is already on the phone's own contact card.
 *
 * ⚠️ **The split is by CONTENT, not by field.** A field arriving with a value
 * sits out in the open and only the empty ones hide — an email you HAVE
 * recorded has to be visible when you open the contact, or the form is lying
 * about what it holds. The consequence worth knowing: for an existing contact
 * the form looks exactly as it always did, because everything filled in is
 * still there, in its old place. It is only a BLANK form that is short.
 *
 * ⚠️ Which is why the pinned fields render in TWO groups, either side of
 * Notes, rather than in one list. Email and phone are identity and belong
 * above the notes about the person; birthday and tags are the two that used to
 * be below it. Rendering all four in one block after Notes would have shuffled
 * a form people already know, for no reason beyond it being less code.
 *
 * ⚠️ **Which fields a BLANK form shows is the user's to choose** (owner's
 * request, 2026-09-29): Customise, under More, opens Tune this app at its
 * "Contact form" section, and a ticked field is out in the open on every new
 * contact. Nothing ticked is the form described above. The content rule still
 * wins either way — a filled-in field is never hidden.
 *
 * ⚠️ The split is decided ONCE, at mount, and deliberately does not re-run.
 * Recomputing it would make a field you just filled in inside "More" jump out
 * of the section you are looking at and land somewhere else on the page,
 * mid-edit. Same reasoning as the `stashed` read above.
 *
 * Validation is now a NAME and nothing else (owner's call, 2026-08-30). It
 * used to be "a name or an email", which cannot survive email moving behind a
 * disclosure: the one field that could satisfy the rule was no longer on
 * screen, so a blank form would have refused to save with nothing visible to
 * explain why. A name is also the only field this app can show you in a list.
 * It need not be a person's — "Plumber (the good one)" is a perfectly good
 * entry in a little black book.
 */
export function ContactForm({ id }: { id: string }) {
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const saveContact = useBookStore((s) => s.saveContact)
  const removeContact = useBookStore((s) => s.removeContact)
  const setPinned = useBookStore((s) => s.setPinned)
  const setListHidden = useBookStore((s) => s.setListHidden)
  const setBirthdayHidden = useBookStore((s) => s.setBirthdayHidden)
  const close = useBookStore((s) => s.edit)
  const stashDraft = useBookStore((s) => s.stashDraft)
  const clearStash = useBookStore((s) => s.clearStash)
  // Read ONCE, at mount. App keys this component on `editing`, so it remounts
  // every time the form opens — which is exactly when "was something left
  // half-typed?" is the right question, and never again while it is open.
  const [stashed] = useState(() => useBookStore.getState().stashed)
  // Same rule, and read at the same moment: a contact just chosen out of the
  // phone's address book (bookStore.startWith).
  const [prefill] = useState(() => useBookStore.getState().prefill)
  // A form Customise set aside (see bookStore.parked) — read once, then let go.
  const [parked] = useState(() => {
    const p = useBookStore.getState().parked
    return p && p.id === id ? p.draft : null
  })
  useEffect(() => {
    if (parked) useBookStore.setState({ parked: null })
  }, [parked])

  const existing = id === 'new' ? undefined : contacts.find((c) => c.id === id)
  // ⚠️ A prefill BEATS a stash, and silently. Both want the same empty form,
  // but the prefill is what the user picked seconds ago and the stash is
  // something they abandoned earlier — offering "you were part way through
  // adding someone" over the top of a contact they just chose would be the app
  // answering a question nobody asked. The stash is left alone rather than
  // dropped, so it is still there the next time a genuinely blank form opens.
  const restorable = id === 'new' && !prefill && !parked && stashed !== null && !draftIsEmpty(stashed)

  const [draft, setDraft] = useState<ContactDraft>(() =>
    parked
      ? parked
      : existing
      ? {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          company: existing.company,
          address: existing.address,
          location: existing.location,
          tagIds: existing.tagIds,
          birthdate: existing.birthdate,
          notes: existing.notes,
        }
      : prefill
        ? prefill
        : restorable
          ? stashed
          : blankDraft(),
  )
  /** Is the "you were part way through" bar still showing? */
  const [offering, setOffering] = useState(restorable)
  const [confirmDelete, setConfirmDelete] = useState(false)
  /** The folded fields opened, each on its own (2026-10-27: one fold per section, not one "More"). */
  const [opened, setOpened] = useState<Extra[]>([])
  /** Is Notes showing on its own, full screen? */
  const [notesFull, setNotesFull] = useState(false)
  const foldId = useId()
  const formId = useId()
  const kit = usePhoneKit()
  /**
   * The Lists tab's Add new opens the Email list form here instead of a
   * person; a string is the open list's name. Read once, at mount, like
   * `prefill`. There is no switch between the two inside the dialog any more
   * (owner's call, 2026-09-18) — which one you get is where you pressed it.
   */
  const [listMode] = useState(() => (id === 'new' && !prefill ? useBookStore.getState().listMode : false))
  const emailLists = useSettingsStore((s) => s.emailLists)
  const park = useBookStore((s) => s.park)
  const openTune = useSettingsStore((s) => s.openTune)
  const tags = useBookStore((s) => s.tags)

  // Which of the optional fields are out in the open: the ones that arrived
  // with something in them, and the ones Customise ticked. Read once, from
  // the draft's INITIAL value — see the note above. A ticked Lists still
  // needs Email lists switched on, like its place under More.
  const [pinned] = useState<Extra[]>(() => {
    const shown = useSettingsStore.getState().shownFields
    return EXTRAS.filter((k) => hasValue(k, draft, tags) || (shown.includes(k) && (k !== 'lists' || emailLists)))
  })
  // Lists only offer themselves with App preferences ▸ Email lists on — but a
  // contact already ON a list shows it regardless, by the content rule above.
  // On the phone every field is a fold, filled or not (James, 2026-10-27: the
  // address of a contact that had one showed open with no fold), each saying
  // what it holds while shut. The website keeps filled fields out in the open.
  const allFolded = Boolean(kit)
  const hidden = EXTRAS.filter((k) => (allFolded || !pinned.includes(k)) && (k !== 'lists' || emailLists || pinned.includes(k)))
  // Rendered either side of Notes, in the order they were always in.
  const pinnedAbove = allFolded ? [] : pinned.filter((k) => ABOVE_NOTES.includes(k))
  const pinnedBelow = allFolded ? [] : pinned.filter((k) => !ABOVE_NOTES.includes(k))

  const patch = (p: Partial<ContactDraft>) => setDraft((d) => ({ ...d, ...p }))
  // A new contact's address starts at the nearest town, with Tune this app ▸
  // Fill in my current location on (useCurrentLocation does nothing off).
  const [isNew] = useState(() => useBookStore.getState().fresh === id)
  useCurrentLocation(isNew && !draft.location && !draft.address?.trim(), (here) =>
    setDraft((d) => (d.location || d.address?.trim() ? d : { ...d, location: { ...newLocation(), ...here } })),
  )
  const valid = Boolean(draft.name.trim())
  // Fine-tune on the phone leaves out what the person's page already edits in
  // place (James, 2026-10-27: "don't have options that can be accessed via the
  // main view"): the name (typed into the page's title) and the note. A
  // contact with no name yet still gets the box: Save needs one.
  const [onPage] = useState(() => Boolean(kit && existing && existing.name.trim()))

  /**
   * One of the four foldable fields, wherever it happens to be rendering.
   *
   * The same call site draws it pinned above Notes, pinned below Notes, or
   * inside the disclosure, which is what guarantees a field looks and behaves
   * identically in all three places — the earlier version of this file wrote
   * the picker JSX out twice and they had already started to drift.
   *
   * ⚠️ The ids are fixed strings, not generated, because a field is only ever
   * on screen in ONE of those three positions at a time. Pinned and hidden are
   * complements by construction (`hidden` is `EXTRAS` minus `pinned`), so a
   * duplicate id here is impossible unless that invariant is broken.
   */
  const renderExtra = (k: Extra, folded = false) => {
    // Inside its fold the fold's own header names it; the label stays for a screen reader.
    const lab = folded ? 'sr-only' : label
    switch (k) {
      case 'email':
        return (
          <div key={k}>
            <label className={lab} htmlFor="cf-email">
              {fieldLabel('email')}
            </label>
            <input
              id="cf-email"
              className={inputCls}
              // `type="email"` would let the browser block submission on anything
              // without an @ — including a perfectly good internal address, and
              // including the empty string on some older engines. The field is
              // optional and the app never sends mail, so the keyboard hint is
              // worth having and the validation is not.
              type="text"
              inputMode="email"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="sam@example.com"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )
      case 'company':
        return (
          <div key={k}>
            <label className={lab} htmlFor="cf-company">
              {fieldLabel('company')}
            </label>
            <input
              id="cf-company"
              className={inputCls}
              value={draft.company ?? ''}
              onChange={(e) => patch({ company: e.target.value })}
              placeholder="Acme Ltd"
              autoComplete="off"
            />
          </div>
        )
      case 'phone':
        return (
          <div key={k}>
            <label className={lab} htmlFor="cf-phone">
              {fieldLabel('phone')}
            </label>
            <input
              id="cf-phone"
              className={inputCls}
              // `type="tel"` for the keypad, and it carries no validation of its
              // own in any engine — which is what this field wants. An address
              // book holds extensions, "ask for Dave", and numbers in formats no
              // pattern of ours would predict, and the value is never dialled by
              // this app.
              type="tel"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+44 7700 900123"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )
      case 'address':
        // In parts since 2026-10-25 (Street, City, County, Country, with
        // suggestions); an address kept as one block reads in as the street.
        return (
          <fieldset key={k}>
            <legend className={lab}>{fieldLabel('address')}</legend>
            <LocationFields
              withPlace={false}
              value={draft.location ?? (draft.address?.trim() ? { street: draft.address } : newLocation())}
              onChange={(location) => patch({ location })}
            />
          </fieldset>
        )
      case 'birthday':
        return (
          <Field key={k} folded={folded} name={fieldLabel(k)}>
            <BirthdayField value={draft.birthdate} onChange={(birthdate) => patch({ birthdate })} />
          </Field>
        )
      case 'tags':
        return (
          <Field key={k} folded={folded} name={fieldLabel(k)}>
            <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} />
          </Field>
        )
      case 'lists':
        return (
          // "Lists" on the More button, but the heading says what the section
          // does, in the owner's words.
          <Field key={k} folded={folded} name={t('form.add_to_list')}>
            <TagPicker value={draft.tagIds} onChange={(tagIds) => patch({ tagIds })} kind="list" />
          </Field>
        )
    }
  }

  /** What a shut fold holds, on its header: "Guildford, Surrey". */
  const summary = (k: Extra): string => {
    switch (k) {
      case 'email':
        return draft.email.trim()
      case 'company':
        return draft.company?.trim() ?? ''
      case 'phone':
        return draft.phone.trim()
      case 'address':
        return draft.location ? locationText(draft.location, t.locale).replace(/\n+/g, ', ') : (draft.address?.trim().replace(/\n+/g, ', ') ?? '')
      case 'birthday':
        return draft.birthdate ? formatBirthday(draft.birthdate) : ''
      case 'tags':
      case 'lists': {
        const lists = listIdsOf(tags)
        return tags
          .filter((x) => draft.tagIds.includes(x.id) && (k === 'lists') === lists.has(x.id))
          .map((x) => x.name)
          .join(', ')
      }
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    void saveContact(draft)
  }

  /**
   * Closed WITHOUT a decision — the backdrop, Escape, or the ✕.
   *
   * A click on the backdrop is the easiest accident on this screen: the dialog
   * is small, the page behind it is a list people are trying to read, and
   * everything typed used to go in the bin with no warning. So it is kept, and
   * offered back the next time the form opens.
   *
   * Note this is NOT what Cancel does. Cancel is somebody saying no, and an app
   * that answers "are you sure? here it is again" to a deliberate no is
   * arguing with its user.
   */
  const dismiss = () => {
    if (id === 'new') stashDraft(draft)
    close(null)
  }

  const cancel = () => {
    if (id === 'new') clearStash()
    close(null)
  }

  if (listMode !== false) {
    return (
      <Modal
        title={
          // A name typed into the Lists tab's search may be a list that does
          // not exist yet: then it is a new list with that name.
          typeof listMode === 'string' &&
          tags.some((x) => isList(x) && x.name.trim().toLowerCase() === listMode.trim().toLowerCase())
            ? t('form.add_to_named', { name: listMode })
            : t('form.new_list')
        }
        onClose={() => close(null)}
      >
        <EmailListForm
          initialName={typeof listMode === 'string' ? listMode : ''}
          onCancel={() => close(null)}
          onSaved={() => close(null)}
        />
      </Modal>
    )
  }

  return (
    <Modal
      title={existing ? t('form.fine_tune_title') : t('c.add_new')}
      onClose={dismiss}
      // The phone: back to the person (or the list), and Save in the bar —
      // the button at the foot of a long form is a scroll away.
      backLabel={kit ? (existing ? existing.name || kit.t('back') : kit.t('contact_back')) : undefined}
      phoneActions={
        kit && (
          <button type="submit" form={formId} disabled={!valid} className="min-h-[44px] px-2 text-[16px] font-semibold text-orange-400 disabled:opacity-40">
            {kit.t('save')}
          </button>
        )
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        {offering && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-900/60 bg-orange-950/30 px-3 py-2.5">
            <p className="text-sm text-orange-200">
              {t('form.restore')}
            </p>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} onClick={() => setOffering(false)}>
                {t('form.continue')}
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setDraft(blankDraft())
                  clearStash()
                  setOffering(false)
                }}
              >
                {t('form.discard')}
              </button>
            </div>
          </div>
        )}

        {!onPage && (
          <div>
            <label className={label} htmlFor="cf-name">
              {t('form.name')}
            </label>
            <input
              id="cf-name"
              className={inputCls}
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Sam Okonkwo"
              autoFocus={autoFocusOK()}
              autoComplete="off"
            />
          </div>
        )}

        {pinnedAbove.map((k) => renderExtra(k))}

        {!onPage && (
          <div>
            {/* The label and its full-screen button share a row, and BOTH carry
                the label's own `mb-1.5` rather than the row carrying it. Putting
                the margin on the row and cancelling it on the label with `mb-0`
                is the version that silently does nothing: Tailwind resolves a
                conflict by CSS source order, not by the order of the class
                string — the same trap that made the birthday year box full
                width (see ui.tsx). */}
            <div className="flex items-center justify-between gap-2">
              <label className={label} htmlFor="cf-notes">
                {t('form.notes')}
              </label>
              <button
                type="button"
                className={`${btnSubtle} mb-1.5 flex items-center gap-1.5`}
                onClick={() => setNotesFull(true)}
              >
                <ExpandGlyph />
                {t('form.full_screen')}
              </button>
            </div>
            <GrowingTextarea
              id="cf-notes"
              className={textareaCls}
              // ⚠️ Seven rows, up from four (owner's request, 2026-09-11). Four
              // was chosen to keep the pickers below it in reach on a phone;
              // those pickers are now folded behind "More" on a blank form, so
              // the room is there — and this is the field people came to write
              // in. `resize-y` (textareaCls) still lets it be dragged taller,
              // and the Full screen button above is the way out for a note that
              // has grown past any row count.
              rows={7}
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder={t('form.notes_placeholder')}
            />
          </div>
        )}

        {pinnedBelow.map((k) => renderExtra(k))}

        {/* One fold per empty field, each named (James, 2026-10-27: "instead
            of more now have collapsables for each section"), in place of the
            single "More" that held them all. Unmounted while shut: BirthdayField
            and TagPicker own popups and focus, and a hidden subtree can still
            hold tabbable children in some engines. */}
        {hidden.length > 0 && (
          <div className="space-y-2">
            {hidden.map((k) => {
              const open = opened.includes(k)
              return (
                <div key={k} className="rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOpened((o) => (open ? o.filter((x) => x !== k) : [...o, k]))}
                    aria-expanded={open}
                    aria-controls={`${foldId}-${k}`}
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="shrink-0 text-sm font-medium text-slate-300">{k === 'lists' ? t('form.add_to_list') : fieldLabel(k)}</span>
                      {!open && summary(k) && <span className="min-w-0 truncate text-sm text-slate-500">{summary(k)}</span>}
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {open && (
                    <div id={`${foldId}-${k}`} className="px-3 pb-3">
                      {renderExtra(k, true)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Outside the More block, so it is still there once every field has
            been brought out and there is no More left to put it in. */}
        <div className="-mt-2 flex justify-end">
          <button
            type="button"
            className={`${btnSubtle} flex items-center gap-1.5`}
            onClick={() => {
              // On the website the person's full-screen view is a <dialog>
              // in the top layer, which would sit over the SDK's Tune this
              // app; it steps aside (the phone stacks pages and keeps it).
              if (!kit) useBookStore.getState().view(null)
              park(id, draft)
              openTune('fields')
            }}
          >
            <SlidersGlyph />
            {t('form.customise')}
          </button>
        </div>

        {existing && (
          <PhoneContactLink
            contact={existing}
            onUpdate={(p) => {
              // The phone's values fill the boxes; an empty one on the phone
              // leaves what is here. Saved, or not, with Save.
              patch({
                name: p.name || draft.name,
                email: p.email || draft.email,
                phone: p.phone || draft.phone,
                address: p.address || draft.address,
                ...(p.address ? { location: { street: p.address } } : {}),
                birthdate: p.birthdate ?? draft.birthdate,
              })
              setOpened(hidden)
            }}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
          <div>
            {existing &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rose-300">
                    {t('del.ask_before')}
                    {existing.name || t('c.this_contact')}
                    {t('del.ask_after')}
                  </span>
                  <button type="button" className={btnDanger} onClick={() => void removeContact(existing.id)}>
                    {t('c.delete')}
                  </button>
                  <button type="button" className={btnGhost} onClick={() => setConfirmDelete(false)}>
                    {t('c.keep')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Pinning lives here rather than on the card (James,
                      2026-10-11: a cleaner card). It takes effect on the tap,
                      like hiding somebody, not on Save — the form's draft has
                      no pin, and `saveContact` carries the stored one over. */}
                  <button
                    type="button"
                    aria-pressed={existing.pinnedAt !== undefined}
                    className={`${btnSubtle} flex items-center gap-1.5 ${existing.pinnedAt !== undefined ? '!text-orange-400 hover:!text-orange-300' : ''}`}
                    onClick={() => void setPinned(existing.id, existing.pinnedAt === undefined)}
                    title={existing.pinnedAt !== undefined ? t('form.unpin') : t('form.pin_title')}
                  >
                    <PinGlyph filled={existing.pinnedAt !== undefined} />
                    {existing.pinnedAt !== undefined ? t('list.pinned') : t('form.pin')}
                  </button>
                  {/* The phone's person page has no ⋯ any more (its "+" picks a
                      button instead), so hiding them lives here. */}
                  {kit && (
                    <button type="button" className={btnSubtle} onClick={() => void setListHidden(existing.id, !existing.hideFromList)}>
                      {existing.hideFromList ? t('row.show_list_title') : t('row.hide_list_title')}
                    </button>
                  )}
                  {kit && existing.birthdate && (
                    <button type="button" className={btnSubtle} onClick={() => void setBirthdayHidden(existing.id, !existing.hideBirthday)}>
                      {existing.hideBirthday ? t('row.show_birthdays_title') : t('row.hide_birthdays_title')}
                    </button>
                  )}
                  <button type="button" className={btnDanger} onClick={() => setConfirmDelete(true)}>
                    {t('c.delete')}
                  </button>
                </div>
              ))}
          </div>
          {!confirmDelete && (
            <div className="flex gap-2">
              <button type="button" className={btnGhost} onClick={cancel}>
                {t('c.cancel')}
              </button>
              <button type="submit" className={btnPrimary} disabled={!valid}>
                {t('c.save')}
              </button>
            </div>
          )}
        </div>
        {!valid && (
          <p className="text-xs text-slate-500">
            {t('form.needs_name')}
          </p>
        )}
      </form>

      {/* Rendered inside the form, and it makes no difference where: a
          `showModal()` dialog is painted in the top layer, not where it sits
          in the tree. Inside is where the draft is, which is what matters. */}
      {notesFull && (
        <NotesFullscreen
          value={draft.notes}
          onChange={(v) => patch({ notes: v })}
          onClose={() => setNotesFull(false)}
          name={draft.name}
        />
      )}
    </Modal>
  )
}

// The fields that fold away when empty — see lib/formFields, which the
// Customise section in Tune this app shares.
const EXTRAS = FORM_FIELDS
type Extra = FormField

function SlidersGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M2 4h7M13 4h1M2 12h1M7 12h7M11 2.5v3M5 10.5v3" strokeLinecap="round" />
    </svg>
  )
}

/** Did this field arrive with something in it? Decides pinned vs. folded. */
function hasValue(k: Extra, draft: ContactDraft, tags: Tag[]): boolean {
  const lists = listIdsOf(tags)
  switch (k) {
    case 'email':
      return draft.email.trim() !== ''
    case 'company':
      return (draft.company ?? '').trim() !== ''
    case 'phone':
      return draft.phone.trim() !== ''
    case 'address':
      return (draft.address ?? '').trim() !== '' || Boolean(draft.location?.street || draft.location?.city)
    case 'birthday':
      return Boolean(draft.birthdate)
    case 'tags':
      return draft.tagIds.some((id) => !lists.has(id))
    case 'lists':
      return draft.tagIds.some((id) => lists.has(id))
  }
}

/**
 * One labelled row. A `<span>` and not a `<label>`: neither of these wraps a
 * single form control — BirthdayField is three, TagPicker is a list of
 * buttons — and a `<label>` pointing at nothing is worse for a screen reader
 * than a plain heading is.
 */
function Field({ name, folded = false, children }: { name: string; folded?: boolean; children: ReactNode }) {
  return (
    <div>
      <span className={folded ? 'sr-only' : label}>{name}</span>
      {children}
    </div>
  )
}
