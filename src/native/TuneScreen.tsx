// Tune this app, as the phone's fourth tab (and as a page, when the contact
// form's "Customise fields" asks for it). Every option the app has lives here
// (the suite rule: no settings pages, all options in Tune this app), with the
// book's own jobs — tags, backups, the PIN, deleting everything — and the
// help and About pages under them. It replaces the website's ⚙ menu, Actions
// menu and SDK dialog, none of which the phone app has.

import type { ReactNode } from 'react'
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  useGlobalPreferences,
  useLanguage,
  useResetAppDefaults,
  type ThemePref,
} from '@unisim/sdk'
import { PREFERENCE_ROWS } from '../appParts'
import { useLockStore } from '../stores/lockStore'
import { usePanelStore, type Panel } from '../stores/panelStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSyncStore } from '../stores/syncStore'
import { useThemeStore } from '../stores/themeStore'
import { Credit } from './Credit'
import { useT, type Key } from '../i18n'
import { IconChevron } from './icons'
import { useNativeNav } from './nav'

type Language = (typeof SUPPORTED_LANGUAGES)[number]

export function TuneContent() {
  const t = useT()
  const openPanel = usePanelStore((s) => s.open)
  const nav = useNativeNav()
  const locked = useLockStore((s) => s.record !== null)
  const syncState = useSyncStore((s) => s.state)
  const resetSettings = useSettingsStore((s) => s.reset)
  const reset = useResetAppDefaults(resetSettings, useThemeStore)

  const backup: Record<string, Key> = {
    'signed-out': 'tune_backup_off',
    off: 'tune_backup_off',
    locked: 'tune_backup_locked',
    on: 'tune_backup_on',
  }

  const row = (panel: Panel, label: Key, opts: { value?: string; danger?: boolean } = {}) => (
    <LinkRow label={t(label)} value={opts.value} danger={opts.danger} onClick={() => openPanel(panel)} />
  )

  return (
    <>
      <Group title={t('tune_look')}>
        <div className="bb-cardpad space-y-4">
          <Appearance />
          <LanguageRow />
        </div>
      </Group>

      <Group title={t('tune_this_app')}>
        {/* The app's own switches, the same rows the website's Tune this app
            shows. Every one starts unticked. */}
        <div className="bb-cardpad space-y-1">{PREFERENCE_ROWS}</div>
      </Group>

      <Group title={t('tune_your_book')}>
        {row('tags', 'tune_tags')}
        {row('templates', 'tune_templates')}
        {row('io', 'tune_backup_file')}
        {row('cloud', 'tune_online_backup', { value: t(backup[syncState] ?? 'tune_backup_off') })}
        {row('lock', 'tune_pin_row', { value: t(locked ? 'tune_on' : 'tune_off') })}
        {row('wipe', 'tune_delete_all', { danger: true })}
      </Group>

      <Group title={t('tune_help')}>
        <LinkRow label={t('kb_title')} onClick={() => nav.setKb(true)} />
        <LinkRow label={t('about_title')} onClick={() => nav.setAbout(true)} />
      </Group>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          className="min-h-[44px] rounded-xl px-4 text-[15px] font-semibold text-orange-400"
          onClick={() => {
            reset()
            nav.say(t('tune_reset_done'))
          }}
        >
          {t('tune_reset')}
        </button>
      </div>
      <p className="px-6 text-center text-[13px] text-slate-500">{t('tune_reset_note')}</p>

      <Credit />
    </>
  )
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bb-group">
      <h2>{title}</h2>
      <div className="bb-card">{children}</div>
    </section>
  )
}

export function LinkRow({
  label,
  value,
  note,
  danger = false,
  onClick,
}: {
  label: string
  value?: string
  note?: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`bb-row${danger ? ' danger' : ''}`} onClick={onClick}>
      <span className="min-w-0 flex-1">
        {label}
        {note && <span className="note">{note}</span>}
      </span>
      {value && <span className="value">{value}</span>}
      <span className="text-slate-600">
        <IconChevron />
      </span>
    </button>
  )
}

/**
 * Light · Dark · Match my device — Light until chosen (the suite rule). While
 * this person uses one app only, a choice here is the suite's own (SDK README
 * ▸ "One app: no Global Tuning"); once they use two, it is this app's override.
 */
function Appearance() {
  const t = useT()
  const pref = useThemeStore((s) => s.pref)
  const setOverride = useThemeStore((s) => s.setOverride)
  const { split, setColorScheme } = useGlobalPreferences()
  const choose = (p: ThemePref) => {
    if (split) {
      setOverride(p)
    } else {
      setColorScheme(p)
      setOverride(null)
    }
  }
  const options: { value: ThemePref; label: Key }[] = [
    { value: 'light', label: 'theme_light' },
    { value: 'dark', label: 'theme_dark' },
    { value: 'system', label: 'theme_system' },
  ]
  return (
    <div role="group" aria-label={t('theme_label')}>
      <p className="mb-2 text-[15px] font-medium text-slate-100">{t('theme_label')}</p>
      <div className="bb-segs">
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={pref === o.value} onClick={() => choose(o.value)}>
            {t(o.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The language, through the phone's own picker (a native `<select>` is the
 * system sheet on iOS and Android). Once the suite's preferences are split,
 * "Follow global" is the first choice, as on the website.
 */
function LanguageRow() {
  const t = useT()
  const { globalLanguage, appLanguage, setGlobalLanguage, setAppLanguage } = useLanguage()
  const { split } = useGlobalPreferences()
  const value = split ? (appLanguage ?? '') : (appLanguage ?? globalLanguage)
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium text-slate-100">{t('language_label')}</span>
      <select
        className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-[16px] text-slate-100"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (split) setAppLanguage(v ? (v as Language) : null)
          else {
            setGlobalLanguage(v as Language)
            if (appLanguage) setAppLanguage(null)
          }
        }}
      >
        {split && <option value="">{t('language_follow', { value: LANGUAGE_LABELS[globalLanguage] ?? globalLanguage })}</option>}
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code] ?? code}
          </option>
        ))}
      </select>
    </label>
  )
}
