import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// Served at opensource.unisim.co.uk/blackbook/ behind the portal Worker, so
// production assets live under /blackbook/. The PWA makes the shell work
// offline — and the app genuinely does work offline, because the book is in
// IndexedDB. Only the optional encrypted vault needs the network.
export default defineConfig(({ mode }) => {
  const BASE_PATH = mode === 'production' ? '/blackbook/' : '/'
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
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'unisim-icon.png', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Universal BlackBook',
          short_name: 'BlackBook',
          description: 'A private address book. Your people, your categories, your pace.',
          theme_color: '#020617',
          // Matches index.css's <html> background, so the splash screen is the
          // app's own black rather than a white flash before first paint.
          background_color: '#020617',
          display: 'standalone',
          start_url: BASE_PATH,
          scope: BASE_PATH,
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'unisim-icon.png', sizes: '128x128', type: 'image/png' },
          ],
        },
        workbox: {
          navigateFallback: `${BASE_PATH}index.html`,
        },
        devOptions: { enabled: false },
      }),
    ],
  }
})
