import { useId, useState } from 'react'
import { newId } from '../lib/id'
import { FIELD_TYPES, TEMPLATE_LIMITS, type FieldType, type NoteTemplate, type TemplateField } from '../lib/templates'
import { useNoteStore } from '../stores/noteStore'
import { usePanelStore } from '../stores/panelStore'
import { useT, type Key } from '../i18n'
import { Modal } from './Modal'
import { actionSwipe, deleteSwipe, removeSwipe, SelectBar, SwipeGroup, SwipeItem, UndoBar, useHoldSelect, useUndo } from './SwipeActions'
import { usePhoneKit } from '../native/kit'
import type { Note } from '../lib/notes'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputCls, label } from './ui'

const FIELD_TYPE_KEY: Record<FieldType, Key> = {
  text: 'tpl.type_text',
  date: 'tpl.type_date',
  number: 'tpl.type_number',
  link: 'tpl.type_link',
}

/**
 * Tune this app ▸ Note templates (James, 2026-10-25): the list, and a form for
 * one — its name and its fields (each a label and a kind: text, a date, a
 * number or a link). Deleting a template, or taking a field out of one, moves
 * what the notes had in it into their text (lib/templates.ts ▸ retireFields).
 */
export function TemplateManager({ onClose }: { onClose: () => void }) {
  const t = useT()
  const templates = useNoteStore((s) => s.templates)
  const notes = useNoteStore((s) => s.notes)
  const [open, setOpen] = useState<string | null>(null)
  const editing = open === 'new' ? null : templates.find((x) => x.id === open)
  const removeTemplate = useNoteStore((s) => s.removeTemplate)
  const restoreTemplate = useNoteStore((s) => s.restoreTemplate)
  // Swipe left to delete, with Undo: deleting moves the template's fields
  // into its notes' text, and Undo puts the notes back as they were.
  const undo = useUndo<{ template: NoteTemplate; notes: Note[] }[]>(async (snaps) => {
    for (const s of snaps) await restoreTemplate(s)
  })
  const removeMany = async (ids: string[]) => {
    const snaps: { template: NoteTemplate; notes: Note[] }[] = []
    for (const id of ids) {
      const snap = await removeTemplate(id)
      if (snap) snaps.push(snap)
    }
    if (snaps.length) undo.deleted(snaps)
  }
  const remove = (tpl: NoteTemplate) => removeMany([tpl.id])
  const kit = usePhoneKit()
  const sel = useHoldSelect(templates.map((x) => x.id), Boolean(kit))
  return (
    <>
      <Modal title={t('tpl.manage')} onClose={onClose} backLabel={t('tpl.back')}>
        <p className="mb-4 text-sm text-slate-400">{t('tpl.intro')}</p>
        {templates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-800 px-6 py-8 text-center text-sm text-slate-400">{t('tpl.none')}</p>
        ) : (
          <SwipeGroup>
          <SelectBar select={sel} total={templates.length} actions={[{ label: t('c.delete'), danger: true, onClick: (ids) => void removeMany(ids) }]} />
          <ul className="space-y-2">
            {templates.map((tpl) => {
              const count = notes.filter((n) => n.templateId === tpl.id).length
              return (
                <li key={tpl.id}>
                  <SwipeItem
                    id={tpl.id}
                    select={sel}
                    name={tpl.name}
                    left={actionSwipe('edit', t('tpl.edit'), t('tpl.edit_label', { name: tpl.name }), () => setOpen(tpl.id))}
                    right={deleteSwipe(tpl.name, () => void remove(tpl))}
                    focus={[{ label: t('todo.delete_label', { title: tpl.name }), onClick: () => void remove(tpl) }]}
                  >
                  <button
                    type="button"
                    onClick={() => setOpen(tpl.id)}
                    className="flex w-full flex-col items-start gap-0.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 text-left hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <span className="font-semibold text-slate-100">{tpl.name}</span>
                    <span className="text-xs text-slate-400">
                      {tpl.fields.map((f) => f.label).filter(Boolean).join(' · ') || t('tpl.no_fields')}
                    </span>
                    <span className="text-xs text-slate-500">{t.plural('tpl.notes', count)}</span>
                  </button>
                  </SwipeItem>
                </li>
              )
            })}
          </ul>
          </SwipeGroup>
        )}
        {undo.item && (
          <UndoBar
            title=""
            text={
              undo.item.length > 1
                ? t.plural('sel.deleted', undo.item.length)
                : undo.item[0].notes.length
                  ? t.plural('tpl.deleted_moved', undo.item[0].notes.length, { name: undo.item[0].template.name })
                  : t('tpl.deleted', { name: undo.item[0].template.name })
            }
            onUndo={() => void undo.undo()}
          />
        )}
        <div className="mt-4 flex justify-end">
          <button type="button" className={btnPrimary} onClick={() => setOpen('new')}>
            {t('tpl.add')}
          </button>
        </div>
      </Modal>
      {open !== null && <TemplateForm key={open} template={editing ?? null} onClose={() => setOpen(null)} />}
    </>
  )
}

