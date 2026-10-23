import { describe, expect, it } from 'vitest'
import { en as nativeEn } from './native/en'
import { appEn } from './app/en'
import { DICTS, en, makeTranslator } from './index'

// Every suite language carries every string BlackBook shows — the phone
// screens' own and the ones both layouts share (machine translation is fine;
// a missing one would show in English) — with the same {placeholders}.

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('translations', () => {
  it('no key is in both sets', () => {
    const both = Object.keys(appEn).filter((k) => k in nativeEn)
    expect(both).toEqual([])
  })

  it('every plural has its _other form', () => {
    for (const key of Object.keys(en)) {
      if (key.endsWith('_one')) expect(en, key).toHaveProperty([key.replace(/_one$/, '_other')])
    }
  })

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`${lang} has every key, and keeps every placeholder`, () => {
      const missing: string[] = []
      const broken: string[] = []
      for (const [key, source] of Object.entries(en) as [string, string][]) {
        const said = (dict as Record<string, string | undefined>)[key]
        if (typeof said !== 'string') missing.push(key)
        else if (holes(said).join() !== holes(source).join()) broken.push(key)
      }
      expect(missing, `${lang} missing`).toEqual([])
      expect(broken, `${lang} placeholders`).toEqual([])
    })

    it(`${lang} has no keys English does not`, () => {
      expect(Object.keys(dict).filter((k) => !(k in en))).toEqual([])
    })
  }

  it('fills placeholders and falls back to English', () => {
    expect(makeTranslator('de')('notes_of', { name: 'Sam' })).toBe('Notizen · Sam')
    expect(makeTranslator('en-gb')('tab_tune')).toBe('Tune')
    expect(makeTranslator('pt')('save')).toBe('Guardar')
    expect(makeTranslator('pt-BR')('save')).toBe('Salvar')
  })

  it('picks the plural form for the language', () => {
    expect(makeTranslator('en-gb').plural('c.people', 1)).toBe('1 person')
    expect(makeTranslator('en-gb').plural('c.people', 4)).toBe('4 people')
  })
})
