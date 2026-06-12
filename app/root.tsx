import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [];

// Applies the persisted (or default-dark) theme BEFORE first paint so there is
// no flash. Runs from an inline script — never touches React render, so it is
// SSR-safe for the build-time index.html emit.
const themeInit = `
(function(){try{
  var t = localStorage.getItem('mp-theme') || 'dark';
  var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var dark = t === 'dark' || (t === 'system' && sys);
  document.documentElement.classList.toggle('dark', dark);
}catch(e){document.documentElement.classList.add('dark');}})();
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MetaPanel — AI-First Geliştirici Paneli</title>
        <meta
          name="description"
          content="AI-first, DX-odaklı metaframework geliştirici paneli prototipi."
        />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// Shown while the SPA bundle hydrates. Keeps the shell visually stable.
export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
        <span className="font-mono text-sm tracking-tight">MetaPanel yükleniyor…</span>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Hata";
  let details = "Beklenmeyen bir hata oluştu.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Hata";
    details =
      error.status === 404
        ? "Aradığınız sayfa bulunamadı."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-8 pt-16">
      <h1 className="font-mono text-4xl font-semibold">{message}</h1>
      <p className="mt-2 text-muted-foreground">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-lg border bg-card p-4 text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