function TemplateForm({ template, onClose }: { template: NoteTemplate | null; onClose: () => void }) {
  const t = useT()
  const ids = useId()
  const saveTemplate = useNoteStore((s) => s.saveTemplate)
  const removeTemplate = useNoteStore((s) => s.removeTemplate)
  const used = useNoteStore((s) => (template ? s.notes.filter((n) => n.templateId === template.id).length : 0))
  const [name, setName] = useState(template?.name ?? '')
  const [fields, setFields] = useState<TemplateField[]>(() =>
    template ? template.fields.map((f) => ({ ...f })) : [{ id: newId(), label: '', type: 'text' }],
  )
  const [confirming, setConfirming] = useState(false)
  const ok = name.trim() !== ''
  // A field swiped away comes back with Undo, in its place (until Save).
  const fieldUndo = useUndo<{ field: TemplateField; at: number }[]>(async (gone) =>
    setFields((fs) => {
      const next = [...fs]
      for (const { field, at } of [...gone].sort((a, b) => a.at - b.at)) if (!next.some((f) => f.id === field.id)) next.splice(at, 0, field)
      return next
    }),
  )
  const removeFields = (ids: string[]) => {
    const gone = fields.map((field, at) => ({ field, at })).filter((x) => ids.includes(x.field.id))
    if (!gone.length) return
    fieldUndo.deleted(gone)
    setFields((fs) => fs.filter((f) => !ids.includes(f.id)))
  }
  const removeField = (i: number) => fields[i] && removeFields([fields[i].id])
  const kit = usePhoneKit()
  const fieldSel = useHoldSelect(fields.map((f) => f.id), Boolean(kit))
  const set = (i: number, p: Partial<TemplateField>) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...p } : f)))
  const move = (i: number, by: number) =>
    setFields((fs) => {
      const j = i + by
      if (j < 0 || j >= fs.length) return fs
      const next = [...fs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const save = () => {
    if (!ok) return
    const now = Date.now()
    void saveTemplate({
      id: template?.id ?? newId(),
      name: name.trim().slice(0, TEMPLATE_LIMITS.name),
      fields: fields.filter((f) => f.label.trim()).map((f) => ({ ...f, label: f.label.trim().slice(0, TEMPLATE_LIMITS.label) })),
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    })
    onClose()
  }

  return (
    <Modal
      title={template ? template.name : t('tpl.new')}
      onClose={onClose}
      backLabel={t('tpl.manage')}
      phoneActions={
        <button type="button" className="min-h-[44px] px-2 text-[16px] font-semibold text-orange-400 disabled:opacity-40" disabled={!ok} onClick={save}>
          {t('c.save')}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor={`${ids}-name`} className={label}>
            {t('tpl.name')}
          </label>
          <input id={`${ids}-name`} className={inputCls} value={name} maxLength={TEMPLATE_LIMITS.name} placeholder={t('tpl.name_placeholder')} onChange={(e) => setName(e.target.value)} />
        </div>
        <fieldset>
          <legend className={label}>{t('tpl.fields')}</legend>
          <SwipeGroup>
          <SelectBar select={fieldSel} total={fields.length} actions={[{ label: t('tpl.remove'), danger: true, onClick: removeFields }]} />
          <ul className="space-y-3">
            {fields.map((f, i) => (
              <li key={f.id}>
              <SwipeItem
                id={f.id}
                select={fieldSel}
                name={f.label || String(i + 1)}
                left={i > 0 ? actionSwipe('up', t('tpl.up'), t('tpl.move_up', { name: f.label || String(i + 1) }), () => move(i, -1)) : undefined}
                right={removeSwipe('leave', t('tpl.remove'), t('tpl.remove_field', { name: f.label || String(i + 1) }), () => removeField(i))}
              >
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center gap-2">
                  <input
                    className={`${inputCls} min-w-0 flex-1`}
                    value={f.label}
                    maxLength={TEMPLATE_LIMITS.label}
                    aria-label={t('tpl.field_label', { n: i + 1 })}
                    placeholder={t('tpl.field_placeholder')}
                    onChange={(e) => set(i, { label: e.target.value })}
                  />
                  <button type="button" className={`${btnSubtle} px-2`} aria-label={t('tpl.move_up', { name: f.label || String(i + 1) })} disabled={i === 0} onClick={() => move(i, -1)}>
                    <Arrow up />
                  </button>
                  <button type="button" className={`${btnSubtle} px-2`} aria-label={t('tpl.move_down', { name: f.label || String(i + 1) })} disabled={i === fields.length - 1} onClick={() => move(i, 1)}>
                    <Arrow />
                  </button>
                  <button
                    type="button"
                    className={`${btnSubtle} px-2`}
                    aria-label={t('tpl.remove_field', { name: f.label || String(i + 1) })}
                    onClick={() => removeField(i)}
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                      <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {/* The kind, as one-of-four buttons rather than a dropdown. */}
                <div role="radiogroup" aria-label={t('tpl.kind')} className="mt-2 grid grid-cols-4 gap-1 rounded-lg bg-slate-800 p-1">
                  {FIELD_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={f.type === type}
                      onClick={() => set(i, { type })}
                      className={`min-h-[32px] rounded-md text-xs font-semibold ${
                        f.type === type ? 'bg-slate-950 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t(FIELD_TYPE_KEY[type])}
                    </button>
                  ))}
                </div>
              </div>
              </SwipeItem>
              </li>
            ))}
          </ul>
          </SwipeGroup>
          {fieldUndo.item && (
            <UndoBar
              title=""
              text={fieldUndo.item.length === 1 ? t('tpl.field_removed', { name: fieldUndo.item[0].field.label || '…' }) : t.plural('sel.deleted', fieldUndo.item.length)}
              onUndo={() => void fieldUndo.undo()}
            />
          )}
          {fields.length < TEMPLATE_LIMITS.fields && (
            <button type="button" className={`${btnGhost} mt-3`} onClick={() => setFields((fs) => [...fs, { id: newId(), label: '', type: 'text' }])}>
              {t('tpl.add_field')}
            </button>
          )}
          {template && <p className="mt-2 text-xs text-slate-500">{t('tpl.removed_note')}</p>}
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
          {template ? (
            <button type="button" className={btnSubtle} onClick={() => setConfirming(true)}>
              {t('c.delete')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>
              {t('c.cancel')}
            </button>
            <button type="button" className={btnPrimary} disabled={!ok} onClick={save}>
              {t('c.save')}
            </button>
          </div>
        </div>
      </div>
      {confirming && template && (
        <Modal phone="sheet" title={t('tpl.delete_title')} onClose={() => setConfirming(false)}>
          <p className="text-sm text-slate-300">{t('tpl.delete_body', { name: template.name })}</p>
          {used > 0 && <p className="mt-2 text-sm text-slate-500">{t.plural('tpl.delete_used', used)}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(false)}>
              {t('c.keep')}
            </button>
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                void removeTemplate(template.id)
                onClose()
              }}
            >
              {t('c.delete')}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-4 w-4 ${up ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Tune this app's row for it, on the website (the phone has a row of its own in Tune). */
export function TemplatesPreference() {
  const t = useT()
  const open = usePanelStore((s) => s.open)
  const count = useNoteStore((s) => s.templates.length)
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
      <span>
        <span className="block text-sm font-medium text-slate-200">{t('tpl.manage')}</span>
        <span className="block text-xs text-slate-400">{t.plural('tpl.count', count)}</span>
      </span>
      <button type="button" className={btnGhost} onClick={() => open('templates')}>
        {t('tpl.open')}
      </button>
    </div>
  )
}
