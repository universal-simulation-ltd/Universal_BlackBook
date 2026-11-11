// Ctrl+Enter (⌘+Enter on a Mac): save and close, on the website (James,
// 2026-11-11: "have a keyboard shortcut to save and close edits to an item").
// The convention Gmail, Slack, GitHub and Jira share for "send / submit from
// inside a text box"; Alt+Enter means other things (a new line in a
// spreadsheet cell, "properties" on Windows), so it is not used.

/** Is this key press the save-and-close shortcut? */
export function isSaveKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey?: boolean; isComposing?: boolean; nativeEvent?: { isComposing?: boolean } }): boolean {
  if (e.key !== 'Enter' || e.altKey) return false
  if (e.isComposing || e.nativeEvent?.isComposing) return false
  return e.ctrlKey || e.metaKey
}

/** The shortcut as this computer writes it, for a button's tooltip. */
export function saveKeyLabel(): string {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  return mac ? '⌘↵' : 'Ctrl+Enter'
}
