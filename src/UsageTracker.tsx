import { useEffect, useRef } from 'react'
import { track, useUniversal, useUsageTracker } from '@unisim/sdk'

/**
 * Mounts the SDK usage batcher and fires `session.opened` once per visit —
 * this feeds the hub's "last product used". Only fires for signed-in
 * visitors; the app requires no account, so most sessions send nothing.
 *
 * ⚠️ No event may ever carry book content: no names, no email addresses, no
 * category names, no counts. Usage is "the app was opened", never what is in
 * it. That is doubly binding here — the vault goes to the server encrypted
 * precisely so we cannot see this data, and a usage event that leaked a
 * contact count would undo part of that for nothing.
 */
export default function UsageTracker() {
  useUsageTracker()
  const { session, activeOrgId } = useUniversal()
  const fired = useRef(false)

  useEffect(() => {
    if (!fired.current && session && activeOrgId) {
      fired.current = true
      track('session.opened')
    }
  }, [session, activeOrgId])

  return null
}
