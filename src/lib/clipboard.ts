/**
 * Put text on the clipboard. Resolves true when it got there.
 *
 * The async Clipboard API first; the hidden-textarea `execCommand('copy')`
 * fallback is for a web view or an older browser that refuses it outside a
 * context it trusts. Both need to run inside the tap that asked for the copy.
 */
export async function copyText(text: string): Promise<boolean> {
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
