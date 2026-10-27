/**
 * Small marks on a card in a list for what it holds (James, 2026-10-27: "in
 * the list view have small icons to represent if things like location, call
 * etc are defined"): the same emoji as the buttons on its page, so 📞 on a
 * card is the 📞 that rings them. Nothing when it holds none of them.
 */
export function DetailMarks({ marks }: { marks: { emoji: string; label: string; on: boolean }[] }) {
  const shown = marks.filter((m) => m.on)
  if (shown.length === 0) return null
  return (
    <span className="flex shrink-0 items-center gap-0.5 text-[12px] leading-none">
      {shown.map((m) => (
        <span key={m.label} aria-hidden title={m.label}>
          {m.emoji}
        </span>
      ))}
      <span className="sr-only">{shown.map((m) => m.label).join(', ')}</span>
    </span>
  )
}
