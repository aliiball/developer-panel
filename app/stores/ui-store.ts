import { create } from "zustand";

interface UIState {
  spotlightOpen: boolean;
  shortcutsOpen: boolean;
  setSpotlight: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  spotlightOpen: false,
  shortcutsOpen: false,
  setSpotlight: (open) => set({ spotlightOpen: open }),
  setShortcuts: (open) => set({ shortcutsOpen: open }),
}));
