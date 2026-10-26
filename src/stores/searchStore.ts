import { create } from 'zustand'

/**
 * "If going away to another tab clear the search" (James, 2026-10-26). Every
 * tab stays mounted (hidden) while another shows, and each keeps its search in
 * its own place, so changing tab bumps this and each search box empties itself
 * (ListSearch, SearchDrawer).
 */
export const useSearchReset = create<{ epoch: number; clearAll: () => void }>((set) => ({
  epoch: 0,
  clearAll: () => set((s) => ({ epoch: s.epoch + 1 })),
}))
