import { create } from "zustand";

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  success: string;
  warning: string;
  destructive: string;
}

export const DEFAULT_BRAND: BrandColors = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  accent: "#06b6d4",
  neutral: "#71717a",
  success: "#10b981",
  warning: "#f59e0b",
  destructive: "#ef4444",
};

export type ColorScheme = "dark" | "light" | "system";

interface ThemeState {
  brand: BrandColors;
  scheme: ColorScheme;
  setColor: (key: keyof BrandColors, value: string) => void;
  setBrand: (brand: Partial<BrandColors>) => void;
  resetBrand: () => void;
  setScheme: (scheme: ColorScheme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  brand: DEFAULT_BRAND,
  scheme: "dark",
  setColor: (key, value) =>
    set((s) => ({ brand: { ...s.brand, [key]: value } })),
  setBrand: (brand) => set((s) => ({ brand: { ...s.brand, ...brand } })),
  resetBrand: () => set({ brand: DEFAULT_BRAND }),
  setScheme: (scheme) => set({ scheme }),
}));
