import { Capacitor } from '@capacitor/core'
import { Clipboard } from '@capacitor/clipboard'
/**
 * Put text on the clipboard. Resolves true when it got there.
 *
 * The async Clipboard API first; the hidden-textarea `execCommand('copy')`
 * fallback is for a web view or an older browser that refuses it outside a
 * context it trusts. Both need to run inside the tap that asked for the copy.
 */
export async function copyText(text: string): Promise<boolean> {
  // The phone app: the system clipboard through @capacitor/clipboard, which
  // does not depend on the web view allowing navigator.clipboard (WKWebView
  // can refuse it outside a gesture it recognises). Imported statically: a
  // dynamic import of a Capacitor plugin never settles inside the web view
  // (landmines: BlackBook's contacts picker, 2026-08-30).
  if (Capacitor.isNativePlatform()) {
    try {
      await Clipboard.write({ string: text })
      return true
    } catch {
      // Fall through to the web ways.
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      area.remove()
    }
  }
}
