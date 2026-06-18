import { create } from "zustand";

const COLLAPSE_KEY = "mp.sidebar.collapsed";
const SECTION_KEY = "mp.sidebar.section";

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  return v === null ? fallback : v === "1";
}

function readStr(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function persist(key: string, value: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, value);
}

interface UIState {
  spotlightOpen: boolean;
  shortcutsOpen: boolean;
  setSpotlight: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;

  /** Sol menü daraltılmış mı (ikon ray) yoksa accordion mu. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Single-open accordion: açık olan tek bölümün id'si. */
  openSection: string | null;
  setOpenSection: (id: string | null) => void;

  /** Mobil: sol nav drawer açık mı (desktop'ta kullanılmaz). */
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  toggleNav: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  spotlightOpen: false,
  shortcutsOpen: false,
  setSpotlight: (open) => set({ spotlightOpen: open }),
  setShortcuts: (open) => set({ shortcutsOpen: open }),

  sidebarCollapsed: readBool(COLLAPSE_KEY, false),
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      persist(COLLAPSE_KEY, next ? "1" : "0");
      return { sidebarCollapsed: next };
    }),
  openSection: readStr(SECTION_KEY),
  setOpenSection: (id) =>
    set(() => {
      persist(SECTION_KEY, id ?? "");
      return { openSection: id };
    }),

  navOpen: false,
  setNavOpen: (open) => set({ navOpen: open }),
  toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),
}));
