import { describe, expect, it } from 'vitest'
import { decryptJson, deriveKey, encryptJson, KDF_ITERATIONS, newSalt } from './vault'

// A low iteration count for the tests. The point being proved here is the
// round-trip and the failure modes, not the KDF's cost — and 600k iterations
// per assertion would take this file from milliseconds to most of a minute.
const FAST = 1000

describe('vault', () => {
  it('round-trips a payload', async () => {
    const salt = newSalt()
    const key = await deriveKey('correct horse battery staple', salt, FAST)
    const payload = { version: 1, contacts: [{ id: 'a', name: 'Zoë' }], categories: [], savedAt: 42 }
    const back = await decryptJson<typeof payload>(await encryptJson(payload, key), key)
    expect(back).toEqual(payload)
  })

  it('returns null — not garbage — for the wrong passphrase', async () => {
    const salt = newSalt()
    const right = await deriveKey('right passphrase', salt, FAST)
    const wrong = await deriveKey('wrong passphrase', salt, FAST)
    const ciphertext = await encryptJson({ secret: true }, right)
    expect(await decryptJson(ciphertext, wrong)).toBeNull()
  })

  it('returns null for a vault opened with the wrong salt', async () => {
    const key = await deriveKey('same passphrase', newSalt(), FAST)
    const other = await deriveKey('same passphrase', newSalt(), FAST)
    expect(await decryptJson(await encryptJson({ a: 1 }, key), other)).toBeNull()
  })

  it('returns null for the wrong iteration count, which is why it is stored', async () => {
    const salt = newSalt()
    const key = await deriveKey('pass', salt, FAST)
    const other = await deriveKey('pass', salt, FAST * 2)
    expect(await decryptJson(await encryptJson({ a: 1 }, key), other)).toBeNull()
  })

  it('returns null rather than throwing on a truncated ciphertext', async () => {
    const key = await deriveKey('pass', newSalt(), FAST)
    const ciphertext = await encryptJson({ a: 1 }, key)
    expect(await decryptJson(ciphertext.slice(0, 12), key)).toBeNull()
  })

  it('uses a fresh IV per write, so the same payload never encrypts identically', async () => {
    const key = await deriveKey('pass', newSalt(), FAST)
    const payload = { a: 1 }
    expect(await encryptJson(payload, key)).not.toBe(await encryptJson(payload, key))
  })

  it('generates a distinct salt each time', () => {
    expect(newSalt()).not.toBe(newSalt())
  })

  it('survives a payload larger than the base64 chunking limit', async () => {
    const key = await deriveKey('pass', newSalt(), FAST)
    // ~40k contacts' worth of string — comfortably past the 0x8000-char chunk
    // that String.fromCharCode(...bytes) would blow up on.
    const big = { notes: 'x'.repeat(400_000) }
    const back = await decryptJson<typeof big>(await encryptJson(big, key), key)
    expect(back?.notes).toHaveLength(400_000)
  })

  it('keeps the derived key non-extractable', async () => {
    const key = await deriveKey('pass', newSalt(), FAST)
    expect(key.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  it('states its production cost, so a silent downgrade is a failing test', () => {
    expect(KDF_ITERATIONS).toBeGreaterThanOrEqual(600_000)
  })
})
