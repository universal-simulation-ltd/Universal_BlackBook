import { readFileSync, appendFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// Served at opensource.unisim.co.uk/blackbook/ behind the portal Worker, so
// production assets live under /blackbook/. The PWA makes the shell work
// offline — and the app genuinely does work offline, because the book is in
// IndexedDB. Only the optional encrypted vault needs the network.
// The production Content-Security-Policy lives in public/_headers, which only
// the Worker serves. This hands the dev server the SAME policy, Report-Only, so
// a new origin shows up as a console warning while developing instead of as a
// broken feature on the live site. Loosened only where Vite itself needs it:
// its inline React-refresh preamble and its HMR websocket. Reports land in
// $CSP_REPORT_LOG when that is set. (Same plugin as Universal PDF.)
function cspDev(): Plugin {
  const headers = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')
  const line = headers.split('\n').find((l) => /^\s*Content-Security-Policy(-Report-Only)?:/.test(l) && /default-src/.test(l))
  const policy = line ? line.slice(line.indexOf(':') + 1).trim() : ''
  const dev = policy
    // Report-Only can't carry frame-ancestors (the browser warns and ignores it).
    .replace(/;\s*frame-ancestors[^;]*/, '')
    .replace(/script-src ([^;]*)/, "script-src $1 'unsafe-inline'")
    .replace(/connect-src ([^;]*)/, 'connect-src $1 ws: wss:')
  return {
    name: 'csp-dev',
    apply: 'serve',
    configureServer(server) {
      if (!policy) return
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/__csp-report')) {
          let body = ''
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            const log = process.env.CSP_REPORT_LOG
            if (log) appendFileSync(log, body.replace(/\n/g, ' ') + '\n')
            res.statusCode = 204
            res.end()
          })
          return
        }
        res.setHeader('Content-Security-Policy-Report-Only', `${dev}; report-uri /__csp-report`)
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // `desktop` mode is what the Capacitor (iOS) build uses. It needs two things
  // the hosted build must NOT have: a RELATIVE base, because Capacitor serves
  // the bundle from `capacitor://localhost` whose document root is the copied
  // directory itself (a `/blackbook/…` URL is a 404 there, and the app is a
  // blank screen with nothing on the Mac reporting it), and NO service worker,
  // which would otherwise cache the wrong origin's URLs inside the app.
  const isDesktop = mode === 'desktop'
  const BASE_PATH = isDesktop ? './' : mode === 'production' ? '/blackbook/' : '/'
  return {
    base: BASE_PATH,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: {
      exclude: ['@unisim/sdk'],
      // ⚠️ Dev only, and REQUIRED. The SDK's QR component reaches
      // qr-code-styling through a dynamic import; that package ships UMD with
      // no ESM build, and with @unisim/sdk excluded above Vite serves it raw,
      // where the UMD wrapper dies on "Cannot set properties of undefined
      // (setting 'QRCodeStyling')". The component catches it, so the only
      // symptom is a plate that never draws. Naming it here forces the CJS
      // interop; `vite build` was never affected.
      include: ['qr-code-styling'],
    },
    plugins: [
      react(),
      tailwindcss(),
      cspDev(),
      ...(isDesktop ? [] : [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'unisim-icon.png', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Universal BlackBook',
          short_name: 'BlackBook',
          description: 'A private address book. Your people, your categories, your pace.',
          theme_color: '#ffffff',
          // Light, like the app's first paint (it is light until the user
          // picks Dark in Tune this app).
          background_color: '#ffffff',
          display: 'standalone',
          start_url: BASE_PATH,
          scope: BASE_PATH,
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            // ⚠️ 1024×1024, not the 128×128 this claimed until 2026-08-30
            // (`sips -g pixelWidth public/unisim-icon.png`). The file has been
            // the full-size suite mark for a while and nobody re-checked the
            // declaration. `sizes` is how an installer PICKS an icon, so a lie
            // here makes the browser choose this one for a 128px slot and
            // downscale a megapixel PNG — or skip it for a large slot it would
            // actually have been ideal for. If the file is ever regenerated,
            // re-measure and update this number with it.
            { src: 'unisim-icon.png', sizes: '1024x1024', type: 'image/png' },
          ],
        },
        workbox: {
          navigateFallback: `${BASE_PATH}index.html`,
          // The map (MapLibre, ~1 MB) is fetched only when the map is opened,
          // never precached in the background (2026-10-25).
          globIgnores: ['**/maplibre-gl-*', '**/MapView-*'],
        },
        devOptions: { enabled: false },
      })]),
    ],
  }
})
