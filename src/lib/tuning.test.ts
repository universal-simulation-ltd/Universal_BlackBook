import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTACT_ACTIONS } from './quickActions'
import { parseLook, parseTuning, sameLook } from './tuning'

describe('parseTuning', () => {
  it('says nothing without a stamp', () => {
    expect(parseTuning({ shownFields: ['email'] })).toBeNull()
    expect(parseTuning(undefined)).toBeNull()
  })

  it('cleans what it is given', () => {
    const got = parseTuning({ shownFields: ['tags', 'nope', 'email'], notifyDetails: 'yes', fillLocation: true, contactActions: 'x', at: 7 })!
    expect(got.shownFields).toEqual(['email', 'tags'])
    expect(got.notifyDetails).toBe(false)
    expect(got.fillLocation).toBe(true)
    expect(got.contactActions.filter(Boolean)).toEqual([...DEFAULT_CONTACT_ACTIONS])
    expect(got.look).toBeUndefined()
    expect(got.at).toBe(7)
  })
})

describe('parseLook', () => {
  it('keeps known values and nulls the rest', () => {
    expect(parseLook({ scheme: 'dark', language: 'fr', opensOn: 'notes' })).toEqual({ scheme: 'dark', language: 'fr', opensOn: 'notes' })
    expect(parseLook({ scheme: 'pink', language: 'xx', opensOn: 'tune' })).toEqual({ scheme: null, language: null, opensOn: null })
  })

  it('compares by value', () => {
    const a = { scheme: null, language: null, opensOn: 'contacts' as const }
    expect(sameLook(a, { ...a })).toBe(true)
    expect(sameLook(a, { ...a, scheme: 'dark' })).toBe(false)
    expect(sameLook(null, a)).toBe(false)
  })
})
