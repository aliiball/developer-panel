import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  CheckCircle as CheckCircle2,
  Warning as AlertTriangle,
  XCircle,
  Pulse as Activity,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SERVICES, type ServiceHealth } from "~/data/expansion";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Health — MetaPanel" }];
}

const STATUS = {
  operational: { icon: CheckCircle2, tone: "text-emerald-400", ring: "bg-emerald-400", label: "çalışıyor", stroke: "var(--chart-2)" },
  degraded: { icon: AlertTriangle, tone: "text-amber-400", ring: "bg-amber-400", label: "yavaş", stroke: "var(--chart-3)" },
  down: { icon: XCircle, tone: "text-red-400", ring: "bg-red-400", label: "kapalı", stroke: "var(--destructive)" },
} as const;

export default function Health() {
  const up = SERVICES.filter((s) => s.status === "operational").length;
  const overall = SERVICES.some((s) => s.status === "down")
    ? "down"
    : SERVICES.some((s) => s.status === "degraded")
      ? "degraded"
      : "operational";
  const O = STATUS[overall];

  return (
    <>
      <PageHeader title="Health" description="Servis sağlık göstergeleri, gecikme ve uptime." />
      <PageBody className="space-y-5">
        {/* Overall banner */}
        <div className={cn("flex items-center gap-3 rounded-xl border p-4",
          overall === "operational" ? "border-emerald-500/20 bg-emerald-500/5" : overall === "degraded" ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/20 bg-red-500/5")}
        >
          <O.icon className={cn("size-6", O.tone)} />
          <div>
            <p className="text-sm font-semibold">
              {overall === "operational" ? "Tüm sistemler çalışıyor" : overall === "degraded" ? "Kısmi performans düşüşü" : "Servis kesintisi"}
            </p>
            <p className="text-xs text-muted-foreground">{up}/{SERVICES.length} servis tam operasyonel</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((s) => (
            <ServiceCard key={s.id} svc={s} />
          ))}
        </div>
      </PageBody>
    </>
  );
}

function ServiceCard({ svc }: { svc: ServiceHealth }) {
  const s = STATUS[svc.status];
  const data = svc.spark.map((value, i) => ({ i, value }));
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", s.ring)} />
            <span className={cn("relative inline-flex size-2.5 rounded-full", s.ring)} />
          </span>
          <span className="text-sm font-medium">{svc.name}</span>
          <span className={cn("ml-auto flex items-center gap-1 text-xs", s.tone)}>
            <s.icon className="size-3.5" /> {s.label}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="flex items-center gap-1 text-lg font-semibold tabular-nums">
              <Activity className="size-3.5 text-muted-foreground" />
              {svc.status === "down" ? "—" : `${svc.latencyMs}ms`}
            </p>
            <p className="text-[11px] text-muted-foreground">uptime %{svc.uptime}</p>
          </div>
          <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`h-${svc.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.stroke} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={s.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={s.stroke} strokeWidth={1.5} fill={`url(#h-${svc.id})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
