import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // GH Pages project subpath. Asset prefix only — NOT React Router basename
  // (basename + SPA build has a known regression). In dev we stay at "/".
  base: process.env.NODE_ENV === "production" ? "/developer-panel/" : "/",
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  // Pre-bundle the heavy deps that are only imported inside lazily-loaded route
  // modules. Without this, Vite's startup scan (which only sees the entry +
  // statically-imported modules) misses them; the browser then discovers them
  // mid-load, triggering a re-optimization + full page reload — i.e. the page
  // "needs a second refresh" on first visit. Listing them here makes Vite
  // pre-bundle everything up front, so the first load is stable.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router",
      "lucide-react",
      "recharts",
      "cmdk",
      "sonner",
      "zustand",
      "next-themes",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@tanstack/react-table",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/modifiers",
      "@dnd-kit/utilities",
      "@uiw/react-codemirror",
      "@uiw/codemirror-theme-github",
      "@codemirror/lang-javascript",
      "@codemirror/lang-json",
      "@base-ui/react/button",
      "@base-ui/react/checkbox",
      "@base-ui/react/dialog",
      "@base-ui/react/input",
      "@base-ui/react/menu",
      "@base-ui/react/merge-props",
      "@base-ui/react/scroll-area",
      "@base-ui/react/select",
      "@base-ui/react/separator",
      "@base-ui/react/switch",
      "@base-ui/react/tabs",
      "@base-ui/react/tooltip",
      "@base-ui/react/use-render",
    ],
  },
});
