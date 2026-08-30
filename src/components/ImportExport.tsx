import { useRef, useState } from 'react'
import { fromCsv, toCsv } from '../lib/csv'
import { saveBlob } from '../lib/saveFile'
import { useBookStore } from '../stores/bookStore'
import { Modal } from './Modal'
import { btnGhost, btnPrimary, label } from './ui'

/**
 * CSV in and out.
 *
 * This is the app's backup story for anyone who does not want an account, and
 * its way out to any other address book — so it is a first-class screen rather
 * than a menu item, and the export button says how many contacts are in the
 * file before you click it.
 */
export function ImportExport({ onClose }: { onClose: () => void }) {
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)
  const importBook = useBookStore((s) => s.importBook)
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [error, setError] = useState<string | null>(null)

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
        setError('No contacts found in that file. It needs a Name or an Email column.')
        return
      }
      const bits = [`Imported ${result.contacts.length} ${result.contacts.length === 1 ? 'contact' : 'contacts'}`]
      if (result.created.length > 0) bits.push(`created ${result.created.length} new tags`)
      if (result.skipped > 0) bits.push(`skipped ${result.skipped} empty ${result.skipped === 1 ? 'row' : 'rows'}`)
      await importBook(result.contacts, result.tags, mode, `${bits.join(', ')}.`)
      onClose()
    } catch {
      setError('That file could not be read.')
    }
  }

  return (
    <Modal title="Import & export" onClose={onClose}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-100">Export</h3>
          <p className="text-sm text-slate-400">
            A plain CSV — Name, Email, Tags, Notes, Birthday. Opens in any spreadsheet, and BlackBook
            reads it straight back in.
          </p>
          <button type="button" className={btnPrimary} onClick={download} disabled={contacts.length === 0}>
            Download {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </button>
        </section>

        <section className="space-y-2 border-t border-slate-800 pt-4">
          <h3 className="text-sm font-semibold text-slate-100">Import</h3>
          <p className="text-sm text-slate-400">
            Any CSV with a Name or Email column. Tags in the file are matched to yours by name and created
            if they're new — a Categories, Groups or Labels column counts as tags, including one from an
            older BlackBook export.
          </p>
          <div>
            <span className={label}>What to do with what's already here</span>
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
                  {m === 'merge' ? 'Add to my book' : 'Replace my book'}
                </button>
              ))}
            </div>
            {mode === 'replace' && contacts.length > 0 && (
              <p className="mt-1.5 text-xs text-rose-300">
                This deletes all {contacts.length} contacts already in your book.
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
            Choose a CSV file
          </button>
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </section>
      </div>
    </Modal>
  )
}
