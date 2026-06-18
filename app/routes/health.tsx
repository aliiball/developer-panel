import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle as CheckCircle2,
  Warning as AlertTriangle,
  XCircle,
  Pulse as Activity,
  ShieldCheck,
  Timer,
  Lightning,
  ArrowClockwise,
  Export as ExportIcon,
  Bell,
  Circle,
  GitBranch,
  Stack,
  MapPin,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SERVICES, type ServiceHealth } from "~/data/expansion";
import {
  SERVICE_META,
  INCIDENTS,
  METRICS_24H,
  UPTIME_30D,
  type Incident,
  type Severity,
} from "~/data/seed.health";
import {
  KpiCard,
  FilterBar,
  FilterChip,
  EmptyState,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
} from "~/components/enterprise";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Health — MetaPanel" }];
}

const STATUS = {
  operational: { icon: CheckCircle2, tone: "text-emerald-400", ring: "bg-emerald-400", label: "çalışıyor", stroke: "var(--chart-2)" },
  degraded: { icon: AlertTriangle, tone: "text-amber-400", ring: "bg-amber-400", label: "yavaş", stroke: "var(--chart-3)" },
  down: { icon: XCircle, tone: "text-red-400", ring: "bg-red-400", label: "kapalı", stroke: "var(--destructive)" },
} as const;

type StatusKey = keyof typeof STATUS;

const SEVERITY: Record<Severity, { label: string; badge: "destructive" | "secondary" | "outline"; tone: string }> = {
  critical: { label: "kritik", badge: "destructive", tone: "text-red-400" },
  major: { label: "majör", badge: "secondary", tone: "text-amber-400" },
  minor: { label: "minör", badge: "outline", tone: "text-muted-foreground" },
};

const INC_STATUS: Record<Incident["status"], { label: string; tone: AuditEvent["tone"] }> = {
  resolved: { label: "çözüldü", tone: "emerald" },
  monitoring: { label: "izleniyor", tone: "amber" },
  investigating: { label: "araştırılıyor", tone: "red" },
  identified: { label: "tespit edildi", tone: "amber" },
};

const REGION_LABEL: Record<string, string> = {
  "eu-central": "EU Central",
  "us-east": "US East",
  "ap-south": "AP South",
};

