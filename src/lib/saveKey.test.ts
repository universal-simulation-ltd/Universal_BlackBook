import { describe, expect, it } from 'vitest'
import { isSaveKey } from './saveKey'

const k = (o: Partial<{ key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; isComposing: boolean }>) => ({ key: 'Enter', ctrlKey: false, metaKey: false, ...o })

describe('isSaveKey', () => {
  it('is Ctrl+Enter or ⌘+Enter', () => {
    expect(isSaveKey(k({ ctrlKey: true }))).toBe(true)
    expect(isSaveKey(k({ metaKey: true }))).toBe(true)
  })
  it('is not a plain Enter, Alt+Enter, another key, or mid-composition', () => {
    expect(isSaveKey(k({}))).toBe(false)
    expect(isSaveKey(k({ ctrlKey: true, altKey: true }))).toBe(false)
    expect(isSaveKey(k({ key: 'a', ctrlKey: true }))).toBe(false)
    expect(isSaveKey(k({ ctrlKey: true, isComposing: true }))).toBe(false)
  })
})
