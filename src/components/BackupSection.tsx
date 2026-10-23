import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { TRANSFER_ACCEPT, transferErrorText, useFileDrop, useLanguage, type TransferErrorReason } from '@unisim/sdk'
import { saveBlob } from '@unisim/media/save'
import { mergeBackup, openBackup, packBackup, type BackupData } from '../lib/backup'
import { useBookStore } from '../stores/bookStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTodoStore } from '../stores/todoStore'
import { useNoteStore } from '../stores/noteStore'
import { btnDanger, btnGhost, btnPrimary, checkboxCls, inputCls, label } from './ui'
import { autoFocusOK } from '../native/kit'
import { useT, type Translator } from '../i18n'

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

/** "2 contacts, 1 to-do, 0 notes and 3 tags", in the language on screen. */
function bookCounts(t: Translator, n: { contacts: number; todos: number; notes?: number; tags?: number }): string {
  const parts = [t.plural('c.contacts', n.contacts), t.plural('c.todos', n.todos)]
  if (n.notes !== undefined) parts.push(t.plural('c.notes', n.notes))
  if (n.tags !== undefined) parts.push(t.plural('c.tags', n.tags))
  return new Intl.ListFormat(t.locale, { type: 'conjunction' }).format(parts)
}

export function BackupSection({ onDone }: { onDone: () => void }) {
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const restoreBook = useBookStore((s) => s.restoreBook)
  const todos = useTodoStore((s) => s.todos)
  const pages = useNoteStore((s) => s.notes)
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
      await Promise.all([useTodoStore.getState().init(), useNoteStore.getState().init()])
      const settings = useSettingsStore.getState()
      const packed = await packBackup(
        {
          contacts: useBookStore.getState().contacts,
          tags: useBookStore.getState().tags,
          todos: useTodoStore.getState().todos,
          pages: useNoteStore.getState().notes,
          settings: { emailLists: settings.emailLists, todos: settings.todos, notes: settings.notes, shownFields: settings.shownFields },
          view: useBookStore.getState().defaultView,
        },
        {
          password: protect ? password : undefined,
          version: __APP_VERSION__,
          platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
        },
      )
      saveBlob(packed.blob, packed.fileName)
      setSaved(protect ? t('bk.saved_protected', { file: packed.fileName }) : t('bk.saved', { file: packed.fileName }))
      setPassword('')
      setRepeat('')
    } catch {
      setError(t('bk.save_failed'))
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
      await Promise.all([useTodoStore.getState().init(), useNoteStore.getState().init()])
      const settings = useSettingsStore.getState()
      if (mode === 'replace') {
        await useTodoStore.getState().replace(data.todos)
        await useNoteStore.getState().replace(data.pages)
        if (data.settings) settings.set(data.settings)
        await restoreBook(
          { contacts: data.contacts, tags: data.tags, view: data.view },
          t('bk.opened', { text: bookCounts(t, { contacts: data.contacts.length, todos: data.todos.length, notes: data.pages.length }) }),
        )
      } else {
        const here = {
          contacts: useBookStore.getState().contacts,
          tags: useBookStore.getState().tags,
          todos: useTodoStore.getState().todos,
          pages: useNoteStore.getState().notes,
        }
        const merged = mergeBackup(here, data)
        await useTodoStore.getState().replace(merged.todos)
        await useNoteStore.getState().replace(merged.pages)
        // Switches the file had on are turned on here too (so its to-dos and
        // lists can be seen); none is ever turned off by adding.
        if (data.settings) {
          settings.set({
            emailLists: settings.emailLists || data.settings.emailLists,
            todos: settings.todos || data.settings.todos,
            notes: settings.notes || data.settings.notes,
            shownFields: [...new Set([...settings.shownFields, ...data.settings.shownFields])],
          })
        }
        const bits = [merged.added > 0 ? t('bk.added', { count: merged.added }) : t('bk.nothing_new')]
        if (merged.updated > 0) bits.push(t('bk.updated', { count: merged.updated }))
        await restoreBook({ contacts: merged.contacts, tags: merged.tags }, t('bk.opened', { text: bits.join(', ') }))
      }
      setStep({ kind: 'idle' })
      onDone()
    } catch {
      setError(t('bk.open_failed'))
    } finally {
      setBusy(false)
    }
  }

  const fileSummary = (data: BackupData, exportedAt: string | null) => {
    const when = exportedAt ? new Date(exportedAt) : null
    const counts = bookCounts(t, { contacts: data.contacts.length, todos: data.todos.length, notes: data.pages.length, tags: data.tags.length })
    return when && !Number.isNaN(when.getTime())
      ? t('bk.holds_dated', { date: when.toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' }), counts })
      : t('bk.holds', { counts })
  }

  return (
    <section
      {...drop.dropzoneProps}
      aria-label={t('bk.title')}
      className={`space-y-3 rounded-xl ${drop.over ? 'outline outline-2 outline-offset-4 outline-orange-400' : ''}`}
    >
      <h3 className="text-sm font-semibold text-slate-100">{t('bk.title')}</h3>
      <p className="text-sm text-slate-400">{t('bk.body')}</p>

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
            {t('bk.protect')}
            <span className="block text-xs text-slate-500">{t('bk.protect_note')}</span>
          </span>
        </label>
        {protect && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="backup-password">{t('bk.password')}</label>
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
              <label className={label} htmlFor="backup-password-repeat">{t('bk.repeat')}</label>
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
            {mismatch && <p className="text-xs text-rose-300 sm:col-span-2">{t('bk.mismatch')}</p>}
          </div>
        )}
        <button type="button" className={btnPrimary} onClick={() => void save()} disabled={!canSave}>
          {saving ? t('bk.saving') : t('bk.save')}
        </button>
        <p className="text-xs text-slate-500">
          {t('io.sentence', { text: bookCounts(t, { contacts: contacts.length, todos: todos.length, notes: pages.length, tags: tags.length }) })}
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
              {busy ? t('bk.opening') : t('bk.open_a')}
            </button>
            <p className="text-xs text-slate-500">
              {Capacitor.isNativePlatform() ? t('bk.choose_native') : t('bk.choose_web')}
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
              {t('bk.has_password')}
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
                {busy ? t('bk.opening') : t('bk.open')}
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
                {t('c.cancel')}
              </button>
            </div>
          </form>
        )}

        {step.kind === 'choose' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">{fileSummary(step.data, step.exportedAt)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void apply(step.data, 'merge')}>
                {t('bk.merge')}
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => setStep({ kind: 'confirm-replace', data: step.data, exportedAt: step.exportedAt })}
              >
                {t('bk.replace')}
              </button>
              <button type="button" className={btnGhost} disabled={busy} onClick={() => setStep({ kind: 'idle' })}>
                {t('c.cancel')}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {t('bk.merge_note')}
            </p>
          </div>
        )}

        {step.kind === 'confirm-replace' && (
          <div className="space-y-2 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2.5">
            <p className="text-sm text-rose-200">
              {t('bk.replace_warning', { counts: bookCounts(t, { contacts: contacts.length, todos: todos.length, notes: pages.length, tags: tags.length }) })}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnDanger} disabled={busy} onClick={() => void apply(step.data, 'replace')}>
                {t('bk.replace')}
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => setStep({ kind: 'choose', data: step.data, exportedAt: step.exportedAt })}
              >
                {t('back')}
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
