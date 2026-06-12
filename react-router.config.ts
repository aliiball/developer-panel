import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: no runtime SSR. Build still emits index.html, which hydrates
  // as a pure client app. Root route must be SSR-safe (no window/localStorage
  // at module scope or render). NO `prerender` array, NO `basename` —
  // GH Pages subpath. Vite `base` prefixes ASSET urls; this `basename` tells
  // the React Router client router to strip the subpath when matching routes.
  // Both are needed under a project-pages subpath. Safe without `prerender`
  // (the basename+prerender regression does not apply here).
  basename: process.env.NODE_ENV === "production" ? "/developer-panel/" : "/",
  ssr: false,
  // Opt into the upcoming v8 behaviors (these are the scaffold defaults) so
  // the dev console isn't spammed with Future Flag warnings.
  future: {
    v8_middleware: true,
    v8_passThroughRequests: true,
    v8_splitRouteModules: true,
    v8_trailingSlashAwareDataRequests: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
