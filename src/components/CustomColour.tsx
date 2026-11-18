import { useEffect, useRef } from 'react'
import { isCustomColour } from '../lib/palette'

/**
 * The multicoloured dot after the swatches (James, 2026-11-18: "On tags, have
 * a multicoloured dot that allows you to choose a custom colour"). A tap opens
 * the device's own colour picker (an `<input type="color">` laid over the dot);
 * the colour is stored as `#rrggbb` (lib/palette.ts ▸ isCustomColour). Lit,
 * with the chosen colour in its middle, while the tag has a colour of its own.
 *
 * The pick is taken on the input's `change`, not React's onChange (the
 * `input` event): a desktop picker fires that on every step of a drag, and
 * each would be a save and a sync.
 */
export function CustomColour({ value, onPick, label }: { value: string | null | undefined; onPick: (hex: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  const on = isCustomColour(value)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const change = () => pickRef.current(el.value.toLowerCase())
    el.addEventListener('change', change)
    return () => el.removeEventListener('change', change)
  }, [])
  return (
    <label
      title={label}
      className={`relative inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-orange-400 ${
        on ? 'border-slate-100' : 'border-transparent'
      }`}
      style={{ background: 'conic-gradient(#f43f5e, #fe8c01, #facc15, #34d399, #38bdf8, #a78bfa, #f43f5e)' }}
    >
      {on && <span aria-hidden className="h-2 w-2 rounded-full ring-1 ring-slate-950/60" style={{ background: value! }} />}
      <input
        ref={ref}
        type="color"
        aria-label={label}
        defaultValue={on ? value! : '#fe8c01'}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}
