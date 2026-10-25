import { useMemo, useState } from 'react'
import { isList } from '../lib/lists'
import { SWATCHES, swatch } from '../lib/palette'
import { PATTERNS } from '../lib/patterns'
import { TagMark } from './TagMark'
import { useBookStore } from '../stores/bookStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Modal } from './Modal'
import { useT, type Key } from '../i18n'
import { btnGhost, btnPrimary, btnSubtle, checkboxCls, inputCls } from './ui'

/**
 * Create, rename, recolour and delete tags.
 *
 * Deleting a tag never deletes the people carrying it — the count beside each
 * row says how many contacts would be un-filed, so the confirmation is a real
 * question and not a shrug. See bookStore.removeTag for the write.
 */
export function TagManager({ onClose }: { onClose: () => void }) {
  const t = useT()
  const tags = useBookStore((s) => s.tags)
  const contacts = useBookStore((s) => s.contacts)
  const addTag = useBookStore((s) => s.addTag)
  const renameTag = useBookStore((s) => s.renameTag)
  const recolourTag = useBookStore((s) => s.recolourTag)
  const setTagPattern = useBookStore((s) => s.setTagPattern)
  const removeTag = useBookStore((s) => s.removeTag)
  const setTagKind = useBookStore((s) => s.setTagKind)
  const emailLists = useSettingsStore((s) => s.emailLists)

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

  // Tags only (2026-09-18: lists must not "pollute the tags lists"). A list is
  // renamed and deleted from its own page on the Lists tab.
  const sorted = useMemo(
    () =>
      tags.filter((t) => !isList(t)).sort((a, b) => a.name.localeCompare(b.name, t.locale, { sensitivity: 'base' })),
    [tags, t],
  )

  return (
    <Modal title={t('field.tags')} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('tm.new_placeholder')}
            aria-label={t('tm.new_label')}
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
            {t('c.add')}
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t('tm.none')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {sorted.map((c) => {
              const count = counts.get(c.id) ?? 0
              return (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TagMark colour={swatch(c.colour).dot} pattern={c.pattern} className="h-4 w-4 shrink-0" />
                    <input
                      className={`${inputCls} flex-1`}
                      value={c.name}
                      aria-label={t('tm.rename', { name: c.name })}
                      onChange={(e) => void renameTag(c.id, e.target.value)}
                    />
                    <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                      {t.plural('c.contacts', count)}
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
                          <span className="text-rose-300">{t('c.delete')}</span>
                        </button>
                        <button type="button" className={btnSubtle} onClick={() => setConfirming(null)}>
                          {t('c.cancel')}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={btnSubtle}
                        onClick={() => setConfirming(c.id)}
                        aria-label={t('swipe.delete_label', { name: c.name })}
                      >
                        {t('c.delete')}
                      </button>
                    )}
                  </div>
                  {confirming === c.id && count > 0 && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {t.plural('tm.stay', count)}
                    </p>
                  )}
                  {/* Tag → list. Only with Email lists on, and it is how a list
                      made before lists were their own kind (as a plain tag)
                      becomes one — after which it leaves this panel for the
                      Lists tab. Membership is untouched. */}
                  {emailLists && (
                    <label className="mt-2 flex items-center gap-2 pl-5 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        className={checkboxCls}
                        checked={false}
                        onChange={(e) => e.target.checked && void setTagKind(c.id, 'list')}
                      />
                      {t('tm.is_list')}
                    </label>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
                    {SWATCHES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        aria-label={t('tm.colour_for', { colour: t(`colour.${s.key}` as Key), name: c.name })}
                        aria-pressed={c.colour === s.key}
                        onClick={() => void recolourTag(c.id, s.key)}
                        className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                          c.colour === s.key ? 'border-slate-100' : 'border-transparent'
                        }`}
                        style={{ background: s.dot }}
                      />
                    ))}
                  </div>
                  {/* The pattern, any colour (2026-10-25): two tags of one
                      colour told apart by shape, colour-blind or not. */}
                  <div role="group" aria-label={t('tm.pattern_for', { name: c.name })} className="mt-2 flex flex-wrap gap-1.5 pl-5">
                    {([undefined, ...PATTERNS] as const).map((p) => (
                      <button
                        key={p ?? 'plain'}
                        type="button"
                        aria-label={t(p ? (`pattern.${p}` as Key) : 'pattern.plain')}
                        title={t(p ? (`pattern.${p}` as Key) : 'pattern.plain')}
                        aria-pressed={(c.pattern ?? undefined) === p}
                        onClick={() => void setTagPattern(c.id, p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                          (c.pattern ?? undefined) === p ? 'border-slate-100 bg-slate-800' : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <TagMark colour={swatch(c.colour).dot} pattern={p} className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex justify-end border-t border-slate-800 pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>
            {t('c.done')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
