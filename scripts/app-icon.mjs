#!/usr/bin/env node
// The phone app's icon and splash — "the little black book": a black leather
// notebook on a cream ground, its elastic band in UNI·SIM orange and the red
// ribbon hanging out of the bottom (2026-10-22, the store-listings §7 bar: its
// own icon, not the suite mark on the orange tile). Drawn once, below; every
// iOS and Android file is rendered from it.
//
//   PLAYWRIGHT=../../backoffice/universal-platform/node_modules/playwright/index.mjs \
//     node scripts/app-icon.mjs
//   PREVIEW=<dir> …   renders just the 1024 icon there and touches nothing else
//
// ⚠️ The suite generator must skip this app's phone icons
// (`ownNativeIcon: true` on BlackBook's mark in
// backoffice/universal-platform/scripts/app-marks/marks.mjs), or its next run
// puts the orange tile back. The website's favicon and the suite switcher keep
// the suite mark. Universal_Jukebox/scripts/app-icon.mjs is the pattern.
//
// What it writes:
//   iOS      AppIcon (1024, opaque) and the launch splash (2732: the icon on
//            the phone app's paper)
//   Android  legacy ic_launcher / ic_launcher_round, the adaptive icon as two
//            layers (the cream ground behind, the book in front), the splash
//            mark, and the splash / launcher background colour.
//
// ⚠️ ADAPTIVE LAYERS ARE 108dp AND A LAUNCHER SHOWS ONLY THE MIDDLE ~72dp, so
// the layers draw the art with the viewBox widened (1660 for 1024), keeping
// the whole book inside the circle a round mask leaves.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright')

/** The phone app's paper (index.css `html.bb-phone`): the splash ground. */
const PAPER = '#faf7f1'
/** The icon's own ground, a shade warmer than the paper so the tile reads as a tile. */
const GROUND = '#efe5d3'

/**
 * The icon as SVG on a 1024 grid.
 * @param {{ wide?: boolean, back?: boolean, book?: boolean }} o
 *   wide — the 108dp adaptive canvas; back / book — which layers to draw.
 */
function svg({ wide = false, back = true, book = true } = {}) {
  const box = wide ? '-318 -318 1660 1660' : '0 0 1024 1024'
  const ground = `<rect x="-340" y="-340" width="1704" height="1704" fill="url(#ground)"/>`
  const notebook = `
    <!-- shadow -->
    <rect x="300" y="170" width="460" height="680" rx="44" fill="#3b2a16" fill-opacity="0.22" transform="translate(16 22)"/>
    <!-- the pages, showing at the fore-edge and the foot -->
    <rect x="292" y="168" width="468" height="682" rx="40" fill="#f4ecdc"/>
    <path d="M744 214v596M732 214v596M720 214v596" stroke="#d9cbb1" stroke-width="5"/>
    <!-- the cover -->
    <rect x="270" y="150" width="466" height="690" rx="44" fill="url(#cover)"/>
    <rect x="270" y="150" width="70" height="690" rx="34" fill="#000" fill-opacity="0.32"/>
    <path d="M340 150v690" stroke="#000" stroke-opacity="0.45" stroke-width="6"/>
    <rect x="276" y="156" width="454" height="678" rx="40" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="5"/>
    <!-- the ribbon, out of the foot -->
    <path d="M430 800h64v168l-32-30-32 30z" fill="url(#ribbon)"/>
    <!-- the elastic band, in UNI·SIM orange -->
    <rect x="642" y="138" width="34" height="714" rx="12" fill="url(#orange)"/>
    <rect x="642" y="138" width="10" height="714" rx="5" fill="#fff" fill-opacity="0.18"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="100%" height="100%">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7efe1"/><stop offset="1" stop-color="#e3d5bb"/></linearGradient>
    <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34302c"/><stop offset="0.55" stop-color="#1a1715"/><stop offset="1" stop-color="#0c0a09"/></linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f1d22"/><stop offset="0.25" stop-color="#c0262d"/><stop offset="1" stop-color="#a51d24"/></linearGradient>
    <linearGradient id="orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fe8c01"/><stop offset="1" stop-color="#e05504"/></linearGradient>
  </defs>
  ${back ? ground : ''}
  ${book ? notebook : ''}
</svg>`
}

const browser = await chromium.launch()

/**
 * Render to PNG.
 * @param {number} size  canvas edge in px
 * @param {string} art   the SVG
 * @param {{ inset?: number, radius?: string, ground?: string | null }} o
 */
