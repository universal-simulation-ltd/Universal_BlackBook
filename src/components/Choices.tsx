import type { ReactNode } from 'react'
import { usePhoneKit } from '../native/kit'
import { SheetRow } from '../native/layers'

export interface Choice {
  key: string
  icon: ReactNode
  label: string
  note?: string
  onClick: () => void
}

/**
 * A short list of choices with an icon each — Import's (Contacts, Notes,
 * To-dos, Restore) and Move's. On the phone the sheet's own rows; on the
 * website, cards in the popup.
 */
export function Choices({ choices, disabled = false }: { choices: Choice[]; disabled?: boolean }) {
  const kit = usePhoneKit()
  if (kit) {
    return (
      <>
        {choices.map((c) => (
          <SheetRow key={c.key} icon={c.icon} onClick={c.onClick}>
            <span className="block">{c.label}</span>
            {c.note && <span className="block text-[13px] font-normal text-slate-500">{c.note}</span>}
          </SheetRow>
        ))}
      </>
    )
  }
  return (
    <div className="space-y-2">
      {choices.map((c) => (
        <button
          key={c.key}
          type="button"
          disabled={disabled}
          onClick={c.onClick}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-800 px-4 py-3 text-left transition-colors hover:border-orange-500/50 hover:bg-orange-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-50"
        >
          <span className="h-6 w-6 shrink-0 text-orange-400" aria-hidden>
            {c.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-100">{c.label}</span>
            {c.note && <span className="block text-xs text-slate-400">{c.note}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}
