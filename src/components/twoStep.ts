import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readAssuranceLevel, TWO_STEP_VERIFIED_EVENT, type useUniversal } from '@unisim/sdk'

type Supabase = ReturnType<typeof useUniversal>['supabase']

/**
 * Does this session still owe its two-step code, by the DATABASE's reckoning?
 *
 * Asks `public.session_owes_two_step()` (platform 0342), the very function the
 * `blackbook_vaults_two_step` policy runs, so "clear" here means the vault
 * will actually be readable and writable. Only if that call fails (offline,
 * mock auth) does it fall back to the token's own assurance level.
 *
 * Why not just the token (2026-11-24, James's screenshot of "new row violates
 * row-level security policy blackbook_vaults_two_step" in the Online backup
 * panel straight after a sign-in): the local read said nothing was owed while
 * the session was still aal1, so the vault read came back empty, `hydrate`
 * took that for "no online copy yet" and tried to create one. The local answer
 * is worked out from the session's cached user, which is not the server.
 *
 * Asked again when the account changes, on every auth event (a sign-in, a
 * token refresh, a verified code — including one entered somewhere other than
 * <TwoStepPrompt />) and on the SDK's `TWO_STEP_VERIFIED_EVENT`.
 *
 * Two-step history: James, 2026-11-22, with his to-do list showing behind the
 * SDK's "Enter your two-step code" dialog: "Surely it shouldn't show data in
 * the bg if I haven't got through 2FA?".
 */
export function useTwoStepDue(supabase: Supabase, userId: string | null): 'checking' | 'due' | 'clear' {
  const [answer, setAnswer] = useState<{ for: string | null; due: boolean } | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    // A later question supersedes an earlier one still in flight.
    let asked = 0
    const ask = () => {
      const n = ++asked
      void sessionOwesTwoStep(supabase).then((due) => {
        if (!cancelled && n === asked) setAnswer({ for: userId, due })
      })
    }
    ask()
    window.addEventListener(TWO_STEP_VERIFIED_EVENT, ask)
    let unsubscribe: (() => void) | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') return
        // Not inside the callback itself: supabase-js holds its auth lock
        // while it runs, and an rpc waits on that lock for the token.
        setTimeout(ask, 0)
      })
      unsubscribe = () => data.subscription.unsubscribe()
    } catch {
      // A client without auth events (mock auth): the explicit event is enough.
    }
    return () => {
      cancelled = true
      window.removeEventListener(TWO_STEP_VERIFIED_EVENT, ask)
      unsubscribe?.()
    }
  }, [supabase, userId])

  if (!userId) return 'clear'
  // An answer for a previous account says nothing about this one.
  if (!answer || answer.for !== userId) return 'checking'
  return answer.due ? 'due' : 'clear'
}

/**
 * The server's answer (0342), falling back to the token's when the server
 * cannot be asked. Never throws.
 */
export async function sessionOwesTwoStep(supabase: Supabase | SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await (supabase as SupabaseClient).rpc('session_owes_two_step')
    if (!error && typeof data === 'boolean') return data
  } catch {
    // fall through
  }
  try {
    return (await readAssuranceLevel(supabase as Supabase)).challengeRequired
  } catch {
    return false
  }
}
