import { useState } from 'react'
import { useLockStore } from '../stores/lockStore'
import { Modal } from './Modal'
import { btnDanger, btnGhost, inputBase, label } from './ui'

/**
 * Advanced ▸ Delete all data (owner's request, 2026-10-08: "I am a guest and
 * want to delete all the data").
 *
 * Deleting contacts one by one leaves the tags, the to-do list, the PIN, the
 * saved view behind. This is the same wipe as
 * "Forgotten your PIN?" (`resetDevice` → `wipeDevice` in lib/store.ts, which
 * says what goes and why the reload is part of it), plus this device's display
 * preferences in localStorage.
 *
 * There is no online copy (sign-in and the vault went on 2026-10-20), so the
 * dialog points at the one way back there can be: a backup file saved first.
 *
 * The confirmation is the typed word, as in the PIN reset, for the same reason:
 * there is no undo, and two taps in a menu is one fumble from losing a book.
 */
const WORD = 'DELETE'

export function DeleteAllData({ onClose }: { onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const resetDevice = useLockStore((s) => s.resetDevice)

  const confirm = async () => {
    if (busy || typed !== WORD) return
    setBusy(true)
    try {
      // Every key this app writes is `blackbook.*` (settings). Collected first: removing while indexing shifts the indices.
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('blackbook.')) keys.push(k)
      }
      keys.forEach((k) => localStorage.removeItem(k))
    } catch {
      // Blocked storage: nothing was saved there to delete.
    }
    // Reloads the page — no success state to draw; see Lock's Forgotten.
    await resetDevice()
  }

  return (
    <Modal title="Delete all data" onClose={busy ? () => {} : onClose}>
      <p className="text-sm leading-relaxed text-slate-300">
        Every contact, tag, list and to-do on this device goes, along with your PIN and your
        settings. BlackBook then opens as a new, empty book.
      </p>

      <div className="mt-3 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2.5 text-xs leading-relaxed text-rose-200">
        <p className="font-semibold">Only a backup file can bring this book back.</p>
        <p className="mt-1">
          Save one first (Advanced ▸ Backup, import &amp; export ▸ Save a backup) if you might want
          it again.
        </p>
      </div>

      <label className={`${label} mt-4`} htmlFor="delete-all-confirm">
        Type {WORD} to delete everything
      </label>
      <input
        id="delete-all-confirm"
        className={`${inputBase} w-full`}
        value={typed}
        disabled={busy}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        onChange={(e) => setTyped(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void confirm()
        }}
      />

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={btnGhost} disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={btnDanger}
          disabled={busy || typed !== WORD}
          onClick={() => void confirm()}
        >
          {busy ? 'Deleting…' : 'Delete all data'}
        </button>
      </div>
    </Modal>
  )
}
