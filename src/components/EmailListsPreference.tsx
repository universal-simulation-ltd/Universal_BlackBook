import { useSettingsStore } from '../stores/settingsStore'
import { checkboxCls } from './ui'

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
  const emailLists = useSettingsStore((s) => s.emailLists)
  const set = useSettingsStore((s) => s.set)

  return (
    <label className="flex items-start gap-3 py-1 text-sm text-slate-200">
      <input
        type="checkbox"
        className={`${checkboxCls} mt-0.5`}
        checked={emailLists}
        onChange={(e) => set({ emailLists: e.target.checked })}
      />
      <span>
        Email lists
        <span className="mt-0.5 block text-xs text-slate-400">
          Adds Lists beside Contacts, an Email list tab to Add new, and Copy emails and Export CSV for
          whatever the list is showing.
        </span>
      </span>
    </label>
  )
}
