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

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { BottomSheet, configurePhoneLayers, PhonePage, useAnyPhoneLayerOpen } from '@unisim/sdk'
import type { PhonePageProps, PhoneSheetProps } from './kit'

// Above the top bar and the tab bar (z-40), as the stack always was here.
configurePhoneLayers({ baseZ: 60 })

/** Is any page or sheet open over the tabs? */
export const useAnyLayerOpen = useAnyPhoneLayerOpen

/** The narrowest a centred title may be before it moves into the room between the buttons. */
const MIN_CENTRED_TITLE = 140

/**
 * Keep a page's title clear of its back button and its actions (James,
 * 2026-10-25: "the title often overlaps the back link"). The SDK centres the
 * title between fixed 96px gutters, which a back label like "‹ Notizen" or a
 * Fine-tune button runs past. This measures the two ends of the bar and sets
 * the title's left and right: the same on both sides (so it stays centred)
 * when that leaves it room, else the room actually between the two. It then
 * truncates with an ellipsis. Run after every render (labels change with the
 * language and the actions with the page) and on every resize.
 */
function useBarFit(marker: RefObject<HTMLSpanElement | null>) {
  useLayoutEffect(() => {
    const row = marker.current?.closest('.unisim-phone-page')?.querySelector<HTMLElement>('.unisim-phone-bar-row')
    if (!row) return
    const fit = () => {
      const box = row.getBoundingClientRect()
      const back = row.querySelector('.unisim-phone-back')?.getBoundingClientRect()
      const acts = row.querySelector('.unisim-phone-actions')?.getBoundingClientRect()
      const left = (back ? back.right - box.left : 0) + 8
      const right = (acts ? box.right - acts.left : 0) + 8
      const side = Math.max(left, right)
      const centred = box.width - 2 * side >= MIN_CENTRED_TITLE
      row.style.setProperty('--bb-title-left', `${Math.round(centred ? side : left)}px`)
      row.style.setProperty('--bb-title-right', `${Math.round(centred ? side : right)}px`)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(row)
    row.querySelectorAll('.unisim-phone-back, .unisim-phone-actions').forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  })
}

export function Page({ title, onBack, backLabel, actions, children, bare = false, editTitle }: PhonePageProps) {
  const marker = useRef<HTMLSpanElement>(null)
  useBarFit(marker)
  return (
    <PhonePage
      title={title}
      onBack={onBack}
      backLabel={backLabel}
      actions={actions}
      className="bb-page"
      bodyClassName={bare ? 'bb-pagebody bare' : 'bb-pagebody'}
    >
      <span ref={marker} hidden />
      {editTitle && <BarTitleEditor marker={marker} title={title} {...editTitle} />}
      {children}
    </PhonePage>
  )
}

/**
 * The page's title, typed into in the bar (James, 2026-10-27: "on the main
 * view allow the user to tap the title to edit it inline"). The SDK draws the
 * title as text, so this lays a tap target over it, in the room useBarFit
 * keeps for it; the tap swaps the text for a box in the same place. Saved on
 * Done (Return) and when the box is left.
 */
function BarTitleEditor({
  marker,
  title,
  value,
  label,
  placeholder,
  onSave,
}: { marker: RefObject<HTMLSpanElement | null>; title: string } & NonNullable<PhonePageProps['editTitle']>) {
  const [row, setRow] = useState<HTMLElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useLayoutEffect(() => {
    setRow(marker.current?.closest('.unisim-phone-page')?.querySelector<HTMLElement>('.unisim-phone-bar-row') ?? null)
  }, [marker])
  useLayoutEffect(() => {
    row?.classList.toggle('bb-titleediting', editing)
  }, [row, editing])
  if (!row) return null
  const save = () => {
    setEditing(false)
    const next = draft.trim()
    if (next !== value) onSave(next)
  }
  return createPortal(
    editing ? (
      <input
        className="bb-titleedit"
        value={draft}
        aria-label={label}
        placeholder={placeholder}
        autoFocus
        enterKeyHint="done"
        autoComplete="off"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    ) : (
      <button
        type="button"
        className="bb-titletap"
        aria-label={`${label}: ${title}`}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
      />
    ),
    row,
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
