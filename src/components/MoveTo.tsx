import { useState } from 'react'
import type { MoveKind } from '../lib/move'
import { moveItems, undoMove, type MoveUndo } from '../stores/move'
import { IconBook, IconNote, IconTodo } from '../native/icons'
import { useT, type Key } from '../i18n'
import { Choices } from './Choices'
import { Modal } from './Modal'
import { UndoBar, useUndo } from './SwipeActions'

const KINDS: { kind: MoveKind; label: Key; icon: JSX.Element }[] = [
  { kind: 'contacts', label: 'ix.contacts', icon: <IconBook /> },
  { kind: 'notes', label: 'ix.notes', icon: <IconNote /> },
  { kind: 'todos', label: 'ix.todos', icon: <IconTodo /> },
]

/**
 * Select ▸ Move (James, 2026-10-26: "When selecting have a 'Move' option that
 * allows you to move a contact to notes etc"): `start(ids)` asks where to —
 * the other two of Contacts, Notes and To-dos — moves them (stores/move.ts)
 * and offers Undo. `ui` is the question and the Undo bar; render it once.
 */
export function useMove(from: MoveKind) {
  const t = useT()
  const [ids, setIds] = useState<string[] | null>(null)
  const undo = useUndo<MoveUndo>(undoMove)

  const go = async (to: MoveKind) => {
    const picked = ids
    setIds(null)
    if (!picked) return
    const done = await moveItems(from, to, picked, t)
    if (done) undo.deleted(done)
  }

  const label = (kind: MoveKind) => t(KINDS.find((k) => k.kind === kind)!.label)

  const ui = (
    <>
      {ids && (
        <Modal phone="sheet" title={t.plural('move.title', ids.length)} onClose={() => setIds(null)}>
          <Choices
            choices={KINDS.filter((k) => k.kind !== from).map((k) => ({
              key: k.kind,
              icon: k.icon,
              label: t(k.label),
              onClick: () => void go(k.kind),
            }))}
          />
        </Modal>
      )}
      {undo.item && (
        <UndoBar
          title=""
          text={t.plural('move.moved', undo.item.created.length, { where: label(undo.item.to) })}
          onUndo={() => void undo.undo()}
        />
      )}
    </>
  )

  return { start: (picked: string[]) => picked.length > 0 && setIds(picked), ui }
}
