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

export type GoTab = 'contacts' | 'places' | 'lists' | 'todos' | 'notes'

/**
 * A tab asked for from inside another (a to-do found by the Notes tab's search
 * opens on To-do: components/Elsewhere). Both shells (App, NativeApp) follow
 * `n`: a new number is a new request, even for the tab asked for last time.
 */
export const useGoTab = create<{ tab: GoTab | null; n: number; go: (tab: GoTab) => void }>((set) => ({
  tab: null,
  n: 0,
  go: (tab) => set((s) => ({ tab, n: s.n + 1 })),
}))
