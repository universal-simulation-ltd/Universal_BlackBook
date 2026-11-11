import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { diffEntries, entryName, type Conflict } from '../lib/syncMerge'
import { useSyncStore } from '../stores/syncStore'
import { useT } from '../i18n'
import type { AppKey } from '../i18n/app/en'
import { btnPrimary } from './ui'

/** The fields a person knows by name; anything else shows its own key. */
const FIELD: Record<string, AppKey> = {
  name: 'form.name',
  title: 'notes.title',
  details: 'todo.details',
  notes: 'form.notes',
  email: 'field.email',
  phone: 'field.phone',
  company: 'field.company',
  address: 'field.address',
  birthdate: 'field.birthday',
  tagIds: 'field.tags',
  items: 'todo.group_items',
  location: 'nlink.location_label',
  fields: 'tpl.fields',
}

const key = (c: Conflict) => `${c.kind}:${c.id}`

/**
 * Another device saved first and both changed the same entries (James,
 * 2026-11-11: "show them the diff so they can pick"). Everything else is
 * merged already; for each of these, what differs, side by side, and which
 * to keep. Preselected: the newer edit, which is what the merge holds now.
 */
export function ClashBlock({ supabase }: { supabase: SupabaseClient }) {
  const t = useT()
  const clash = useSyncStore((s) => s.clash)
  const resolveClash = useSyncStore((s) => s.resolveClash)
  const [keep, setKeep] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  if (!clash) return null
  const keepsLocal = (c: Conflict) => keep[key(c)] ?? (c.local.updatedAt ?? 0) > (c.online.updatedAt ?? 0)
  return (
    <div className="space-y-3 rounded-xl border border-orange-900/60 bg-orange-950/20 px-3 py-3">
      <p className="text-sm font-semibold text-orange-200">{t('cp.clash_title')}</p>
      <p className="text-sm text-slate-300">{t('cp.clash_body')}</p>
      <ul className="space-y-3">
        {clash.result.conflicts.map((c) => {
          const local = keepsLocal(c)
          const rows = diffEntries(c.local, c.online)
          const name = entryName(c.online) || entryName(c.local) || t('c.untitled')
          return (
            <li key={key(c)} className="rounded-lg border border-slate-800 bg-slate-900 p-2.5">
              <p className="mb-2 break-words text-sm font-semibold text-slate-100">{name}</p>
              <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-2">
                {([true, false] as const).map((side) => (
                  <button
                    key={String(side)}
                    type="button"
                    role="radio"
                    aria-checked={local === side}
                    aria-label={side ? t('cp.clash_keep_here') : t('cp.clash_keep_there')}
                    onClick={() => setKeep((k) => ({ ...k, [key(c)]: side }))}
                    className={`min-w-0 rounded-lg border p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      local === side ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {side ? t('cp.clash_here') : t('cp.clash_there')}
                    </span>
                    {rows.map((r) => {
                      const v = side ? r.local : r.online
                      return (
                        <span key={r.field} className="mb-1 block min-w-0">
                          <span className="block text-[11px] font-medium text-slate-500">{FIELD[r.field] ? t(FIELD[r.field]) : r.field}</span>
                          <span className={`line-clamp-4 block whitespace-pre-wrap break-words text-sm ${v ? 'text-slate-100' : 'italic text-slate-500'}`}>
                            {v || t('cp.clash_removed')}
                          </span>
                        </span>
                      )
                    })}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        className={btnPrimary}
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void resolveClash(supabase, keepsLocal).finally(() => setBusy(false))
        }}
      >
        {t('cp.clash_save')}
      </button>
    </div>
  )
}
