import { create } from 'zustand'
import { clearLock, loadLock, loadSyncMeta, saveLock, wipeDevice } from '../lib/store'
import { cooldownMs, isValidPin, makeLock, pinMatches, type LockRecord } from '../lib/lock'

/**
 * The door on the front of the app.
 *
 *   'unknown'  still reading the disk. Nothing is rendered on top of this —
 *              the app shows neither the book nor the keypad until it knows
 *              which one is right, because a flash of somebody's contacts
 *              before the lock appears is the one thing this feature exists
 *              to prevent.
 *   'off'      no PIN on this device.
 *   'locked'   a PIN is set and has not been entered THIS opening.
 *   'open'     a PIN is set and has been entered.
 *
 * ⚠️ 'open' is deliberately not persisted anywhere. "Ask on every fresh
 * opening" is the whole requirement, and a store created fresh on every page
 * load gives it for free: a reload, a relaunch, or a cold start of the
 * Capacitor app all begin at 'locked' again. (An iOS app RESUMED from the
 * background is not a fresh opening and does not re-ask — the WebView was
 * never torn down. That is the same behaviour as the phone's own apps.)
 */
export type LockStatus = 'unknown' | 'off' | 'locked' | 'open'

/** Why a PIN was refused. `wait` is the cooldown; `bad` is "that is not four digits". */
export type PinResult = 'ok' | 'wrong' | 'wait' | 'bad'

interface LockState {
  status: LockStatus
  record: LockRecord | null
  /** Consecutive wrong PINs. In memory only — see `cooldownMs`. */
  failures: number
  /** Epoch ms until which guesses are refused. 0 = not waiting. */
  blockedUntil: number

  init: () => Promise<void>
  /** Try to open the gate. */
  unlock: (pin: string) => Promise<PinResult>
  /** Turn the lock ON. Refuses if one is already set — that is `change`. */
  setPin: (pin: string) => Promise<PinResult>
  /** Turn the lock OFF, which needs the PIN that is on. */
  removePin: (pin: string) => Promise<PinResult>
  /**
   * Is there an online copy of this book, so a reset is recoverable?
   *
   * Read from the sync bookkeeping on disk, NOT from the network — the lock
   * screen is the first thing the app draws and may well be offline, and the
   * answer decides which of two very different warnings the reset shows.
   * `null` means "could not tell", which the UI must treat as the bad case.
   */
  hasOnlineCopy: () => Promise<boolean | null>
  /**
   * The way back in for somebody who has genuinely forgotten their PIN: throw
   * this device's copy away and start it over, unlocked.
   *
   * ⚠️ Destructive on purpose, and it is what keeps the lock a lock. See
   * `wipeDevice` in lib/store.ts for why clearing the PIN on its own would be
   * a bypass rather than a reset.
   */
  resetDevice: () => Promise<void>
}

export const useLockStore = create<LockState>((set, get) => ({
  status: 'unknown',
  record: null,
  failures: 0,
  blockedUntil: 0,

  init: async () => {
    if (get().status !== 'unknown') return
    let record: LockRecord | null = null
    try {
      record = await loadLock()
    } catch {
      // IndexedDB unavailable (private mode on some engines, a storage error).
      // The book itself will have failed to load too, so there is nothing to
      // protect and nothing gained by refusing to start.
      record = null
    }
    set({ record, status: record ? 'locked' : 'off' })
  },

  unlock: async (pin) => {
    const { record, blockedUntil, failures } = get()
    if (!record) return 'ok'
    if (Date.now() < blockedUntil) return 'wait'
    if (!isValidPin(pin)) return 'bad'
    if (await pinMatches(pin, record)) {
      set({ status: 'open', failures: 0, blockedUntil: 0 })
      return 'ok'
    }
    const next = failures + 1
    const wait = cooldownMs(next)
    set({ failures: next, blockedUntil: wait > 0 ? Date.now() + wait : 0 })
    return 'wrong'
  },

  setPin: async (pin) => {
    if (get().record) return 'wrong'
    if (!isValidPin(pin)) return 'bad'
    const record = await makeLock(pin)
    await saveLock(record)
    // 'open', not 'locked': the person setting the PIN is looking at the app
    // they just locked. It takes effect the next time it is opened, which is
    // what the panel tells them.
    set({ record, status: 'open', failures: 0, blockedUntil: 0 })
    return 'ok'
  },

  removePin: async (pin) => {
    const { record, blockedUntil, failures } = get()
    if (!record) return 'ok'
    if (Date.now() < blockedUntil) return 'wait'
    if (!isValidPin(pin)) return 'bad'
    if (!(await pinMatches(pin, record))) {
      const next = failures + 1
      const wait = cooldownMs(next)
      set({ failures: next, blockedUntil: wait > 0 ? Date.now() + wait : 0 })
      return 'wrong'
    }
    await clearLock()
    set({ record: null, status: 'off', failures: 0, blockedUntil: 0 })
    return 'ok'
  },

  hasOnlineCopy: async () => {
    try {
      const meta = await loadSyncMeta()
      // `rev > 0` and not merely "there is a row": bookkeeping exists from the
      // moment a vault is set up, but until a push has actually landed there
      // is nothing on the server to come back from. Promising a restore that
      // does not exist is the one wrong answer this function can give.
      return meta !== null && meta.rev > 0
    } catch {
      return null
    }
  },

  resetDevice: async () => {
    await wipeDevice()
    set({ record: null, status: 'off', failures: 0, blockedUntil: 0 })
    // ⚠️ **The reload is part of the wipe, not a nicety after it.** Clearing
    // IndexedDB leaves three copies of what was just destroyed sitting in
    // memory, and every one of them puts it back:
    //   • bookStore still holds the contacts, so the app would render the list
    //     it has just deleted — and App.tsx's autosave would push that list
    //     back into the vault a couple of seconds later.
    //   • syncStore still holds the derived vault CryptoKey, which is the one
    //     secret this device is not supposed to have any more.
    //   • the autosave timer is already scheduled and does not care that the
    //     store beneath it changed.
    // Resetting each store by hand would work until somebody adds a fourth,
    // so this does the one thing that cannot be forgotten. It lives here
    // rather than at the call site for the same reason.
    //
    // Optional-chained because this store is unit-tested in a `node`
    // environment with no DOM, where `location` does not exist.
    globalThis.location?.reload?.()
  },
}))
