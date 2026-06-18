import { useMemo, useState } from "react";
import {
  RocketLaunch as Rocket,
  Sparkle as Sparkles,
  ArrowUUpLeft as Undo2,
  GitCommit as GitCommitHorizontal,
  ArrowLineUp as ArrowUpToLine,
  Lightning,
  Timer,
  ShieldWarning,
  Wrench,
  CheckCircle,
  XCircle,
  Warning,
  GitBranch,
  Cube,
  Pulse,
  ClockCounterClockwise,
  Stack,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { StatusTimeline, type TimelineStep } from "~/components/delivery/StatusTimeline";
import { DeployStatusBadge } from "~/components/delivery/badges";
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
  type AuditEvent,
  type DrawerTab,
} from "~/components/enterprise";
import { useReleaseStore } from "~/stores/release-store";
import { useIssueStore } from "~/stores/issue-store";
import { useChangeSetStore } from "~/stores/change-set-store";
import { useCopilotStore } from "~/stores/copilot-store";
import type { Deployment, EnvName, Environment } from "~/data/delivery";
import {
  RELEASE_META,
  EXTRA_DEPLOYMENTS,
  ENV_HEALTH,
  DEPLOY_FREQ_TREND,
  LEAD_TIME_TREND,
  CHANGE_FAIL_TREND,
  MTTR_TREND,
  type ReleaseMeta,
} from "~/data/seed.releases";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { toastUndo } from "~/lib/feedback";
import { useListNav } from "~/hooks/use-list-nav";

export function meta() {
  return [{ title: "Releases — MetaPanel" }];
}

const ENV_TONE: Record<EnvName, string> = {
  dev: "text-sky-400", staging: "text-amber-400", prod: "text-emerald-400",
};
const ENV_LABEL: Record<EnvName, string> = { dev: "dev", staging: "staging", prod: "prod" };

type EnvFilter = "all" | EnvName;
type StatusFilter = "all" | "success" | "failed" | "rolled-back";

// SLA hedefi: deploy süresi 15 dk altında olmalı.
const SLA_TARGET_MS = 15 * 60 * 1000;

