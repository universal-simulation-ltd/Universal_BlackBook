/**
 * Ids for contacts and categories.
 *
 * `crypto.randomUUID` needs a secure context, which `http://<lan-ip>:5173` is
 * not — so testing the dev server from a phone on the same network would
 * otherwise throw on the first save. The fallback is not a security control
 * (nothing here is), only a collision-avoidance one.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
