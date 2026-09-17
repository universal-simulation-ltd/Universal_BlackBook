import { AdvancedMenu, AdvancedMenuItem } from '@unisim/sdk'
// Generated — `npm run credits` after any dependency change. Never edit it by
// hand: it is read off the installed tree, so a hand-kept list drifts from the
// lockfile the first time anyone upgrades anything, and a credits list naming a
// package we removed is worse than no list at all.
import credits from '../../generated/credits.json'

// The per-app rows that slot into <UniversalAppsNavBar />'s `actions` prop —
// ROWS ONLY, no trigger and no panel of its own. Inline styles match the SDK
// dropdown's own row rhythm (8px/14px, 13px labels); these render inside SDK
// chrome, not ours.
//
// ⚠️ Nothing here styles itself any more. Every row is an <AdvancedMenuItem>,
// which the SDK themes — the hand-styled `MenuRow`/`MenuLabel` pair that used
// to live at the bottom of this file went with the Tags row on 2026-09-17, and
// with them went the one part of this dropdown that could drift out of step
// with the panel around it.
//
// ⚠️ No "Universal ID" / backup row (owner's call, 2026-09-17). Signing in with
// the navbar IS turning the backup on: App's useCloudSync opens the backup
// panel by itself after sign-in and on a two-device conflict, so a menu door
// to the same place read as a second feature.

export default function AppMenu({
  onTags,
  onImportExport,
}: {
  onTags: () => void
  onImportExport: () => void
}) {
  return (
    <>
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
          credits,
          noticesHref: 'https://github.com/universal-simulation-ltd/Universal_BlackBook/blob/main/THIRD-PARTY-NOTICES.md',
        }}
      >
        {/* Tags moved in here too (owner's call, 2026-09-17: "tags can move
            into advanced, you can manage them from normal use and adding
            contacts etc"). Tags are made and applied while adding or editing a
            contact, so this panel is for tidying them up — renaming,
            recolouring, merging — which is not an everyday job. It was the
            menu's only top-level row, under a "Your book" heading that then had
            nothing left to head. */}
        <AdvancedMenuItem
          theme="dark"
          icon={<span aria-hidden>🏷️</span>}
          label="Tags"
          onSelect={onTags}
        />
        {/* Import & export lives here (owner's call, 2026-09-17): moving a whole
            book in or out is occasional, and signing in now does the everyday
            job of getting a book onto another device. */}
        <AdvancedMenuItem
          theme="dark"
          icon={<span aria-hidden>📄</span>}
          label="Import & export"
          onSelect={onImportExport}
        />
      </AdvancedMenu>
    </>
  )
}
