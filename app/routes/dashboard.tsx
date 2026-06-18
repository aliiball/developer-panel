import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Stack as Boxes,
  Plus,
  Sparkle as Sparkles,
  Palette,
  Pulse as Activity,
  Plug,
  Database,
  GitCommit as GitCommitHorizontal,
  ArrowRight,
  ArrowSquareOut,
  CaretUp,
  CaretDown,
  Warning,
  Lightbulb,
  CheckCircle,
  Rocket,
  ListChecks,
  ChartLineUp,
  ChartDonut,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import {
  Area, AreaChart, Bar, BarChart, Pie, PieChart, Cell,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { ActivityFeed } from "~/components/dashboard/ActivityFeed";
import { InsightStrip } from "~/components/dashboard/InsightStrip";
import {
  KpiCard,
  KpiSkeleton,
  FilterChip,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
} from "~/components/enterprise";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useCopilotStore } from "~/stores/copilot-store";
import { CopilotComposer } from "~/components/dashboard/CopilotComposer";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import {
  PERIODS,
  KPI_DEFS,
  SUMMARY_CARDS,
  TRAFFIC_SOURCES,
  ENV_VOLUME,
  WORKSPACE_AUDIT,
  HIGHLIGHTS,
  sliceSeries,
  deltaPct,
  type PeriodKey,
  type SummaryTone,
  type HighlightTone,
} from "~/data/seed.dashboard";

export function meta() {
  return [{ title: "Dashboard — MetaPanel" }];
}

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const chartTip = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 },
};

