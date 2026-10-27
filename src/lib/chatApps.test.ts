import { describe, expect, it } from 'vitest'
import { whatsAppNumber } from './chatApps'

describe('a number for WhatsApp', () => {
  it('keeps one already international, as digits', () => {
    expect(whatsAppNumber('+44 7700 900123')).toBe('447700900123')
    expect(whatsAppNumber('0044 7700 900123', 'FR')).toBe('447700900123')
  })
  it('turns a local one international with the country', () => {
    expect(whatsAppNumber('07700 900123', 'GB')).toBe('447700900123')
    expect(whatsAppNumber('06 12 34 56 78', 'fr')).toBe('33612345678')
    expect(whatsAppNumber('(415) 555-0100', 'US')).toBe('14155550100')
  })
  it('leaves it alone when there is no country to go on', () => {
    expect(whatsAppNumber('07700 900123')).toBe('07700900123')
  })
})
