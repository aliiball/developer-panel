import { useMemo, useState } from "react";
import {
  Plus,
  Clock,
  CheckCircle as CheckCircle2,
  XCircle,
  CircleNotch as Loader2,
  Play,
  Pause,
  Timer,
  Lightning,
  ArrowsClockwise,
  Database,
  Broom,
  ChartLineUp,
  Receipt,
  Warning,
  PencilSimple,
  TrashSimple,
  type Icon,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { CRON_JOBS, type CronJob } from "~/data/expansion";
import {
  EmptyState,
  TableSkeleton,
  KpiSkeleton,
  KpiCard,
  FilterBar,
  FilterChip,
  BulkBar,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Scheduler — MetaPanel" }];
}

/* ── Page-local enrich tipi & seed ──────────────────────────────────
 * Ortak CRON_JOBS kaydını enterprise alanlarla zenginleştirir:
 * tür, sahip, ortalama süre, başarı oranı, ardışık hata, çalıştırma
 * geçmişi ve audit timeline. Ortak dosya değiştirilmez. */
type RunStatus = "success" | "failed" | "running";

interface CronRun {
  id: string;
  at: string;
  status: RunStatus;
  durationMs: number;
  trigger: "schedule" | "manual";
  note?: string;
}

interface CronMeta {
  category: "backup" | "sync" | "report" | "maintenance" | "billing";
  owner: string;
  timezone: string;
  avgMs: number;
  p95Ms: number;
  successRate: number;
  consecutiveFailures: number;
  timeoutSec: number;
  retries: number;
  lastDuration: string;
  lastRunAt: string;
  command: string;
  trendMs: number[];
  runs: CronRun[];
}

const CATEGORY: Record<CronMeta["category"], { label: string; icon: Icon }> = {
  backup: { label: "Yedekleme", icon: Database },
  sync: { label: "Senkronizasyon", icon: ArrowsClockwise },
  report: { label: "Raporlama", icon: ChartLineUp },
  maintenance: { label: "Bakım", icon: Broom },
  billing: { label: "Faturalama", icon: Receipt },
};

const ICON_BY_CAT: Record<CronMeta["category"], Icon> = {
  backup: Database,
  sync: ArrowsClockwise,
  report: ChartLineUp,
  maintenance: Broom,
  billing: Receipt,
};

const META: Record<string, CronMeta> = {
  j1: {
    category: "backup",
    owner: "platform@metapanel.io",
    timezone: "Europe/Istanbul",
    avgMs: 48200,
    p95Ms: 71400,
    successRate: 99.7,
    consecutiveFailures: 0,
    timeoutSec: 300,
    retries: 2,
    lastDuration: "47.9s",
    lastRunAt: "Bugün 03:00",
    command: "pg_dump --format=custom | s3 put backups/daily/",
    trendMs: [46000, 48000, 47000, 49000, 51000, 48000, 47000, 48200],
    runs: [
      { id: "r1", at: "Bugün 03:00", status: "success", durationMs: 47900, trigger: "schedule" },
      { id: "r2", at: "Dün 03:00", status: "success", durationMs: 49100, trigger: "schedule" },
      { id: "r3", at: "2 gün önce 03:00", status: "success", durationMs: 46200, trigger: "schedule" },
      { id: "r4", at: "3 gün önce 14:12", status: "success", durationMs: 51020, trigger: "manual", note: "Sürüm öncesi anlık yedek" },
      { id: "r5", at: "3 gün önce 03:00", status: "success", durationMs: 48400, trigger: "schedule" },
    ],
  },
  j2: {
    category: "sync",
    owner: "integrations@metapanel.io",
    timezone: "Europe/Istanbul",
    avgMs: 1180,
    p95Ms: 2400,
    successRate: 99.9,
    consecutiveFailures: 0,
    timeoutSec: 60,
    retries: 3,
    lastDuration: "1.2s",
    lastRunAt: "7 dk önce",
    command: "node scripts/sync-stock.js --source=erp --batch=500",
    trendMs: [1100, 1240, 980, 1180, 1320, 1090, 1200, 1180],
    runs: [
      { id: "r1", at: "7 dk önce", status: "success", durationMs: 1180, trigger: "schedule" },
      { id: "r2", at: "22 dk önce", status: "success", durationMs: 1320, trigger: "schedule" },
      { id: "r3", at: "37 dk önce", status: "success", durationMs: 980, trigger: "schedule" },
      { id: "r4", at: "52 dk önce", status: "success", durationMs: 1090, trigger: "schedule" },
      { id: "r5", at: "67 dk önce", status: "success", durationMs: 1240, trigger: "schedule" },
    ],
  },
  j3: {
    category: "report",
    owner: "analytics@metapanel.io",
    timezone: "Europe/Istanbul",
    avgMs: 14200,
    p95Ms: 22800,
    successRate: 98.4,
    consecutiveFailures: 0,
    timeoutSec: 180,
    retries: 1,
    lastDuration: "13.8s",
    lastRunAt: "Geçen Pzt 09:00",
    command: "node scripts/weekly-report.js --email=stakeholders",
    trendMs: [13500, 14800, 15200, 13800, 14000, 21000, 13900, 14200],
    runs: [
      { id: "r1", at: "Geçen Pzt 09:00", status: "success", durationMs: 13800, trigger: "schedule" },
      { id: "r2", at: "2 hafta önce Pzt 09:00", status: "success", durationMs: 21030, trigger: "schedule", note: "Veri ambarı yavaştı" },
      { id: "r3", at: "3 hafta önce Pzt 09:00", status: "success", durationMs: 14100, trigger: "schedule" },
    ],
  },
  j4: {
    category: "maintenance",
    owner: "platform@metapanel.io",
    timezone: "UTC",
    avgMs: 3400,
    p95Ms: 8900,
    successRate: 81.2,
    consecutiveFailures: 3,
    timeoutSec: 30,
    retries: 2,
    lastDuration: "—",
    lastRunAt: "1 saat önce",
    command: "redis-cli FLUSHDB && node scripts/warm-cache.js",
    trendMs: [3200, 3400, 9100, 8800, 3300, 8900, 9000, 8900],
    runs: [
      { id: "r1", at: "1 saat önce", status: "failed", durationMs: 8900, trigger: "schedule", note: "redis ECONNREFUSED 6379" },
      { id: "r2", at: "2 saat önce", status: "failed", durationMs: 8800, trigger: "schedule", note: "redis ECONNREFUSED 6379" },
      { id: "r3", at: "3 saat önce", status: "failed", durationMs: 9100, trigger: "schedule", note: "timeout (30s) aşıldı" },
      { id: "r4", at: "4 saat önce", status: "success", durationMs: 3400, trigger: "schedule" },
      { id: "r5", at: "5 saat önce", status: "success", durationMs: 3200, trigger: "schedule" },
    ],
  },
  j5: {
    category: "maintenance",
    owner: "growth@metapanel.io",
    timezone: "Europe/Istanbul",
    avgMs: 6200,
    p95Ms: 11200,
    successRate: 97.1,
    consecutiveFailures: 0,
    timeoutSec: 120,
    retries: 2,
    lastDuration: "çalışıyor…",
    lastRunAt: "şimdi",
    command: "node scripts/scan-abandoned-carts.js --window=1h",
    trendMs: [5900, 6400, 6100, 7000, 6200, 5800, 6300, 6200],
    runs: [
      { id: "r1", at: "şimdi", status: "running", durationMs: 0, trigger: "schedule" },
      { id: "r2", at: "30 dk önce", status: "success", durationMs: 6100, trigger: "schedule" },
      { id: "r3", at: "60 dk önce", status: "success", durationMs: 7000, trigger: "schedule" },
      { id: "r4", at: "90 dk önce", status: "success", durationMs: 5900, trigger: "schedule" },
    ],
  },
  j6: {
    category: "billing",
    owner: "finance@metapanel.io",
    timezone: "Europe/Istanbul",
    avgMs: 92400,
    p95Ms: 142000,
    successRate: 100,
    consecutiveFailures: 0,
    timeoutSec: 600,
    retries: 1,
    lastDuration: "1m 31s",
    lastRunAt: "1 Haziran 00:00",
    command: "node scripts/close-invoices.js --month=current",
    trendMs: [88000, 91000, 95000, 92400, 90000, 94000, 91500, 92400],
    runs: [
      { id: "r1", at: "1 Haziran 00:00", status: "success", durationMs: 91200, trigger: "schedule" },
      { id: "r2", at: "1 Mayıs 00:00", status: "success", durationMs: 94000, trigger: "schedule" },
      { id: "r3", at: "1 Nisan 00:00", status: "success", durationMs: 90100, trigger: "schedule" },
    ],
  },
};

/* Ortak seed dışında ekstra gerçekçi kayıtlar — yoğunluk için. */
const EXTRA_JOBS: CronJob[] = [
  { id: "j7", name: "Arama indeksi yeniden inşa", schedule: "0 4 * * *", human: "Her gün 04:00", nextRun: "13s sonra", lastStatus: "success", enabled: true },
  { id: "j8", name: "Ödeme mutabakatı", schedule: "0 6 * * *", human: "Her gün 06:00", nextRun: "15s sonra", lastStatus: "success", enabled: true },
  { id: "j9", name: "Soğuk veri arşivleme", schedule: "0 2 * * 0", human: "Pazar 02:00", nextRun: "5 gün sonra", lastStatus: "failed", enabled: false },
  { id: "j10", name: "Sertifika yenileme kontrolü", schedule: "0 0 * * *", human: "Her gün 00:00", nextRun: "9s sonra", lastStatus: "success", enabled: true },
  { id: "j11", name: "Kullanım metriği toplama", schedule: "*/5 * * * *", human: "Her 5 dk", nextRun: "2 dk sonra", lastStatus: "running", enabled: true },
  { id: "j12", name: "Geçici dosya temizliği", schedule: "0 1 * * *", human: "Her gün 01:00", nextRun: "10s sonra", lastStatus: "success", enabled: true },
  { id: "j13", name: "E-posta kuyruğu boşaltma", schedule: "*/2 * * * *", human: "Her 2 dk", nextRun: "1 dk sonra", lastStatus: "success", enabled: true },
];

const EXTRA_META: Record<string, CronMeta> = {
  j7: mkMeta("sync", "search@metapanel.io", 18400, 99.2, 0, "node scripts/reindex.js --collection=products"),
  j8: mkMeta("billing", "finance@metapanel.io", 24100, 99.9, 0, "node scripts/reconcile-payments.js"),
  j9: mkMeta("backup", "platform@metapanel.io", 312000, 74.0, 2, "node scripts/archive-cold.js --older-than=90d", "failed"),
  j10: mkMeta("maintenance", "security@metapanel.io", 2100, 100, 0, "node scripts/check-certs.js --renew"),
  j11: mkMeta("report", "analytics@metapanel.io", 4200, 99.6, 0, "node scripts/collect-usage.js", "running"),
  j12: mkMeta("maintenance", "platform@metapanel.io", 1800, 100, 0, "find /tmp -mtime +1 -delete"),
  j13: mkMeta("sync", "platform@metapanel.io", 900, 99.8, 0, "node scripts/flush-mail-queue.js"),
};

function mkMeta(
  category: CronMeta["category"],
  owner: string,
  avgMs: number,
  successRate: number,
  consecutiveFailures: number,
  command: string,
  lastStatus: RunStatus = "success",
): CronMeta {
  const trend = Array.from({ length: 8 }, (_, i) => Math.round(avgMs * (0.85 + ((i * 7) % 5) / 14)));
  return {
    category,
    owner,
    timezone: "Europe/Istanbul",
    avgMs,
    p95Ms: Math.round(avgMs * 1.6),
    successRate,
    consecutiveFailures,
    timeoutSec: avgMs > 60000 ? 600 : 120,
    retries: 2,
    lastDuration: fmtMs(avgMs),
    lastRunAt: "kısa süre önce",
    command,
    trendMs: trend,
    runs: [
      { id: "r1", at: "kısa süre önce", status: lastStatus, durationMs: lastStatus === "running" ? 0 : avgMs, trigger: "schedule" },
      { id: "r2", at: "önceki çalışma", status: "success", durationMs: Math.round(avgMs * 1.05), trigger: "schedule" },
      { id: "r3", at: "ondan önce", status: consecutiveFailures > 0 ? "failed" : "success", durationMs: Math.round(avgMs * 0.95), trigger: "schedule" },
    ],
  };
}

const ALL_JOBS: CronJob[] = [...CRON_JOBS, ...EXTRA_JOBS];
const ALL_META: Record<string, CronMeta> = { ...META, ...EXTRA_META };

const STATUS: Record<RunStatus, { icon: Icon; tone: string; label: string }> = {
  success: { icon: CheckCircle2, tone: "text-emerald-400", label: "başarılı" },
  failed: { icon: XCircle, tone: "text-red-400", label: "başarısız" },
  running: { icon: Loader2, tone: "text-sky-400 animate-spin", label: "çalışıyor" },
};

function fmtMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

type StatusFilter = "all" | RunStatus | "disabled";

export default function Scheduler() {
  const [jobs, setJobs] = useState<CronJob[]>(ALL_JOBS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [catFilter, setCatFilter] = useState<CronMeta["category"] | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading] = useState(false);
  const [cols, setCols] = useState({ schedule: true, next: true, owner: true, success: true, status: true });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      const m = ALL_META[j.id];
      if (q && !(j.name.toLowerCase().includes(q) || j.schedule.includes(q) || m?.owner.toLowerCase().includes(q) || m?.command.toLowerCase().includes(q)))
        return false;
      if (statusFilter === "disabled" && j.enabled) return false;
      if (statusFilter !== "all" && statusFilter !== "disabled" && j.lastStatus !== statusFilter) return false;
      if (catFilter !== "all" && m?.category !== catFilter) return false;
      return true;
    });
  }, [jobs, search, statusFilter, catFilter]);

  const enabledCount = jobs.filter((j) => j.enabled).length;
  const failingCount = jobs.filter((j) => j.lastStatus === "failed").length;
  const runningCount = jobs.filter((j) => j.lastStatus === "running").length;
  const avgSuccess =
    jobs.reduce((a, j) => a + (ALL_META[j.id]?.successRate ?? 100), 0) / Math.max(jobs.length, 1);

  const active = activeId ? jobs.find((j) => j.id === activeId) : null;
  const activeMeta = activeId ? ALL_META[activeId] : null;

  function toggle(id: string) {
    setJobs((p) =>
      p.map((j) => {
        if (j.id !== id) return j;
        const next = !j.enabled;
        toast[next ? "success" : "message"](
          next ? `"${j.name}" etkinleştirildi` : `"${j.name}" duraklatıldı`,
        );
        return { ...j, enabled: next };
      }),
    );
  }

  function runNow(id: string) {
    const j = jobs.find((x) => x.id === id);
    if (!j) return;
    setJobs((p) => p.map((x) => (x.id === id ? { ...x, lastStatus: "running" } : x)));
    toast.loading(`"${j.name}" çalıştırılıyor…`, { id: `run-${id}` });
    window.setTimeout(() => {
      setJobs((p) => p.map((x) => (x.id === id ? { ...x, lastStatus: "success" } : x)));
      toast.success(`"${j.name}" başarıyla tamamlandı`, {
        id: `run-${id}`,
        action: { label: "Geri al", onClick: () => toast.message("Geri alındı (mock)") },
      });
    }, 1400);
  }

  function bulkToggle(enable: boolean) {
    setJobs((p) => p.map((j) => (selected.has(j.id) ? { ...j, enabled: enable } : j)));
    toast.success(`${selected.size} görev ${enable ? "etkinleştirildi" : "duraklatıldı"}`);
    setSelected(new Set());
  }

  function exportData() {
    toast.success(`${filtered.length} görev JSON olarak dışa aktarıldı (mock)`);
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((j) => selected.has(j.id));

  const colDefs = [
    { key: "schedule", label: "Çizelge", visible: cols.schedule, toggle: () => setCols((c) => ({ ...c, schedule: !c.schedule })) },
    { key: "next", label: "Sonraki", visible: cols.next, toggle: () => setCols((c) => ({ ...c, next: !c.next })) },
    { key: "owner", label: "Sahip", visible: cols.owner, toggle: () => setCols((c) => ({ ...c, owner: !c.owner })) },
    { key: "success", label: "Başarı", visible: cols.success, toggle: () => setCols((c) => ({ ...c, success: !c.success })) },
    { key: "status", label: "Son durum", visible: cols.status, toggle: () => setCols((c) => ({ ...c, status: !c.status })) },
  ];

  return (
    <>
      <PageHeader
        title="Scheduler"
        description="Zamanlanmış görevler (cron). Çizelge, sonraki çalışma, başarı oranı ve çalıştırma geçmişi."
        actions={[
          { label: "Yeni Görev", icon: Plus, variant: "default", onClick: () => toast.success("Yeni cron görevi (mock)") },
        ]}
      />
      <PageBody className="space-y-4">
        {/* KPI şeridi */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Aktif görev"
              value={`${enabledCount}/${jobs.length}`}
              delta={5}
              icon={Timer}
              hint="son 7g"
              trend={[10, 11, 11, 12, 12, 13, enabledCount]}
            />
            <KpiCard
              label="Ortalama başarı"
              value={`%${avgSuccess.toFixed(1)}`}
              delta={0.4}
              icon={CheckCircle2}
              hint="son 30g"
              trend={[97.8, 98.1, 97.9, 98.4, 98.6, 98.9, avgSuccess]}
            />
            <KpiCard
              label="Şu an çalışan"
              value={runningCount}
              icon={Lightning}
              hint="canlı"
              trend={[1, 0, 2, 1, 2, 1, runningCount]}
            />
            <KpiCard
              label="Başarısız (son çalışma)"
              value={failingCount}
              delta={failingCount > 0 ? 50 : -20}
              invert
              icon={Warning}
              hint="dikkat gerektirir"
              trend={[0, 1, 1, 2, 1, 2, failingCount]}
            />
          </div>
        )}

        {/* FilterBar */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Görev, cron ifadesi, sahip veya komut ara…"
          onExport={exportData}
          columns={colDefs}
        >
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} count={jobs.length}>
            Tümü
          </FilterChip>
          <FilterChip active={statusFilter === "success"} onClick={() => setStatusFilter("success")} count={jobs.filter((j) => j.lastStatus === "success").length}>
            Başarılı
          </FilterChip>
          <FilterChip active={statusFilter === "failed"} onClick={() => setStatusFilter("failed")} count={failingCount}>
            Başarısız
          </FilterChip>
          <FilterChip active={statusFilter === "running"} onClick={() => setStatusFilter("running")} count={runningCount}>
            Çalışıyor
          </FilterChip>
          <FilterChip active={statusFilter === "disabled"} onClick={() => setStatusFilter("disabled")} count={jobs.filter((j) => !j.enabled).length}>
            Duraklatılmış
          </FilterChip>
          <span className="mx-0.5 h-4 w-px bg-border" />
          <FilterChip active={catFilter === "all"} onClick={() => setCatFilter("all")}>
            Tüm kategoriler
          </FilterChip>
          {(Object.keys(CATEGORY) as CronMeta["category"][]).map((c) => (
            <FilterChip
              key={c}
              active={catFilter === c}
              onClick={() => setCatFilter(catFilter === c ? "all" : c)}
              count={jobs.filter((j) => ALL_META[j.id]?.category === c).length}
            >
              {CATEGORY[c].label}
            </FilterChip>
          ))}
        </FilterBar>

        {/* BulkBar */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bulkToggle(true)}>
            <Play className="size-3.5" /> Etkinleştir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bulkToggle(false)}>
            <Pause className="size-3.5" /> Duraklat
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              selected.forEach((id) => runNow(id));
              setSelected(new Set());
            }}
          >
            <Lightning className="size-3.5" /> Şimdi çalıştır
          </Button>
        </BulkBar>

        {/* İçerik */}
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Clock}
            variant={search || statusFilter !== "all" || catFilter !== "all" ? "search" : "default"}
            title={search || statusFilter !== "all" || catFilter !== "all" ? "Eşleşen görev yok" : "Henüz zamanlanmış görev yok"}
            description={
              search || statusFilter !== "all" || catFilter !== "all"
                ? "Arama veya filtreleri değiştirip tekrar deneyin."
                : "İlk cron görevinizi oluşturarak otomasyonu başlatın."
            }
            action={
              <Button
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setCatFilter("all");
                }}
              >
                Filtreleri temizle
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-10 px-4 py-2.5">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(v) =>
                        setSelected(v ? new Set(filtered.map((j) => j.id)) : new Set())
                      }
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th className="px-4 py-2.5 font-medium">Görev</th>
                  {cols.schedule && <th className="px-4 py-2.5 font-medium">Çizelge</th>}
                  {cols.next && <th className="px-4 py-2.5 font-medium">Sonraki</th>}
                  {cols.owner && <th className="px-4 py-2.5 font-medium">Sahip</th>}
                  {cols.success && <th className="px-4 py-2.5 font-medium text-right">Başarı</th>}
                  {cols.status && <th className="px-4 py-2.5 font-medium">Son durum</th>}
                  <th className="px-4 py-2.5 font-medium text-right">Eylem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => {
                  const m = ALL_META[j.id];
                  const s = STATUS[j.lastStatus];
                  const CatIcon = m ? ICON_BY_CAT[m.category] : Clock;
                  const isSel = selected.has(j.id);
                  return (
                    <tr
                      key={j.id}
                      className={cn(
                        "cursor-pointer border-b last:border-0 hover:bg-accent/30",
                        isSel && "bg-primary/5",
                      )}
                      onClick={() => setActiveId(j.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={(v) =>
                            setSelected((prev) => {
                              const n = new Set(prev);
                              if (v) n.add(j.id);
                              else n.delete(j.id);
                              return n;
                            })
                          }
                          aria-label={`${j.name} seç`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CatIcon className={cn("size-4", j.enabled ? "text-muted-foreground" : "text-muted-foreground/50")} />
                          <span className={cn("font-medium", !j.enabled && "text-muted-foreground")}>{j.name}</span>
                          {m && m.consecutiveFailures >= 3 && (
                            <Badge variant="destructive" className="gap-1">
                              <Warning className="size-3" /> {m.consecutiveFailures}× hata
                            </Badge>
                          )}
                        </div>
                      </td>
                      {cols.schedule && (
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <code className="font-mono text-xs">{j.schedule}</code>
                            <span className="text-[11px] text-muted-foreground">{j.human}</span>
                          </div>
                        </td>
                      )}
                      {cols.next && (
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{j.enabled ? j.nextRun : "—"}</td>
                      )}
                      {cols.owner && (
                        <td className="px-4 py-3 text-xs text-muted-foreground">{m?.owner ?? "—"}</td>
                      )}
                      {cols.success && (
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={cn(m && m.successRate < 90 ? "text-red-400" : m && m.successRate < 98 ? "text-amber-400" : "text-foreground")}>
                            {m ? `%${m.successRate.toFixed(1)}` : "—"}
                          </span>
                        </td>
                      )}
                      {cols.status && (
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs", s.tone)}>
                            <s.icon className="size-3.5" /> {s.label}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => runNow(j.id)}
                            disabled={j.lastStatus === "running"}
                            aria-label="Şimdi çalıştır"
                            title="Şimdi çalıştır"
                          >
                            <Lightning className="size-4" />
                          </Button>
                          <Switch checked={j.enabled} onCheckedChange={() => toggle(j.id)} aria-label="Etkin" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          {filtered.length} / {jobs.length} görev gösteriliyor · zaman dilimi varsayılanı Europe/Istanbul · cron ifadeleri UTC tabanlı değerlendirilir.
        </p>
      </PageBody>

      {/* DetailDrawer */}
      <DetailDrawer
        open={!!active}
        onOpenChange={(v) => !v && setActiveId(null)}
        title={active?.name ?? ""}
        subtitle={active ? `${active.schedule} · ${active.human}` : undefined}
        badge={
          active ? (
            <Badge variant={active.lastStatus === "failed" ? "destructive" : active.enabled ? "secondary" : "outline"}>
              {active.enabled ? "etkin" : "duraklatıldı"}
            </Badge>
          ) : undefined
        }
        tabs={active && activeMeta ? buildTabs(active, activeMeta) : undefined}
        footer={
          active ? (
            <div className="flex w-full flex-wrap items-center gap-2 p-3">
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => runNow(active.id)}
                disabled={active.lastStatus === "running"}
              >
                <Lightning className="size-4" /> Şimdi çalıştır
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggle(active.id)}>
                {active.enabled ? <Pause className="size-4" /> : <Play className="size-4" />}
                {active.enabled ? "Duraklat" : "Etkinleştir"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.message("Düzenle (mock)")}>
                <PencilSimple className="size-4" /> Düzenle
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() => toast.error(`"${active.name}" silindi (mock)`)}
              >
                <TrashSimple className="size-4" /> Sil
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}

function buildTabs(job: CronJob, m: CronMeta): DrawerTab[] {
  const cat = CATEGORY[m.category];
  const auditEvents: AuditEvent[] = [
    { id: "a1", action: "görevi oluşturdu", actor: m.owner, at: "32 gün önce", icon: Plus, tone: "primary" },
    { id: "a2", action: "çizelgeyi güncelledi", actor: m.owner, at: "18 gün önce", icon: PencilSimple, detail: m.command },
    ...m.runs.slice(0, 4).map<AuditEvent>((r) => ({
      id: `run-${r.id}`,
      action:
        r.status === "success"
          ? `çalışma tamamlandı (${fmtMs(r.durationMs)})`
          : r.status === "failed"
            ? `çalışma başarısız${r.note ? ` — ${r.note}` : ""}`
            : "çalışma başladı",
      actor: r.trigger === "manual" ? "manuel tetik" : "scheduler",
      at: r.at,
      icon: r.status === "success" ? CheckCircle2 : r.status === "failed" ? XCircle : Loader2,
      tone: r.status === "success" ? "emerald" : r.status === "failed" ? "red" : "primary",
    })),
  ];

  return [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <Field label="Kategori">
              <span className="inline-flex items-center gap-1.5">
                <cat.icon className="size-3.5 text-muted-foreground" /> {cat.label}
              </span>
            </Field>
            <Field label="Sahip" mono>{m.owner}</Field>
            <Field label="Zaman dilimi" mono>{m.timezone}</Field>
            <Field label="Cron ifadesi" mono>{job.schedule}</Field>
            <Field label="İnsan okunur">{job.human}</Field>
            <Field label="Komut" mono>{m.command}</Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Başarı oranı" value={`%${m.successRate.toFixed(1)}`} icon={CheckCircle2} trend={[97, 98, 98.5, m.successRate]} />
            <KpiCard label="Ortalama süre" value={fmtMs(m.avgMs)} icon={Timer} trend={m.trendMs.map((x) => x / 1000)} />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <Field label="Sonraki çalışma">{job.enabled ? job.nextRun : "duraklatıldı"}</Field>
            <Field label="Son çalışma">{m.lastRunAt}</Field>
            <Field label="Son süre" mono>{m.lastDuration}</Field>
            <Field label="p95 süre" mono>{fmtMs(m.p95Ms)}</Field>
            <Field label="Zaman aşımı" mono>{m.timeoutSec}s</Field>
            <Field label="Yeniden deneme" mono>{m.retries}×</Field>
            <Field label="Ardışık hata">
              <span className={cn("tabular-nums", m.consecutiveFailures > 0 ? "text-red-400" : "text-emerald-400")}>
                {m.consecutiveFailures}
              </span>
            </Field>
          </div>
        </div>
      ),
    },
    {
      value: "runs",
      label: "Çalıştırma geçmişi",
      content: (
        <div className="space-y-2">
          {m.runs.map((r) => {
            const s = STATUS[r.status];
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
              >
                <span className={cn("inline-flex items-center gap-1.5 text-xs", s.tone)}>
                  <s.icon className="size-3.5" /> {s.label}
                </span>
                <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {r.note ?? (r.trigger === "manual" ? "Manuel tetikleme" : "Zamanlanmış")}
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                  {fmtMs(r.durationMs)}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground/70 tabular-nums">{r.at}</span>
              </div>
            );
          })}
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
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(
            {
              id: job.id,
              name: job.name,
              schedule: job.schedule,
              human: job.human,
              enabled: job.enabled,
              nextRun: job.nextRun,
              lastStatus: job.lastStatus,
              meta: {
                category: m.category,
                owner: m.owner,
                timezone: m.timezone,
                successRate: m.successRate,
                avgMs: m.avgMs,
                p95Ms: m.p95Ms,
                timeoutSec: m.timeoutSec,
                retries: m.retries,
                consecutiveFailures: m.consecutiveFailures,
                command: m.command,
              },
            },
            null,
            2,
          )}
        </pre>
      ),
    },
  ];
}
