import { useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { askForLocation } from './currentLocation'
import { checkboxCls } from './ui'
import { useT } from '../i18n'
import { phoneScreens } from '../native/shell'

/**
 * BlackBook's own row in the SDK's App preferences dialog (⚙ menu ▸ App
 * preferences), passed through `<UniversalAppsNavBar appPreferences>`. The SDK
 * draws the dialog, its Language and Colour scheme sections and the heading;
 * this is only what is BlackBook's.
 *
 * ⚠️ The dialog is themed from the bar's `theme` ("dark" here) with inline
 * styles, but this row is our markup, so it carries its own dark classes.
 */
export function EmailListsPreference() {
  const t = useT()
  const emailLists = useSettingsStore((s) => s.emailLists)
  const todos = useSettingsStore((s) => s.todos)
  const notes = useSettingsStore((s) => s.notes)
  const contacts = useSettingsStore((s) => s.contacts)
  const set = useSettingsStore((s) => s.set)
  const notifyDetails = useSettingsStore((s) => s.notifyDetails)
  const fillLocation = useSettingsStore((s) => s.fillLocation)
  const [locationRefused, setLocationRefused] = useState(false)
  // On the phone a tab bar with nothing but Tune in it would be a trap, so the
  // last tab shown can't be hidden (the website always keeps Contacts).
  const phone = phoneScreens()
  const shown = [phone ? contacts : true, emailLists, todos, notes].filter(Boolean).length
  const last = (on: boolean) => phone && on && shown === 1

  return (
    <>
    {phone && (
      <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
        <input
          type="checkbox"
          className={`${checkboxCls} mt-0.5`}
          checked={!contacts}
          disabled={last(contacts)}
          onChange={(e) => set({ contacts: !e.target.checked })}
        />
        <span>
          {t('pref.contacts')}
          <span className="mt-0.5 block text-xs text-slate-400">{t('pref.contacts_note')}</span>
        </span>
      </label>
    )}
    <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
      <input
        type="checkbox"
        className={`${checkboxCls} mt-0.5`}
        checked={emailLists}
        disabled={last(emailLists)}
        onChange={(e) => set({ emailLists: e.target.checked })}
      />
      <span>
        {t('pref.email_lists')}
        <span className="mt-0.5 block text-xs text-slate-400">{t('pref.email_lists_note')}</span>
      </span>
    </label>
    <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
      <input
        type="checkbox"
        className={`${checkboxCls} mt-0.5`}
        // Inverted: the tab is on by default and the box hides it, so the box
        // starts unticked (the suite rule) while To-do starts on.
        checked={!todos}
        disabled={last(todos)}
        onChange={(e) => set({ todos: !e.target.checked })}
      />
      <span>
        {t('pref.todos')}
        <span className="mt-0.5 block text-xs text-slate-400">{t('pref.todos_note')}</span>
      </span>
    </label>
    <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
      <input
        type="checkbox"
        className={`${checkboxCls} mt-0.5`}
        checked={!notes}
        disabled={last(notes)}
        onChange={(e) => set({ notes: !e.target.checked })}
      />
      <span>
        {t('pref.notes')}
        <span className="mt-0.5 block text-xs text-slate-400">{t('pref.notes_note')}</span>
      </span>
    </label>
    {/* Asks for the device's position the moment it is ticked (and only
        then); a refusal unticks it again and says why. */}
    <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
      <input
        type="checkbox"
        className={`${checkboxCls} mt-0.5`}
        checked={fillLocation}
        onChange={(e) => {
          const on = e.target.checked
          setLocationRefused(false)
          set({ fillLocation: on })
          if (on)
            void askForLocation().then((ok) => {
              if (!ok) {
                set({ fillLocation: false })
                setLocationRefused(true)
              }
            })
        }}
      />
      <span>
        {t('pref.fill_location')}
        <span className="mt-0.5 block text-xs text-slate-400">{t('pref.fill_location_note')}</span>
        {locationRefused && <span className="mt-0.5 block text-xs text-rose-300">{t('pref.fill_location_refused')}</span>}
      </span>
    </label>
    {/* Phone notifications are the phone app's: the website shows due
        reminders inside the app, where nothing is on a lock screen. */}
    {phoneScreens() && (
      <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
        <input
          type="checkbox"
          className={`${checkboxCls} mt-0.5`}
          checked={notifyDetails}
          onChange={(e) => set({ notifyDetails: e.target.checked })}
        />
        <span>
          {t('pref.notify_details')}
          <span className="mt-0.5 block text-xs text-slate-400">{t('pref.notify_details_note')}</span>
        </span>
      </label>
    )}
    </>
  )
}
