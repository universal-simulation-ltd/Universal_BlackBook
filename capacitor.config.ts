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
  // cutout (edge-to-edge is enforced from targetSdk 35, with no opt-out at 36),
  // and no viewport meta tag moves an Android window. This margins the web
  // view by the system bars and the cutout. "auto", not "force": Android 14 and
  // below aren't edge-to-edge and would take a second inset. The margin shows
  // the WINDOW background, which is why values/styles.xml pins it to the
  // app's own slate-950 (BlackBook is dark-only).
  android: { adjustMarginsForEdgeToEdge: 'auto' },
}

export default config
