/* eslint-disable react-refresh/only-export-components -- hooks and helpers live beside the components that use them; hot reload of these few files is not worth splitting them */
// layers.tsx — the phone app's pages and bottom sheets: what every website
// popup becomes on the phone (kit.ts says why).
//
//  • A PAGE fills the screen and comes in from the right. It has a back button
//    naming where it goes; a swipe in from the left edge does the same, the
//    page following the finger (BRANDING.md ▸ "A swipe from the left edge goes
//    back"); a pull down from its top puts the finger in its first text box
//    (▸ "A big swipe down closes a drawer; a short pull puts you in its box").
//  • A SHEET rises from the bottom over a scrim. A tap on the scrim, the grip
//    dragged down, or a big swipe down anywhere on it closes it; a shorter
//    pull focuses its text box.
//
// ⚠️ EVERY LAYER IS ALSO A HISTORY ENTRY, so Android's back gesture (Capacitor
// goes `history.back()` while there is history, and leaves the app when there
// is none) closes the top one, as does the browser's Back in development.
// Kept by COUNTING, not by state objects: a layer pushes one entry as it
// opens, and one closed by its own button takes one back off — batched, so a
// delete that closes the form and the contact under it at once goes back two
// in one step. Whichever entry goes, the count stays equal to the layers open.
//
// Layers are portalled to <body> and stack in the order they opened, so a
// shared component can open one from wherever it happens to be rendered.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { usePageScrollLock } from '../lib/scrollLock'
import { useEdgeSwipeBack } from './edgeSwipe'
import { usePagePullToType, useSheetBodyPull, useSheetPull, type GripProps } from './gestures'
import { useT } from './i18n'
import { IconBack } from './icons'
import type { PhonePageProps, PhoneSheetProps } from './kit'

type Kind = 'page' | 'sheet'
interface Layer {
  id: number
  kind: Kind
  close: () => void
  /** Its history entry was taken by a back gesture: nothing left to remove. */
  popped: boolean
}

let layers: Layer[] = []
let nextId = 1
/** Our own `history.go(-n)`s, whose popstate is not a back gesture. */
let ignorePops = 0
/** Entries to take back off, gathered over one task. */
let pendingBacks = 0
const subscribers = new Set<() => void>()
const emit = () => subscribers.forEach((f) => f())
const subscribe = (f: () => void) => {
  subscribers.add(f)
  return () => {
    subscribers.delete(f)
  }
}
const snapshot = () => layers

function register(kind: Kind, close: () => void): Layer {
  const layer: Layer = { id: nextId++, kind, close, popped: false }
  layers = [...layers, layer]
  history.pushState({ bbLayer: layer.id }, '')
  emit()
  return layer
}

function unregister(layer: Layer) {
  if (!layers.includes(layer)) return
  layers = layers.filter((l) => l !== layer)
  emit()
  if (layer.popped) return
  pendingBacks++
  queueMicrotask(() => {
    if (!pendingBacks) return
    const n = pendingBacks
    pendingBacks = 0
    ignorePops++
    history.go(-n)
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--
      return
    }
    const top = layers[layers.length - 1]
    if (!top) return
    top.popped = true
    top.close()
    // A layer that would not close (it asked first, say) gets its entry back,
    // so the next back gesture still has something to take.
    setTimeout(() => {
      if (layers.includes(top)) {
        top.popped = false
        history.pushState({ bbLayer: top.id }, '')
      }
    }, 0)
  })
}

/** This layer's place in the stack, from the moment it mounts to the moment it goes. */
function useLayer(kind: Kind, onClose: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const [layer, setLayer] = useState<Layer | null>(null)
  useLayoutEffect(() => {
    const l = register(kind, () => closeRef.current())
    setLayer(l)
    return () => unregister(l)
  }, [kind])
  const all = useSyncExternalStore(subscribe, snapshot)
  const index = layer ? all.indexOf(layer) : all.length
  return { index: Math.max(0, index), isTop: layer !== null && index === all.length - 1 }
}

/** Is any page or sheet open over the tabs? */
export function useAnyLayerOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot).length > 0
}

/** Above the tab bar and the top bar (z-40), each new layer above the last. */
const zFor = (index: number) => 60 + index * 2

/** Escape closes the top layer, as the website's dialogs did. */
function useEscape(active: boolean, onClose: () => void) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        ref.current()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active])
}

/** Focus into the layer as it opens (never into a text box), and back where it was as it closes. */
function useFocusHandOff(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ref.current?.focus({ preventScroll: true })
    return () => before?.focus?.({ preventScroll: true })
  }, [ref])
}

export function Page({ title, onBack, backLabel, actions, children, bare = false }: PhonePageProps) {
  const t = useT()
  const { index, isTop } = useLayer('page', onBack)
  const ref = useRef<HTMLDivElement>(null)
  usePageScrollLock()
  useEdgeSwipeBack(ref, isTop, onBack)
  usePagePullToType(ref, isTop)
  useEscape(isTop, onBack)
  useFocusHandOff(ref)

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="bb-page outline-none"
      style={{ zIndex: zFor(index) }}
    >
      <div className="bb-pagebar">
        <button type="button" className="bb-back" onClick={onBack}>
          <IconBack />
          <span>{backLabel ?? t('back')}</span>
        </button>
        <h2 className="bb-pagetitle">{title}</h2>
        <div className="bb-pageactions">{actions}</div>
      </div>
      <div className={bare ? 'bb-pagebody bare' : 'bb-pagebody'}>{children}</div>
    </div>,
    document.body,
  )
}

export function Sheet({ title, onClose, children, hideTitle = false }: PhoneSheetProps) {
  const { index, isTop } = useLayer('sheet', onClose)
  const ref = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const grip = useSheetPull(ref, onClose)
  useSheetBodyPull(ref, bodyRef, onClose)
  usePageScrollLock()
  useEscape(isTop, onClose)
  useFocusHandOff(ref)

  return createPortal(
    <div className="bb-sheetwrap" style={{ zIndex: zFor(index) }}>
      <div className="bb-scrim" onClick={onClose} aria-hidden="true" />
      <section ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="bb-sheet outline-none">
        <Grip grip={grip} />
        {!hideTitle && <h2 className="bb-sheettitle">{title}</h2>}
        <div ref={bodyRef} className="bb-sheetbody">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  )
}

/** The grip, in a strip the width of the sheet so there is a finger's worth to take hold of. */
function Grip({ grip }: { grip: GripProps }) {
  return (
    <div {...grip} data-sheet-grip className="bb-gripzone">
      <div className="bb-grip" aria-hidden="true" />
    </div>
  )
}

/** One row of a sheet's list of choices. */
export function SheetRow({
  children,
  onClick,
  danger = false,
  icon,
  selected,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
  icon?: ReactNode
  /** A choice that is the current one shows a tick. */
  selected?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`bb-sheetrow${danger ? ' danger' : ''}`}
    >
      {icon && <span className="bb-sheetrow-icon" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1 text-left">{children}</span>
      {selected && (
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m4.5 10.5 3.5 3.5 7.5-8" />
        </svg>
      )}
    </button>
  )
}
