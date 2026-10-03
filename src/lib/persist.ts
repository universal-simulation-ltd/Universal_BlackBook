// Ask the browser not to evict the book.
//
// IndexedDB is "best-effort" storage by default: under disk pressure the
// browser may delete it without asking, and Safari drops a site's script-
// written storage after seven days of browser use without a visit. For most
// sites that is a cache going cold. For BlackBook it is somebody's only copy
// of their address book (lib/store.ts), so we ask for "persistent" storage —
// the browser's own promise not to evict it.
//
// Asked on the first WRITE of a session, never on load: Firefox shows a
// permission prompt for this, and a prompt before the person has put anything
// in the book is a question about nothing. Chrome and Safari decide silently
// (installed, bookmarked or often-visited sites get it). The answer is not
// needed for anything — a refusal changes nothing we do — so it is not stored
// or shown, and it is asked at most once per page load.

let asked = false

export function requestPersistentStorage(): void {
  if (asked) return
  asked = true
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (!storage?.persist || !storage.persisted) return
    void storage
      .persisted()
      .then((already) => (already ? true : storage.persist()))
      .catch(() => {})
  } catch {
    /* not offered here (old browser, sandboxed frame) — nothing to do */
  }
}
