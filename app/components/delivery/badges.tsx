import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

export type Tone = "emerald" | "amber" | "orange" | "red" | "sky" | "violet" | "muted";

const TONE: Record<Tone, string> = {
  emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  amber: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  orange: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  red: "text-red-400 bg-red-400/10 border-red-400/30",
  sky: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  violet: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  muted: "text-muted-foreground bg-muted border-border",
};

// Generic status pill driven by a tone. Consolidates the STATUS_TONE pattern
// repeated across webhooks/logs/health.
export function StatusBadge({
  label,
  tone,
  icon: Icon,
  className,
}: {
  label: string;
  tone: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
        TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3" />}
      {label}
    </span>
  );
}

// ── Domain-specific mappers ───────────────────────────────────────
const SEVERITY_TONE: Record<string, Tone> = {
  low: "muted",
  medium: "sky",
  high: "amber",
  critical: "red",
};
const SEVERITY_LABEL: Record<string, string> = {
  low: "düşük", medium: "orta", high: "yüksek", critical: "kritik",
};
export function SeverityBadge({ severity }: { severity: string }) {
  return <StatusBadge label={SEVERITY_LABEL[severity] ?? severity} tone={SEVERITY_TONE[severity] ?? "muted"} />;
}

const ISSUE_STATUS_TONE: Record<string, Tone> = {
  triage: "amber", "in-progress": "sky", resolved: "emerald", closed: "muted",
  unresolved: "red", ignored: "muted",
};
const ISSUE_STATUS_LABEL: Record<string, string> = {
  triage: "triyaj", "in-progress": "geliştiriliyor", resolved: "çözüldü", closed: "kapandı",
  unresolved: "açık", ignored: "yok sayıldı",
};
export function IssueStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={ISSUE_STATUS_LABEL[status] ?? status} tone={ISSUE_STATUS_TONE[status] ?? "muted"} />;
}

const DEPLOY_TONE: Record<string, Tone> = {
  success: "emerald", failed: "red", "rolled-back": "muted",
  queued: "muted", building: "sky", testing: "sky", deploying: "violet",
};
export function DeployStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={DEPLOY_TONE[status] ?? "muted"} />;
}
