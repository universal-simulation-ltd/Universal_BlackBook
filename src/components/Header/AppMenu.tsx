import { useSyncStore } from '../../stores/syncStore'

// The per-app rows that slot into <UniversalAppsNavBar />'s `actions` prop —
// ROWS ONLY, no trigger and no panel of its own. Inline styles match the SDK
// dropdown's own row rhythm (8px/14px, 13px labels); these render inside SDK
// chrome, not ours.
//
// ⚠️ THESE ROWS ARE LIGHT, in a dark-only app, and that is correct.
//
// BlackBook passes `theme="dark"` to the navbar, but SDK 0.106.0's theme
// covers the BAR only — the profile dropdown these rows are mounted inside is
// still light, in every consumer, and our stylesheet cannot reach it. Dark
// rows here would be invisible on their own background. If the SDK ever
// themes the dropdowns, this file flips with it and not before.
//
// Values match PalsPayIn's so the two apps' menus are the same menu.

const TINT = { bg: '#fff7ed', fg: '#c2410c' }
const REST_COLOR = '#374151'
const MUTED = '#9ca3af'

export default function AppMenu({
  onCategories,
  onImportExport,
  onCloud,
}: {
  onCategories: () => void
  onImportExport: () => void
  onCloud: () => void
}) {
  const state = useSyncStore((s) => s.state)

  return (
    <>
      <MenuLabel>Your book</MenuLabel>
      <MenuRow glyph="🏷️" label="Categories" onClick={onCategories} />
      <MenuRow glyph="📄" label="Import & export" onClick={onImportExport} />
      <MenuLabel>Universal ID</MenuLabel>
      <MenuRow
        glyph={state === 'on' ? '☁️' : '🔒'}
        label={
          state === 'on' ? 'Saving online — manage' : state === 'locked' ? 'Unlock online copy' : 'Save online'
        }
        selected={state === 'on'}
        onClick={onCloud}
      />
    </>
  )
}

function MenuLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: '8px 14px 4px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: MUTED,
      }}
    >
      {children}
    </div>
  )
}

function MenuRow({
  glyph,
  label,
  onClick,
  selected = false,
}: {
  glyph: string
  label: string
  onClick: () => void
  selected?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 14px',
        fontSize: 13,
        fontFamily: 'inherit',
        textAlign: 'left',
        border: 0,
        background: selected ? TINT.bg : 'transparent',
        color: selected ? TINT.fg : REST_COLOR,
        cursor: 'pointer',
        transition: 'background 120ms, color 120ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = TINT.bg
        e.currentTarget.style.color = TINT.fg
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = selected ? TINT.bg : 'transparent'
        e.currentTarget.style.color = selected ? TINT.fg : REST_COLOR
      }}
    >
      <span aria-hidden>{glyph}</span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
      {selected && <span aria-hidden style={{ color: TINT.fg }}>✓</span>}
    </button>
  )
}
