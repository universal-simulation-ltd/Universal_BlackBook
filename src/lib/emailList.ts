import type { Contact } from './types'

/**
 * The list on screen as a To: line — `Sam Okonkwo <sam@example.com>, …` —
 * ready to paste into Gmail, Outlook or Apple Mail, all of which turn it into
 * recipient chips (owner's request, 2026-09-17).
 *
 * Contacts with no email are left out, and an address that appears twice goes
 * in once. A name carrying a character that means something in an address
 * header (a comma above all — "Okonkwo, Sam" would split into two recipients)
 * is quoted, per RFC 5322.
 */
export function toRecipients(contacts: Contact[]): { text: string; count: number } {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of contacts) {
    const email = c.email.trim()
    if (!email || seen.has(email.toLowerCase())) continue
    seen.add(email.toLowerCase())
    const name = c.name.trim()
    if (!name || name.toLowerCase() === email.toLowerCase()) {
      out.push(email)
    } else if (/[,;:<>@()[\]\\".]/.test(name)) {
      out.push(`"${name.replace(/["\\]/g, '\\$&')}" <${email}>`)
    } else {
      out.push(`${name} <${email}>`)
    }
  }
  return { text: out.join(', '), count: out.length }
}
