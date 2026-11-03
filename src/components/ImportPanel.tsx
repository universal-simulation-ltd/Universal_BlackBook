import { useRef, useState } from 'react'
import { importFiles, type ImportResult } from '../lib/noteImport'
import { fileTagName, knownNames, planPeopleImport } from '../lib/peopleImport'
import { importTodoFiles, type TodoImportResult } from '../lib/todoImport'
import { useNoteStore } from '../stores/noteStore'
import { useTodoStore } from '../stores/todoStore'
import { useSettingsStore } from '../stores/settingsStore'
import { usePhoneKit } from '../native/kit'
import { useNativeNav } from '../native/nav'
import { IconContactsBook, IconFile, IconNote, IconPerson, IconTodo } from '../native/icons'
import { useBookStore } from '../stores/bookStore'
import { isList } from '../lib/lists'
import { useT, type Key } from '../i18n'
import { BackupSection } from './BackupSection'
import { Choices } from './Choices'
import { ImportExport } from './ImportExport'
import { Modal } from './Modal'
import { removeSwipe, SelectBar, SwipeGroup, SwipeItem, UndoBar, useHoldSelect, useUndo } from './SwipeActions'
import { btnGhost, btnPrimary, btnSubtle, inputCls, label, radioCls } from './ui'

/**
 * Import (James, 2026-10-26: "Remove the import button from notes and include
 * it on the imports on tuning — click import then choice of Contacts, Notes,
 * ToDo, restore BlackBook backup"). One door for everything coming in: Tune ▸
 * Import on the phone, Advanced ▸ Import on the website, and the empty book's
 * Import. Notes and To-dos open the file picker straight from their row (a
 * file input has to be clicked in the tap itself, or iOS ignores it) and then
 * show what was found before anything is added; Contacts and the backup are
 * the screens they always were (ImportExport, BackupSection).
 *
 * People from OneNote (James, 2026-11-03) reads the same files as Notes, but
 * makes a person of each page (lib/peopleImport.ts).
 */
type Step = 'choose' | 'contacts' | 'restore'
/** How the people from OneNote are tagged: by their section, all with one tag, or not. */
type TagMode = 'section' | 'custom' | 'none'

const NOTE_SKIP: Record<ImportResult['skipped'][number]['reason'], Key> = {
  type: 'imp.skip_type',
  size: 'imp.skip_size',
  empty: 'imp.skip_empty',
  damaged: 'imp.skip_damaged',
}
const TODO_SKIP: typeof NOTE_SKIP = { ...NOTE_SKIP, type: 'tdi.skip_type' }

