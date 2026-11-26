// Splitting a list into newspaper columns (components/ColumnList.tsx).

/**
 * Where each column after the first starts, splitting `heights` (in order)
 * into at most `cols` runs whose tallest is as short as it can be: the
 * smallest column height the cards fit in, found by halving, then the cards
 * filled down to it greedily.
 */
export function columnStarts(heights: number[], cols: number): number[] {
  if (cols < 2 || heights.length < 2) return []
  const fits = (h: number) => {
    let runs = 1
    let sum = 0
    for (const x of heights) {
      if (sum + x > h && sum > 0) {
        runs++
        sum = 0
      }
      sum += x
    }
    return runs <= cols
  }
  let lo = Math.max(...heights)
  let hi = heights.reduce((a, b) => a + b, 0)
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2
    if (fits(mid)) hi = mid
    else lo = mid
  }
  const starts: number[] = []
  let sum = 0
  heights.forEach((x, i) => {
    if (sum + x > hi && sum > 0 && starts.length < cols - 1) {
      starts.push(i)
      sum = 0
    }
    sum += x
  })
  return starts
}
