// The PIN lock — what "lock this app" actually stores, and what it does not.
//
// ── What this is ─────────────────────────────────────────────────────────────
//
// A door on the front of the app, on THIS DEVICE. With a PIN set, every fresh
// opening of BlackBook asks for it before the book is rendered at all.
//
// ⚠️ **It is NOT encryption, and the UI must never imply that it is.** The book
// stays in IndexedDB exactly as it always was; somebody with the unlocked phone
// in their hands and a browser devtools window can still read it, and so can
// anybody restoring a device backup. What the lock stops is the ordinary case
// this was asked for: the person who picks up your phone, or looks over your
// shoulder at a list of names with private notes under them. Encrypting the
// book under a FOUR DIGIT pin would be theatre — 10,000 candidates is not a
// key — and it would put somebody's only copy behind a number they can forget.
//
// ── What is stored ───────────────────────────────────────────────────────────
//
// Never the PIN. A PBKDF2-SHA-256 digest of it, with a random per-device salt,
// in the same IndexedDB database as the book (lib/store.ts). Storing it there
// rather than in localStorage is deliberate: the lock and the book are then
// evicted together, so there is no state where the browser has kept the
// contacts and dropped the door in front of them.
//
// The iteration count is the whole defence, because the secret is four digits.
// At 600,000 iterations a candidate costs roughly 300ms of the device's own
// CPU, so walking all 10,000 of them takes the better part of an hour even
// with the database in hand — and the digest gives no way to shortcut it.
// It is stored ALONGSIDE the digest so the number can be raised later without
// locking out every PIN set before the change.

import { fromBase64, toBase64 } from './vault'

/** Bumped only for a change that makes an existing record unreadable. */
export const LOCK_VERSION = 1

/** Four digits. The whole product decision, in one constant. */
export const PIN_LENGTH = 4

/** See the note above: this is the only thing standing in front of 10,000 guesses. */
export const LOCK_KDF_ITERATIONS = 600_000

export interface LockRecord {
  version: number
  /** Base64, 16 random bytes, generated once when the PIN is set. */
  salt: string
  iterations: number
  /** Base64 of the derived bits. Never the PIN. */
  digest: string
}

/** Exactly four ASCII digits. Nothing is trimmed — a space is not a digit. */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^[0-9]{${PIN_LENGTH}}$`).test(pin)
}

/**
 * Keep only what can be typed into the PIN boxes.
 *
 * Applied on every keystroke rather than validated on submit: a numeric
 * `inputMode` is a KEYBOARD HINT and not a restriction — a hardware keyboard,
 * a paste, or a swipe-typed suggestion all put letters in the field — and a
 * field that silently refuses the character is clearer than one that accepts
 * it and complains later.
 */
export function onlyDigits(s: string): string {
  return s.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH)
}

function digestBits(pin: string, saltB64: string, iterations: number): Promise<ArrayBuffer> {
  return crypto.subtle
    .importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
    .then((material) =>
      crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: fromBase64(saltB64) as BufferSource, iterations, hash: 'SHA-256' },
        material,
        256,
      ),
    )
}

/** Hash a PIN against an existing salt and cost. Base64 of 32 bytes. */
export async function hashPin(pin: string, saltB64: string, iterations: number): Promise<string> {
  return toBase64(new Uint8Array(await digestBits(pin, saltB64, iterations)))
}

/** A brand new record for this PIN, with its own salt. */
export async function makeLock(pin: string): Promise<LockRecord> {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)))
  return {
    version: LOCK_VERSION,
    salt,
    iterations: LOCK_KDF_ITERATIONS,
    digest: await hashPin(pin, salt, LOCK_KDF_ITERATIONS),
  }
}

/**
 * Does this PIN open that record?
 *
 * Compared in constant time. The timing of a base64 string comparison against
 * a digest is a weak signal at best, but it costs four lines to not have to
 * think about it.
 */
export async function pinMatches(pin: string, rec: LockRecord): Promise<boolean> {
  if (!isValidPin(pin)) return false
  return sameSecret(await hashPin(pin, rec.salt, rec.iterations), rec.digest)
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Coerce whatever came back out of IndexedDB into a LockRecord, or null.
 *
 * Same rule as the contacts and tags beside it (lib/store.ts): a record that
 * cannot be read is treated as no record at all. ⚠️ For THIS record that means
 * the app opens unlocked, which is the right way round — the alternative is a
 * corrupted row locking somebody out of their own address book permanently,
 * and the lock is a privacy screen, not a safe.
 */
export function toLockRecord(raw: unknown): LockRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.salt !== 'string' || !r.salt) return null
  if (typeof r.digest !== 'string' || !r.digest) return null
  if (typeof r.iterations !== 'number' || !Number.isFinite(r.iterations) || r.iterations < 1) return null
  return {
    version: typeof r.version === 'number' ? r.version : LOCK_VERSION,
    salt: r.salt,
    iterations: r.iterations,
    digest: r.digest,
  }
}

/** Wrong tries before the keypad starts making you wait. */
const FREE_ATTEMPTS = 5

/** The cap. Long enough to be a real cost, short enough not to look broken. */
const MAX_COOLDOWN_MS = 5 * 60_000

/**
 * How long to refuse guesses after `failures` consecutive wrong PINs.
 *
 * Nothing for the first few — a mistyped PIN is the common case and being
 * punished for it is how a lock gets turned off. After that it doubles: 5s,
 * 10s, 20s… to five minutes. Combined with the KDF cost above, an unattended
 * phone is not worth a brute force.
 *
 * ⚠️ In memory only, and therefore reset by a reload. That is a real hole and
 * a deliberate one: persisting it would let a wrong guess lock the OWNER out
 * across restarts, and the durable cost is the 300ms KDF, which a reload does
 * not reset.
 */
export function cooldownMs(failures: number): number {
  if (failures <= FREE_ATTEMPTS) return 0
  return Math.min(MAX_COOLDOWN_MS, 5_000 * 2 ** (failures - FREE_ATTEMPTS - 1))
}
