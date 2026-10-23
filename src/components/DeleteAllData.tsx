import { useEffect, useState } from 'react'
import { useLockStore } from '../stores/lockStore'
import { Modal } from './Modal'
import { btnDanger, btnGhost, inputBase, label } from './ui'
import { useT } from '../i18n'

/**
 * Advanced ▸ Delete all data (owner's request, 2026-10-08: "I am a guest and
 * want to delete all the data").
 *
 * Deleting contacts one by one leaves the tags, the to-do list, the PIN, the
 * saved view and the remembered backup key behind. This is the same wipe as
 * "Forgotten your PIN?" (`resetDevice` → `wipeDevice` in lib/store.ts, which
 * says what goes and why the reload is part of it), plus this device's display
 * preferences in localStorage.
 *
 * ⚠️ **It never touches the online copy.** A signed-in book's vault stays on
 * the server, and the dialog says so — deleting somebody's backup from a menu
 * row would be the one thing worse than leaving their data on the device.
 *
 * The confirmation is the typed word, as in the PIN reset, for the same reason:
 * there is no undo, and two taps in a menu is one fumble from losing a book.
 */

export function DeleteAllData({ onClose }: { onClose: () => void }) {
  const t = useT()
  // The word typed to confirm, in the language on screen.
  const WORD = t('reset.word').toLocaleUpperCase(t.locale)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState<boolean | null | 'checking'>('checking')
  const hasOnlineCopy = useLockStore((s) => s.hasOnlineCopy)
  const resetDevice = useLockStore((s) => s.resetDevice)

  useEffect(() => {
    let live = true
    void hasOnlineCopy().then((v) => live && setOnline(v))
    return () => {
      live = false
    }
  }, [hasOnlineCopy])

  const confirm = async () => {
    if (busy || typed !== WORD) return
    setBusy(true)
    try {
      // Every key this app writes is `blackbook.*` (settings, the backup
      // prompt). Collected first: removing while indexing shifts the indices.
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
    <Modal title={t('tune_delete_all')} onClose={busy ? () => {} : onClose}>
      <p className="text-sm leading-relaxed text-slate-300">{t('wipe.body')}</p>

      {online === 'checking' ? (
        <p className="mt-3 text-xs text-slate-500">{t('lock.checking_online')}</p>
      ) : online === true ? (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-slate-100">{t('wipe.online_kept')}</p>
          <p className="mt-1">{t('wipe.online_kept_body')}</p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2.5 text-xs leading-relaxed text-rose-200">
          <p className="font-semibold">
            {online === null ? t('lock.online_unknown') : t('wipe.online_none')}
          </p>
          <p className="mt-1">{t('wipe.online_none_body')}</p>
        </div>
      )}

      <label className={`${label} mt-4`} htmlFor="delete-all-confirm">
        {t('wipe.type_word', { word: WORD })}
      </label>
      <input
        id="delete-all-confirm"
        className={`${inputBase} w-full`}
        value={typed}
        disabled={busy}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        onChange={(e) => setTyped(e.target.value.toLocaleUpperCase(t.locale))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void confirm()
        }}
      />

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={btnGhost} disabled={busy} onClick={onClose}>
          {t('c.cancel')}
        </button>
        <button
          type="button"
          className={btnDanger}
          disabled={busy || typed !== WORD}
          onClick={() => void confirm()}
        >
          {busy ? t('wipe.deleting') : t('tune_delete_all')}
        </button>
      </div>
    </Modal>
  )
}
