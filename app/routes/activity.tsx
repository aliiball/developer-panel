import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowClockwise,
  Brain,
  Cube,
  CheckCircle,
  Clock,
  Database,
  Lightning,
  ListBullets,
  PaintBrush,
  Pulse,
  Stack,
  Warning,
  XCircle,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import {
  EmptyState,
  KpiCard,
  KpiSkeleton,
  TableSkeleton,
  FilterBar,
  FilterChip,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
} from "~/components/enterprise";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { ActivityType } from "~/data/activities";
import {
  RICH_ACTIVITIES,
  TYPE_META,
  USAGE_SERIES,
  SOURCE_USAGE,
  PERIOD_KPIS,
  type Period,
  type RichActivity,
} from "~/data/seed.activity";

export function meta() {
  return [{ title: "Activity — MetaPanel" }];
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "24h", label: "Son 24 saat" },
  { key: "7d", label: "Son 7 gün" },
  { key: "30d", label: "Son 30 gün" },
];

const TYPE_FILTERS: { key: ActivityType | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "model", label: "Model" },
  { key: "module", label: "Modül" },
  { key: "migration", label: "Migration" },
  { key: "api", label: "API" },
  { key: "ai", label: "AI" },
  { key: "theme", label: "Tema" },
];

const TYPE_ICON: Record<ActivityType, PhosphorIcon> = {
  model: Cube,
  module: Stack,
  migration: Database,
  api: Lightning,
  theme: PaintBrush,
  ai: Brain,
};

const STATUS_META: Record<RichActivity["status"], { label: string; tone: AuditEvent["tone"]; icon: PhosphorIcon }> = {
  success: { label: "Başarılı", tone: "emerald", icon: CheckCircle },
  warning: { label: "Uyarı", tone: "amber", icon: Warning },
  failed: { label: "Başarısız", tone: "red", icon: XCircle },
};

const chartTip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
};

