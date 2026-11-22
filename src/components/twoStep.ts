import { useEffect, useState } from 'react'
import { readAssuranceLevel, TWO_STEP_VERIFIED_EVENT, type useUniversal } from '@unisim/sdk'

type Supabase = ReturnType<typeof useUniversal>['supabase']

/**
 * Does this signed-in session still owe its two-step code?
 *
 * - `'checking'` until the answer is in (signed in only),
 * - `'due'`: an authenticator is set up and the code has not been entered,
 * - `'clear'`: nothing owed (no authenticator, the code entered, a passkey, or
 *   signed out).
 *
 * James, 2026-11-22, with his to-do list showing behind the SDK's "Enter your
 * two-step code" dialog: "Surely it shouldn't show data in the bg if I haven't
 * got through 2FA?". `useCloudSync` waits for `'clear'` before it reads the
 * online copy; migration 0342 refuses the row to the server side as well.
 *
 * Asked again whenever the account changes and when the SDK says the code has
 * been entered (`TWO_STEP_VERIFIED_EVENT`, fired by <TwoStepPrompt />). A
 * client with no MFA at all (mock auth, a network error) answers `'clear'`,
 * the same as the SDK's prompt does: the server still refuses what needs it.
 */
export function useTwoStepDue(supabase: Supabase, userId: string | null): 'checking' | 'due' | 'clear' {
  const [answer, setAnswer] = useState<{ for: string | null; due: boolean } | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const ask = () => {
      void readAssuranceLevel(supabase)
        .then(({ challengeRequired }) => {
          if (!cancelled) setAnswer({ for: userId, due: challengeRequired })
        })
        .catch(() => {
          if (!cancelled) setAnswer({ for: userId, due: false })
        })
    }
    ask()
    window.addEventListener(TWO_STEP_VERIFIED_EVENT, ask)
    return () => {
      cancelled = true
      window.removeEventListener(TWO_STEP_VERIFIED_EVENT, ask)
    }
  }, [supabase, userId])

  if (!userId) return 'clear'
  // An answer for a previous account says nothing about this one.
  if (!answer || answer.for !== userId) return 'checking'
  return answer.due ? 'due' : 'clear'
}
