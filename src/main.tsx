import React from 'react'
import ReactDOM from 'react-dom/client'
import { UniversalProvider } from '@unisim/sdk'
import App from './App'
import './index.css'

// `product` must exist in THREE places before this ships, or every
// usage_events insert fails silently for signed-in visitors only (the
// Converter/USB bug — events unrecoverable, found months later):
//   1. the Postgres `product_code` enum   (universal-platform migration 0123)
//   2. the SDK's `ProductCode` union      (packages/sdk/src/types.ts)
//   3. `SuiteProductId` + the catalogue   (packages/sdk/src/SuiteSwitcher.tsx)
// Never `as unknown as ProductCode` — if the type fights you, the enum is
// missing a value and the fix is a migration, not a cast.
//
// BlackBook needs the signed-in session for a second reason the other apps do
// not: the encrypted-vault feature reads and writes `public.blackbook_vaults`
// through this same client, and RLS there is `auth.uid()`.
//
// ⚠️ Which is exactly why `cookieDomain` has to come off in the native build.
// Vite `--mode desktop` is the Capacitor (iOS) bundle; it loads from
// `capacitor://localhost`, where a cookie scoped to `.unisim.co.uk` is a
// cross-domain cookie the WebView simply refuses to store. The SDK's session
// storage IS that cookie whenever cookieDomain is set, so sign-in would appear
// to succeed and then evaporate on the next read — no session, no `auth.uid()`,
// and the vault unreachable, with no error anywhere saying why. Left undefined,
// supabase-js falls back to localStorage, which the container has. The hosted
// web build is untouched and still rides the shared SSO cookie.
const isDesktop = import.meta.env.MODE === 'desktop'

const universalConfig = {
  supabaseUrl: import.meta.env.VITE_PLATFORM_SUPABASE_URL || 'https://rygfxgalojojppxmhddo.supabase.co',
  supabaseAnonKey:
    import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Z4Z2Fsb2pvanBweG1oZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTY4MjUsImV4cCI6MjA5NDMzMjgyNX0.hLy_vt9vY_rdPKF3nL32yAuMCD604E3CH5VM7D7CaNE',
  product: 'blackbook' as const,
  cookieDomain: !isDesktop && import.meta.env.PROD ? '.unisim.co.uk' : undefined,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UniversalProvider config={universalConfig}>
      <App />
    </UniversalProvider>
  </React.StrictMode>,
)
