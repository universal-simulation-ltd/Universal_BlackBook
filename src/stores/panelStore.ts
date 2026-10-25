import { create } from 'zustand'

/**
 * Which of the app's panels is open — Tags, Backup/import/export, Online
 * backup, the PIN lock, Delete all data. On the website each is a dialog over
 * the list; on the phone each is a page (src/native/). One store rather than
 * App's own state, so the phone's Tune tab and the website's Actions menu open
 * the same thing the same way. Not saved: it is a panel being open.
 */
export type Panel = 'tags' | 'io' | 'cloud' | 'lock' | 'wipe' | 'templates' | 'map'

interface PanelState {
  panel: Panel | null
  open: (panel: Panel) => void
  close: () => void
}

export const usePanelStore = create<PanelState>((set) => ({
  panel: null,
  open: (panel) => set({ panel }),
  close: () => set({ panel: null }),
}))
