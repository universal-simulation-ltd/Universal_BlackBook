// About BlackBook, as a page (the website opens the SDK's About dialog). Its
// own words, its own privacy policy, the source and the software it is built
// on, and who made it.

import credits from '../generated/credits.json'
import { REPO_URL } from '../appParts'
import { Credit } from './Credit'
import { useT } from './i18n'
import { Ribbon } from './icons'
import { Group, LinkRow } from './TuneScreen'

const PRIVACY_URL = `${REPO_URL}/blob/main/PRIVACY.md`
const NOTICES_URL = `${REPO_URL}/blob/main/THIRD-PARTY-NOTICES.md`

const open = (href: string) => window.open(href, '_blank', 'noopener')

export function AboutContent() {
  const t = useT()
  const ships = (credits as { ships?: { name: string; title?: string; licence?: string; repo?: string }[] }).ships ?? []
  return (
    <>
      <div className="flex flex-col items-center pt-2 text-center">
        <Ribbon className="h-10 w-6" />
        <h1 className="bb-h1 mt-3">Universal BlackBook</h1>
        <p className="mt-1 text-[14px] text-slate-500">{t('about_version', { version: __APP_VERSION__ })}</p>
      </div>

      <p className="mt-5 text-[16px] leading-relaxed text-slate-200">{t('about_what')}</p>
      <p className="mt-3 text-[16px] leading-relaxed text-slate-200">{t('about_private')}</p>

      <Group title={t('about_paperwork')}>
        <LinkRow label={t('about_privacy')} onClick={() => open(PRIVACY_URL)} />
        <LinkRow label={t('about_source')} note={t('about_source_note')} onClick={() => open(REPO_URL)} />
        <LinkRow label={t('about_notices')} onClick={() => open(NOTICES_URL)} />
      </Group>

      <Group title={t('about_built_with')}>
        {ships.map((p) => (
          <div key={p.name} className="bb-row">
            <span className="min-w-0 flex-1">
              {p.title ?? p.name}
              {p.licence && <span className="note">{p.licence}</span>}
            </span>
          </div>
        ))}
      </Group>

      <Credit />
    </>
  )
}
