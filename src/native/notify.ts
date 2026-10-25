// Phone notifications for reminders (James, 2026-10-25: "phone notifications,
// no server"). Everything is scheduled on the phone itself with
// @capacitor/local-notifications; nothing is sent anywhere.
//
// The whole schedule is rebuilt whenever a reminder changes and whenever the
// app comes to the front: every notification this app has pending is
// cancelled and the next ones are scheduled again. A repeating reminder is
// scheduled as its next few occurrences (6 months, 2 years) rather than as a
// system repeat, because a system "every month on the 31st" skips the short
// months; opening the app tops the list up. iOS keeps at most 64 pending, so
// the soonest 60 are kept.
//
// ⚠️ Static import: a code-split plugin import never settles inside the
// Capacitor web view (landmines: @capacitor-community/contacts, 2026-08-30).

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { notificationId, upcoming } from '../lib/reminders'
import type { ReminderEntry } from '../components/Reminders'
import type { Translator } from '../i18n'

const AHEAD = { once: 1, monthly: 6, yearly: 2 } as const
const MAX_PENDING = 60

export const notificationsAvailable = () => Capacitor.isNativePlatform()

/** Ask once, when somebody adds a reminder. True when the phone will show them. */
export async function askForNotifications(): Promise<boolean> {
  if (!notificationsAvailable()) return false
  try {
    const now = await LocalNotifications.checkPermissions()
    if (now.display === 'granted') return true
    if (now.display === 'denied') return false
    const asked = await LocalNotifications.requestPermissions()
    return asked.display === 'granted'
  } catch {
    return false
  }
}

/**
 * Cancel what is pending and schedule the next occurrences of every reminder.
 * `details` off (the default) keeps names off the lock screen.
 */
export async function scheduleReminders(entries: ReminderEntry[], details: boolean, t: Translator): Promise<void> {
  if (!notificationsAvailable()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
    }
    if (perm.display !== 'granted') return
    const from = Date.now() + 5_000
    const all = entries.flatMap((e) =>
      upcoming(e.reminder, from, AHEAD[e.reminder.repeat]).map((when) => ({ e, when })),
    )
    all.sort((a, b) => a.when - b.when)
    const notifications = all.slice(0, MAX_PENDING).map(({ e, when }) => ({
      id: notificationId(e.reminder.id, when),
      title: details ? e.owner : t('notify.generic_title'),
      body: details ? e.reminder.label || t('rem.untitled') : t('notify.generic_body'),
      schedule: { at: new Date(when), allowWhileIdle: true },
      extra: { kind: e.kind, id: e.ownerId },
    }))
    if (notifications.length) await LocalNotifications.schedule({ notifications })
  } catch {
    // A failed schedule must never take the app down; the in-app list of due
    // reminders (DueReminders) still shows them.
  }
}

/** A tap on a notification opens what it was about. */
export function onNotificationTap(open: (kind: 'contact' | 'note', id: string) => void): () => void {
  if (!notificationsAvailable()) return () => {}
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const extra = a.notification.extra as { kind?: string; id?: string } | undefined
    if (extra?.id && (extra.kind === 'contact' || extra.kind === 'note')) open(extra.kind, extra.id)
  })
  return () => void handle.then((h) => h.remove())
}
