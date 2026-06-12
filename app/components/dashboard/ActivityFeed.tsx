import { Link } from "react-router";
import { Database, Boxes, GitCommitHorizontal, Plug, Palette, Sparkles } from "lucide-react";
import { ACTIVITIES, type ActivityType } from "~/data/activities";

// Each activity type deep-links to its home surface.
const LINK: Record<ActivityType, string> = {
  model: "/schema",
  module: "/modules",
  migration: "/migrations",
  api: "/api-explorer",
  theme: "/theme",
  ai: "/agent-runs",
};

const ICON: Record<ActivityType, typeof Database> = {
  model: Database,
  module: Boxes,
  migration: GitCommitHorizontal,
  api: Plug,
  theme: Palette,
  ai: Sparkles,
};

const TONE: Record<ActivityType, string> = {
  model: "text-sky-400 bg-sky-400/10",
  module: "text-violet-400 bg-violet-400/10",
  migration: "text-amber-400 bg-amber-400/10",
  api: "text-emerald-400 bg-emerald-400/10",
  theme: "text-pink-400 bg-pink-400/10",
  ai: "text-primary bg-primary/10",
};

export function ActivityFeed({ limit }: { limit?: number }) {
  const items = limit ? ACTIVITIES.slice(0, limit) : ACTIVITIES;
  return (
    <ol className="space-y-1">
      {items.map((a) => {
        const Icon = ICON[a.type];
        return (
          <li key={a.id}>
            <Link
              to={LINK[a.type]}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONE[a.type]}`}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {a.title} <span className="font-mono text-xs text-muted-foreground">{a.target}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">{a.actor}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{a.timeAgo} önce</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
