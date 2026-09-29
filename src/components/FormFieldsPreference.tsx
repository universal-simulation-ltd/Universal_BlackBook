import { useEffect, useRef } from 'react'
import { FIELD_LABELS, FORM_FIELDS } from '../lib/formFields'
import { useSettingsStore } from '../stores/settingsStore'
import { checkboxCls } from './ui'

/**
 * Tune this app ▸ Contact form: which fields a new contact's form shows
 * straight away, and which wait under "More" (owner's request, 2026-09-29).
 * The contact form's "Customise fields" button opens Tune this app scrolled
 * to here.
 *
 * ⚠️ Every box starts UNticked, like every switch in this app: unticked is
 * the plain form — Name and Notes, and the rest under More. So a box is worded
 * as "show it", never as "hide it".
 *
 * Lists only appears with Email lists on, as it does on the form.
 */
export function FormFieldsPreference() {
  const shown = useSettingsStore((s) => s.shownFields)
  const toggle = useSettingsStore((s) => s.toggleField)
  const emailLists = useSettingsStore((s) => s.emailLists)
  const focus = useSettingsStore((s) => s.tune?.focus ?? null)
  const ref = useRef<HTMLFieldSetElement>(null)

  // Opened from Customise: bring this section into view rather than leaving
  // it below Language, Colour scheme and the other switches.
  useEffect(() => {
    if (focus === 'fields') ref.current?.scrollIntoView({ block: 'start' })
  }, [focus])

  return (
    <fieldset ref={ref} className="mt-3 border-t border-slate-800 pt-3">
      <legend className="sr-only">Contact form</legend>
      <p aria-hidden className="text-sm font-medium text-slate-200">
        Contact form
      </p>
      <p className="mb-2 mt-0.5 text-xs text-slate-400">
        Tick the fields to show straight away when you add someone. The rest stay under More. A field with
        something in it always shows.
      </p>
      <div className="grid grid-cols-2 gap-x-4">
        {FORM_FIELDS.filter((f) => f !== 'lists' || emailLists).map((f) => (
          <label key={f} className="flex items-center gap-3 py-1 text-sm text-slate-200">
            <input
              type="checkbox"
              className={checkboxCls}
              checked={shown.includes(f)}
              onChange={(e) => toggle(f, e.target.checked)}
            />
            {FIELD_LABELS[f]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
