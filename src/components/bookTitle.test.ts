import { describe, expect, it } from 'vitest'
import { makeTranslator } from '../i18n'
import { personalBookTitle } from './bookTitle'

describe('personalBookTitle', () => {
  const en = makeTranslator('en-gb')
  it('names the book after its owner', () => {
    expect(personalBookTitle(en, 'Bradley')).toBe('Bradley’s Book')
  })
  it('gives a name ending in s the apostrophe alone', () => {
    expect(personalBookTitle(en, 'James')).toBe('James’ Book')
  })
  it('is "My Book" with no name', () => {
    expect(personalBookTitle(en, undefined)).toBe('My Book')
  })
  it('leaves other languages their own wording', () => {
    expect(personalBookTitle(makeTranslator('fr'), 'James')).toBe('Le carnet de James')
  })
})