function fmtDur(ms: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}d ${s % 60}s`;
}

// Deployment için meta'yı çöz; seed'de yoksa makul fallback üret (yeni deploy'lar).
function metaFor(d: Deployment): ReleaseMeta {
  return (
    RELEASE_META[d.id] ?? {
      deployId: d.id,
      strategy: d.env === "prod" ? "canary" : "rolling",
      trafficPct: d.status === "success" ? 100 : 0,
      errorRate: d.status === "failed" ? 0 : 0.05,
      p95Ms: d.status === "failed" ? 0 : 190,
      affectedUsers: d.env === "prod" ? 12000 : 0,
      slaMet: d.durationMs > 0 && d.durationMs < SLA_TARGET_MS,
      diffStat: { files: d.changelog.length * 4 + 2, additions: d.changelog.length * 120, deletions: d.changelog.length * 40 },
      artifactMb: 28,
      region: "eu-central-1",
    }
  );
}

export default function Releases() {
  const environments = useReleaseStore((s) => s.environments);
  const storeDeployments = useReleaseStore((s) => s.deployments);
  const deploy = useReleaseStore((s) => s.deploy);
  const rollback = useReleaseStore((s) => s.rollback);
  const issues = useIssueStore((s) => s.issues);
  const changeSets = useChangeSetStore((s) => s.sets);
  const markReleased = useChangeSetStore((s) => s.markReleased);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // Store geçmişi + sayfa-yerel tarihsel deploy'ları birleştir (gerçekçi yoğunluk).
  const deployments = useMemo<Deployment[]>(() => {
    const seen = new Set(storeDeployments.map((d) => d.id));
    const extras = EXTRA_DEPLOYMENTS.filter((e) => !seen.has(e.id)) as Deployment[];
    return [...storeDeployments, ...extras];
  }, [storeDeployments]);

  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState<EnvFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Onay diyalogları
  const [promoteEnv, setPromoteEnv] = useState<EnvName | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);

  // Akış: async/yıkıcı aksiyon yükleniyor durumları
  const [busyDeploy, setBusyDeploy] = useState<EnvName | null>(null);
  const [busyPromote, setBusyPromote] = useState(false);
  const [busyRollback, setBusyRollback] = useState(false);

  // Kolon görünürlüğü
  const [cols, setCols] = useState<Record<string, boolean>>({
    env: true, status: true, commit: true, sla: true, trigger: true, meta: true,
  });

  // Next-release changelog: önce "ready" change set'ler, sonra çözülmüş issue'lar.
  const readySets = changeSets.filter((c) => c.status === "ready");
  const setIssueIds = new Set(readySets.map((c) => c.issueId));
  const pending = [
    ...readySets.map((c) => ({ issueId: c.issueId, type: c.issueType, title: c.issueTitle })),
    ...issues
      .filter((i) => (i.status === "resolved" || i.stage === "shipped") && !setIssueIds.has(i.id))
      .map((i) => ({ issueId: i.id, type: i.type, title: i.title })),
  ].slice(0, 6);

  // ── KPI'lar (DORA metrikleri) ────────────────────────────────────
  const last30 = deployments;
  const successCount = last30.filter((d) => d.status === "success").length;
  const failedCount = last30.filter((d) => d.status === "failed").length;
  const rolledBackCount = last30.filter((d) => d.status === "rolled-back").length;
  const total = last30.length || 1;
  const successRate = Math.round((successCount / total) * 100);
  const changeFailRate = Math.round(((failedCount + rolledBackCount) / total) * 100);
  const durations = last30.filter((d) => d.durationMs > 0).map((d) => d.durationMs);
  const avgLeadMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const slaBreaches = last30.filter((d) => d.durationMs > 0 && !metaFor(d).slaMet).length;
  const prodVersion = environments.find((e) => e.name === "prod")?.currentVersion ?? "—";

  // ── Filtreleme ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deployments.filter((d) => {
      if (envFilter !== "all" && d.env !== envFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (q) {
        const hay = `${d.version} ${d.commit} ${d.triggeredBy} ${d.changelog.map((c) => c.issueId + c.title).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deployments, query, envFilter, statusFilter]);

  const filtersActive = query !== "" || envFilter !== "all" || statusFilter !== "all";
  const drawerDeploy = drawerId ? deployments.find((d) => d.id === drawerId) ?? null : null;

  // Akış: deploy geçmişi satırlarında klavye gezinme (j/↓ · k/↑ · Enter aç · Esc temizle)
  const { active, setActive, onKeyDown, containerRef } = useListNav(
    filtered.length,
    (i) => {
      const row = filtered[i];
      if (row) setDrawerId(row.id);
    },
  );

  function runDeploy(env: EnvName) {
    deploy(env, pending);
    markReleased(readySets.map((c) => c.issueId));
    toast.success(`${ENV_LABEL[env]} ortamına deploy başlatıldı`, {
      description: `${pending.length} değişiklik pipeline'a alındı`,
    });
  }

  // EnvCard'tan tetiklenen doğrudan deploy (non-prod) — yükleniyor durumlu.
  function startDeploy(env: EnvName) {
    setBusyDeploy(env);
    setTimeout(() => {
      runDeploy(env);
      setBusyDeploy(null);
    }, 600);
  }

  function confirmPromote() {
    if (!promoteEnv) return;
    const env = promoteEnv;
    setBusyPromote(true);
    setTimeout(() => {
      runDeploy(env);
      setBusyPromote(false);
      setPromoteEnv(null);
    }, 600);
  }

  function confirmRollback() {
    if (!rollbackTarget) return;
    const d = rollbackTarget;
    setBusyRollback(true);
    setTimeout(() => {
      rollback(d.id);
      setBusyRollback(false);
      setRollbackTarget(null);
      // Geri-al: rollback öncesi sürümü tekrar deploy ederek eski durumu yeniden yayınla.
      toastUndo("Geri alma tetiklendi", {
        description: `${d.version} (${ENV_LABEL[d.env]}) önceki kararlı sürüme dönülüyor`,
        onUndo: () => {
          deploy(d.env, d.changelog);
          toast.info(`${d.version} yeniden yayına alınıyor`, {
            description: `${ENV_LABEL[d.env]} ortamı geri alma iptal edildi`,
          });
        },
      });
    }, 600);
  }

  function exportJson() {
    toast.success("Deploy geçmişi dışa aktarıldı", {
      description: `${filtered.length} kayıt · releases.json`,
    });
  }

  function bulkRollback() {
    const targets = [...selected]
      .map((id) => deployments.find((d) => d.id === id))
      .filter((d): d is Deployment => !!d && d.status === "success");
    targets.forEach((d) => rollback(d.id));
    toast.success(`${targets.length} deploy geri alındı`);
    setSelected(new Set());
  }

  function toggleSel(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const columnDefs = [
    { key: "env", label: "Ortam" },
    { key: "status", label: "Durum" },
    { key: "commit", label: "Commit" },
    { key: "sla", label: "SLA" },
    { key: "trigger", label: "Tetikleyen" },
    { key: "meta", label: "Değişiklik / Zaman" },
  ];

  return (
    <>
      <PageHeader
        title="Releases"
        description="Ortam durumu, deploy pipeline'ı, changelog/diff ve denetimli geri alma."
        actions={[
          {
            label: "Sürüm Notları Üret",
            icon: Sparkles,
            variant: "default",
            onClick: () =>
              queuePrompt(
                "Son prod deploy'una giren hata düzeltmeleri ve özelliklerden müşteriye dönük sürüm notları oluştur.",
              ),
          },
        ]}
      />
      <PageBody className="space-y-5">
        {/* Hazır change set şeridi */}
        {readySets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <span className="text-sm">
              <span className="font-medium">{readySets.length} change set yayına hazır</span>
              <span className="text-muted-foreground"> — sonraki deploy'un changelog'una girecek:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {readySets.map((c) => (
                <Badge key={c.id} variant="secondary" className="font-mono text-[10px]">
                  {c.issueId}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* KPI şeridi — DORA metrikleri */}
        {environments.length === 0 ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Deploy Sıklığı"
              value={`${deployments.length}/ay`}
              delta={12}
              trend={DEPLOY_FREQ_TREND}
              icon={Rocket}
              hint="son 30 gün"
            />
            <KpiCard
              label="Başarı Oranı"
              value={`%${successRate}`}
              delta={successRate >= 90 ? 3 : -4}
              trend={LEAD_TIME_TREND.map((v) => 100 - v / 6)}
              icon={CheckCircle}
              hint={`${successCount}/${deployments.length}`}
            />
            <KpiCard
              label="Lead Time (ort.)"
              value={fmtDur(avgLeadMs)}
              delta={-18}
              invert
              trend={LEAD_TIME_TREND}
              icon={Timer}
              hint="commit→prod"
            />
            <KpiCard
              label="Change-Fail Rate"
              value={`%${changeFailRate}`}
              delta={-22}
              invert
              trend={CHANGE_FAIL_TREND}
              icon={ShieldWarning}
              hint={`${slaBreaches} SLA aşımı`}
            />
          </div>
        )}

        {/* Ortam durumu kartları */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ortam Durumu
            </h3>
            <span className="text-[11px] text-muted-foreground/70">
              prod sürümü <span className="font-mono">{prodVersion}</span>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {environments.map((env) => (
              <EnvCard
                key={env.name}
                env={env}
                busy={busyDeploy === env.name}
                onDeploy={() =>
                  env.name === "prod" ? setPromoteEnv("prod") : startDeploy(env.name)
                }
              />
            ))}
          </div>
        </div>

        {/* Deploy geçmişi grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Deploy Geçmişi
            </h3>
            <span className="text-[11px] text-muted-foreground/70">
              {filtered.length} / {deployments.length} kayıt
            </span>
            {filtered.length > 0 && (
              <span className="ml-auto hidden text-[11px] text-muted-foreground/60 md:inline">
                ↑↓ gez · Enter aç
              </span>
            )}
          </div>

          <FilterBar
            search={query}
            onSearch={setQuery}
            placeholder="Sürüm, commit, tetikleyen veya issue ara…"
            onExport={exportJson}
            columns={columnDefs.map((c) => ({
              key: c.key,
              label: c.label,
              visible: cols[c.key],
              toggle: () => setCols((s) => ({ ...s, [c.key]: !s[c.key] })),
            }))}
          >
            <FilterChip active={envFilter === "all"} onClick={() => setEnvFilter("all")}>
              Tümü
            </FilterChip>
            {(["dev", "staging", "prod"] as EnvName[]).map((e) => (
              <FilterChip
                key={e}
                active={envFilter === e}
                onClick={() => setEnvFilter(e)}
                count={deployments.filter((d) => d.env === e).length}
              >
                {ENV_LABEL[e]}
              </FilterChip>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            <FilterChip
              active={statusFilter === "failed"}
              onClick={() => setStatusFilter(statusFilter === "failed" ? "all" : "failed")}
              count={failedCount}
            >
              Başarısız
            </FilterChip>
            <FilterChip
              active={statusFilter === "rolled-back"}
              onClick={() => setStatusFilter(statusFilter === "rolled-back" ? "all" : "rolled-back")}
              count={rolledBackCount}
            >
              Geri alınan
            </FilterChip>
          </FilterBar>

          <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            <Button size="xs" variant="outline" className="gap-1" onClick={bulkRollback}>
              <Undo2 className="size-3.5" /> Seçilenleri Geri Al
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="gap-1"
              onClick={() => {
                toast.success(`${selected.size} deploy notları kopyalandı`);
                setSelected(new Set());
              }}
            >
              <GitCommitHorizontal className="size-3.5" /> Notları Kopyala
            </Button>
          </BulkBar>

          {/* Durumlar: yükleniyor / boş / filtre-boş / liste */}
          {deployments.length === 0 ? (
            <TableSkeleton rows={5} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={filtersActive ? Stack : Rocket}
              variant={filtersActive ? "search" : "default"}
              title={filtersActive ? "Eşleşen deploy yok" : "Henüz deploy yok"}
              description={
                filtersActive
                  ? "Filtreleri temizleyip tekrar deneyin."
                  : "Bir ortama deploy başlatınca geçmiş burada görünür."
              }
              action={
                filtersActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setEnvFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Filtreleri temizle
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div
              ref={containerRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              className="space-y-2 outline-none"
            >
              {filtered.map((d, i) => (
                <DeployRow
                  key={d.id}
                  d={d}
                  meta={metaFor(d)}
                  cols={cols}
                  selected={selected.has(d.id)}
                  navActive={active === i}
                  onMouseEnter={() => setActive(i)}
                  navIndex={i}
                  onToggleSel={() => toggleSel(d.id)}
                  onOpen={() => setDrawerId(d.id)}
                  onRollback={() => setRollbackTarget(d)}
                  envTone={ENV_TONE[d.env]}
                />
              ))}
            </div>
          )}
        </div>
      </PageBody>

      {/* Detay drawer — sekmeli */}
      <DeployDrawer
        d={drawerDeploy}
        onOpenChange={(v) => !v && setDrawerId(null)}
        onRollback={(dep) => {
          setDrawerId(null);
          setRollbackTarget(dep);
        }}
      />

      {/* Prod'a yükselt onayı */}
      <Dialog open={promoteEnv === "prod"} onOpenChange={(v) => !v && setPromoteEnv(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpToLine className="size-4 text-emerald-400" />
              Production'a yükselt
            </DialogTitle>
            <DialogDescription>
              Bu işlem canlı trafiği etkiler. {pending.length} değişiklik canary stratejisiyle
              kademeli olarak yayına alınacak. Devam etmeden önce staging doğrulamasını kontrol edin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hedef ortam</span>
              <Badge variant="outline" className={cn("text-[10px]", ENV_TONE.prod)}>prod · acme.app</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Strateji</span>
              <span>canary · %10 → %100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Changelog</span>
              <span className="tabular-nums">{pending.length} öğe</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SLA hedefi</span>
              <span>{"< 15 dk"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={busyPromote} onClick={() => setPromoteEnv(null)}>
              Vazgeç
            </Button>
            <Button size="sm" className="gap-1.5" loading={busyPromote} onClick={confirmPromote}>
              <ArrowUpToLine className="size-3.5" />
              {busyPromote ? "Yükseltiliyor…" : "Onayla ve Yükselt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geri al onayı */}
      <Dialog open={!!rollbackTarget} onOpenChange={(v) => !v && setRollbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warning className="size-4 text-amber-400" />
              Geri alma onayı
            </DialogTitle>
            <DialogDescription>
              {rollbackTarget && (
                <>
                  <span className="font-mono">{rollbackTarget.version}</span> sürümü{" "}
                  <span className="font-medium">{ENV_LABEL[rollbackTarget.env]}</span> ortamında geri
                  alınacak ve önceki kararlı sürüme dönülecek. Bu işlem audit log'a kaydedilir.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={busyRollback} onClick={() => setRollbackTarget(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" loading={busyRollback} onClick={confirmRollback}>
              <Undo2 className="size-3.5" />
              {busyRollback ? "Geri alınıyor…" : "Geri Al"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Ortam kartı ────────────────────────────────────────────────────
function EnvCard({ env, busy, onDeploy }: { env: Environment; busy?: boolean; onDeploy: () => void }) {
  const deploying = env.status === "deploying";
  const health = ENV_HEALTH[env.name];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              env.status === "healthy"
                ? "bg-emerald-400"
                : env.status === "deploying"
                  ? "animate-pulse bg-sky-400"
                  : "bg-amber-400",
            )}
          />
          <span className="text-sm font-medium">{env.label}</span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{env.url}</span>
        </div>
        <div className="mt-3 font-mono text-lg font-semibold tabular-nums">{env.currentVersion}</div>
        <div className="text-[11px] text-muted-foreground">son deploy: {env.lastDeploy}</div>

        {/* Sağlık metrikleri */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 p-2 text-center">
          <Metric icon={Pulse} label="uptime" value={`%${health.uptime}`} />
          <Metric icon={ShieldWarning} label="hata" value={`%${health.errorRate}`} />
          <Metric icon={Timer} label="p95" value={`${health.p95Ms}ms`} />
        </div>

        <Button
          size="sm"
          className="mt-3 w-full gap-1.5"
          disabled={deploying}
          loading={busy}
          onClick={onDeploy}
        >
          {env.name === "prod" ? <ArrowUpToLine className="size-3.5" /> : <Rocket className="size-3.5" />}
          {busy ? "Başlatılıyor…" : deploying ? "Deploy ediliyor…" : env.name === "prod" ? "Prod'a Yükselt" : "Deploy"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Pulse;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <Icon className="mx-auto size-3 text-muted-foreground" />
      <div className="text-xs font-semibold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

// ── Deploy satırı ──────────────────────────────────────────────────
function DeployRow({
  d,
  meta,
  cols,
  selected,
  navActive,
  navIndex,
  onMouseEnter,
  onToggleSel,
  onOpen,
  onRollback,
  envTone,
}: {
  d: Deployment;
  meta: ReleaseMeta;
  cols: Record<string, boolean>;
  selected: boolean;
  navActive: boolean;
  navIndex: number;
  onMouseEnter: () => void;
  onToggleSel: () => void;
  onOpen: () => void;
  onRollback: () => void;
  envTone: string;
}) {
  return (
    <div
      data-nav-index={navIndex}
      onMouseEnter={onMouseEnter}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/20",
        selected && "border-primary/40 bg-primary/5",
        navActive && "ring-1 ring-inset ring-primary/40 bg-accent/40",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSel}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${d.version} seç`}
        className="size-3.5 shrink-0 accent-primary"
      />
      <button onClick={onOpen} className="flex flex-1 items-center gap-3 text-left">
        <span className="font-mono text-sm font-medium">{d.version}</span>
        {cols.env && (
          <Badge variant="outline" className={cn("text-[10px]", envTone)}>
            {d.env}
          </Badge>
        )}
        {cols.status && <DeployStatusBadge status={d.status} />}
        {cols.commit && (
          <span className="font-mono text-[10px] text-muted-foreground">{d.commit}</span>
        )}
        {cols.sla && d.durationMs > 0 && (
          <SlaPill met={meta.slaMet} duration={d.durationMs} />
        )}
        {cols.trigger && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {d.triggeredBy}
          </span>
        )}
        {cols.meta && (
          <span className="ml-auto text-xs text-muted-foreground">
            {d.changelog.length} değişiklik · {d.time}
          </span>
        )}
      </button>
      {d.status === "success" && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRollback();
          }}
          aria-label="Geri al"
        >
          <Undo2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

function SlaPill({ met, duration }: { met: boolean; duration: number }) {
  return (
    <span
      className={cn(
        "hidden items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium tabular-nums md:inline-flex",
        met
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
          : "border-red-400/30 bg-red-400/10 text-red-400",
      )}
      title={met ? "SLA içinde" : "SLA aşıldı (>15dk)"}
    >
      <Timer className="size-2.5" />
      {fmtDur(duration)}
    </span>
  );
}

// ── Detay drawer ───────────────────────────────────────────────────
function DeployDrawer({
  d,
  onOpenChange,
  onRollback,
}: {
  d: Deployment | null;
  onOpenChange: (v: boolean) => void;
  onRollback: (d: Deployment) => void;
}) {
  if (!d) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} title="" />;
  }
  const meta = metaFor(d);
  const steps: TimelineStep[] = d.steps.map((s) => ({
    label: s.name,
    status: s.status,
    meta: s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : undefined,
  }));

  const audit: AuditEvent[] = [
    {
      id: "a-trigger",
      action: `${d.env} ortamına deploy tetikledi`,
      actor: d.triggeredBy,
      at: d.time,
      icon: Rocket,
      tone: "primary",
    },
    ...(meta.approvedBy
      ? [
          {
            id: "a-approve",
            action: "prod yükseltmeyi onayladı",
            actor: meta.approvedBy,
            at: d.time,
            icon: CheckCircle,
            tone: "emerald" as const,
          },
        ]
      : []),
    {
      id: "a-build",
      action: "build aşaması tamamlandı",
      actor: "ci-bot",
      at: d.time,
      icon: Cube,
      tone: d.steps[0]?.status === "passed" ? "emerald" : "red",
      detail: `artifact ${meta.artifactMb} MB · ${meta.diffStat.files} dosya`,
    },
    {
      id: "a-test",
      action: d.steps[1]?.status === "failed" ? "test aşaması başarısız" : "test aşaması geçti",
      actor: "ci-bot",
      at: d.time,
      icon: d.steps[1]?.status === "failed" ? XCircle : CheckCircle,
      tone: d.steps[1]?.status === "failed" ? "red" : "emerald",
    },
    ...(d.status === "rolled-back"
      ? [
          {
            id: "a-rollback",
            action: "önceki kararlı sürüme geri alındı",
            actor: "release-manager",
            at: "az önce",
            icon: Undo2,
            tone: "amber" as const,
          },
        ]
      : []),
    {
      id: "a-final",
      action:
        d.status === "success"
          ? `${meta.strategy} ile %${meta.trafficPct} trafik yeni sürümde`
          : d.status === "failed"
            ? "deploy başarısız — pipeline durduruldu"
            : "deploy geri alındı",
      actor: "system",
      at: d.time,
      icon: d.status === "success" ? Lightning : Warning,
      tone: d.status === "success" ? "emerald" : "red",
    },
  ];

  const tabs: DrawerTab[] = [
    {
      value: "genel",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat icon={ShieldWarning} label="Hata oranı" value={`%${meta.errorRate}`} />
            <MiniStat icon={Timer} label="p95 yanıt" value={`${meta.p95Ms}ms`} />
            <MiniStat icon={Pulse} label="Etkilenen kullanıcı" value={meta.affectedUsers.toLocaleString("tr-TR")} />
            <MiniStat icon={ClockCounterClockwise} label="Süre" value={fmtDur(d.durationMs)} />
          </div>

          <div className="rounded-lg border bg-card p-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pipeline
            </p>
            <StatusTimeline steps={steps} />
          </div>

          <div className="divide-y rounded-lg border bg-card">
            <Field label="Sürüm" mono>{d.version}</Field>
            <Field label="Ortam">
              <Badge variant="outline" className={cn("text-[10px]", ENV_TONE[d.env])}>
                {d.env}
              </Badge>
            </Field>
            <Field label="Durum"><DeployStatusBadge status={d.status} /></Field>
            <Field label="Strateji">{meta.strategy}</Field>
            <Field label="Bölge" mono>{meta.region}</Field>
            <Field label="Commit" mono>{d.commit}</Field>
            <Field label="Tetikleyen">{d.triggeredBy}</Field>
            {meta.approvedBy && <Field label="Onaylayan">{meta.approvedBy}</Field>}
            <Field label="SLA">
              <span className={meta.slaMet ? "text-emerald-400" : "text-red-400"}>
                {meta.slaMet ? "karşılandı" : "aşıldı"} · {fmtDur(d.durationMs)} / 15dk
              </span>
            </Field>
          </div>

          {/* Changelog + diff */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Changelog
              </p>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <span className="text-muted-foreground">{meta.diffStat.files} dosya</span>
                <span className="text-emerald-400">+{meta.diffStat.additions}</span>
                <span className="text-red-400">-{meta.diffStat.deletions}</span>
              </span>
            </div>
            {d.changelog.length > 0 ? (
              <ul className="space-y-1.5 rounded-lg border bg-card p-3">
                {d.changelog.map((c) => (
                  <li key={c.issueId} className="flex items-center gap-2 text-xs">
                    <GitBranch className="size-3 text-muted-foreground" />
                    <Badge
                      variant="secondary"
                      className={cn("text-[9px]", c.type === "bug" ? "text-red-400" : "text-emerald-400")}
                    >
                      {c.type === "bug" ? "fix" : "feat"}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.issueId}</span>
                    <span className="truncate">{c.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
                Bu deploy'da changelog kaydı yok.
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "aktivite",
      label: "Aktivite",
      content: <AuditTimeline events={audit} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify({ ...d, meta }, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open={!!d}
      onOpenChange={onOpenChange}
      title={d.version}
      subtitle={`${d.env} · ${d.commit} · ${d.time}`}
      badge={<DeployStatusBadge status={d.status} />}
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => toast.success("Diff panoya kopyalandı")}
          >
            <GitCommitHorizontal className="size-3.5" /> Diff Kopyala
          </Button>
          {d.status === "success" && (
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto gap-1.5"
              onClick={() => onRollback(d)}
            >
              <Undo2 className="size-3.5" /> Geri Al
            </Button>
          )}
          {d.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto gap-1.5"
              onClick={() => toast.info("Pipeline yeniden tetiklendi (mock)")}
            >
              <Wrench className="size-3.5" /> Yeniden Dene
            </Button>
          )}
        </div>
      }
    />
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Pulse;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