export default function Health() {
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ServiceHealth | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);

  const up = SERVICES.filter((s) => s.status === "operational").length;
  const degraded = SERVICES.filter((s) => s.status === "degraded").length;
  const down = SERVICES.filter((s) => s.status === "down").length;

  const overall: StatusKey = down > 0 ? "down" : degraded > 0 ? "degraded" : "operational";
  const O = STATUS[overall];

  // Toplu KPI'lar
  const fleetUptime = useMemo(
    () => SERVICES.reduce((a, s) => a + s.uptime, 0) / SERVICES.length,
    [],
  );
  const avgLatency = useMemo(() => {
    const live = SERVICES.filter((s) => s.status !== "down");
    return Math.round(live.reduce((a, s) => a + s.latencyMs, 0) / live.length);
  }, []);
  const openIncidents = INCIDENTS.filter((i) => i.status !== "resolved").length;
  const slaBreaches = SERVICES.filter((s) => {
    const m = SERVICE_META[s.id];
    return m && m.slaActual < m.slaTarget;
  }).length;

  const filtered = useMemo(() => {
    return SERVICES.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (activeOnly && s.status === "operational") return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.id.includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [statusFilter, search, activeOnly]);

  const incidentsFiltered = useMemo(() => {
    if (statusFilter === "all") return INCIDENTS;
    return INCIDENTS.filter((i) => SERVICES.find((s) => s.id === i.service)?.status === statusFilter);
  }, [statusFilter]);

  function exportJson() {
    const payload = SERVICES.map((s) => ({ ...s, meta: SERVICE_META[s.id] }));
    void payload;
    toast.success("Sağlık raporu dışa aktarıldı", {
      description: `${SERVICES.length} servis + ${INCIDENTS.length} incident JSON olarak hazırlandı.`,
    });
  }

  function refresh() {
    toast.success("Sağlık probları yenilendi", { description: "Son senkron: az önce." });
  }

  function acknowledgeAll() {
    if (openIncidents === 0) {
      toast.info("Açık incident yok.");
      return;
    }
    toast.success(`${openIncidents} açık incident sahiplenildi`, {
      description: "Sorumlu ekiplere bildirim gönderildi.",
    });
  }

  return (
    <>
      <PageHeader
        title="Health"
        description="Servis sağlığı, gecikme/hata trendleri, incident geçmişi ve SLA göstergeleri."
        actions={[
          { label: "Acknowledge", icon: Bell, onClick: acknowledgeAll },
          { label: "Yenile", icon: ArrowClockwise, onClick: refresh },
          { label: "Export", icon: ExportIcon, variant: "default", onClick: exportJson },
        ]}
      />
      <PageBody className="space-y-5">
        {/* ── Overall banner ─────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border p-4",
            overall === "operational"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : overall === "degraded"
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-red-500/20 bg-red-500/5",
          )}
        >
          <O.icon className={cn("size-6", O.tone)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {overall === "operational"
                ? "Tüm sistemler çalışıyor"
                : overall === "degraded"
                  ? "Kısmi performans düşüşü"
                  : "Aktif servis kesintisi"}
            </p>
            <p className="text-xs text-muted-foreground">
              {up}/{SERVICES.length} tam operasyonel · {degraded} yavaş · {down} kapalı
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Son güncelleme:</span>
            <Badge variant="outline" className="gap-1">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              canlı · 30sn
            </Badge>
          </div>
        </div>

        {/* ── KPI şeridi ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Filo Uptime (30g)"
            value={`%${fleetUptime.toFixed(2)}`}
            delta={-0.21}
            icon={ShieldCheck}
            hint="hedef %99.9"
            trend={UPTIME_30D.map((d) => d.uptime)}
          />
          <KpiCard
            label="Ort. Latency (p95)"
            value={`${avgLatency}ms`}
            delta={14}
            invert
            icon={Timer}
            hint="canlı servisler"
            trend={METRICS_24H.map((m) => m.p95)}
          />
          <KpiCard
            label="Açık Incident"
            value={openIncidents}
            delta={openIncidents > 0 ? 100 : -50}
            invert
            icon={AlertTriangle}
            hint={`${INCIDENTS.length} toplam`}
            deltaSuffix=""
          />
          <KpiCard
            label="SLA İhlali"
            value={slaBreaches}
            delta={slaBreaches > 0 ? 1 : 0}
            invert
            icon={Lightning}
            hint="hedef altı servis"
            deltaSuffix=""
          />
        </div>

        {/* ── Latency / Error trend grafikleri ───────────────────── */}
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard title="Latency p95 (24s)" subtitle="Tüm filo ağırlıklı ortalama" accent="var(--chart-1)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={METRICS_24H} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="lat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={3} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<ChartTip unit="ms" />} />
                <Area type="monotone" dataKey="p95" stroke="var(--chart-1)" strokeWidth={1.8} fill="url(#lat)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Hata Oranı (24s)" subtitle="5xx + başarısız teslimat %" accent="var(--destructive)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={METRICS_24H} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={3} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<ChartTip unit="%" />} />
                <Line type="monotone" dataKey="errorRate" stroke="var(--destructive)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── 30 günlük uptime status bar ─────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Uptime — son 30 gün</p>
                <p className="text-xs text-muted-foreground">Günlük uptime % (status-page görünümü)</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                %{fleetUptime.toFixed(2)} ortalama
              </span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={UPTIME_30D} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
                  <YAxis domain={[96, 100]} hide />
                  <Tooltip content={<UptimeTip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                  <Bar dataKey="uptime" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {UPTIME_30D.map((d) => (
                      <Cell
                        key={d.day}
                        fill={d.uptime >= 99.9 ? "var(--chart-2)" : d.uptime >= 99 ? "var(--chart-3)" : "var(--destructive)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── FilterBar ───────────────────────────────────────────── */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Servis ara (isim / id)…"
          onExport={exportJson}
        >
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} count={SERVICES.length}>
            Tümü
          </FilterChip>
          <FilterChip active={statusFilter === "operational"} onClick={() => setStatusFilter("operational")} count={up}>
            Çalışıyor
          </FilterChip>
          <FilterChip active={statusFilter === "degraded"} onClick={() => setStatusFilter("degraded")} count={degraded}>
            Yavaş
          </FilterChip>
          <FilterChip active={statusFilter === "down"} onClick={() => setStatusFilter("down")} count={down}>
            Kapalı
          </FilterChip>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <FilterChip active={activeOnly} onClick={() => setActiveOnly((v) => !v)}>
            Yalnız sorunlu
          </FilterChip>
        </FilterBar>

        {/* ── Servis durum kartları ───────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState
            variant="search"
            icon={Activity}
            title="Eşleşen servis yok"
            description="Arama veya filtre kriterlerini gevşetmeyi deneyin."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setActiveOnly(false);
                }}
              >
                Filtreleri temizle
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <ServiceCard key={s.id} svc={s} onOpen={() => setSelected(s)} />
            ))}
          </div>
        )}

        {/* ── Incident timeline (özet liste) ──────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Incident Geçmişi</p>
                <p className="text-xs text-muted-foreground">
                  {incidentsFiltered.length} kayıt · {openIncidents} açık
                </p>
              </div>
              <Badge variant={openIncidents > 0 ? "destructive" : "outline"}>
                {openIncidents > 0 ? `${openIncidents} aktif` : "tümü çözüldü"}
              </Badge>
            </div>
            {incidentsFiltered.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Bu filtre için incident yok"
                description="Seçili servis durumunda kayıtlı bir olay bulunmuyor."
              />
            ) : (
              <div className="space-y-2">
                {incidentsFiltered.map((inc) => {
                  const svc = SERVICES.find((s) => s.id === inc.service);
                  const sev = SEVERITY[inc.severity];
                  const st = INC_STATUS[inc.status];
                  return (
                    <button
                      key={inc.id}
                      onClick={() => svc && setSelected(svc)}
                      className="flex w-full items-center gap-3 rounded-lg border bg-card/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", inc.severity === "critical" ? "bg-red-500/15" : inc.severity === "major" ? "bg-amber-500/15" : "bg-muted")}>
                        <AlertTriangle className={cn("size-3.5", sev.tone)} weight="bold" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-medium">
                          {inc.title}
                          <span className="font-mono text-[10px] text-muted-foreground">{inc.id}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {svc?.name} · {inc.startedAt} · {fmtDur(inc.durationMin)}
                        </p>
                      </div>
                      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                        <Badge variant={sev.badge}>{sev.label}</Badge>
                        <span className={cn("text-xs font-medium", toneText(st.tone))}>{st.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PageBody>

      {/* ── DetailDrawer ──────────────────────────────────────────── */}
      <ServiceDrawer svc={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/* ── Servis kartı ──────────────────────────────────────────────────── */
function ServiceCard({ svc, onOpen }: { svc: ServiceHealth; onOpen: () => void }) {
  const s = STATUS[svc.status];
  const meta = SERVICE_META[svc.id];
  const data = svc.spark.map((value, i) => ({ i, value }));
  const slaOk = !meta || meta.slaActual >= meta.slaTarget;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <button onClick={onOpen} className="w-full text-left">
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
        </button>

        {meta && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {REGION_LABEL[meta.region]}
            </span>
            <span className="flex items-center gap-1">
              <Lightning className="size-3" /> {meta.errorRate}% hata
            </span>
            <span className={cn("flex items-center gap-1 font-medium", slaOk ? "text-emerald-400" : "text-red-400")}>
              <ShieldCheck className="size-3" /> SLA %{meta.slaActual}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Servis detay drawer'ı ─────────────────────────────────────────── */
function ServiceDrawer({ svc, onClose }: { svc: ServiceHealth | null; onClose: () => void }) {
  if (!svc) return null;
  const s = STATUS[svc.status];
  const meta = SERVICE_META[svc.id];
  const incidents = INCIDENTS.filter((i) => i.service === svc.id);
  const slaOk = !meta || meta.slaActual >= meta.slaTarget;

  const auditEvents: AuditEvent[] = incidents.flatMap((inc) =>
    inc.timeline.map((t) => ({
      id: `${inc.id}-${t.id}`,
      action: `[${inc.id}] ${t.action}`,
      actor: t.actor,
      at: `${inc.startedAt.split(" ")[0]} ${t.at}`,
      tone: t.tone,
      detail: t.detail,
      icon: t.tone === "emerald" ? CheckCircle2 : t.tone === "red" ? XCircle : t.tone === "amber" ? AlertTriangle : Circle,
    })),
  );

  const tabs = [
    {
      value: "genel",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card/50 p-3">
            <Field label="Durum">
              <span className={cn("flex items-center justify-end gap-1.5 font-medium", s.tone)}>
                <s.icon className="size-4" /> {s.label}
              </span>
            </Field>
            <Field label="Latency (p95)" mono>
              {svc.status === "down" ? "—" : `${meta?.p95Ms ?? svc.latencyMs}ms`}
            </Field>
            <Field label="Uptime (30g)" mono>%{svc.uptime}</Field>
            {meta && (
              <>
                <Field label="Hata oranı (24s)" mono>
                  <span className={meta.errorRate > 1 ? "text-red-400" : "text-foreground"}>{meta.errorRate}%</span>
                </Field>
                <Field label="İstek hacmi" mono>{meta.rps} rps</Field>
              </>
            )}
          </div>

          {meta && (
            <div className="rounded-lg border bg-card/50 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">SLA</p>
              <Field label="Hedef" mono>%{meta.slaTarget}</Field>
              <Field label="Gerçekleşen (30g)" mono>
                <span className={slaOk ? "text-emerald-400" : "text-red-400"}>%{meta.slaActual}</span>
              </Field>
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", slaOk ? "bg-emerald-400" : "bg-red-400")}
                    style={{ width: `${Math.min(100, (meta.slaActual / 100) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {slaOk ? "SLA hedefi karşılanıyor" : `Hedefin %${(meta.slaTarget - meta.slaActual).toFixed(2)} altında — hata bütçesi tükendi`}
                </p>
              </div>
            </div>
          )}

          {meta && (
            <div className="rounded-lg border bg-card/50 p-3">
              <Field label="Bölge">
                <span className="flex items-center justify-end gap-1"><MapPin className="size-3.5" />{REGION_LABEL[meta.region]}</span>
              </Field>
              <Field label="Katman"><Badge variant="outline">{meta.tier}</Badge></Field>
              <Field label="Sahip">{meta.owner}</Field>
              <Field label="Bağımlılıklar">
                {meta.dependencies.length
                  ? meta.dependencies.map((d) => SERVICES.find((x) => x.id === d)?.name ?? d).join(", ")
                  : "—"}
              </Field>
              <Field label="Son deploy">
                <span className="flex items-center justify-end gap-1"><GitBranch className="size-3.5" />{meta.lastDeploy}</span>
              </Field>
              <Field label="Endpoint" mono>{meta.endpoint}</Field>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">İlişkili incident'lar ({incidents.length})</p>
            {incidents.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-card/40 py-4 text-center text-xs text-muted-foreground">
                Kayıtlı incident yok.
              </p>
            ) : (
              <div className="space-y-1.5">
                {incidents.map((inc) => {
                  const sev = SEVERITY[inc.severity];
                  const st = INC_STATUS[inc.status];
                  return (
                    <div key={inc.id} className="rounded-lg border bg-card/50 p-2.5">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {inc.title}
                        <Badge variant={sev.badge} className="ml-auto">{sev.label}</Badge>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{inc.impact}</p>
                      <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{inc.id}</span>
                        <span className={toneText(st.tone)}>{st.label}</span>
                        <span>· {fmtDur(inc.durationMin)}</span>
                        {inc.postmortem && <Badge variant="outline" className="ml-auto">postmortem</Badge>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "aktivite",
      label: "Aktivite",
      content: auditEvents.length ? (
        <AuditTimeline events={auditEvents} />
      ) : (
        <EmptyState icon={Stack} title="Aktivite yok" description="Bu servis için kayıtlı incident aktivitesi bulunmuyor." />
      ),
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify({ ...svc, meta, incidents: incidents.map((i) => i.id) }, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open={!!svc}
      onOpenChange={(v) => !v && onClose()}
      title={svc.name}
      subtitle={meta ? `${REGION_LABEL[meta.region]} · ${meta.tier} · ${meta.owner}` : svc.id}
      badge={
        <Badge variant={svc.status === "operational" ? "outline" : svc.status === "degraded" ? "secondary" : "destructive"}>
          {s.label}
        </Badge>
      }
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.success(`${svc.name} probu yeniden çalıştırıldı`)}
          >
            <ArrowClockwise className="size-4" /> Probu çalıştır
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => toast.info(`${svc.name} için uyarı kuralı aç`, { description: "Alerting modülüne yönlendiriliyorsunuz." })}
          >
            <Bell className="size-4" /> Uyarı kur
          </Button>
        </div>
      }
    />
  );
}

/* ── Yardımcı bileşenler ───────────────────────────────────────────── */
function ChartCard({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: accent }} />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="h-40">{children}</div>
      </CardContent>
    </Card>
  );
}

function ChartTip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="tabular-nums">
        {payload[0].value}
        {unit}
      </p>
    </div>
  );
}

function UptimeTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">Gün {d.day}</p>
      <p className="tabular-nums">uptime %{d.uptime}</p>
    </div>
  );
}

function toneText(tone: AuditEvent["tone"]): string {
  switch (tone) {
    case "emerald":
      return "text-emerald-400";
    case "amber":
      return "text-amber-400";
    case "red":
      return "text-red-400";
    case "primary":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}s ${m}dk` : `${h} saat`;
}
