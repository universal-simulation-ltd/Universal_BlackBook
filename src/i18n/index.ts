// Every word BlackBook shows, in every suite language: the website and the
// phone app alike.
//
// Two sets of strings, one dictionary:
//   ./native/<lang>.ts  the phone screens' own words (src/native/)
//   ./app/<lang>.ts     everything the two layouts share: the list, the form,
//                       the panels, birthdays, the lock, backups
// English is the source and defines the keys (`Key`); every other language is
// a `Partial` of it and a missing key shows in English. `i18n.test.ts` fails on
// a missing key, a key in both sets, or a dropped `{placeholder}`.
//
// The language is the SDK's (`useLanguage()`): this app's own choice from Tune
// this app ▸ Language, else the suite's, else the device's. Code that is not a
// component (lib/, the stores) reads it through `currentT()`, which follows
// whatever the last `useT()` rendered with — App calls `useT()` at the top, so
// that is the language on screen.

import { useMemo } from 'react'
import { useLanguage } from '@unisim/sdk'
import { en as nativeEn } from './native/en'
import { de as nativeDe } from './native/de'
import { es as nativeEs } from './native/es'
import { fr as nativeFr } from './native/fr'
import { it as nativeIt } from './native/it'
import { ptBR as nativePtBR } from './native/pt-BR'
import { ptPT as nativePtPT } from './native/pt-PT'
import { tr as nativeTr } from './native/tr'
import { appEn } from './app/en'
import { appDe } from './app/de'
import { appEs } from './app/es'
import { appFr } from './app/fr'
import { appIt } from './app/it'
import { appPtBR } from './app/pt-BR'
import { appPtPT } from './app/pt-PT'
import { appTr } from './app/tr'

export const en = { ...nativeEn, ...appEn }
export type Key = keyof typeof en
export type Vars = Record<string, string | number>
export type Dict = Partial<Record<Key, string>>

export const DICTS: Record<string, Dict> = {
  fr: { ...nativeFr, ...appFr },
  es: { ...nativeEs, ...appEs },
  it: { ...nativeIt, ...appIt },
  de: { ...nativeDe, ...appDe },
  'pt-BR': { ...nativePtBR, ...appPtBR },
  'pt-PT': { ...nativePtPT, ...appPtPT },
  tr: { ...nativeTr, ...appTr },
}

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

const cache = new Map<string, Translator>()
function translatorFor(lang: string): Translator {
  let t = cache.get(lang)
  if (!t) {
    t = makeTranslator(lang)
    cache.set(lang, t)
  }
  return t
}

let current: Translator = translatorFor('en-gb')

/** The translator for code outside React: the language last rendered by `useT()`. */
export function currentT(): Translator {
  return current
}

/** For tests: pick the language `currentT()` answers in. */
export function setCurrentLanguage(lang: string): void {
  current = translatorFor(lang)
}

/** The translator for a component. Re-renders when the language changes. */
export function useT(): Translator {
  const { language } = useLanguage()
  const t = useMemo(() => translatorFor(language), [language])
  // Set during render, not in an effect: the children rendered in this same
  // pass (and the lib/ helpers they call) must already answer in it.
  current = t
  return t
}
