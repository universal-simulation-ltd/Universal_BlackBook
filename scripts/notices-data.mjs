#!/usr/bin/env node
// Appends the data BlackBook ships (GeoNames) and the tiles it shows to
// THIRD-PARTY-NOTICES.md, which gen-credits.mjs regenerates from the npm tree
// alone. Run by `npm run credits`, after it.
import { appendFileSync, readFileSync } from 'node:fs'
const notices = new URL('../THIRD-PARTY-NOTICES.md', import.meta.url)
const data = readFileSync(new URL('./data-notices.md', import.meta.url), 'utf8')
if (!readFileSync(notices, 'utf8').includes('# Data')) appendFileSync(notices, data)
