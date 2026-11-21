import { useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { askForLocation } from './currentLocation'
import { askForMotion } from '../lib/shake'
import { checkboxCls } from './ui'
import { useT } from '../i18n'
import { phoneScreens } from '../native/shell'

/**
 * BlackBook's own switches in Tune this app (the website's dialog and the
 * phone's Tune screen draw the same rows, appParts → PREFERENCE_ROWS). Which
 * tabs show is not here: the eye on each row of Tab order shows and hides
 * them (TabOrderPreference, James, 2026-11-20). Every box starts unticked.
 *
 * ⚠️ The website's dialog is themed from the bar's `theme` ("dark" here) with
 * inline styles, but these rows are our markup, so they carry their own dark
 * classes.
 */
export function AppSwitchesPreference() {
  const t = useT()
  const todos = useSettingsStore((s) => s.todos)
  const set = useSettingsStore((s) => s.set)
  const notifyDetails = useSettingsStore((s) => s.notifyDetails)
  const fillLocation = useSettingsStore((s) => s.fillLocation)
  const [locationRefused, setLocationRefused] = useState(false)
  const shakeClear = useSettingsStore((s) => s.shakeClear)
  const [motionRefused, setMotionRefused] = useState(false)

  return (
    <>
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
    {/* A phone's alone: shake on the To-do tab to clear the done ones. iOS
        asks for motion here, inside the tap that turns it on. */}
    {phoneScreens() && todos && (
      <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
        <input
          type="checkbox"
          className={`${checkboxCls} mt-0.5`}
          checked={shakeClear}
          onChange={(e) => {
            const on = e.target.checked
            setMotionRefused(false)
            set({ shakeClear: on })
            if (on)
              void askForMotion().then((ok) => {
                if (!ok) {
                  set({ shakeClear: false })
                  setMotionRefused(true)
                }
              })
          }}
        />
        <span>
          {t('pref.shake_clear')}
          <span className="mt-0.5 block text-xs text-slate-400">{t('pref.shake_clear_note')}</span>
          {motionRefused && <span className="mt-0.5 block text-xs text-rose-300">{t('pref.shake_clear_refused')}</span>}
        </span>
      </label>
    )}
    </>
  )
}
