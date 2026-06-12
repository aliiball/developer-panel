import { redirect } from "react-router";
import type { Route } from "./+types/soon-redirect";

// Backward-compat: the expansion modules used to live under /soon/:slug while
// they were placeholders. They are now full pages at /:slug. Old bookmarks /
// open tabs (e.g. /soon/workflows) redirect to the real page.
const VALID = new Set([
  "workflows", "terminal", "media", "email-templates", "reports",
  "scheduler", "webhooks", "logs", "health", "docs",
]);

export function clientLoader({ params }: Route.ClientLoaderArgs) {
  const slug = params.slug ?? "";
  return redirect(VALID.has(slug) ? `/${slug}` : "/");
}

export default function SoonRedirect() {
  return null;
}
