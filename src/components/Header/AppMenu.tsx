import { AdvancedMenu, AdvancedMenuItem } from '@unisim/sdk'
import { KNOWLEDGE_BASE } from '../../knowledge'
import { useT } from '../../i18n'

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
// Online backup IS a row here now (owner's call, 2026-10-08, reversing
// 2026-09-17's "no backup row"): signing in asks for the passphrase and then
// gets out of the way, so Save now, Fetch online copy, Forget this device,
// Change passphrase and Turn off need a door that is not the sign-in itself.
// (Removed with sign-in on 2026-10-20 and restored the same day: James,
// "blackbook needs sign-in, it's designed to be on multi devices".)

export default function AppMenu({
  theme,
  onTags,
  onImport,
  onImportExport,
  onBackup,
  onDeleteAll,
}: {
  /** The page's theme, which the SDK's menu rows are drawn for. */
  theme: 'light' | 'dark'
  onTags: () => void
  onImport: () => void
  onImportExport: () => void
  onBackup: () => void
  onDeleteAll: () => void
}) {
  const t = useT()
  return (
    <>
      {/* Advanced — the SDK's own category, so every app in the suite has one in
          the same place, and whatever goes in it next is one change rather than
          nineteen. The knowledge base goes HERE, not on the navbar: the navbar's
          `knowledgeBase` would draw a second Advanced section under this one. */}
      <AdvancedMenu theme={theme} knowledgeBase={KNOWLEDGE_BASE}>
        {/* Tags moved in here too (owner's call, 2026-09-17: "tags can move
            into advanced, you can manage them from normal use and adding
            contacts etc"). Tags are made and applied while adding or editing a
            contact, so this panel is for tidying them up — renaming,
            recolouring, merging — which is not an everyday job. It was the
            menu's only top-level row, under a "Your book" heading that then had
            nothing left to head. */}
        <AdvancedMenuItem
          theme={theme}
          icon={<span aria-hidden>🏷️</span>}
          label={t('tune_tags')}
          onSelect={onTags}
        />
        {/* Import & export lives here (owner's call, 2026-09-17): moving a whole
            book in or out is occasional, and signing in now does the everyday
            job of getting a book onto another device. Since 2026-10-20 it is
            also where the backup file is saved and opened (the way to move or
            keep a copy without an account), so the row says so. */}
        {/* Import is its own door since 2026-10-26 (James: "click import
            then choice of Contacts, Notes, ToDo, restore BlackBook backup"),
            the same one Tune ▸ Import opens on the phone — ImportPanel. */}
        <AdvancedMenuItem
          theme={theme}
          icon={<span aria-hidden>📥</span>}
          label={t('tune_import')}
          onSelect={onImport}
        />
        <AdvancedMenuItem
          theme={theme}
          icon={<span aria-hidden>📄</span>}
          label={t('tune_backup_file')}
          onSelect={onImportExport}
        />
        <AdvancedMenuItem
          theme={theme}
          icon={<span aria-hidden>☁️</span>}
          label={t('online_backup')}
          onSelect={onBackup}
        />
        {/* Delete all data (owner's request, 2026-10-08 — a guest wanting
            everything gone). Last, after Backup, import & export and Online
            backup, so "save a copy first" is right above it. See DeleteAllData. */}
        <AdvancedMenuItem
          theme={theme}
          icon={<span aria-hidden>🗑️</span>}
          label={t('tune_delete_all')}
          onSelect={onDeleteAll}
        />
      </AdvancedMenu>
    </>
  )
}
