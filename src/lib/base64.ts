// Base64 for the PIN lock's salt and digest (lib/lock.ts). It lived in
// lib/vault.ts until the online vault was removed (2026-10-20); the backup
// file's own encryption is the SDK's (`@unisim/sdk` transfer.ts).

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  // Chunked: String.fromCharCode(...bytes) blows the argument limit on a large
  // array, and does it as a RangeError from somewhere nobody would look.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
