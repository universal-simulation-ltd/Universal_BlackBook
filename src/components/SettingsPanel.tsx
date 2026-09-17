import { useSettingsStore } from '../stores/settingsStore'
import { Modal } from './Modal'
import { checkboxCls } from './ui'

/** ⚙ menu ▸ Settings. One tick box per switch; every one starts unticked. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const emailLists = useSettingsStore((s) => s.emailLists)
  const set = useSettingsStore((s) => s.set)

  return (
    <Modal title="Settings" onClose={onClose}>
      <label className="flex items-start gap-3 text-sm text-slate-200">
        <input
          type="checkbox"
          className={`${checkboxCls} mt-0.5`}
          checked={emailLists}
          onChange={(e) => set({ emailLists: e.target.checked })}
        />
        <span>
          Email lists
          <span className="mt-0.5 block text-xs text-slate-500">
            Adds an Email list tab to Add new for typing in a named list of people, and Copy emails and
            Export CSV above your contacts for whatever the list is showing.
          </span>
        </span>
      </label>
    </Modal>
  )
}