const TONE_DOT: Record<SummaryTone, string> = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  default: "bg-muted-foreground/50",
};
const TONE_TEXT: Record<SummaryTone, string> = {
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  default: "text-muted-foreground",
};
const HL_TONE: Record<HighlightTone, { ring: string; text: string; icon: typeof Warning }> = {
  red: { ring: "border-red-500/30 bg-red-500/5", text: "text-red-400", icon: Warning },
  amber: { ring: "border-amber-500/30 bg-amber-500/5", text: "text-amber-400", icon: Lightbulb },
  emerald: { ring: "border-emerald-500/30 bg-emerald-500/5", text: "text-emerald-400", icon: CheckCircle },
  primary: { ring: "border-primary/30 bg-primary/5", text: "text-primary", icon: Sparkles },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [trendKey, setTrendKey] = useState<"apiCalls" | "errors" | "builds">("apiCalls");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const series = useMemo(() => sliceSeries(period), [period]);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();

  // dönem-duyarlı KPI'lar (cari vs önceki eşit dönem → delta)
  const kpis = useMemo(
    () =>
      KPI_DEFS.map((d) => {
        const cur = d.current(series);
        const prev = d.previous(period);
        return {
          ...d,
          valueNum: cur,
          value: d.format(cur),
          delta: deltaPct(cur, prev),
          trendData: d.trend(series),
        };
      }),
    [series, period],
  );

  const trendDefs = [
    { key: "apiCalls" as const, label: "API çağrısı", icon: ChartLineUp, data: series.apiCalls, color: "var(--chart-1)" },
    { key: "errors" as const, label: "Hata olayı", icon: Warning, data: series.errors, color: "var(--chart-4)" },
    { key: "builds" as const, label: "Deploy", icon: Rocket, data: series.builds, color: "var(--chart-2)" },
  ];
  const activeTrend = trendDefs.find((t) => t.key === trendKey)!;
  const trendTotal = activeTrend.data.reduce((s, p) => s + p.value, 0);
  const trendPeak = Math.max(...activeTrend.data.map((p) => p.value));

  function exportSnapshot() {
    const snapshot = {
      generatedAt: new Date().toISOString(),
      period,
      kpis: kpis.map((k) => ({ key: k.key, value: k.value, deltaPct: k.delta })),
      traffic: TRAFFIC_SOURCES,
      environments: ENV_VOLUME,
    };
    toast.success("Workspace snapshot dışa aktarıldı", {
      description: `${period} · ${kpis.length} KPI · JSON kopyalandı (mock)`,
    });
    try {
      void navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2));
    } catch {
      /* clipboard yoksa sessiz geç */
    }
  }

  const drawerTabs: DrawerTab[] = [
    {
      value: "genel",
      label: "Genel",
      content: (
        <div className="divide-y">
          <Field label="Workspace">turksab-prod</Field>
          <Field label="Aktif dönem">{PERIODS.find((p) => p.key === period)!.label}</Field>
          {kpis.map((k) => (
            <Field key={k.key} label={k.label}>
              <span className="inline-flex items-center gap-2">
                <span className="tabular-nums">{k.value}</span>
                <DeltaTag delta={k.delta} invert={k.invert} />
              </span>
            </Field>
          ))}
          <Field label="Trafik kaynağı">{TRAFFIC_SOURCES.map((t) => `${t.label} %${t.value}`).join(" · ")}</Field>
        </div>
      ),
    },
    {
      value: "aktivite",
      label: "Aktivite",
      content: <AuditTimeline events={WORKSPACE_AUDIT} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(
            {
              period,
              kpis: kpis.map((k) => ({ key: k.key, value: k.value, deltaPct: k.delta, invert: !!k.invert })),
              trafficSources: TRAFFIC_SOURCES,
              envVolume: ENV_VOLUME,
            },
            null,
            2,
          )}
        </pre>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Workspace'inizin sağlığı, trendleri ve son etkinlikleri — tek bakışta."
        actions={[
          { label: "Yeni Model", icon: Plus, variant: "default", onClick: () => navigate("/schema?new=1") },
          { label: "AI Özet", icon: Sparkles, onClick: () => queuePrompt(`Bu workspace'te ${periodLabel} ne değişti, özetle ve riskleri sırala.`) },
          { label: "Denetim", icon: ClockCounterClockwise, onClick: () => setDrawerOpen(true) },
          { label: "Modül", icon: Boxes, onClick: () => navigate("/modules") },
          { label: "Tema", icon: Palette, onClick: () => navigate("/theme") },
          { label: "Metrikler", icon: Activity, onClick: () => navigate("/activity") },
        ]}
      />
      <PageBody className="space-y-5">
        <CopilotComposer />
        <InsightStrip />

        {/* Dönem seçimi + snapshot export */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Dönem:</span>
          {PERIODS.map((p) => (
            <FilterChip key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)}>
              {p.label}
            </FilterChip>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportSnapshot}>
              <ArrowSquareOut className="size-4" /> Snapshot
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
              <ClockCounterClockwise className="size-4" /> Audit
            </Button>
          </div>
        </div>

        {/* KPI şeridi — delta + sparkline, dönem karşılaştırması */}
        {kpis.length === 0 ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard
                key={k.key}
                label={k.label}
                value={k.value}
                delta={k.delta}
                trend={k.trendData}
                invert={k.invert}
                hint={k.hint}
                onClick={() => navigate(k.to)}
              />
            ))}
          </div>
        )}

        {/* Öne çıkanlar — "neden böyle" insight derinliği */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => {
            const t = HL_TONE[h.tone];
            return (
              <Link
                key={h.id}
                to={h.to}
                className={cn(
                  "group flex flex-col rounded-xl border p-3 transition-colors hover:border-primary/40",
                  t.ring,
                )}
              >
                <div className="flex items-start gap-2">
                  <t.icon className={cn("mt-0.5 size-4 shrink-0", t.text)} weight="regular" />
                  <p className="text-xs font-medium leading-snug">{h.title}</p>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">{h.detail}</p>
                <span className={cn("mt-auto flex items-center gap-1 pt-2 text-[11px] font-medium", t.text)}>
                  {h.cta} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Trend grafiği (seçilebilir metrik) + trafik dağılımı */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <ChartLineUp className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Aktivite Trendi</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {trendDefs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTrendKey(t.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                      trendKey === t.key
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <t.icon className="size-3" /> {t.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Toplam ({periodLabel})</p>
                  <p className="text-xl font-semibold tabular-nums">{trendTotal.toLocaleString("tr-TR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Zirve</p>
                  <p className="text-xl font-semibold tabular-nums">{trendPeak.toLocaleString("tr-TR")}</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeTrend.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={activeTrend.color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={activeTrend.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={28}
                    />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={40} />
                    <Tooltip {...chartTip} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={activeTrend.label}
                      stroke={activeTrend.color}
                      strokeWidth={2}
                      fill="url(#trendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 pb-2">
              <ChartDonut className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Trafik Kaynağı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip {...chartTip} />
                    <Pie data={TRAFFIC_SOURCES} dataKey="value" nameKey="label" innerRadius={42} outerRadius={70} paddingAngle={2}>
                      {TRAFFIC_SOURCES.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1">
                {TRAFFIC_SOURCES.map((t, i) => (
                  <li key={t.label} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 truncate">{t.label}</span>
                    <span className="tabular-nums text-muted-foreground">%{t.value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Çapraz-sayfa özet kartları */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ListChecks className="size-3.5 text-muted-foreground" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Yüzey Özetleri</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SUMMARY_CARDS.map((c) => (
              <Card
                key={c.key}
                role="link"
                tabIndex={0}
                onClick={() => navigate(c.to)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(c.to);
                }}
                className="cursor-pointer transition-colors hover:border-primary/40"
              >
                <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", TONE_DOT[c.tone])} />
                    <CardTitle className="text-sm font-semibold">{c.title}</CardTitle>
                  </div>
                  <ArrowSquareOut className="size-3.5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{c.primary}</p>
                    <p className="text-[11px] text-muted-foreground">{c.caption}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2">
                    {c.rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="truncate text-muted-foreground">{r.label}</span>
                        <span className={cn("tabular-nums font-medium", r.tone ? TONE_TEXT[r.tone] : "")}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Ortam başına hacim (stacked) + son aktivite */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-semibold">Ortam Başına İstek Hacmi</CardTitle>
              <Badge variant="outline" className="font-mono">{period}</Badge>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ENV_VOLUME} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="env" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={40} />
                  <Tooltip {...chartTip} cursor={{ fill: "var(--accent)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="read" name="Okuma" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="write" name="Yazma" stackId="a" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-semibold">Son Aktiviteler</CardTitle>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                Denetim <ArrowRight className="size-3" />
              </button>
            </CardHeader>
            <CardContent>
              <ActivityFeed limit={7} />
            </CardContent>
          </Card>
        </div>

        {/* Platform sayaçları — derin linkli hızlı erişim */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat icon={Database} label="Models" value="12" to="/schema" onGo={navigate} />
          <MiniStat icon={Boxes} label="Modules" value="8" to="/modules" onGo={navigate} />
          <MiniStat icon={Plug} label="Endpoints" value="47" to="/api-explorer" onGo={navigate} />
          <MiniStat icon={GitCommitHorizontal} label="Migrations" value="23" to="/migrations" onGo={navigate} />
        </div>
      </PageBody>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Workspace Denetimi"
        subtitle={`turksab-prod · ${PERIODS.find((p) => p.key === period)!.label}`}
        badge={<Badge variant="secondary">{period}</Badge>}
        tabs={drawerTabs}
        footer={
          <div className="flex w-full items-center justify-between p-3">
            <span className="text-xs text-muted-foreground">{WORKSPACE_AUDIT.length} olay</span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/activity")}>
              Tüm aktivite <ArrowRight className="size-3.5" />
            </Button>
          </div>
        }
      />
    </>
  );
}

function DeltaTag({ delta, invert }: { delta: number; invert?: boolean }) {
  const positive = delta > 0;
  const good = invert ? !positive && delta !== 0 : positive;
  const tone = delta === 0 ? "text-muted-foreground" : good ? "text-emerald-400" : "text-red-400";
  const Icon = positive ? CaretUp : CaretDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", tone)}>
      <Icon className="size-3" weight="bold" />
      {Math.abs(delta)}%
    </span>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  to,
  onGo,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  to: string;
  onGo: (to: string) => void;
}) {
  return (
    <button
      onClick={() => onGo(to)}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
      <ArrowRight className="ml-auto size-4 text-muted-foreground" />
    </button>
  );
}
