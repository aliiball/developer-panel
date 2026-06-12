import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface ThemeCtx {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

const Ctx = createContext<ThemeCtx>({
  isDark: true,
  toggle: () => {},
  setDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to dark to match the build-time class on <html>. Real value is
  // read from the DOM after mount (the inline script in root.tsx set it).
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("mp-theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setDark(!isDark), [isDark, setDark]);

  return <Ctx.Provider value={{ isDark, toggle, setDark }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
