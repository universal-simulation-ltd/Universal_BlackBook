import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The theme key is written down twice — `src/stores/themeStore.ts` for the
// SDK's store, and index.html's pre-paint script, the only place early enough
// to stop a light frame before a Dark user's page. Nothing can share one
// constant between the two, so this is what stops them drifting. The key IS
// every user's saved choice: change it and everybody's choice is forgotten.
//
// The script is also allowed by its hash in public/_headers (the CSP has no
// 'unsafe-inline'), so any edit to it must carry a new hash, or the live site
// silently ignores it and paints light for everybody.

const read = (rel: string) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')

function storeKey(): string {
  const match = /createThemeStore\('([^']+)'\)/.exec(read('src/stores/themeStore.ts'))
  if (!match) throw new Error('themeStore.ts no longer calls createThemeStore with a literal key')
  return match[1]
}

function inlineScripts(): string[] {
  const html = read('index.html')
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
}

describe('the pre-paint theme script', () => {
  it('reads the same localStorage key as the theme store, then the global scheme', () => {
    const [script] = inlineScripts()
    expect(script).toContain(`localStorage.getItem('${storeKey()}')`)
    expect(script).toContain("localStorage.getItem('universal:color-scheme')")
    expect(script).toContain('prefers-color-scheme: dark')
  })

  it('opens light unless something says otherwise', () => {
    expect(inlineScripts()[0]).toContain("|| 'light'")
  })

  it('is allowed by its hash in the Content-Security-Policy', () => {
    const headers = read('public/_headers')
    for (const script of inlineScripts()) {
      const hash = createHash('sha256').update(script).digest('base64')
      expect(headers).toContain(`'sha256-${hash}'`)
    }
  })
})