async function png(size, art, { inset = 1, radius = '0', ground = null } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  const pct = (inset * 100).toFixed(4)
  await page.setContent(`<!doctype html><style>
    html,body{margin:0;width:${size}px;height:${size}px;background:${ground ?? 'transparent'};display:grid;place-items:center}
    div{width:${pct}%;height:${pct}%;border-radius:${radius};overflow:hidden}
  </style><div>${art}</div>`)
  const buf = await page.screenshot({ omitBackground: ground === null })
  await page.close()
  return buf
}

if (process.env.PREVIEW) {
  mkdirSync(process.env.PREVIEW, { recursive: true })
  writeFileSync(path.join(process.env.PREVIEW, 'icon.png'), await png(1024, svg(), { ground: GROUND }))
  writeFileSync(path.join(process.env.PREVIEW, 'icon-small.png'), await png(120, svg(), { inset: 1, radius: '22.4%', ground: '#888' }))
  await browser.close()
  console.log(`Preview: ${process.env.PREVIEW}`)
  process.exit(0)
}

const written = []
function put(rel, data) {
  const file = path.join(root, rel)
  mkdirSync(path.dirname(file), { recursive: true })
  try {
    if (readFileSync(file).equals(Buffer.from(data))) return
  } catch {
    /* new file */
  }
  writeFileSync(file, data)
  written.push(rel)
}

const HEADER = `<!-- Written by scripts/app-icon.mjs — edit the drawing there, not this file.
     BlackBook's phone icon is its own; the suite generator skips it (ownNativeIcon). -->`

// ── iOS ─────────────────────────────────────────────────────────────────────
const IOS = 'ios/App/App/Assets.xcassets'
// Opaque, full bleed: iOS rounds the corners itself and refuses alpha.
put(`${IOS}/AppIcon.appiconset/AppIcon-512@2x.png`, await png(1024, svg(), { ground: GROUND }))
// The splash: the icon, rounded, in the middle of the paper the app opens on.
const splash = await png(2732, svg(), { inset: 0.26, radius: '22.4%', ground: PAPER })
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  put(`${IOS}/Splash.imageset/${name}`, splash)
}

// ── Android ─────────────────────────────────────────────────────────────────
const RES = 'android/app/src/main/res'
const DENSITIES = { 'mipmap-mdpi': 1, 'mipmap-hdpi': 1.5, 'mipmap-xhdpi': 2, 'mipmap-xxhdpi': 3, 'mipmap-xxxhdpi': 4 }
for (const [dir, scale] of Object.entries(DENSITIES)) {
  const launcher = Math.round(48 * scale)
  const adaptive = Math.round(108 * scale)
  // Pre-Android 8: nothing masks these, so they carry their own shape.
  put(`${RES}/${dir}/ic_launcher.png`, await png(launcher, svg(), { inset: 0.92, radius: '22.4%' }))
  put(`${RES}/${dir}/ic_launcher_round.png`, await png(launcher, svg(), { inset: 0.92, radius: '50%' }))
  put(`${RES}/${dir}/ic_launcher_background.png`, await png(adaptive, svg({ wide: true, book: false }), { ground: GROUND }))
  put(`${RES}/${dir}/ic_launcher_foreground.png`, await png(adaptive, svg({ wide: true, back: false })))
}
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
${HEADER}
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
put(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`, adaptiveXml)
put(`${RES}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptiveXml)

// The splash. Android 11 and below draw `drawable/splash.xml` (the tile, then
// the mark at its own size); 12 and up draw the launcher icon on
// `ic_launcher_background` (values-v31/styles.xml). Both on the paper.
const SPLASH = { 'drawable-mdpi': 1, 'drawable-hdpi': 1.5, 'drawable-xhdpi': 2, 'drawable-xxhdpi': 3, 'drawable-xxxhdpi': 4 }
for (const [dir, scale] of Object.entries(SPLASH)) {
  const px = Math.round(240 * scale)
  put(`${RES}/${dir}/splash_mark.png`, await png(px, svg(), { inset: 0.6, radius: '22.4%' }))
}
put(`${RES}/drawable/ic_launcher_tile.xml`, `<?xml version="1.0" encoding="utf-8"?>
${HEADER}
<!-- The splash ground (drawable/splash.xml draws it under the mark). -->
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${PAPER}"/>
</shape>
`)
put(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>
${HEADER}
<resources>
    <color name="ic_launcher_background">${PAPER}</color>
</resources>
`)

await browser.close()
console.log(written.length ? `Wrote ${written.length} file(s):\n  ${written.join('\n  ')}` : 'Nothing changed.')
