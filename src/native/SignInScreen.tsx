// Sign in, as a page (the website opens the SDK's sign-in dialog). BlackBook
// keeps sign-in (James, 2026-10-20: "it's designed to be on multi devices"),
// and on the phone it appears only where the feature needs it: Tune ▸ Online
// backup. Apple and Google come up in the phone's own sheet (the SDK's native
// round trip); the email code is typed here.
//
// Built from the SDK's own pieces (OAuthButtons, startNativeOAuthSignIn,
// sendSignInCode / verifySignInCode), the same calls its dialog makes, so the
// accounts and the rules (App Review 4.8: Apple whenever Google is offered on
// an iPhone — `nativeProvidersToOffer`) are the same. BlackBook never starts a
// trial session, so the dialog's trial-collision panel has no case here.

import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  fetchEnabledOAuthProviders,
  isNativeShell,
  nativeOAuthSupport,
  nativeProvidersToOffer,
  OAuthButtons,
  oauthProviderLabel,
  sendSignInCode,
  startNativeOAuthSignIn,
  useUniversal,
  verifySignInCode,
  type OAuthProvider,
  type SignInCodeFlow,
} from '@unisim/sdk'
import { btnPrimary, inputCls, label } from '../components/ui'
import { useEffectiveTheme } from '../stores/themeStore'
import { useT } from './i18n'

export function SignInContent({ onDone }: { onDone: () => void }) {
  const t = useT()
  const theme = useEffectiveTheme()
  const { supabase, config } = useUniversal()
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [busyProvider, setBusyProvider] = useState<OAuthProvider | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [flow, setFlow] = useState<SignInCodeFlow>('signin')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  // Only in the app: a browser preview of the phone screens has no native half.
  useEffect(() => {
    if (!isNativeShell()) return
    let live = true
    void (async () => {
      const support = await nativeOAuthSupport()
      if (!support || !live) return
      const enabled = await fetchEnabledOAuthProviders(config.supabaseUrl, config.supabaseAnonKey)
      if (live) setProviders(nativeProvidersToOffer(enabled, support))
    })()
    return () => {
      live = false
    }
  }, [config.supabaseUrl, config.supabaseAnonKey])

  const withProvider = async (provider: OAuthProvider) => {
    setBusyProvider(provider)
    setError(null)
    const result = await startNativeOAuthSignIn(supabase, provider, {
      supabaseUrl: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
      loginHint: email,
    })
    setBusyProvider(null)
    if (result.status === 'signed-in') onDone()
    else if (result.status === 'error' && result.error) setError(result.error.message)
  }

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy || !email.trim().includes('@')) return
    setBusy(true)
    setError(null)
    const result = await sendSignInCode(supabase, { email: email.trim() })
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setFlow(result.flow)
    setStage('code')
    setCode('')
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await verifySignInCode(supabase, { email: email.trim(), code: code.trim(), flow })
    setBusy(false)
    if (result.ok) onDone()
    else setError(result.invalid ? t('signin_code_wrong') : result.message)
  }

  return (
    <div className="space-y-5">
      <p className="text-[16px] leading-relaxed text-slate-300">{t('signin_why')}</p>

      {providers.length > 0 && stage === 'email' && (
        <OAuthButtons
          providers={providers}
          busyProvider={busyProvider}
          onProvider={(p) => void withProvider(p)}
          labelFor={(p) => t('signin_with', { provider: oauthProviderLabel(p) })}
          dividerLabel={t('signin_or')}
          theme={theme}
        />
      )}

      {stage === 'email' ? (
        <form onSubmit={(e) => void send(e)} className="space-y-3">
          <label className="block">
            <span className={label}>{t('signin_email')}</span>
            <input
              className={`${inputCls} min-h-[44px]`}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button type="submit" className={`${btnPrimary} w-full min-h-[44px]`} disabled={busy || !email.trim().includes('@')}>
            {busy ? t('signin_sending') : t('signin_send_code')}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void verify(e)} className="space-y-3">
          <p className="text-[15px] text-slate-300">{t('signin_code_sent', { email: email.trim() })}</p>
          <label className="block">
            <span className={label}>{t('signin_code')}</span>
            <input
              ref={codeRef}
              className={`${inputCls} min-h-[44px] tracking-[0.3em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
            />
          </label>
          <button type="submit" className={`${btnPrimary} w-full min-h-[44px]`} disabled={busy || code.trim().length < 6}>
            {busy ? t('signin_checking') : t('signin_sign_in')}
          </button>
          <div className="flex justify-between text-[15px]">
            <button type="button" className="min-h-[44px] text-orange-400" onClick={() => setStage('email')}>
              {t('signin_other_email')}
            </button>
            <button type="button" className="min-h-[44px] text-orange-400" onClick={() => void send()}>
              {t('signin_resend')}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-rose-950/50 px-3 py-2 text-[15px] text-rose-300">
          {error}
        </p>
      )}

      <p className="text-[13px] leading-relaxed text-slate-500">{t('signin_one_account')}</p>
    </div>
  )
}
