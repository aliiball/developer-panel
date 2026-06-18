import type { Icon } from "@phosphor-icons/react";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "~/lib/utils";

/* ── KpiCard ────────────────────────────────────────────────────────
 * Delta'lı (dönem karşılaştırması) + opsiyonel sparkline'lı KPI kartı.
 * Enterprise dashboard'ların temel yapı taşı: çıplak sayı değil, yön.
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
  const hasDelta = typeof delta === "number";
  const positive = hasDelta && delta! > 0;
  const negative = hasDelta && delta! < 0;
  const good = invert ? negative : positive;
  const bad = invert ? positive : negative;
  const DeltaIcon = positive ? TrendUp : negative ? TrendDown : Minus;
  const tone = good
    ? "text-emerald-400"
    : bad
      ? "text-red-400"
      : "text-muted-foreground";
  const stroke = good ? "#34d399" : bad ? "#f87171" : "#7c9cff";

  const data = (trend ?? []).map((v, i) => ({ i, v }));

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-4",
        onClick && "cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {Icon && <Icon className="size-3.5" />}
          {label}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        {hasDelta && (
          <span className={cn("flex items-center gap-0.5 pb-1 text-xs font-medium tabular-nums", tone)}>
            <DeltaIcon className="size-3.5" weight="bold" />
            {Math.abs(delta!)}
            {deltaSuffix}
          </span>
        )}
      </div>

      {data.length > 1 && (
        <div className="mt-2 h-8 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={stroke}
                strokeWidth={1.6}
                fill={`url(#spark-${label})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
