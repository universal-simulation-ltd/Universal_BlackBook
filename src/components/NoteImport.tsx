import { useRef, useState } from 'react'
import { importFiles, type ImportResult } from '../lib/noteImport'
import { useNoteStore } from '../stores/noteStore'
import { usePhoneKit } from '../native/kit'
import { useNativeNav } from '../native/nav'
import { useBookStore } from '../stores/bookStore'
import { useT, type Key } from '../i18n'
import { Modal } from './Modal'
import { btnGhost, btnPrimary, btnSubtle } from './ui'

const REASON: Record<ImportResult['skipped'][number]['reason'], Key> = {
  type: 'imp.skip_type',
  size: 'imp.skip_size',
  empty: 'imp.skip_empty',
  damaged: 'imp.skip_damaged',
}

/**
 * Notes ▸ Import (James, 2026-10-25: "Import from OneNote"): pick several
 * files — Word, web pages, text, Markdown — and see what was found before
 * anything is added. Everything is read on the device (lib/noteImport.ts).
 * How to get the files out of OneNote is the help article "Bring your notes
 * from OneNote".
 */
export function NoteImportButton() {
  const t = useT()
  const kit = usePhoneKit()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState<ImportResult | null>(null)
  const addMany = useNoteStore((s) => s.addMany)
  const say = useNativeNav((s) => s.say)
  const setNotice = useBookStore((s) => s.setNotice)
  const nav = useNativeNav()

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      setFound(await importFiles([...files]))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const add = async () => {
    if (!found) return
    const n = await addMany(found.notes)
    setFound(null)
    const message = t.plural('imp.added', n)
    if (kit) say(message)
    else setNotice(message)
  }

  return (
    <>
      <button type="button" className={btnGhost} onClick={() => input.current?.click()} disabled={busy}>
        {busy ? t('imp.reading') : t('imp.import')}
      </button>
      {/* The accept written out (scripts/verify-ios-launch.mjs reads it): no
          image or video types, so iOS never offers the camera here. */}
      <input
        ref={input}
        type="file"
        multiple
        accept=".docx,.html,.htm,.mht,.mhtml,.txt,.md,.markdown,text/plain,text/html,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => void pick(e.target.files)}
      />
      {found && (
        <Modal phone="sheet" title={t('imp.title')} onClose={() => setFound(null)}>
          {found.notes.length > 0 ? (
            <>
              <p className="text-sm text-slate-300">{t.plural('imp.found', found.notes.length)}</p>
              <ul className="mt-3 max-h-[40vh] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-2">
                {found.notes.slice(0, 100).map((n, i) => (
                  <li key={i} className="min-w-0 px-1.5 py-1">
                    <p className="truncate text-sm font-medium text-slate-100">{n.title || t('c.untitled')}</p>
                    <p className="truncate text-xs text-slate-500">
                      {n.createdAt ? `${new Date(n.createdAt).toLocaleDateString(t.locale)} · ` : ''}
                      {n.file}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-slate-300">{t('imp.none')}</p>
          )}
          {found.skipped.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-400">{t('imp.skipped')}</p>
              <ul className="mt-1 space-y-0.5">
                {found.skipped.map((s, i) => (
                  <li key={i} className="break-words text-xs text-slate-500">
                    {s.file}: {t(REASON[s.reason])}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">{t('imp.plain')}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {kit ? (
              <button
                type="button"
                className={btnSubtle}
                onClick={() => {
                  setFound(null)
                  nav.setKb(true)
                  nav.setArticle('notes-from-onenote')
                }}
              >
                {t('imp.howto')}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className={btnGhost} onClick={() => setFound(null)}>
                {t('c.cancel')}
              </button>
              {found.notes.length > 0 && (
                <button type="button" className={btnPrimary} onClick={() => void add()}>
                  {t.plural('imp.add', found.notes.length)}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
