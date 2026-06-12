import { Check, X, Loader2, Circle } from "lucide-react";
import { cn } from "~/lib/utils";

export interface TimelineStep {
  label: string;
  status: "pending" | "running" | "passed" | "failed";
  meta?: string;
}

const ICON = { pending: Circle, running: Loader2, passed: Check, failed: X } as const;
const TONE = {
  pending: "text-muted-foreground border-border",
  running: "text-sky-400 border-sky-400/40",
  passed: "text-emerald-400 border-emerald-400/40",
  failed: "text-red-400 border-red-400/40",
} as const;

// Horizontal step timeline. Used by the Releases CI pipeline (build→test→deploy)
// and adaptable to issue lifecycle.
export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const Icon = ICON[s.status];
        return (
          <div key={i} className="flex flex-1 items-center gap-1">
            <div className="flex items-center gap-2">
              <span className={cn("flex size-6 items-center justify-center rounded-full border", TONE[s.status])}>
                <Icon className={cn("size-3.5", s.status === "running" && "animate-spin")} />
              </span>
              <div className="leading-tight">
                <div className="text-xs font-medium capitalize">{s.label}</div>
                {s.meta && <div className="text-[10px] text-muted-foreground">{s.meta}</div>}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-px flex-1", s.status === "passed" ? "bg-emerald-400/30" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
