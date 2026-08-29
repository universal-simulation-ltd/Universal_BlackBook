import { AdvancedMenu, MENU } from '@unisim/sdk'
import { useSyncStore } from '../../stores/syncStore'

// The per-app rows that slot into <UniversalAppsNavBar />'s `actions` prop —
// ROWS ONLY, no trigger and no panel of its own. Inline styles match the SDK
// dropdown's own row rhythm (8px/14px, 13px labels); these render inside SDK
// chrome, not ours.
//
// ⚠️ **These rows were LIGHT until SDK 0.107.0, deliberately, and are now
// dark.** 0.106.0's `theme` prop covered the bar alone, so the profile
// dropdown these rows sit inside was light in every consumer including this
// one — dark rows would have been invisible on their own background. 0.107.0
// themes the panels too, so the note that used to live here ("this file flips
// with it and not before") has come due.
//
// The colours are read from the SDK's own exported palette rather than copied
// as literals. `actions` rows are the one part of that dropdown the SDK cannot
// style for us, so they are also the one part that can silently drift out of
// step with the panel around them — and a hand-copied hex has no way of
// noticing when the panel's does change.
//
// ⚠️ PalsPayIn's menu was byte-identical to this one on purpose, and is still
// on the light values. It is a LIGHT app, so it is now correct for a different
// reason rather than by being the same file — do not "resync" the two.

const C = MENU.dark
const TINT = { bg: C.accentBg, fg: C.accentText }
const REST_COLOR = C.body
const MUTED = C.muted

export default function AppMenu({
  onTags,
  onImportExport,
  onCloud,
}: {
  onTags: () => void
  onImportExport: () => void
  onCloud: () => void
}) {
  const state = useSyncStore((s) => s.state)

  return (
    <>
      <MenuLabel>Your book</MenuLabel>
      <MenuRow glyph="🏷️" label="Tags" onClick={onTags} />
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

      {/* Advanced — the SDK's own category, so every app in the suite has one in
          the same place, and whatever goes in it next is one change rather than
          nineteen. "About this app" is always its last row. */}
      <AdvancedMenu
        theme="dark"
        about={{
          repo:    'https://github.com/universal-simulation-ltd/Universal_BlackBook',
          subject: 'Your contacts',
          plural:  true,
          except:  'the end-to-end encrypted backup you choose to store',
          headline: 'Other address books keep your contacts on their servers.',
          version: __APP_VERSION__,
        }}
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
