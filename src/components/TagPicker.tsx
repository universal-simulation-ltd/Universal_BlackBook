import { useState } from 'react'
import { SWATCHES } from '../lib/palette'
import { useBookStore } from '../stores/bookStore'
import { TagChip } from './TagChip'
import { btnGhost, inputCls } from './ui'

/**
 * The multi-select on the contact form. Tap a chip to toggle it; type a name
 * and press Enter to create one that doesn't exist yet.
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
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const tags = useBookStore((s) => s.tags)
  const addTag = useBookStore((s) => s.addTag)
  const recolourTag = useBookStore((s) => s.recolourTag)
  const [draft, setDraft] = useState('')
  const [colour, setColour] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  const create = async () => {
    const name = draft.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      const created = await addTag(name)
      if (!created) return
      // A colour was picked before the name was submitted → apply it. Skipped
      // when nothing was picked so the store's own next-unused-swatch choice
      // stands, and skipped for an EXISTING tag: `addTag` hands back the tag
      // that already had that name, and silently recolouring somebody's
      // "Family" because they retyped it is not what they asked for.
      const isNew = !tags.some((t) => t.id === created.id)
      if (colour && isNew) await recolourTag(created.id, colour)
      if (!value.includes(created.id)) onChange([...value, created.id])
      setDraft('')
      setColour(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <p className="text-sm text-slate-500">No tags yet — name one below. They're entirely yours.</p>
        )}
        {tags.map((t) => (
          <TagChip
            key={t.id}
            name={t.name}
            colour={t.colour}
            selected={value.includes(t.id)}
            onClick={() => toggle(t.id)}
          />
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <input
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New tag…"
          aria-label="New tag name"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            // The picker lives inside the contact <form>. Without this, Enter
            // submits the whole form and saves a half-filled contact instead
            // of creating the tag the person was clearly in the middle of.
            e.preventDefault()
            void create()
          }}
        />
        <button type="button" className={btnGhost} onClick={() => void create()} disabled={!draft.trim() || busy}>
          Add
        </button>
      </div>
      {draft.trim() && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-xs text-slate-500">Colour</span>
          {SWATCHES.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-label={s.label}
              aria-pressed={colour === s.key}
              onClick={() => setColour(s.key)}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                colour === s.key ? 'border-slate-100' : 'border-transparent'
              }`}
              style={{ background: s.dot }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
