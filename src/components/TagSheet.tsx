import { Modal } from './Modal'
import { TagPicker } from './TagPicker'
import { useT } from '../i18n'

/**
 * The 🏷️ Tags quick action (James, 2026-11-05: "add Tags as an option in the
 * quick action buttons"): the same picker Fine-tune has, on its own page, so
 * a note's or a person's tags change without opening the whole form. Every
 * toggle is written straight away, like the 👤 link sheet beside it. Tags
 * only: `value` is the item's whole `tagIds`, and a contact's lists ride
 * through TagPicker untouched. The whole list is open on arrival: the tags
 * are all this page is for.
 */
export function TagSheet({
  value,
  onChange,
  onClose,
  backLabel,
}: {
  value: string[]
  onChange: (next: string[]) => void
  onClose: () => void
  backLabel?: string
}) {
  const t = useT()
  return (
    <Modal title={t('field.tags')} onClose={onClose} backLabel={backLabel}>
      <TagPicker value={value} onChange={onChange} open />
    </Modal>
  )
}
