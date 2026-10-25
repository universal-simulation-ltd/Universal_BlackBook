import { describe, expect, it } from 'vitest'
import { noteText } from './notes'

describe('noteText (Copy on a note)', () => {
  it('is the title, a blank line, then the details', () => {
    expect(noteText(' Wi-Fi ', 'Network: Garden\nOn the fridge\n')).toBe('Wi-Fi\n\nNetwork: Garden\nOn the fridge')
  })
  it('is just the details with no title, just the title with no details', () => {
    expect(noteText('', 'Only text')).toBe('Only text')
    expect(noteText('Only a title', '  ')).toBe('Only a title')
    expect(noteText('', '')).toBe('')
  })
})
