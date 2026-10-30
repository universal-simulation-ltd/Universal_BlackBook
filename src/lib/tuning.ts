// Everything in Tune this app, beyond the tabs, for the online copy (James,
// 2026-10-30: "My settings should be synced from mobile to web, everything on
// tune this app"). The tabs went first (lib/tabs.ts `TabLayout`, the vault's
// `tabs`) and keep their own block, so a phone on an older build still reads
// them; this is the rest, under the SAME stamp (settingsStore `tunedAt`), and
// the newer side wins the lot.
//
// Not in here because it already travels: tags and note templates (the book
// itself), and the language and colour scheme when they are the suite's
// (the SDK keeps those on the account). What IS here of the look is this
// app's own override of them, and the tab it opens on.

import { isSupportedLanguage, type ThemePref } from '@unisim/sdk'
import { FORM_FIELDS, isFormField, type FormField } from './formFields'
import { normaliseContactActions, normaliseQuickActions, type ContactAction, type QuickAction, type Slots } from './quickActions'
import { TABS, type Tab } from './tabs'

/**
 * The look, as BlackBook's own choices: null in each means "follow the
 * suite" (scheme, language) or "the first tab" (opensOn).
 */
export interface Look {
  scheme: ThemePref | null
  language: string | null
  opensOn: Tab | null
}

export interface Tuning {
  shownFields: FormField[]
  notifyDetails: boolean
  fillLocation: boolean
  noteActions: Slots<QuickAction>
  contactActions: Slots<ContactAction>
  /** Absent from a device that has not seen its look yet: it then says nothing about it. */
  look?: Look
  at: number
}

/** Ticked fields in FORM_FIELDS order, anything unknown dropped. */
export function normaliseShownFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return []
  return FORM_FIELDS.filter((f) => raw.filter(isFormField).includes(f))
}

const SCHEMES: readonly ThemePref[] = ['light', 'dark', 'system']

export function parseLook(raw: unknown): Look | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return {
    scheme: SCHEMES.includes(r.scheme as ThemePref) ? (r.scheme as ThemePref) : null,
    language: typeof r.language === 'string' && isSupportedLanguage(r.language) ? r.language : null,
    opensOn: TABS.includes(r.opensOn as Tab) ? (r.opensOn as Tab) : null,
  }
}

export function sameLook(a: Look | null | undefined, b: Look | null | undefined): boolean {
  return !!a && !!b && a.scheme === b.scheme && a.language === b.language && a.opensOn === b.opensOn
}

/** The rest of Tune out of a vault, or null when the blob says nothing usable. */
export function parseTuning(raw: unknown): Tuning | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.at !== 'number' || !Number.isFinite(r.at)) return null
  return {
    shownFields: normaliseShownFields(r.shownFields),
    notifyDetails: r.notifyDetails === true,
    fillLocation: r.fillLocation === true,
    noteActions: normaliseQuickActions(r.noteActions),
    contactActions: normaliseContactActions(r.contactActions),
    look: parseLook(r.look),
    at: r.at,
  }
}
