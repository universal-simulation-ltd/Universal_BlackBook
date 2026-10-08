import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { classifyLink, linkifyText } from '@unisim/sdk/link-safety'

// Links in a contact's notes, company and address open in one tap, and the
// ones that hide where they go ask first (ContactView's <Linked>, over the
// SDK's shared link check). A book is often filled from a CSV or a phone's
// contacts, i.e. text nobody here typed — so the hostile shapes matter.

const view = readFileSync(fileURLToPath(new URL('./ContactView.tsx', import.meta.url)), 'utf8')

describe('ContactView renders typed fields through <Linked>', () => {
  it.each([
    // `notes`, not `contact.notes`: the view shows its own draft, typed in place.
    ['notes', '<Linked text={notes} />', /(^\s*|>)\{(contact\.)?notes\}(\s*$|<)/m],
    ['company', '<Linked text={contact.company} />', /(^\s*|>)\{contact\.company\}(\s*$|<)/m],
    ['address', '<Linked text={contact.address.trim()} />', /(^\s*|>)\{contact\.address\.trim\(\)\}(\s*$|<)/m],
  ])('%s', (_field, uses, raw) => {
    expect(view).toContain(uses)
    expect(view).not.toMatch(raw)
  })

  it('builds no href from a field except the fixed mailto:/tel: ones', () => {
    const hrefs = [...view.matchAll(/href=\{`([^`]*)`\}/g)].map((m) => m[1])
    expect(hrefs.every((h) => h.startsWith('mailto:') || h.startsWith('tel:'))).toBe(true)
    expect(view).not.toMatch(/href=\{contact\./)
  })
})

describe('what a note can hold', () => {
  const hrefs = (t: string) => linkifyText(t).flatMap((s) => (s.href ? [s.href] : []))

  it('a website in a note opens', () => {
    expect(hrefs('Portfolio: https://example.com/jo (new)')).toEqual(['https://example.com/jo'])
  })

  it('www. in the company field opens over https', () => {
    expect(hrefs('Acme Ltd — www.acme.example')).toEqual(['https://www.acme.example/'])
  })

  it.each([
    'javascript:alert(1)',
    '=HYPERLINK("javascript:alert(1)")',
    'data:text/html,<script>alert(1)</script>',
    'file:///C:/Windows/System32',
    'vbscript:msgbox(1)',
  ])('never an href: %s', (note) => {
    expect(hrefs(note)).toEqual([])
    expect(linkifyText(note).map((s) => s.text).join('')).toBe(note)
  })

  it('a hidden destination is named, and asks first', () => {
    const [href] = hrefs('Pay here https://mybank.co.uk@evil.example/pay')
    const v = classifyLink(href)
    expect(v.host).toBe('evil.example')
    expect(v.reasons).toEqual(['userinfo'])
    expect(v.risky).toBe(true)
  })
})
