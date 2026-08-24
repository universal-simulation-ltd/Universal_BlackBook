import { useMemo, useState } from 'react'
import { SWATCHES, swatch } from '../lib/palette'
import { useBookStore } from '../stores/bookStore'
import { Modal } from './Modal'
import { btnGhost, btnPrimary, btnSubtle, inputCls } from './ui'

/**
 * Create, rename, recolour and delete tags.
 *
 * Deleting a tag never deletes the people carrying it — the count beside each
 * row says how many contacts would be un-filed, so the confirmation is a real
 * question and not a shrug. See bookStore.removeTag for the write.
 */
export function TagManager({ onClose }: { onClose: () => void }) {
  const tags = useBookStore((s) => s.tags)
  const contacts = useBookStore((s) => s.contacts)
  const addTag = useBookStore((s) => s.addTag)
  const renameTag = useBookStore((s) => s.renameTag)
  const recolourTag = useBookStore((s) => s.recolourTag)
  const removeTag = useBookStore((s) => s.removeTag)

  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)

  // One pass over the contacts rather than a `filter` per tag — with a few
  // hundred contacts and a dozen tags the quadratic version is the difference
  // between an instant panel and a visible stutter on a phone.
  const counts = useMemo(() => {
    const out = new Map<string, number>()
    for (const c of contacts) for (const id of c.tagIds) out.set(id, (out.get(id) ?? 0) + 1)
    return out
  }, [contacts])

  const sorted = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' })),
    [tags],
  )

  return (
    <Modal title="Tags" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New tag…"
            aria-label="New tag name"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              void addTag(draft).then(() => setDraft(''))
            }}
          />
          <button
            type="button"
            className={btnPrimary}
            disabled={!draft.trim()}
            onClick={() => void addTag(draft).then(() => setDraft(''))}
          >
            Add
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No tags yet. Add one above — they're yours to name, colour and change.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {sorted.map((c) => {
              const count = counts.get(c.id) ?? 0
              return (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: swatch(c.colour).dot }}
                    />
                    <input
                      className={`${inputCls} flex-1`}
                      value={c.name}
                      aria-label={`Rename ${c.name}`}
                      onChange={(e) => void renameTag(c.id, e.target.value)}
                    />
                    <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                      {count} {count === 1 ? 'contact' : 'contacts'}
                    </span>
                    {confirming === c.id ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          className={btnSubtle}
                          onClick={() => {
                            void removeTag(c.id)
                            setConfirming(null)
                          }}
                        >
                          <span className="text-rose-300">Delete</span>
                        </button>
                        <button type="button" className={btnSubtle} onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={btnSubtle}
                        onClick={() => setConfirming(c.id)}
                        aria-label={`Delete ${c.name}`}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {confirming === c.id && count > 0 && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {count} {count === 1 ? 'contact stays' : 'contacts stay'} in your book — they just
                      lose this tag.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
                    {SWATCHES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        aria-label={`${s.label} for ${c.name}`}
                        aria-pressed={c.colour === s.key}
                        onClick={() => void recolourTag(c.id, s.key)}
                        className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                          c.colour === s.key ? 'border-slate-100' : 'border-transparent'
                        }`}
                        style={{ background: s.dot }}
                      />
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex justify-end border-t border-slate-800 pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
