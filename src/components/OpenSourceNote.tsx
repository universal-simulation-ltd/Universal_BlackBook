import { useT } from '../i18n'

/** BlackBook's code, in public (the open-source Universal Apps are public repos). */
export const REPO_URL = 'https://github.com/universal-simulation-ltd/Universal_BlackBook'

/**
 * At the foot of Fine-tune (James, 2026-10-27: "You can customise this app.
 * Access the open source code, change it and deploy it" — "concise but clear
 * and motivate a casual user to look and understand how code works"). Quiet,
 * below everything the page is for: an invitation, not a banner.
 */
export function OpenSourceNote() {
  const t = useT()
  return (
    <aside className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-3">
      <p className="text-sm font-semibold text-slate-200">
        <span aria-hidden>{'\u{1F6E0}\u{FE0F}'} </span>
        {t('oss.title')}
      </p>
      <p className="mt-1 text-sm text-slate-400">{t('oss.body')}</p>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm font-semibold text-orange-400 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        {t('oss.link')} <span aria-hidden>↗</span>
      </a>
    </aside>
  )
}
