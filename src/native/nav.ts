import { create } from 'zustand'

// The phone screens' own pages — the ones that are not a shared component's
// popup (those follow the app's stores: `viewing`, `editing`, the panels). Each
// open flag is one page; the knowledge base's article stands over its list.

interface NativeNav {
  about: boolean
  kb: boolean
  article: string | null
  /** A short message at the foot of the screen, in place of an alert. */
  toast: string | null
  setAbout: (open: boolean) => void
  setKb: (open: boolean) => void
  setArticle: (id: string | null) => void
  say: (message: string | null) => void
}

export const useNativeNav = create<NativeNav>((set) => ({
  about: false,
  kb: false,
  article: null,
  toast: null,
  setAbout: (about) => set({ about }),
  setKb: (kb) => set(kb ? { kb } : { kb, article: null }),
  setArticle: (article) => set({ article }),
  say: (toast) => set({ toast }),
}))
