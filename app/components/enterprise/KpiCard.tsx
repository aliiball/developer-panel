import type { Icon } from "@phosphor-icons/react";
import { TrendUp, TrendDown } from "@phosphor-icons/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "~/lib/utils";

/* ── KpiCard ────────────────────────────────────────────────────────
 * Sakin/rafine KPI kartı. Renk yalnızca DELTA'da (anlam taşır); sparkline
 * nötr ve ince tutulur ki sayfa kırmızı/yeşil dolguya boğulmasın.
 * Çıplak sayı değil, yön — ama sessizce.
 */
export function KpiCard({
  label,
  value,
  delta,
  deltaSuffix = "%",
  trend,
  icon: Icon,
  hint,
  /** delta'da yükseliş kötü mü (ör. hata oranı) */
  invert = false,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  /** dönem-üstü yüzde değişim; pozitif/negatif yönü gösterir */
  delta?: number;
  deltaSuffix?: string;
  /** sparkline için sayı dizisi */
  trend?: number[];
  icon?: Icon;
  hint?: string;
  invert?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const positive = hasDelta && delta! > 0;
  const good = invert ? !positive : positive;
  const DeltaIcon = positive ? TrendUp : TrendDown;
  const tone = !hasDelta
    ? "text-muted-foreground"
    : good
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-rose-500 dark:text-rose-400";

  const data = (trend ?? []).map((v, i) => ({ i, v }));
  const gid = `spark-${label.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between gap-3 overflow-hidden rounded-xl bg-card p-4 ring-1 ring-foreground/[0.07] transition-shadow",
        onClick &&
          "cursor-pointer hover:ring-foreground/15 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {Icon && <Icon className="size-3.5 opacity-70" />}
          {label}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground/60">{hint}</span>}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[1.7rem] font-semibold leading-none tabular-nums tracking-tight">
            {value}
          </div>
          {hasDelta && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium tabular-nums", tone)}>
              <DeltaIcon className="size-3" weight="bold" />
              {Math.abs(delta!)}
              {deltaSuffix}
            </span>
          )}
        </div>

        {data.length > 1 && (
          <div className="h-9 w-20 shrink-0 text-muted-foreground/35">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 3, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  fill={`url(#${gid})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
