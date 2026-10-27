// Message a contact in WhatsApp or WhatsApp Business as well as by text (James,
// 2026-10-27: "is it possible to give choice of WhatsApp / WhatsApp business
// (some have both)"). The phone app asks the phone which of the two are there
// (PhoneContactPlugin: a scheme each on iOS, a package each on Android) and
// opens the chat in the one picked. On the website there is no asking, so
// Message stays a text message there.

import { Capacitor } from '@capacitor/core'
import { PhoneContact } from './deviceContacts'

export type ChatApp = 'whatsapp' | 'business'

/** Which of the two are on this phone; none on the website or if the asking fails. */
export async function chatApps(): Promise<ChatApp[]> {
  if (!Capacitor.isNativePlatform()) return []
  try {
    const { whatsapp, business } = await PhoneContact.chatApps()
    return [...(whatsapp ? (['whatsapp'] as const) : []), ...(business ? (['business'] as const) : [])]
  } catch {
    return []
  }
}

export async function openChat(app: ChatApp, phone: string): Promise<boolean> {
  try {
    return (await PhoneContact.openChat({ app, phone })).opened
  } catch {
    return false
  }
}

// Country calling codes for the countries the suite's languages are spoken in
// and their neighbours: enough to turn a number typed the local way, with its
// leading 0, into the international one WhatsApp needs.
const CALLING: Record<string, string> = {
  GB: '44', IE: '353', US: '1', CA: '1', AU: '61', NZ: '64', ZA: '27', IN: '91',
  FR: '33', BE: '32', CH: '41', LU: '352', MC: '377', DE: '49', AT: '43', NL: '31',
  ES: '34', MX: '52', AR: '54', CL: '56', CO: '57', PE: '51', IT: '39', SM: '378',
  PT: '351', BR: '55', AO: '244', MZ: '258', TR: '90', CY: '357', GR: '30', PL: '48',
  SE: '46', NO: '47', DK: '45', FI: '358',
}

/**
 * A number as WhatsApp wants it: international, digits only, no "+". Typed
 * with a + or 00 it already is; typed the local way ("07700 900123") the
 * leading 0 gives way to the country's code — the contact's own country when
 * their address has one, else this device's.
 */
export function whatsAppNumber(phone: string, country?: string): string {
  const typed = phone.trim()
  const digits = typed.replace(/\D/g, '')
  if (typed.startsWith('+')) return digits
  if (digits.startsWith('00')) return digits.slice(2)
  const code = country ? CALLING[country.toUpperCase()] : undefined
  if (!code) return digits
  if (digits.startsWith('0')) return code + digits.replace(/^0+/, '')
  // North America has no leading 0: a ten-digit number is a local one.
  if (code === '1' && digits.length === 10) return `1${digits}`
  return digits
}
