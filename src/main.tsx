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
// No sign-in (James, 2026-10-20: no logins in first iterations unless they
// improve the experience; Docs_UNI_SIM/login-free-plan.md). BlackBook's sign-in
// only carried the encrypted online vault (`blackbook_vaults`), which a backup
// file in Backup, import & export now replaces, so `noAccounts: true` drops the
// account rows and keeps the app signed out of the suite session in every
// build; with it the SDK's anonymous open count is off too (SDK 0.187), as in
// Video, Charts, Beam and the rest.
//
// The vault table still holds 2 orphaned rows on prod (one James's, one an
// anonymous session's that could never have reached a second device); this
// app no longer reads or writes them.

// `--mode desktop` is the Capacitor (phone) bundle. It loads from
// `capacitor://localhost`, where a cookie scoped to `.unisim.co.uk` cannot be
// stored, so the cookie domain stays off there.
const isDesktop = import.meta.env.MODE === 'desktop'

const universalConfig = {
  supabaseUrl: import.meta.env.VITE_PLATFORM_SUPABASE_URL || 'https://rygfxgalojojppxmhddo.supabase.co',
  supabaseAnonKey:
    import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Z4Z2Fsb2pvanBweG1oZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTY4MjUsImV4cCI6MjA5NDMzMjgyNX0.hLy_vt9vY_rdPKF3nL32yAuMCD604E3CH5VM7D7CaNE',
  product: 'blackbook' as const,
  cookieDomain: !isDesktop && import.meta.env.PROD ? '.unisim.co.uk' : undefined,
  noAccounts: true,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UniversalProvider config={universalConfig}>
      <App />
    </UniversalProvider>
  </React.StrictMode>,
)
