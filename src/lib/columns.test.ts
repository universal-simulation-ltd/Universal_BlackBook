import { describe, expect, it } from 'vitest'
import { columnStarts } from './columns'

describe('columnStarts', () => {
  it('splits in order so the tallest column is as short as it can be', () => {
    expect(columnStarts([10, 10, 10, 10], 2)).toEqual([2])
    expect(columnStarts([40, 10, 10, 10, 10], 2)).toEqual([1])
    expect(columnStarts([10, 10, 10, 10, 10, 10], 3)).toEqual([2, 4])
  })
  it('one column, or one card, has no breaks', () => {
    expect(columnStarts([10, 20, 30], 1)).toEqual([])
    expect(columnStarts([10], 3)).toEqual([])
  })
  it('never makes more columns than asked', () => {
    expect(columnStarts([5, 5, 5, 5, 5, 5, 5], 2).length).toBeLessThanOrEqual(1)
  })
})
