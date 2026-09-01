import { describe, expect, it } from 'vitest'
import { cooldownMs, hashPin, isValidPin, makeLock, onlyDigits, pinMatches, toLockRecord } from './lock'

// ⚠️ Every test that derives a digest passes a SMALL iteration count of its
// own. The real one is 600,000 (~300ms a go, on purpose — see lock.ts), and a
// file that paid it a dozen times would be a test suite nobody runs. The cost
// is a product decision; the arithmetic under test is the same at any count,
// which is exactly why the count is stored on the record rather than assumed.
const FAST = 1_000

describe('isValidPin', () => {
  it('takes exactly four digits', () => {
    expect(isValidPin('0000')).toBe(true)
    expect(isValidPin('9174')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('')).toBe(false)
    expect(isValidPin('12 4')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    // Not folded to ASCII anywhere, so it must not pass as digits either.
    expect(isValidPin('１２３４')).toBe(false)
  })
})

describe('onlyDigits', () => {
  it('strips what a numeric keyboard does not stop', () => {
    expect(onlyDigits('12a3')).toBe('123')
    expect(onlyDigits('1 2-3')).toBe('123')
  })

  it('caps at the PIN length, so a paste cannot overrun the field', () => {
    expect(onlyDigits('123456789')).toBe('1234')
  })
})

describe('hashPin', () => {
  it('is deterministic for a PIN, salt and cost', async () => {
    const a = await hashPin('1234', 'c2FsdHkgc2FsdHkh', FAST)
    const b = await hashPin('1234', 'c2FsdHkgc2FsdHkh', FAST)
    expect(a).toBe(b)
  })

  it('never returns the PIN, and differs for a different one', async () => {
    const a = await hashPin('1234', 'c2FsdHkgc2FsdHkh', FAST)
    expect(a).not.toContain('1234')
    expect(a).not.toBe(await hashPin('1235', 'c2FsdHkgc2FsdHkh', FAST))
  })

  it('differs per salt, so two devices with the same PIN store different bytes', async () => {
    const a = await hashPin('1234', 'c2FsdHkgc2FsdHkh', FAST)
    const b = await hashPin('1234', 'YW5vdGhlciBzYWx0IQ==', FAST)
    expect(a).not.toBe(b)
  })
})

describe('makeLock / pinMatches', () => {
  it('round-trips the PIN it was made with', async () => {
    const rec = await makeLock('4821')
    expect(await pinMatches('4821', rec)).toBe(true)
    expect(await pinMatches('4822', rec)).toBe(false)
  }, 20_000)

  it('stores a salt and a cost, and never the PIN', async () => {
    const rec = await makeLock('4821')
    expect(rec.salt.length).toBeGreaterThan(0)
    expect(rec.iterations).toBeGreaterThan(0)
    expect(rec.digest).not.toContain('4821')
  }, 20_000)

  it('rejects a malformed PIN without deriving anything', async () => {
    const rec = { version: 1, salt: 'c2FsdHkgc2FsdHkh', iterations: FAST, digest: 'x' }
    expect(await pinMatches('12', rec)).toBe(false)
    expect(await pinMatches('abcd', rec)).toBe(false)
  })

  it('opens a record written under a DIFFERENT cost — the whole point of storing it', async () => {
    const salt = 'c2FsdHkgc2FsdHkh'
    const old = { version: 1, salt, iterations: FAST, digest: await hashPin('1234', salt, FAST) }
    expect(await pinMatches('1234', old)).toBe(true)
  })
})

describe('toLockRecord', () => {
  it('accepts a well-formed record', () => {
    const rec = { version: 1, salt: 's', iterations: 600000, digest: 'd' }
    expect(toLockRecord(rec)).toEqual(rec)
  })

  it('defaults a missing version rather than dropping the record', () => {
    expect(toLockRecord({ salt: 's', iterations: 10, digest: 'd' })?.version).toBe(1)
  })

  it('reads junk as NO LOCK, never as a lock nothing opens', () => {
    // Each of these would otherwise be a book its owner can never see again.
    expect(toLockRecord(null)).toBeNull()
    expect(toLockRecord('nope')).toBeNull()
    expect(toLockRecord({})).toBeNull()
    expect(toLockRecord({ salt: 's', digest: 'd' })).toBeNull()
    expect(toLockRecord({ salt: 's', iterations: 0, digest: 'd' })).toBeNull()
    expect(toLockRecord({ salt: '', iterations: 10, digest: 'd' })).toBeNull()
    expect(toLockRecord({ salt: 's', iterations: 10, digest: 42 })).toBeNull()
  })
})

describe('cooldownMs', () => {
  it('costs nothing for the first few, because a mistyped PIN is the common case', () => {
    for (let i = 0; i <= 5; i++) expect(cooldownMs(i)).toBe(0)
  })

  it('doubles after that', () => {
    expect(cooldownMs(6)).toBe(5_000)
    expect(cooldownMs(7)).toBe(10_000)
    expect(cooldownMs(8)).toBe(20_000)
  })

  it('caps at five minutes, so a lock cannot wedge its own owner out for an hour', () => {
    expect(cooldownMs(20)).toBe(300_000)
    expect(cooldownMs(500)).toBe(300_000)
  })
})
