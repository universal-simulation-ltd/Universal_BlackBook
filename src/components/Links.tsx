import { useMemo, useState, type ReactNode } from 'react'
import { fold } from '../lib/filter'
import { useT } from '../i18n'
import { autoFocusOK, usePhoneKit } from '../native/kit'
import { phoneScreens } from '../native/shell'
import { Modal } from './Modal'
import { removeSwipe, SelectBar, SwipeGroup, SwipeItem, UndoBar, useHoldSelect, useUndo } from './SwipeActions'
import { btnPrimary, inputCls, label } from './ui'

/**
 * Links between places, people and notes (2026-11-19, James: "both ways, like
 * notes"), drawn the way a note's links to people already are: a picker of
 * tick boxes with a search, where each tick saves, and the linked ones as rows
 * — tap to open, swipe left (or hold and Unlink) to unlink, with Undo.
 */
export interface LinkItem {
  id: string
  title: string
  sub?: string
}

/** Tick the ones to link. The linked ones sort first; each tick saves at once. */
export function LinkPicker({
  title,
  backLabel,
  items,
  linked,
  onToggle,
  onClose,
  searchLabel,
  emptyText,
}: {
  title: string
  backLabel?: string
  items: LinkItem[]
  linked: ReadonlySet<string>
  onToggle: (id: string, on: boolean) => void
  onClose: () => void
  searchLabel: string
  emptyText: string
}) {
  const t = useT()
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const f = fold(q.trim())
    return items
      .filter((x) => !f || fold(`${x.title} ${x.sub ?? ''}`).includes(f))
      .sort((a, b) => Number(linked.has(b.id)) - Number(linked.has(a.id)) || a.title.localeCompare(b.title, t.locale))
  }, [items, q, linked, t.locale])
  return (
    <Modal title={title} onClose={onClose} backLabel={backLabel}>
      <input
        className={`${inputCls} mb-3`}
        type="search"
        value={q}
        aria-label={searchLabel}
        placeholder={searchLabel}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocusOK()}
      />
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {shown.map((x) => {
            const on = linked.has(x.id)
            return (
              <li key={x.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggle(x.id, !on)}
                  className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-500 bg-slate-950'}`}
                  >
                    {on && (
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25">
                        <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-slate-100">{x.title}</span>
                    {x.sub && <span className="block truncate text-xs text-slate-500">{x.sub}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!phoneScreens() && (
        <div className="mt-4 flex justify-end">
          <button type="button" className={btnPrimary} onClick={onClose}>
            {t('c.done')}
          </button>
        </div>
      )}
    </Modal>
  )
}

/**
 * The linked ones as rows under a label: tap opens, swipe left unlinks (with
 * Undo), hold selects several to unlink. Nothing at all when there are none,
 * unless an Undo is still on offer.
 */
export function LinkedRows({
  heading,
  items,
  icon,
  onOpen,
  onLink,
}: {
  heading: string
  items: LinkItem[]
  icon: ReactNode
  onOpen: (id: string) => void
  /** Link (true) or unlink (false) one. */
  onLink: (id: string, on: boolean) => void
}) {
  const t = useT()
  const undo = useUndo<LinkItem[]>(async (xs) => xs.forEach((x) => onLink(x.id, true)))
  const kit = usePhoneKit()
  const sel = useHoldSelect(items.map((x) => x.id), Boolean(kit))
  if (items.length === 0 && !undo.item) return null
  const unlink = (xs: LinkItem[]) => {
    undo.deleted(xs)
    xs.forEach((x) => onLink(x.id, false))
  }
  return (
    <div>
      {items.length > 0 && <span className={label}>{heading}</span>}
      <SelectBar select={sel} total={items.length} actions={[{ label: t('nlink.unlink'), danger: true, onClick: (ids) => unlink(items.filter((x) => ids.includes(x.id))) }]} />
      <SwipeGroup>
        <ul className="space-y-2">
          {items.map((x) => (
            <li key={x.id}>
              <SwipeItem
                id={x.id}
                select={sel}
                name={x.title}
                right={removeSwipe('unlink', t('nlink.unlink'), t('plink.unlink_label', { name: x.title }), () => unlink([x]))}
                focus={[{ label: t('plink.unlink_label', { name: x.title }), onClick: () => unlink([x]) }]}
              >
                <button
                  type="button"
                  onClick={() => onOpen(x.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-left hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:text-orange-400"
                >
                  {icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-100">{x.title}</span>
                    {x.sub && <span className="block truncate text-xs text-slate-500">{x.sub}</span>}
                  </span>
                </button>
              </SwipeItem>
            </li>
          ))}
        </ul>
      </SwipeGroup>
      {undo.item && (
        <UndoBar
          title=""
          text={undo.item.length === 1 ? t('nlink.unlinked', { name: undo.item[0].title }) : t.plural('sel.unlinked', undo.item.length)}
          onUndo={() => void undo.undo()}
        />
      )}
    </div>
  )
}
