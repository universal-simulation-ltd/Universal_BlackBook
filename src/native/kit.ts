// kit.ts — how a shared component knows it is on the phone screens, and what
// to draw there instead of a website popup.
//
// The phone app has screens of its own (src/native/, lazy-loaded, see
// shell.ts), but it reuses the website's components — the contact list, the
// form, the panels. Those open `Modal`, a `<dialog>`, a dropdown. On the phone
// none of that is allowed (James, 2026-10-11; store-listings §7: "no website
// popups"): each one becomes a PAGE with a back gesture, a BOTTOM SHEET, or
// the system's own sheet.
//
// So NativeApp puts a kit in context, and a shared component that would open
// a popup asks for it: with a kit it draws `kit.Page` / `kit.Sheet`, without
// one (the website) it draws what it always did. The kit's implementation is
// in the lazy chunk; only this file, a context and two types, is in the
// website's bundle.

import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import type { Contact } from '../lib/types'
import { phoneScreens } from './shell'

export interface PhonePageProps {
  /** The page's title, in the bar beside the back button. */
  title: string
  /** The back button, the left-edge swipe and Android's back all call this. */
  onBack: () => void
  /** What the back button says (where it goes back to). Defaults to "Back". */
  backLabel?: string
  /** Buttons at the right of the bar (a primary action, say). */
  actions?: ReactNode
  children: ReactNode
  /** Full-bleed body: no padding of its own (a full-screen note). */
  bare?: boolean
  /**
   * A title that is typed into where it stands (James, 2026-10-27: "tap the
   * title to edit it inline"): a tap on it in the bar opens a box there.
   * `value` is the real name, which may be empty while `title` says "Unnamed".
   */
  editTitle?: { value: string; label: string; placeholder?: string; onSave: (value: string) => void }
}

export interface PhoneSheetProps {
  /** Read out as the sheet's name; shown as its heading unless `hideTitle`. */
  title: string
  onClose: () => void
  children: ReactNode
  hideTitle?: boolean
}

export interface PhoneKit {
  Page: ComponentType<PhonePageProps>
  Sheet: ComponentType<PhoneSheetProps>
  /** Sign in as a page (Online backup's way in), in place of the SDK's dialog. */
  SignIn: ComponentType<{ onClose: () => void }>
  /** The emoji buttons at the top of a contact's page (Call, Message, Share, "+"). */
  ContactActions: ComponentType<{ contact: Contact; onRemind: () => void }>
  /** A note's links, guarded, with the warning as a sheet (the SDK's is a dialog). */
  Linkified: ComponentType<{ text: string; linkClassName?: string }>
  /** A translated string from the phone screens' own dictionary. */
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const PhoneKitContext = createContext<PhoneKit | null>(null)

/** The kit on the phone screens; null on the website. */
export function usePhoneKit(): PhoneKit | null {
  return useContext(PhoneKitContext)
}

/**
 * May a box focus itself as it appears? Not on the phone (BRANDING.md ▸ "A big
 * swipe down closes a drawer; a short pull puts you in its box"): a page never
 * raises the keyboard on arrival, only when asked for — a tap on the box, or a
 * pull down on the page. A function of the build, not of render, so it is
 * safe anywhere an `autoFocus` is.
 */
export function autoFocusOK(): boolean {
  return !phoneScreens()
}
