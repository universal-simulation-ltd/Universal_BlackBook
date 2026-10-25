import { useSettingsStore } from '../stores/settingsStore'
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
  const set = useSettingsStore((s) => s.set)
  const notifyDetails = useSettingsStore((s) => s.notifyDetails)

  return (
    <>
    <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
      <input
        type="checkbox"
        className={`${checkboxCls} mt-0.5`}
        checked={emailLists}
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
        onChange={(e) => set({ notes: !e.target.checked })}
      />
      <span>
        {t('pref.notes')}
        <span className="mt-0.5 block text-xs text-slate-400">{t('pref.notes_note')}</span>
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
