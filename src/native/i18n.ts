// The phone screens' own words, in every suite language.
//
// ⚠️ ONLY the phone screens' new words live here — the tab bar, the page bars,
// Tune this app, About, the sheets. The website's components that the phone
// app reuses (the list, the form, the panels) are still English everywhere;
// translating those is its own piece of work (see the backlog).
//
// English is the source and defines the keys (`Key`); every other language is
// a `Partial` of it and a missing key shows in English. `i18n.test.ts` fails on
// a missing key or a dropped `{placeholder}`. The language is the SDK's
// (`useLanguage()`): this app's own choice from Tune this app ▸ Language, else
// the suite's, else the phone's.

import { useMemo } from 'react'
import { useLanguage } from '@unisim/sdk'
import { en, type Key } from './strings/en'
import { de } from './strings/de'
import { es } from './strings/es'
import { fr } from './strings/fr'
import { it } from './strings/it'
import { ptBR } from './strings/pt-BR'
import { ptPT } from './strings/pt-PT'
import { tr } from './strings/tr'

export type { Key }
export type Vars = Record<string, string | number>
export type Dict = Partial<Record<Key, string>>

export const DICTS: Record<string, Dict> = { fr, es, it, de, 'pt-BR': ptBR, 'pt-PT': ptPT, tr }

function chain(lang: string): Dict[] {
  const l = lang.toLowerCase()
  const codes = l === 'pt-br' ? ['pt-BR', 'pt-PT'] : l.startsWith('pt') ? ['pt-PT', 'pt-BR'] : [l, l.split('-')[0]]
  return codes.map((c) => DICTS[c]).filter(Boolean)
}

export function fill(s: string, vars?: Vars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

/** A BCP 47 tag for Intl: the SDK's plain `en` is US English, `en-gb` British. */
export function intlLocale(lang: string): string {
  return lang === 'en' ? 'en-US' : lang === 'en-gb' ? 'en-GB' : lang
}

export interface Translator {
  (key: Key, vars?: Vars): string
  /** `t.plural('people', 3)`: the `people_one` / `people_other` form, `{count}` filled in. */
  plural(stem: string, count: number, vars?: Vars): string
  lang: string
  locale: string
}

export function makeTranslator(lang: string): Translator {
  const dicts = chain(lang)
  const locale = intlLocale(lang)
  const plurals = new Intl.PluralRules(locale)
  const find = (key: string): string => {
    for (const d of dicts) {
      const hit = (d as Record<string, string | undefined>)[key]
      if (hit !== undefined) return hit
    }
    return (en as Record<string, string>)[key] ?? key
  }
  const t = ((key: Key, vars?: Vars) => fill(find(key), vars)) as Translator
  t.plural = (stem, count, vars) => {
    const form = plurals.select(count)
    const key = `${stem}_${form}` in en ? `${stem}_${form}` : `${stem}_other`
    return fill(find(key), { count: new Intl.NumberFormat(locale).format(count), ...vars })
  }
  t.lang = lang
  t.locale = locale
  return t
}

/** The phone screens' translator. Re-renders when the language changes. */
export function useT(): Translator {
  const { language } = useLanguage()
  return useMemo(() => makeTranslator(language), [language])
}