export default function ActivityPage() {
  // Demo amaçlı: ilk render'da kısa bir "yükleniyor" durumu canlandır.
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("7d");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RichActivity | null>(null);

  const kpis = PERIOD_KPIS[period];
  const series = USAGE_SERIES[period];
  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();

  // Önce dönem, sonra tip, sonra arama ile filtrele.
  const inPeriod = useMemo(
    () =>
      RICH_ACTIVITIES.filter((a) =>
        period === "24h" ? a.period === "24h" : period === "7d" ? a.period !== "30d" : true,
      ),
    [period],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.actor.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    });
  }, [inPeriod, typeFilter, search]);

  const typeCounts = useMemo(() => {
    const m = new Map<ActivityType | "all", number>();
    m.set("all", inPeriod.length);
    for (const a of inPeriod) m.set(a.type, (m.get(a.type) ?? 0) + 1);
    return m;
  }, [inPeriod]);

  function refresh() {
    setLoading(true);
    toast.message("Aktivite verisi yenileniyor…");
    window.setTimeout(() => {
      setLoading(false);
      toast.success(`Güncellendi — ${periodLabel}`);
    }, 650);
  }

  function exportFeed() {
    const blob = JSON.stringify(filtered, null, 2);
    toast.success(`${filtered.length} olay JSON olarak dışa aktarıldı`, {
      description: `${(blob.length / 1024).toFixed(1)} KB · pano-hazır`,
    });
  }

  // Detay drawer için audit timeline türet.
  const auditEvents: AuditEvent[] = selected
    ? [
        {
          id: `${selected.id}-1`,
          actor: selected.actor,
          action: `${selected.title.toLowerCase()} — ${selected.target}`,
          at: selected.at,
          icon: STATUS_META[selected.status].icon,
          tone: STATUS_META[selected.status].tone,
          detail: selected.detail,
        },
        {
          id: `${selected.id}-2`,
          actor: "system",
          action: `${selected.source} yüzeyinde tetiklendi`,
          at: selected.at,
          icon: Pulse,
          tone: "primary",
        },
        {
          id: `${selected.id}-3`,
          actor: "audit-log",
          action: "olay denetim akışına yazıldı",
          at: selected.at,
          icon: CheckCircle,
          tone: "default",
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Activity"
        description="Kullanım analitiği: dönem KPI'ları, kullanım grafikleri ve filtrelenebilir aktivite akışı."
        actions={[{ label: "Yenile", icon: ArrowClockwise, onClick: refresh }]}
      >
        <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                period === p.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <PageBody className="space-y-5">
        {/* ── KPI şeridi ─────────────────────────────────────────── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="API çağrısı"
              value={kpis.apiCalls.value}
              delta={kpis.apiCalls.delta}
              trend={kpis.apiCalls.trend}
              icon={Lightning}
              hint={periodLabel}
            />
            <KpiCard
              label="AI çalıştırma"
              value={kpis.aiRuns.value}
              delta={kpis.aiRuns.delta}
              trend={kpis.aiRuns.trend}
              icon={Brain}
              hint={periodLabel}
            />
            <KpiCard
              label="Aktivite olayı"
              value={kpis.events.value}
              delta={kpis.events.delta}
              trend={kpis.events.trend}
              icon={Pulse}
              hint={periodLabel}
            />
            <KpiCard
              label="Hata oranı"
              value={kpis.errorRate.value}
              delta={kpis.errorRate.delta}
              trend={kpis.errorRate.trend}
              icon={Warning}
              hint={periodLabel}
              invert
            />
          </div>
        )}

        {/* ── Kullanım grafikleri ────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Kullanım eğilimi</CardTitle>
              <span className="text-[11px] text-muted-foreground">API · AI · olay — {periodLabel}</span>
            </CardHeader>
            <CardContent className="h-64">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <TableSkeleton rows={3} cols={1} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={44} />
                    <Tooltip {...chartTip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="api" name="API" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ai" name="AI" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="events" name="Olay" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Kaynağa göre kullanım</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <TableSkeleton rows={4} cols={1} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={SOURCE_USAGE} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={92} />
                    <Tooltip {...chartTip} cursor={{ fill: "var(--accent)" }} />
                    <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Hacim alanı (ikincil görsel) ───────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Toplam API hacmi</CardTitle>
          </CardHeader>
          <CardContent className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={44} />
                <Tooltip {...chartTip} />
                <Area type="monotone" dataKey="api" name="API" stroke="var(--primary)" strokeWidth={2} fill="url(#vol)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Aktivite akışı ─────────────────────────────────────── */}
        <div className="space-y-3">
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Olay, hedef, aktör veya kaynak ara…"
            onExport={exportFeed}
          >
            {TYPE_FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                active={typeFilter === f.key}
                count={typeCounts.get(f.key) ?? 0}
                onClick={() => setTypeFilter(f.key)}
              >
                {f.label}
              </FilterChip>
            ))}
          </FilterBar>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
              <ListBullets className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Aktivite akışı</CardTitle>
              <span className="ml-auto flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                <Clock className="size-3.5" /> {filtered.length} olay · {periodLabel}
              </span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={6} cols={4} />
              ) : filtered.length === 0 ? (
                search || typeFilter !== "all" ? (
                  <EmptyState
                    variant="search"
                    icon={ListBullets}
                    title="Eşleşen olay yok"
                    description="Bu filtre/arama kombinasyonunda aktivite bulunamadı. Filtreleri sıfırlamayı deneyin."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setTypeFilter("all");
                        }}
                      >
                        Filtreleri temizle
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Pulse}
                    title="Bu dönemde aktivite yok"
                    description="Seçili dönem aralığında kaydedilmiş bir olay bulunmuyor. Daha geniş bir dönem seçin."
                  />
                )
              ) : (
                <ol className="space-y-1">
                  {filtered.map((a) => {
                    const TIcon = TYPE_ICON[a.type];
                    const st = STATUS_META[a.status];
                    const StIcon = st.icon;
                    return (
                      <li key={a.id}>
                        <button
                          onClick={() => setSelected(a)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/40"
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <TIcon className="size-3.5" weight="bold" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {a.title}{" "}
                              <span className="font-mono text-xs text-muted-foreground">{a.target}</span>
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {a.actor} · {a.source}
                            </span>
                          </span>
                          <Badge variant="secondary" className="hidden shrink-0 text-[10px] sm:inline-flex">
                            {TYPE_META[a.type].label}
                          </Badge>
                          <span
                            className={cn(
                              "hidden shrink-0 items-center gap-1 text-[11px] sm:flex",
                              a.status === "success"
                                ? "text-emerald-400"
                                : a.status === "warning"
                                  ? "text-amber-400"
                                  : "text-red-400",
                            )}
                          >
                            <StIcon className="size-3.5" weight="bold" />
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {a.timeAgo} önce
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>

      {/* ── Detay drawer ─────────────────────────────────────────── */}
      <DetailDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected ? selected.title : ""}
        subtitle={selected ? `${selected.source} · ${selected.at}` : undefined}
        badge={
          selected ? (
            <Badge variant="secondary" className="text-[10px]">
              {TYPE_META[selected.type].label}
            </Badge>
          ) : undefined
        }
        tabs={
          selected
            ? [
                {
                  value: "overview",
                  label: "Genel",
                  content: (
                    <div className="divide-y">
                      <Field label="Olay ID" mono>{selected.id}</Field>
                      <Field label="Tür">{TYPE_META[selected.type].label}</Field>
                      <Field label="Hedef" mono>{selected.target}</Field>
                      <Field label="Aktör">{selected.actor}</Field>
                      <Field label="Kaynak">{selected.source}</Field>
                      <Field label="Durum">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            selected.status === "success"
                              ? "text-emerald-400"
                              : selected.status === "warning"
                                ? "text-amber-400"
                                : "text-red-400",
                          )}
                        >
                          {STATUS_META[selected.status].label}
                        </span>
                      </Field>
                      <Field label="Zaman">{selected.at}</Field>
                      {selected.detail && (
                        <Field label="Detay" mono>{selected.detail}</Field>
                      )}
                    </div>
                  ),
                },
                {
                  value: "activity",
                  label: "Aktivite",
                  content: <AuditTimeline events={auditEvents} />,
                },
                {
                  value: "json",
                  label: "JSON",
                  content: (
                    <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                      {JSON.stringify(selected, null, 2)}
                    </pre>
                  ),
                },
              ]
            : undefined
        }
        footer={
          selected ? (
            <div className="flex w-full items-center gap-2 p-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(selected, null, 2));
                  toast.success("Olay JSON panoya kopyalandı");
                }}
              >
                JSON kopyala
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  toast.success(`${selected.source} açılıyor…`);
                  setSelected(null);
                }}
              >
                Kaynağa git
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}
