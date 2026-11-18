import { useMemo, useState } from 'react'
import { useTodoStore } from '../stores/todoStore'
import type { Tag } from '../lib/types'
import { SWATCHES } from '../lib/palette'
import { useBookStore } from '../stores/bookStore'
import { isList } from '../lib/lists'
import { ListChip } from './ListChip'
import { TagChip } from './TagChip'
import { TagCombo } from './TagCombo'
import { CustomColour } from './CustomColour'
import { useT, type Key } from '../i18n'

/** A Work or Personal tag the book does not have yet: made on first use. */
const PRESET = 'preset:'
const TODO_PRESETS = [
  { label: 'todo.tag_work', colour: 'sky' },
  { label: 'todo.tag_personal', colour: 'emerald' },
] as const

/**
 * The multi-select on the contact form, collapsed (TagCombo, 2026-10-23): the
 * chosen tags as chips, then a box — type to find one, or to make a new one
 * with "Add new tag “x”" — and a chevron for the whole list. Tap a chip to
 * toggle it.
 *
 * Chips rather than a `<select multiple>`: a native multi-select needs
 * ctrl-click to add a second value, which is undiscoverable on a desktop and
 * literally impossible on a phone — and "more than one tag" is the field this
 * app exists for.
 *
 * Creating from here writes the tag to the book IMMEDIATELY, before the
 * contact is saved. That is deliberate: a tag invented mid-form and then
 * abandoned along with the form is a stray, but the alternative — holding it
 * pending until save — means two half-built objects and a merge on submit, and
 * the stray costs one tap in the tag manager to remove.
 *
 * The colour is chosen HERE as well as in the manager. A book now starts with
 * no tags at all, so this is where most tags are born, and "make a tag" and
 * "pick its colour" being two screens apart made the colour feel like a
 * setting rather than part of naming the thing.
 */
export function TagPicker({
  value,
  onChange,
  kind,
  open,
  forTodos = false,
}: {
  value: string[]
  onChange: (next: string[]) => void
  /**
   * `'list'` turns this into the contact form's "Add to list" picker (owner's
   * request, 2026-09-17): lists only, and what it creates is a list. `value`
   * still holds the contact's WHOLE `tagIds`, tags included — only the list
   * ids are toggled, so the tags ride through untouched.
   *
   * Without it, TAGS only — a list is never offered as a tag (2026-09-18).
   */
  kind?: 'list'
  /** Every tag shown at once, no chevron (TagCombo `open`): the 🏷️ Tags page. */
  open?: boolean
  /**
   * A to-do's tags (James, 2026-11-18: "have todo tags preset as 'Work'
   * 'Personal' and then beneath have global tags which show ones from
   * contacts and notes to link also"): Work, Personal and every tag a to-do
   * already carries on show first; the book's other tags (the ones contacts
   * and notes use) under the chevron. Work and Personal are offered whether
   * or not the book has them yet — a tap makes the tag — so nothing is
   * written to anyone's book until it is used.
   */
  forTodos?: boolean
}) {
  const t = useT()
  const all = useBookStore((s) => s.tags)
  const listMode = kind === 'list'
  const tags = all.filter((t) => (listMode ? isList(t) : !isList(t)))
  const addTag = useBookStore((s) => s.addTag)
  const recolourTag = useBookStore((s) => s.recolourTag)
  const todos = useTodoStore((s) => s.todos)
  const [colour, setColour] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const presets = useMemo<Tag[]>(() => {
    if (!forTodos) return []
    return TODO_PRESETS.map((p) => {
      const name = t(p.label)
      return tags.find((x) => x.name.trim().toLowerCase() === name.toLowerCase()) ?? { id: `${PRESET}${p.colour}`, name, colour: p.colour }
    })
  }, [forTodos, tags, t])
  const lead = useMemo(() => {
    if (!forTodos) return undefined
    const onTodos = new Set(todos.flatMap((x) => x.tagIds))
    const ids = new Set(presets.map((p) => p.id))
    return { label: t('todo.tags_todo'), options: [...presets, ...tags.filter((x) => onTodos.has(x.id) && !ids.has(x.id))] }
  }, [forTodos, todos, presets, tags, t])
  const options = useMemo(
    () => (lead ? [...lead.options, ...tags.filter((x) => !lead.options.some((o) => o.id === x.id))] : tags),
    [lead, tags],
  )

  /** A preset not in the book yet: made now, in its own colour, and chosen. */
  const makePreset = async (id: string) => {
    const p = presets.find((x) => x.id === id)
    if (!p || busy) return
    setBusy(true)
    try {
      const created = await addTag(p.name)
      if (!created) return
      if (!tags.some((x) => x.id === created.id)) await recolourTag(created.id, p.colour)
      if (!value.includes(created.id)) onChange([...value, created.id])
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string) => {
    if (id.startsWith(PRESET)) return void makePreset(id)
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  const create = async (typed: string) => {
    const name = typed.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      const created = await addTag(name, kind)
      if (!created) return
      // A colour was picked before the name was submitted → apply it. Skipped
      // when nothing was picked so the store's own next-unused-swatch choice
      // stands, and skipped for an EXISTING tag: `addTag` hands back the tag
      // that already had that name, and silently recolouring somebody's
      // "Family" because they retyped it is not what they asked for.
      const isNew = !tags.some((t) => t.id === created.id)
      if (colour && isNew && !listMode) await recolourTag(created.id, colour)
      if (!value.includes(created.id)) onChange([...value, created.id])
      setColour(null)
    } finally {
      setBusy(false)
    }
  }

  const swatches = (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs text-slate-500">{t('tags.colour')}</span>
      {SWATCHES.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-label={t(`colour.${s.key}` as Key)}
          aria-pressed={colour === s.key}
          onClick={() => setColour(s.key)}
          className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
            colour === s.key ? 'border-slate-100' : 'border-transparent'
          }`}
          style={{ background: s.dot }}
        />
      ))}
      <CustomColour value={colour} onPick={setColour} label={t('tags.custom_colour')} />
    </div>
  )

  return (
    <TagCombo
      options={options}
      lead={lead}
      restLabel={t('todo.tags_everywhere')}
      isOn={(id) => value.includes(id)}
      chip={(t) =>
        listMode ? (
          <ListChip name={t.name} selected={value.includes(t.id)} onClick={() => toggle(t.id)} />
        ) : (
          <TagChip name={t.name} colour={t.colour} pattern={t.pattern} selected={value.includes(t.id)} onClick={() => toggle(t.id)} />
        )
      }
      suggestion={(t) => (listMode ? <ListChip name={t.name} /> : <TagChip name={t.name} colour={t.colour} pattern={t.pattern} />)}
      onPick={(id) => (id.startsWith(PRESET) ? void makePreset(id) : onChange(value.includes(id) ? value : [...value, id]))}
      onCreate={create}
      placeholder={listMode ? t('tags.find_or_add_list') : t('tags.find_or_add')}
      createLabel={listMode ? t('tags.add_new_list') : t('tags.add_new')}
      fullLabel={listMode ? t('tags.show_all_lists') : t('tags.show_all')}
      // Lists have no colour of their own to pick — see ListChip.
      open={open}
      belowInput={(_, willCreate) => (willCreate && !listMode ? swatches : null)}
    />
  )
}
