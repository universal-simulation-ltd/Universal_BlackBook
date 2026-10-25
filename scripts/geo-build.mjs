#!/usr/bin/env node
// Builds BlackBook's offline place lists from GeoNames (CC BY 4.0,
// https://www.geonames.org): countries, their first- or second-level
// divisions (a UK county, a US state…), and every town of 5,000 people or
// more (cities5000). Used for City / County / Country suggestions, for
// "Fill in my current location" (nearest town, worked out on the device) and
// for placing the map's pins. Nothing about the user is ever sent anywhere.
//
//   node scripts/geo-build.mjs <dir with countryInfo.txt, admin1CodesASCII.txt, admin2Codes.txt, cities5000.txt>
//
// Get the four files from https://download.geonames.org/export/dump/ (unzip
// cities5000.zip). Writes public/geo/{countries,divisions}.json and
// public/geo/cities.tsv; commit them. The division level per country is
// src/lib/geo.ts ▸ ADMIN2_COUNTRIES (keep the two lists the same).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Countries whose everyday "county/province" is GeoNames' admin2.
const ADMIN2 = new Set(['GB', 'IE', 'IT', 'ES'])

const src = process.argv[2]
if (!src) throw new Error('usage: node scripts/geo-build.mjs <dir>')
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'geo')
mkdirSync(out, { recursive: true })
const lines = (f) => readFileSync(join(src, f), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'))

const countries = lines('countryInfo.txt').map((l) => {
  const c = l.split('\t')
  return [c[0], c[4]]
})

const divisions = {}
const add = (cc, code, name) => ((divisions[cc] ??= []).push([code, name]))
for (const l of lines('admin1CodesASCII.txt')) {
  const [key, name] = l.split('\t')
  const [cc, a1] = key.split('.')
  if (!ADMIN2.has(cc)) add(cc, a1, name)
}
for (const l of lines('admin2Codes.txt')) {
  const [key, name] = l.split('\t')
  const [cc, a1, a2] = key.split('.')
  if (ADMIN2.has(cc)) add(cc, `${a1}.${a2}`, name)
}
for (const list of Object.values(divisions)) list.sort((a, b) => a[1].localeCompare(b[1]))

// name \t lat×100 \t lng×100 \t country \t division code \t population/1000
const rows = []
for (const l of lines('cities5000.txt')) {
  const c = l.split('\t')
  const cc = c[8]
  const div = ADMIN2.has(cc) ? (c[11] ? `${c[10]}.${c[11]}` : '') : c[10]
  const pop = Math.round(Number(c[14]) / 1000)
  rows.push([c[1], Math.round(Number(c[4]) * 100), Math.round(Number(c[5]) * 100), cc, div, pop])
}
// Biggest first: suggestions and the nearest-town tie-break both prefer them.
rows.sort((a, b) => b[5] - a[5])

writeFileSync(join(out, 'countries.json'), JSON.stringify(countries))
writeFileSync(join(out, 'divisions.json'), JSON.stringify(divisions))
writeFileSync(join(out, 'cities.tsv'), rows.map((r) => r.join('\t')).join('\n') + '\n')
console.log(`countries ${countries.length}, divisions ${Object.values(divisions).flat().length}, towns ${rows.length}`)
