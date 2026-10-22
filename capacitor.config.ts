import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor wraps the same Vite build that ships to the web. `webDir` is the
// Vite build output. Capacitor serves it from a local `capacitor://localhost`
// origin whose document root IS that directory, so every asset must resolve
// relatively — build with `npm run build:mobile` (Vite `--mode desktop`, which
// sets `base` to `./` and drops the service worker) before `npx cap sync`.
//
// ⚠️ Building with the hosted `/blackbook/` base instead installs and launches
// as a BLANK SCREEN with no error anywhere on the Mac: every
// `/blackbook/assets/…` URL 404s inside the container, so no module script
// runs. `npm run cap:sync` does the right build and then checks the copied
// bundle (scripts/verify-mobile-bundle.mjs) — use it, never a bare `cap sync`.
const config: CapacitorConfig = {
  appId: 'uk.co.unisim.blackbook',
  appName: 'Universal BlackBook',
  webDir: 'dist',
  // Android 15+ lays the window out under the status bar and the camera
  // cutout (edge-to-edge is enforced from targetSdk 35, with no opt-out at 36).
  // Capacitor 8 removed `android.adjustMarginsForEdgeToEdge` in favour of its
  // core SystemBars plugin, which reads index.html's `viewport-fit=cover`: on a
  // WebView from Chromium 140 the page is drawn edge-to-edge and
  // `env(safe-area-inset-*)` carries the real insets — which this app already
  // pads by, exactly as on iOS. On an older WebView, where those env values
  // read 0, it pads the web view natively instead and the strips show the
  // WINDOW background: values/styles.xml pins it to the phone app's paper,
  // and WindowThemePlugin repaints it to the leather for Dark.
  plugins: {
    SystemBars: {
      // Dark glyphs, for the app's default LIGHT paper ("LIGHT" means "for a
      // light background"). src/native/systemBars.ts flips them when the app
      // is set to Dark. Left at DEFAULT they would follow the PHONE's theme,
      // not the app's — light glyphs on the paper whenever the phone is dark.
      style: 'LIGHT',
      // index.html says cover; saying so here spares a layout jump on start.
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
