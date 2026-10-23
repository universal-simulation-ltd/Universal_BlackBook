/* eslint-disable react-refresh/only-export-components -- hooks and helpers live beside the components that use them; hot reload of these few files is not worth splitting them */
// layers.tsx — the phone app's pages and bottom sheets: what every website
// popup becomes on the phone (kit.ts says why). Since 2026-10-23 they are the
// SDK's phone kit (@unisim/sdk ▸ "Phone pages, sheets and gestures"), which
// grew out of this file's own copies: PhonePage and BottomSheet, wearing the
// book's look through the kit's tokens (native.css ▸ "The phone kit").
//
//  • A PAGE fills the screen and comes in from the right. Its back button names
//    where it goes; a swipe in from the left edge does the same, the page
//    following the finger; a pull down from its top puts the finger in its
//    first text box.
//  • A SHEET rises from the bottom over a scrim. A tap on the scrim, the grip
//    dragged down, or a big swipe down anywhere on it closes it; a shorter
//    pull focuses its text box.
//
// ⚠️ EVERY LAYER IS ALSO A HISTORY ENTRY (the kit's stack), so Android's back
// gesture closes the top one: @capacitor/app goes `history.back()` while the
// web view has history and leaves the app when it has none. ⚠️ Without
// @capacitor/app installed, back simply leaves the app from any page (seen on
// the emulator, 2026-10-22) — keep the dependency.

import type { ReactNode } from 'react'
import { BottomSheet, configurePhoneLayers, PhonePage, useAnyPhoneLayerOpen } from '@unisim/sdk'
import type { PhonePageProps, PhoneSheetProps } from './kit'

// Above the top bar and the tab bar (z-40), as the stack always was here.
configurePhoneLayers({ baseZ: 60 })

/** Is any page or sheet open over the tabs? */
export const useAnyLayerOpen = useAnyPhoneLayerOpen

export function Page({ title, onBack, backLabel, actions, children, bare = false }: PhonePageProps) {
  return (
    <PhonePage
      title={title}
      onBack={onBack}
      backLabel={backLabel}
      actions={actions}
      className="bb-page"
      bodyClassName={bare ? 'bb-pagebody bare' : 'bb-pagebody'}
    >
      {children}
    </PhonePage>
  )
}

export function Sheet({ title, onClose, children, hideTitle = false }: PhoneSheetProps) {
  return (
    <BottomSheet
      label={title}
      title={hideTitle ? undefined : title}
      onClose={onClose}
      className="bb-sheet"
      bodyClassName="bb-sheetbody"
    >
      {children}
    </BottomSheet>
  )
}

/** One row of a sheet's list of choices. */
export function SheetRow({
  children,
  onClick,
  danger = false,
  icon,
  selected,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
  icon?: ReactNode
  /** A choice that is the current one shows a tick. */
  selected?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`bb-sheetrow${danger ? ' danger' : ''}`}
    >
      {icon && <span className="bb-sheetrow-icon" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1 text-left">{children}</span>
      {selected && (
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m4.5 10.5 3.5 3.5 7.5-8" />
        </svg>
      )}
    </button>
  )
}
