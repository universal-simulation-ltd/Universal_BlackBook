import { Capacitor } from '@capacitor/core'
import { copyText } from './clipboard'

/**
 * Hand text to the system share sheet: the phone's own in the app, the
 * browser's where it has one, else the clipboard. Resolves 'copied' when it
 * fell back to the clipboard (so the caller can say so), 'failed' when even
 * that did not work. Closing the share sheet is a decision, not a fault.
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, dialogTitle: title })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title, text })
      return 'shared'
    }
  } catch {
    return 'shared'
  }
  return (await copyText(text)) ? 'copied' : 'failed'
}
