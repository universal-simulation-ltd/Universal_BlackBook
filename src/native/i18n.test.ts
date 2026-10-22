import { describe, expect, it } from 'vitest'
import { en } from './strings/en'
import { DICTS, makeTranslator } from './i18n'

// Every suite language carries every phone-screen string (machine translation
// is fine; a missing one would show in English), with the same {placeholders}.

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('phone screen translations', () => {
  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`${lang} has every key, and keeps every placeholder`, () => {
      for (const [key, source] of Object.entries(en)) {
        const said = (dict as Record<string, string | undefined>)[key]
        expect(said, `${lang}.${key}`).toBeTypeOf('string')
        expect(holes(said!), `${lang}.${key}`).toEqual(holes(source))
      }
    })
  }

  it('fills placeholders and falls back to English', () => {
    expect(makeTranslator('de')('notes_of', { name: 'Sam' })).toBe('Notizen · Sam')
    expect(makeTranslator('en-gb')('tab_tune')).toBe('Tune')
    expect(makeTranslator('pt')('save')).toBe('Guardar')
    expect(makeTranslator('pt-BR')('save')).toBe('Salvar')
  })
})
