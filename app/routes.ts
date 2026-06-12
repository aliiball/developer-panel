import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/_shell.tsx", [
    index("routes/dashboard.tsx"),
    route("ai-copilot", "routes/ai-copilot.tsx"),
    route("schema", "routes/schema.tsx"),
    route("schema/:modelId", "routes/schema.$modelId.tsx"),
    route("erd", "routes/erd.tsx"),
    route("data", "routes/data.tsx"),
    route("forms", "routes/forms.tsx"),
    route("modules", "routes/modules.tsx"),
    route("permissions", "routes/permissions.tsx"),
    route("theme", "routes/theme.tsx"),
    route("api-explorer", "routes/api-explorer.tsx"),
    route("code", "routes/code.tsx"),
    route("activity", "routes/activity.tsx"),
    route("settings", "routes/settings.tsx"),
    // Expansion surfaces — full pages.
    route("workflows", "routes/workflows.tsx"),
    route("terminal", "routes/terminal.tsx"),
    route("media", "routes/media.tsx"),
    route("email-templates", "routes/email-templates.tsx"),
    route("reports", "routes/reports.tsx"),
    route("scheduler", "routes/scheduler.tsx"),
    route("webhooks", "routes/webhooks.tsx"),
    route("logs", "routes/logs.tsx"),
    route("health", "routes/health.tsx"),
    route("docs", "routes/docs.tsx"),
    // Delivery & Operations
    route("issues", "routes/issues.tsx"),
    route("issues/:issueId", "routes/issues.$issueId.tsx"),
    route("roadmap", "routes/roadmap.tsx"),
    route("releases", "routes/releases.tsx"),
    route("errors", "routes/errors.tsx"),
    route("flags", "routes/flags.tsx"),
    route("environments", "routes/environments.tsx"),
    // Platform
    route("migrations", "routes/migrations.tsx"),
    route("team", "routes/team.tsx"),
    route("api-keys", "routes/api-keys.tsx"),
    route("agent-runs", "routes/agent-runs.tsx"),
    route("notifications", "routes/notifications.tsx"),
    // Backward-compat redirect for old /soon/:slug placeholder links.
    route("soon/:slug", "routes/soon-redirect.tsx"),
    // Catch-all 404 (rendered inside the shell, navigable).
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
