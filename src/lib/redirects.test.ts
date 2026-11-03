import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The portal proxies opensource.unisim.co.uk/blackbook/* here with the prefix
// intact, and public/_redirects maps each prefixed path onto the flat build.
// A file with no rule does not 404: the single-page fallback answers 200 with
// index.html, so a fetch of it "works" and the caller fails to parse it. That
// is how the map said "needs the internet" on the website (geo/, 2026-11-03).

const root = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url))

describe('public/_redirects', () => {
  const rules = readFileSync(root('public/_redirects'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => l.trim().split(/\s+/)[0])

  const entries = readdirSync(root('public'), { withFileTypes: true }).filter((e) => !e.name.startsWith('_') && !e.name.startsWith('.'))

  it.each(entries.map((e) => [e.isDirectory() ? `${e.name}/*` : e.name]))('serves /blackbook/%s', (path) => {
    expect(rules).toContain(`/blackbook/${path}`)
  })
})