export function ImportPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const kit = usePhoneKit()
  const nav = useNativeNav()
  const setNotice = useBookStore((s) => s.setNotice)
  const addNotes = useNoteStore((s) => s.addMany)
  const addTodos = useTodoStore((s) => s.addMany)
  const contacts = useBookStore((s) => s.contacts)
  const importPeople = useBookStore((s) => s.importPeople)
  const addTag = useBookStore((s) => s.addTag)
  const [step, setStep] = useState<Step>('choose')
  const [reading, setReading] = useState(false)
  const [notes, setNotes] = useState<ImportResult | null>(null)
  const [todos, setTodos] = useState<TodoImportResult | null>(null)
  const [people, setPeople] = useState<ImportResult | null>(null)
  const [tagMode, setTagMode] = useState<TagMode | null>(null)
  const [customTag, setCustomTag] = useState('')
  const tags = useBookStore((s) => s.tags)
  const noteInput = useRef<HTMLInputElement>(null)
  const peopleInput = useRef<HTMLInputElement>(null)
  const todoInput = useRef<HTMLInputElement>(null)
  // On the phone, back from a step is back to the choice; the website's ✕ shuts.
  const back = kit ? () => setStep('choose') : onClose

  const read = async <R,>(input: HTMLInputElement, files: FileList | null, run: (f: File[]) => Promise<R>, done: (r: R) => void) => {
    if (!files?.length) return
    setReading(true)
    try {
      done(await run([...files]))
    } finally {
      setReading(false)
      input.value = ''
    }
  }

  const finish = (message: string) => {
    if (kit) nav.say(message)
    else setNotice(message)
    onClose()
  }

  // The phone's help article on exporting from OneNote (Notes and People alike).
  const howto = kit ? (
    <button
      type="button"
      className={btnSubtle}
      onClick={() => {
        onClose()
        nav.setKb(true)
        nav.setArticle('notes-from-onenote')
      }}
    >
      {t('imp.howto')}
    </button>
  ) : undefined

  if (notes) {
    return (
      <ImportReview
        title={t('imp.title')}
        items={notes.notes.map((n) => ({
          title: n.title,
          sub: `${n.createdAt ? `${new Date(n.createdAt).toLocaleDateString(t.locale)} · ` : ''}${n.file}`,
        }))}
        skipped={notes.skipped.map((s) => ({ file: s.file, why: t(NOTE_SKIP[s.reason]) }))}
        found={(n) => t.plural('imp.found', n)}
        add={(n) => t.plural('imp.add', n)}
        none={t('imp.none')}
        plain={t('imp.plain')}
        howto={howto}
        onCancel={() => setNotes(null)}
        onAdd={async (kept) => {
          const n = await addNotes(kept.map((i) => notes.notes[i]))
          // The Notes tab comes on, so what was added can be seen.
          useSettingsStore.getState().set({ notes: true })
          finish(t.plural('imp.added', n))
        }}
      />
    )
  }

  if (people) {
    const known = knownNames(contacts)
    // A file of several pages is a OneNote section, named after itself, so
    // its people can be tagged with that name (James: "the tag to be the
    // section e.g. People - James", confirmed on import, "or add a custom
    // one"). A file of one page is just that page — its section tag would be
    // the person's own name, so it gets none.
    const perFile = new Map<string, number>()
    for (const p of people.notes) perFile.set(p.file, (perFile.get(p.file) ?? 0) + 1)
    const sections = [...perFile].filter(([, n]) => n > 1).map(([f]) => f)
    const mode: TagMode = tagMode ?? (sections.length ? 'section' : 'none')
    const custom = customTag.trim().slice(0, 100)
    const tagOf = (file: string) => (mode === 'section' && sections.includes(file) ? fileTagName(file) : mode === 'custom' && custom ? custom : '')
    const modes: { k: TagMode; text: Key }[] = [
      ...(sections.length ? [{ k: 'section' as const, text: 'pim.tag_section' as Key }] : []),
      { k: 'custom', text: 'pim.tag_custom' },
      { k: 'none', text: 'pim.tag_none' },
    ]
    const closeReview = () => {
      setPeople(null)
      setTagMode(null)
      setCustomTag('')
    }
    return (
      <ImportReview
        title={t('pim.title')}
        items={people.notes.map((n) => ({
          title: n.title,
          sub: [known(n.title) ? t('pim.known') : '', tagOf(n.file) ? `🏷 ${tagOf(n.file)}` : '', n.createdAt ? new Date(n.createdAt).toLocaleDateString(t.locale) : '', n.file].filter(Boolean).join(' · '),
        }))}
        skipped={people.skipped.map((s) => ({ file: s.file, why: t(NOTE_SKIP[s.reason]) }))}
        found={(n) => t.plural('pim.found', n)}
        add={(n) => t.plural('pim.add', n)}
        none={t('pim.none')}
        plain={t('pim.plain')}
        howto={howto}
        extra={
          <fieldset className="mt-3">
            <legend className={label}>{t('pim.tag')}</legend>
            <div className="mt-1 space-y-1">
              {modes.map(({ k, text }) => (
                <div key={k}>
                  <label className="flex min-h-[40px] items-center gap-3 text-sm text-slate-200">
                    <input type="radio" name="pim-tag" className={radioCls} checked={mode === k} onChange={() => setTagMode(k)} />
                    <span>{k === 'section' ? t(text, { names: sections.map(fileTagName).join(', ') }) : t(text)}</span>
                  </label>
                  {k === 'custom' && mode === 'custom' && (
                    <>
                      <input
                        className={inputCls}
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        placeholder={t('pim.tag_placeholder')}
                        aria-label={t('pim.tag_custom')}
                        list="pim-tags"
                        maxLength={100}
                        autoFocus
                      />
                      <datalist id="pim-tags">
                        {tags.filter((x) => !isList(x)).map((x) => (
                          <option key={x.id} value={x.name} />
                        ))}
                      </datalist>
                    </>
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        }
        onCancel={closeReview}
        onAdd={async (kept) => {
          const pages = kept.map((i) => people.notes[i])
          const tagIds = new Map<string, string>()
          for (const f of new Set(pages.map((p) => p.file))) {
            const name = tagOf(f)
            if (!name) continue
            const tag = await addTag(name)
            if (tag) tagIds.set(f, tag.id)
          }
          const plan = planPeopleImport(pages, useBookStore.getState().contacts, (f) => tagIds.get(f))
          await importPeople(plan)
          // The People tab comes on, so who was added can be seen.
          useSettingsStore.getState().set({ contacts: true })
          const bits = [plan.added.length ? t.plural('pim.added', plan.added.length) : '', plan.updated.length ? t.plural('pim.updated', plan.updated.length) : '']
          closeReview()
          finish(bits.filter(Boolean).join(' ') || t('pim.nothing_new'))
        }}
      />
    )
  }

  if (todos) {
    return (
      <ImportReview
        title={t('tdi.title')}
        items={todos.todos.map((x) => ({
          title: x.title,
          sub: [x.done ? t('tdi.done') : '', x.due ? new Date(`${x.due}T12:00`).toLocaleDateString(t.locale) : '', x.file].filter(Boolean).join(' · '),
        }))}
        skipped={todos.skipped.map((s) => ({ file: s.file, why: t(TODO_SKIP[s.reason]) }))}
        found={(n) => t.plural('tdi.found', n)}
        add={(n) => t.plural('tdi.add', n)}
        none={t('tdi.none')}
        plain={t('tdi.plain')}
        onCancel={() => setTodos(null)}
        onAdd={async (kept) => {
          const n = await addTodos(kept.map((i) => todos.todos[i]))
          useSettingsStore.getState().set({ todos: true })
          finish(t.plural('tdi.added', n))
        }}
      />
    )
  }

  if (step === 'contacts') return <ImportExport part="contacts" onClose={onClose} onBack={back} />

  if (step === 'restore') {
    return (
      <Modal title={t('ix.restore')} onClose={back}>
        <BackupSection part="open" onDone={onClose} />
      </Modal>
    )
  }

  const choices: { key: string; icon: JSX.Element; label: Key; note: Key; onClick: () => void }[] = [
    { key: 'contacts', icon: <IconContactsBook />, label: 'ix.contacts', note: kit ? 'ix.contacts_note' : 'ix.contacts_note_web', onClick: () => setStep('contacts') },
    { key: 'people', icon: <IconPerson />, label: 'ix.people_onenote', note: 'ix.people_onenote_note', onClick: () => peopleInput.current?.click() },
    { key: 'notes', icon: <IconNote />, label: 'ix.notes', note: 'ix.notes_note', onClick: () => noteInput.current?.click() },
    { key: 'todos', icon: <IconTodo />, label: 'ix.todos', note: 'ix.todos_note', onClick: () => todoInput.current?.click() },
    { key: 'restore', icon: <IconFile />, label: 'ix.restore', note: 'ix.restore_note', onClick: () => setStep('restore') },
  ]

  return (
    <Modal phone="sheet" title={reading ? t('imp.reading') : t('ix.title')} onClose={onClose}>
      {/* The accepts written out on the inputs (scripts/verify-ios-launch.mjs
          reads them): no image or video types, so iOS never offers the camera. */}
      <input
        ref={noteInput}
        type="file"
        multiple
        accept=".docx,.html,.htm,.mht,.mhtml,.txt,.md,.markdown,text/plain,text/html,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => void read(e.currentTarget, e.target.files, importFiles, setNotes)}
      />
      <input
        ref={peopleInput}
        type="file"
        multiple
        accept=".docx,.html,.htm,.mht,.mhtml,.txt,.md,.markdown,text/plain,text/html,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => void read(e.currentTarget, e.target.files, importFiles, setPeople)}
      />
      <input
        ref={todoInput}
        type="file"
        multiple
        accept=".txt,.md,.markdown,.csv,.tsv,.ics,text/plain,text/markdown,text/csv,text/tab-separated-values,text/calendar"
        className="hidden"
        onChange={(e) => void read(e.currentTarget, e.target.files, importTodoFiles, setTodos)}
      />
      <Choices choices={choices.map((c) => ({ ...c, label: t(c.label), note: t(c.note) }))} disabled={reading} />
    </Modal>
  )
}

/**
 * What a file held, before any of it is added: swipe one left (or hold to
 * select several) to leave it out, with Undo. The note import's review, shared
 * with the to-dos'.
 */
function ImportReview({
  title,
  items,
  skipped,
  found,
  add,
  none,
  plain,
  howto,
  extra,
  onCancel,
  onAdd,
}: {
  title: string
  items: { title: string; sub: string }[]
  skipped: { file: string; why: string }[]
  found: (n: number) => string
  add: (n: number) => string
  none: string
  plain: string
  howto?: JSX.Element
  /** Anything more to settle before adding (People: how to tag them). */
  extra?: JSX.Element
  onCancel: () => void
  onAdd: (kept: number[]) => Promise<void>
}) {
  const t = useT()
  const kit = usePhoneKit()
  const [left, setLeft] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const leaveUndo = useUndo<number[]>(async (is) => setLeft((s) => new Set([...s].filter((x) => !is.includes(x)))))
  const leaveOutMany = (is: number[]) => {
    if (!is.length) return
    leaveUndo.deleted(is)
    setLeft((s) => new Set([...s, ...is]))
  }
  const leaveOut = (i: number) => leaveOutMany([i])
  const shownIdx = items.slice(0, 100).map((_, i) => i).filter((i) => !left.has(i))
  const sel = useHoldSelect(shownIdx.map(String), Boolean(kit))
  const kept = items.map((_, i) => i).filter((i) => !left.has(i))
  const name = (i: number) => items[i]?.title || t('c.untitled')

  return (
    <Modal phone="sheet" title={title} onClose={onCancel}>
      {items.length > 0 ? (
        <>
          <p className="text-sm text-slate-300">{found(kept.length)}</p>
          <SwipeGroup>
            <div className="mt-3">
              <SelectBar select={sel} total={shownIdx.length} actions={[{ label: t('imp.leave'), danger: true, onClick: (ids) => leaveOutMany(ids.map(Number)) }]} />
            </div>
            <ul className="mt-3 max-h-[40vh] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-2">
              {shownIdx.map((i) => (
                <li key={i} className="min-w-0">
                  <SwipeItem
                    id={String(i)}
                    select={sel}
                    name={name(i)}
                    right={removeSwipe('leave', t('imp.leave'), t('imp.leave_label', { title: name(i) }), () => leaveOut(i))}
                    focus={[{ label: t('imp.leave_label', { title: name(i) }), onClick: () => leaveOut(i) }]}
                  >
                    <div className="bg-slate-900 px-1.5 py-1">
                      <p className="truncate text-sm font-medium text-slate-100">{name(i)}</p>
                      <p className="truncate text-xs text-slate-500">{items[i].sub}</p>
                    </div>
                  </SwipeItem>
                </li>
              ))}
            </ul>
          </SwipeGroup>
          {leaveUndo.item !== null && (
            <UndoBar
              title=""
              text={leaveUndo.item.length === 1 ? t('imp.left_out', { title: name(leaveUndo.item[0]) }) : t.plural('sel.left_out', leaveUndo.item.length)}
              onUndo={() => void leaveUndo.undo()}
            />
          )}
        </>
      ) : (
        <p className="text-sm text-slate-300">{none}</p>
      )}
      {skipped.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-400">{t('imp.skipped')}</p>
          <ul className="mt-1 space-y-0.5">
            {skipped.map((s, i) => (
              <li key={i} className="break-words text-xs text-slate-500">
                {s.file}: {s.why}
              </li>
            ))}
          </ul>
        </div>
      )}
      {items.length > 0 && extra}
      <p className="mt-3 text-xs text-slate-500">{plain}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {howto ?? <span />}
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={onCancel}>
            {t('c.cancel')}
          </button>
          {kept.length > 0 && (
            <button
              type="button"
              className={btnPrimary}
              disabled={adding}
              onClick={async () => {
                setAdding(true)
                try {
                  await onAdd(kept)
                } finally {
                  setAdding(false)
                }
              }}
            >
              {add(kept.length)}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
