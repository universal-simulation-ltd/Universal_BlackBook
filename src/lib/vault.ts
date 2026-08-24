// The encrypted vault — what "save my book online" actually stores.
//
// ── Why this is encrypted at all ─────────────────────────────────────────────
//
// The online copy is keyed to a Universal ID, so we could simply have written
// the book into a Postgres row and been done. We do not, because of what is in
// the book: other people's names, other people's email addresses, and a free
// Notes field whose entire purpose is private observations about them. The
// people in someone's BlackBook never consented to anything — they are not
// users of this app and most will never hear of it. Holding that in plaintext
// on our servers is not a risk we get to accept on their behalf.
//
// So: the browser encrypts, the server stores bytes, and UNI·SIM cannot read
// any of it. Same stance as PalsPayIn's relay, reached by the same reasoning.
//
// ── The key ──────────────────────────────────────────────────────────────────
//
// AES-GCM-256, from a passphrase via PBKDF2-SHA-256. The passphrase is NOT the
// Universal ID password and must not be: we would have to receive the account
// password in the clear to derive from it, which is the one thing an auth
// provider must never do, and a password change would then silently orphan the
// vault.
//
// ⚠️ There is no recovery. Losing the passphrase loses the online copy — we
// hold no key, no escrow and no reset. The device that made it still has the
// local book, which is why this is a BACKUP of a local-first app and never the
// primary copy. Every screen that takes the passphrase says so.

/** Bumped only for a change that makes old ciphertext unreadable. */
export const VAULT_VERSION = 1

/**
 * OWASP's floor for PBKDF2-HMAC-SHA-256 (2023) and roughly 300ms on a mid
 * phone — deliberately slow, because the passphrase is the only thing between
 * a stolen database row and the plaintext.
 *
 * Stored ALONGSIDE the ciphertext rather than hardcoded at the read site: when
 * this number is raised, vaults written under the old one must still open. A
 * decrypt path that assumes today's value locks out every existing user the
 * day it changes.
 */
export const KDF_ITERATIONS = 600_000

const enc = new TextEncoder()
const dec = new TextDecoder()

function toBase64(bytes: Uint8Array): string {
  let s = ''
  // Chunked: String.fromCharCode(...bytes) blows the argument limit somewhere
  // around a book with a few thousand contacts, and does it as a RangeError
  // from inside the save path rather than anywhere obvious.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function newSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)))
}

/**
 * Derive the vault key.
 *
 * `extractable: false` is the point of the `false` argument: the resulting
 * CryptoKey can encrypt and decrypt but its raw bytes cannot be read back out
 * by any script, including ours. That is what makes it safe to park in
 * IndexedDB for "remember this device" — an XSS bug can use the key while the
 * tab is open, but it cannot exfiltrate it.
 */
export async function deriveKey(passphrase: string, saltB64: string, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(saltB64) as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Encrypt any JSON-serialisable payload. The IV is prepended to the ciphertext. */
export async function encryptJson(payload: unknown, key: CryptoKey): Promise<string> {
  // A fresh 96-bit IV per write. Reusing one across two writes under the same
  // key is the failure that breaks GCM outright — not a weakening, a break.
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = enc.encode(JSON.stringify(payload))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plain as BufferSource))
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv)
  out.set(ct, iv.length)
  return toBase64(out)
}

/**
 * Decrypt. Returns null on ANY failure, which in practice means one thing:
 * the passphrase was wrong. GCM authenticates, so a wrong key fails the tag
 * check rather than yielding garbage — that is what lets "wrong passphrase"
 * be a reliable message rather than a guess.
 */
export async function decryptJson<T>(ciphertextB64: string, key: CryptoKey): Promise<T | null> {
  try {
    const data = fromBase64(ciphertextB64)
    const iv = data.subarray(0, 12)
    const ct = data.subarray(12)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource)
    return JSON.parse(dec.decode(plain)) as T
  } catch {
    return null
  }
}

// ── Size ─────────────────────────────────────────────────────────────────────

/**
 * The largest ciphertext we will upload, in CHARACTERS OF BASE64.
 *
 * ⚠️ Characters of base64, not bytes of ciphertext — because the base64 string
 * is what `blackbook_vaults.ciphertext` actually stores. It is an unbounded
 * `text` column, and unbounded is the problem this constant exists to fix.
 * Base64 costs 4 characters per 3 bytes, so 2 MB here is ~1.5 MB of encrypted
 * bytes and, near enough, ~1.5 MB of contacts JSON.
 *
 * ⚠️ Deliberately NOT a server-side CHECK constraint (James, 2026-08-24). A
 * constraint violation arrives mid-sync as an opaque Postgres error code, after
 * the edit that caused it has already been made and the request has already
 * gone out. The browser, before the request, is the only place that can say
 * what happened and what to do about it.
 *
 * A contact with every field filled is a few hundred bytes, so this is many
 * thousands of people. In practice it is reached by pasting something large
 * into one Notes field — which is why the message below names Notes first.
 */
export const VAULT_MAX_CIPHERTEXT_CHARS = 2 * 1024 * 1024

function formatSize(chars: number): string {
  const mb = chars / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

/**
 * Check a ciphertext before uploading it. Returns the message to show the user,
 * or `null` to go ahead.
 *
 * The message leads with the fact that nothing is lost, because the failure it
 * describes is alarming and completely non-destructive: the local book is
 * untouched and remains the primary copy. Only the online BACKUP is refused.
 */
export function vaultSizeError(ciphertextB64: string): string | null {
  if (ciphertextB64.length <= VAULT_MAX_CIPHERTEXT_CHARS) return null
  return (
    `This book is too large to save online — ${formatSize(ciphertextB64.length)}, ` +
    `against a ${formatSize(VAULT_MAX_CIPHERTEXT_CHARS)} limit. ` +
    `Nothing has been lost: this device still has every contact. ` +
    `A very long Notes field is the usual cause — shortening the longest ones, ` +
    `or removing contacts you no longer need, will bring it under.`
  )
}
