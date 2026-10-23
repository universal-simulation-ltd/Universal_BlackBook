import { useRef, useState } from 'react'
import { fromCsv, toCsv } from '../lib/csv'
import {
  contactsAvailability,
  ContactsPermissionError,
  planBulkImport,
  readAllContacts,
} from '../lib/deviceContacts'
import { saveBlob } from '@unisim/media/save'
import { useBookStore } from '../stores/bookStore'
import { BackupSection } from './BackupSection'
import { Modal } from './Modal'
import { btnGhost, btnPrimary, label } from './ui'
import { useT } from '../i18n'

/**
 * Backup file, then CSV in and out.
 *
 * The backup file (BackupSection) is the whole book, to-dos included, for
 * moving or keeping a copy without an account; signing in to sync with a
 * Universal ID (Online backup, CloudPanel) is the other way across devices.
 * The CSV is the way out to any other address book and in from one,
 * so it stays a first-class screen, and the export button says how many
 * contacts are in the file before you click it.
 */
export function ImportExport({ onClose }: { onClose: () => void }) {
  const t = useT()
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const importBook = useBookStore((s) => s.importBook)
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [error, setError] = useState<string | null>(null)
  // Read once: a device does not grow an address book while the panel is open.
  const [where] = useState(contactsAvailability)
  const [reading, setReading] = useState(false)

  /**
   * Everybody on the phone, minus everybody already here.
   *
   * Always a merge, and never offered as a replace — see `planBulkImport`. The
   * CSV section above keeps both modes because a CSV is usually somebody
   * moving a whole book between devices, which is exactly when "replace what's
   * here" is the right answer; pulling in the phone's contacts never is.
   */
  const importFromPhone = async () => {
    setError(null)
    setReading(true)
    try {
      const picked = await readAllContacts()
      const { contacts: fresh, duplicates } = planBulkImport(picked, contacts)
      if (fresh.length === 0) {
        setError(
          duplicates > 0
            ? t('io.phone_nothing_new', { count: duplicates })
            : t('io.phone_none'),
        )
        return
      }
      const bits = [t.plural('io.phone_added', fresh.length)]
      if (duplicates > 0) bits.push(t('io.phone_skipped', { count: duplicates }))
      // `tags` unchanged: nothing on a phone maps to a BlackBook tag, and
      // inventing "Imported" as one would be the app filing somebody's friends
      // for them — which is the same call the empty tag list makes.
      await importBook(fresh, tags, 'merge', t('io.sentence', { text: bits.join(', ') }))
      onClose()
    } catch (e) {
      setError(
        e instanceof ContactsPermissionError
          ? t('io.phone_denied')
          : t('io.phone_failed'),
      )
    } finally {
      setReading(false)
    }
  }

  const download = () => {
    const blob = new Blob([toCsv(contacts, tags)], { type: 'text/csv;charset=utf-8' })
    // A dated filename, because the second export lands in the same Downloads
    // folder as the first and "blackbook.csv (1)" tells nobody which is newer.
    //
    // ⚠️ Via saveBlob, not a bare `a.download`. In a Capacitor WKWebView the
    // download attribute is IGNORED — silently, with no exception — so the one
    // way out of this app that does not need an account would be a dead button
    // on the phone while looking perfect in every browser test. saveBlob keeps
    // the anchor on the web and hands the phone its share sheet instead.
    saveBlob(blob, `blackbook-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const onFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const result = fromCsv(text, tags)
      if (result.contacts.length === 0) {
        setError(t('io.csv_none'))
        return
      }
      const bits = [t.plural('io.csv_imported', result.contacts.length)]
      if (result.created.length > 0) bits.push(t.plural('io.csv_created', result.created.length))
      if (result.skipped > 0) bits.push(t.plural('io.csv_skipped', result.skipped))
      await importBook(result.contacts, result.tags, mode, t('io.sentence', { text: bits.join(', ') }))
      onClose()
    } catch {
      setError(t('io.csv_failed'))
    }
  }

  // An empty book opens on Import (owner, 2026-10-09): there is nothing to
  // export yet, so the one useful thing goes first and Export drops to the
  // foot. Read ONCE, at open — an import that fills the book must not swap
  // the sections round under the pointer.
  const [importFirst] = useState(() => contacts.length === 0)

  const exportSection = (
    <section className={importFirst ? 'space-y-2 border-t border-slate-800 pt-4' : 'space-y-2'}>
      <h3 className="text-sm font-semibold text-slate-100">{t('io.export_title')}</h3>
      <p className="text-sm text-slate-400">{t('io.export_body')}</p>
      <button type="button" className={btnPrimary} onClick={download} disabled={contacts.length === 0}>
        {t.plural('io.download', contacts.length)}
      </button>
    </section>
  )

  return (
    <Modal title={t('io.title')} onClose={onClose}>
      <div className="space-y-5">
        <BackupSection onDone={onClose} />

        <div className="border-t border-slate-800" />

        {!importFirst && exportSection}

        <section className={importFirst ? 'space-y-2' : 'space-y-2 border-t border-slate-800 pt-4'}>
          <h3 className="text-sm font-semibold text-slate-100">{t('io.import_title')}</h3>
          <p className="text-sm text-slate-400">{t('io.import_body')}</p>
          <div>
            <span className={label}>{t('io.mode')}</span>
            <div className="flex flex-wrap gap-2">
              {(['merge', 'replace'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                    mode === m
                      ? 'border-orange-500/50 bg-orange-500/15 text-orange-300'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {m === 'merge' ? t('io.merge') : t('io.replace')}
                </button>
              ))}
            </div>
            {mode === 'replace' && contacts.length > 0 && (
              <p className="mt-1.5 text-xs text-rose-300">
                {t('io.replace_warning', { count: contacts.length })}
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              // Reset the input, or choosing the SAME file twice in a row fires
              // no change event and the second import silently does nothing.
              e.target.value = ''
              if (file) void onFile(file)
            }}
          />
          <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
            {t('io.choose')}
          </button>
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </section>

        {/* Native only. The web Contact Picker API behind "From my contacts" on
            the main page hands over ONE person at a time by design — there is
            no bulk read in any browser, and there should not be. */}
        {where === 'native' && (
          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-100">{t('io.phone_title')}</h3>
            <p className="text-sm text-slate-400">{t('io.phone_body')}</p>
            <button type="button" className={btnGhost} onClick={() => void importFromPhone()} disabled={reading}>
              {reading ? t('io.phone_reading') : t('io.phone_import')}
            </button>
          </section>
        )}
        {importFirst && exportSection}
      </div>
    </Modal>
  )
}
