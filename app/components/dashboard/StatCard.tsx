import { useNavigate } from "react-router";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  type Icon as LucideIcon,
} from "@phosphor-icons/react";
import type { Point } from "~/data/metrics";
import { cn } from "~/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  spark,
  to,
  accent = "var(--brand)",
}: {
  label: string;
  value: number | string;
  delta: string;
  icon: LucideIcon;
  spark: Point[];
  to: string;
  accent?: string;
}) {
  const navigate = useNavigate();
  const id = `spark-${label.replace(/\s/g, "")}`;
  return (
    <button
      onClick={() => navigate(to)}
      className="group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between">
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-muted-foreground transition-colors group-hover:text-primary">
          <Icon className="size-[18px]" />
        </div>
        <span className="text-[11px] text-muted-foreground">{delta}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={accent}
              strokeWidth={1.5}
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4")}>{children}</div>
  );
}
