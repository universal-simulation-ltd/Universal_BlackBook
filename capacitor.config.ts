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
}

export default config
