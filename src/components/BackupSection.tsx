import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { TRANSFER_ACCEPT, transferErrorText, useFileDrop, useLanguage, type TransferErrorReason } from '@unisim/sdk'
import { saveBlob } from '@unisim/media/save'
import { mergeBackup, openBackup, packBackup, type BackupData } from '../lib/backup'
import { useBookStore } from '../stores/bookStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTodoStore } from '../stores/todoStore'
import { btnDanger, btnGhost, btnPrimary, checkboxCls, inputCls, label } from './ui'
import { autoFocusOK } from '../native/kit'

/**
 * Save a backup / Open a backup — the whole book as one file (lib/backup.ts).
 *
 * Added 2026-10-20 beside the online vault (Online backup, CloudPanel): the way
 * to keep a second copy, or move a book to another device, without an account.
 * Signed in with sync on, whatever a backup brings in is pushed like any other
 * edit. It sits
 * above the CSV section because it is the complete copy; the CSV is the way
 * out to other address books and leaves the to-dos behind.
 *
 * Opening is two questions at most: the password (only when the file has
 * one), then "Add to what's here" or "Replace everything" (which confirms).
 */
type Step =
  | { kind: 'idle' }
  | { kind: 'password'; file: File; wrong: boolean }
  | { kind: 'choose'; data: BackupData; exportedAt: string | null }
  | { kind: 'confirm-replace'; data: BackupData; exportedAt: string | null }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function BackupSection({ onDone }: { onDone: () => void }) {
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const restoreBook = useBookStore((s) => s.restoreBook)
  const todos = useTodoStore((s) => s.todos)
  const { language } = useLanguage()

  const [protect, setProtect] = useState(false)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const [filePassword, setFilePassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mismatch = protect && repeat.length > 0 && password !== repeat
  const canSave = !saving && (!protect || (password.length > 0 && password === repeat))

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setSaved(null)
    setError(null)
    try {
      await useTodoStore.getState().init()
      const settings = useSettingsStore.getState()
      const packed = await packBackup(
        {
          contacts: useBookStore.getState().contacts,
          tags: useBookStore.getState().tags,
          todos: useTodoStore.getState().todos,
          settings: { emailLists: settings.emailLists, todos: settings.todos, shownFields: settings.shownFields },
          view: useBookStore.getState().defaultView,
        },
        {
          password: protect ? password : undefined,
          version: __APP_VERSION__,
          platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
        },
      )
      saveBlob(packed.blob, packed.fileName)
      setSaved(protect ? `Saved ${packed.fileName}, protected with your password.` : `Saved ${packed.fileName}.`)
      setPassword('')
      setRepeat('')
    } catch {
      setError('The backup could not be made. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const fail = (reason: TransferErrorReason) => setError(transferErrorText(reason, language))

  const open = async (file: File, pw?: string) => {
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const result = await openBackup(file, pw)
      if (result.ok) {
        setFilePassword('')
        setStep({ kind: 'choose', data: result.data, exportedAt: result.exportedAt })
      } else if (result.reason === 'needs-password' || result.reason === 'wrong-password') {
        setStep({ kind: 'password', file, wrong: result.reason === 'wrong-password' })
        if (result.reason === 'wrong-password') fail(result.reason)
      } else {
        setStep({ kind: 'idle' })
        fail(result.reason)
      }
    } catch {
      setStep({ kind: 'idle' })
      fail('damaged')
    } finally {
      setBusy(false)
    }
  }

  const drop = useFileDrop({
    onFiles: (files) => void open(files[0]),
    accept: TRANSFER_ACCEPT,
    multiple: false,
    clickToBrowse: false,
    pageWide: true,
    disabled: busy || step.kind === 'choose' || step.kind === 'confirm-replace',
  })

  const apply = async (data: BackupData, mode: 'merge' | 'replace') => {
    setBusy(true)
    try {
      await useTodoStore.getState().init()
      const settings = useSettingsStore.getState()
      if (mode === 'replace') {
        await useTodoStore.getState().replace(data.todos)
        if (data.settings) settings.set(data.settings)
        await restoreBook(
          { contacts: data.contacts, tags: data.tags, view: data.view },
          `Opened the backup: ${plural(data.contacts.length, 'contact', 'contacts')} and ${plural(data.todos.length, 'to-do', 'to-dos')}.`,
        )
      } else {
        const here = { contacts: useBookStore.getState().contacts, tags: useBookStore.getState().tags, todos: useTodoStore.getState().todos }
        const merged = mergeBackup(here, data)
        await useTodoStore.getState().replace(merged.todos)
        // Switches the file had on are turned on here too (so its to-dos and
        // lists can be seen); none is ever turned off by adding.
        if (data.settings) {
          settings.set({
            emailLists: settings.emailLists || data.settings.emailLists,
            todos: settings.todos || data.settings.todos,
            shownFields: [...new Set([...settings.shownFields, ...data.settings.shownFields])],
          })
        }
        const bits = [merged.added > 0 ? `added ${merged.added}` : 'nothing new to add']
        if (merged.updated > 0) bits.push(`updated ${merged.updated} edited more recently in the file`)
        await restoreBook({ contacts: merged.contacts, tags: merged.tags }, `Opened the backup: ${bits.join(', ')}.`)
      }
      setStep({ kind: 'idle' })
      onDone()
    } catch {
      setError('The backup could not be opened into this book. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  const fileSummary = (data: BackupData, exportedAt: string | null) => {
    const when = exportedAt ? new Date(exportedAt) : null
    const date = when && !Number.isNaN(when.getTime()) ? ` saved ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''
    return `This backup${date} holds ${plural(data.contacts.length, 'contact', 'contacts')}, ${plural(data.todos.length, 'to-do', 'to-dos')} and ${plural(data.tags.length, 'tag', 'tags')}.`
  }

  return (
    <section
      {...drop.dropzoneProps}
      aria-label="Backup file"
      className={`space-y-3 rounded-xl ${drop.over ? 'outline outline-2 outline-offset-4 outline-orange-400' : ''}`}
    >
      <h3 className="text-sm font-semibold text-slate-100">Backup file</h3>
      <p className="text-sm text-slate-400">
        Everything in BlackBook in one file: contacts with every field, tags and lists, to-dos and your
        Tune this app choices. Open it on any device to bring the book back. Nothing is sent anywhere.
      </p>

      {/* ── Save ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="flex items-start gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className={`${checkboxCls} mt-0.5`}
            checked={protect}
            onChange={(e) => {
              setProtect(e.target.checked)
              setPassword('')
              setRepeat('')
            }}
          />
          <span>
            Protect with a password
            <span className="block text-xs text-slate-500">
              Your contacts are personal: with a password nobody who finds the file can read it. Forget
              it and the file can't be opened, not even by us.
            </span>
          </span>
        </label>
        {protect && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="backup-password">Password</label>
              <input
                id="backup-password"
                type="password"
                autoComplete="new-password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="backup-password-repeat">Type it again</label>
              <input
                id="backup-password-repeat"
                type="password"
                autoComplete="new-password"
                className={inputCls}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void save()
                }}
              />
            </div>
            {mismatch && <p className="text-xs text-rose-300 sm:col-span-2">The two passwords are different.</p>}
          </div>
        )}
        <button type="button" className={btnPrimary} onClick={() => void save()} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save a backup'}
        </button>
        <p className="text-xs text-slate-500">
          {plural(contacts.length, 'contact', 'contacts')}, {plural(todos.length, 'to-do', 'to-dos')} and{' '}
          {plural(tags.length, 'tag', 'tags')}.
        </p>
        {saved && (
          <p className="text-sm text-emerald-300" role="status">
            {saved}
          </p>
        )}
      </div>

      {/* ── Open ─────────────────────────────────────────────────────── */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <input {...drop.inputProps} className="hidden" data-testid="backup-file-input" />
        {step.kind === 'idle' && (
          <>
            <button type="button" className={btnGhost} onClick={drop.open} disabled={busy}>
              {busy ? 'Opening…' : 'Open a backup'}
            </button>
            <p className="text-xs text-slate-500">
              {Capacitor.isNativePlatform() ? 'Choose the .json file you saved.' : 'Choose the .json file you saved, or drop it here.'}
            </p>
          </>
        )}

        {step.kind === 'password' && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (filePassword) void open(step.file, filePassword)
            }}
          >
            <label className={label} htmlFor="backup-open-password">
              This backup has a password
            </label>
            <input
              id="backup-open-password"
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={filePassword}
              autoFocus={autoFocusOK()}
              onChange={(e) => setFilePassword(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={btnPrimary} disabled={busy || !filePassword}>
                {busy ? 'Opening…' : 'Open'}
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => {
                  setStep({ kind: 'idle' })
                  setFilePassword('')
                  setError(null)
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {step.kind === 'choose' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">{fileSummary(step.data, step.exportedAt)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void apply(step.data, 'merge')}>
                Add to what's here
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => setStep({ kind: 'confirm-replace', data: step.data, exportedAt: step.exportedAt })}
              >
                Replace everything
              </button>
              <button type="button" className={btnGhost} disabled={busy} onClick={() => setStep({ kind: 'idle' })}>
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Adding keeps everything here. Anyone in both is kept once, as last edited.
            </p>
          </div>
        )}

        {step.kind === 'confirm-replace' && (
          <div className="space-y-2 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2.5">
            <p className="text-sm text-rose-200">
              This deletes the {plural(contacts.length, 'contact', 'contacts')}, {plural(todos.length, 'to-do', 'to-dos')}{' '}
              and {plural(tags.length, 'tag', 'tags')} on this device and puts the backup's in their place.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnDanger} disabled={busy} onClick={() => void apply(step.data, 'replace')}>
                Replace everything
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => setStep({ kind: 'choose', data: step.data, exportedAt: step.exportedAt })}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
