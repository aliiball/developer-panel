import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  Plus,
  Lightning as Zap,
  GitBranch,
  Play,
  WebhooksLogo as Webhook,
  CheckCircle,
  XCircle,
  Clock,
  Pulse,
  PlayCircle,
  PauseCircle,
  FlowArrow,
  Warning,
  ListChecks,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { WORKFLOWS, type WorkflowDef, type WorkflowStep } from "~/data/expansion";
import {
  EXTRA_WORKFLOWS,
  WORKFLOW_META,
  CATEGORY_LABEL,
  type WorkflowMeta,
  type WorkflowRun,
  type WorkflowCategory,
} from "~/data/seed.workflows";
import { useCopilotStore } from "~/stores/copilot-store";
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
import { Card, CardContent } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Workflows — MetaPanel" }];
}

const STEP_ICON = { trigger: Zap, condition: GitBranch, action: Play } as const;
const STEP_TONE = {
  trigger: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  condition: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  action: "text-primary bg-primary/10 border-primary/30",
} as const;
const STEP_LABEL = { trigger: "tetikleyici", condition: "koşul", action: "eylem" } as const;

const RUN_BADGE: Record<WorkflowRun["status"], { label: string; cls: string; icon: typeof CheckCircle }> = {
  success: { label: "başarılı", cls: "text-emerald-400", icon: CheckCircle },
  failed: { label: "hata", cls: "text-red-400", icon: XCircle },
  running: { label: "çalışıyor", cls: "text-sky-400", icon: PlayCircle },
  skipped: { label: "atlandı", cls: "text-muted-foreground", icon: Clock },
};

const CATEGORIES = Object.keys(CATEGORY_LABEL) as WorkflowCategory[];

// base + page-local seed birleşimi
const ALL_WORKFLOWS: WorkflowDef[] = [...WORKFLOWS, ...EXTRA_WORKFLOWS];

function metaFor(id: string): WorkflowMeta | undefined {
  return WORKFLOW_META[id];
}

function fmtMs(ms: number) {
  if (ms === 0) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} sn` : `${ms} ms`;
}

export default function Workflows() {
  const [list, setList] = useState<WorkflowDef[]>(ALL_WORKFLOWS);
  const [loading] = useState(false);
  const [activeId, setActiveId] = useState(ALL_WORKFLOWS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState<boolean | null>(null);
  const [cat, setCat] = useState<WorkflowCategory | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // ── KPI hesapları ───────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalRuns = list.reduce((a, w) => a + w.runs, 0);
    const activeCount = list.filter((w) => w.active).length;
    const metas = list.map((w) => metaFor(w.id)).filter(Boolean) as WorkflowMeta[];
    const avgSuccess = metas.length
      ? metas.reduce((a, m) => a + m.successRate, 0) / metas.length
      : 0;
    const failing = metas.filter((m) => m.lastError).length;
    const runsTrend = Array.from({ length: 12 }, (_, i) =>
      metas.reduce((a, m) => a + (m.trend[i] ?? 0), 0),
    );
    const successTrend = metas.length
      ? metas[0].trend.map((_, i) =>
          Math.round(metas.reduce((a, m) => a + (m.trend[i] ?? 0), 0) / metas.length),
        )
      : [];
    return { totalRuns, activeCount, avgSuccess, failing, runsTrend, successTrend };
  }, [list]);

  // ── Filtrelenmiş liste ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q) && !w.trigger.toLowerCase().includes(q)) return false;
      if (onlyActive !== null && w.active !== onlyActive) return false;
      if (cat && metaFor(w.id)?.category !== cat) return false;
      return true;
    });
  }, [list, search, onlyActive, cat]);

  const active = list.find((w) => w.id === activeId) ?? list[0];
  const activeMeta = metaFor(active.id);

  const catCounts = useMemo(() => {
    const m = new Map<WorkflowCategory, number>();
    list.forEach((w) => {
      const c = metaFor(w.id)?.category;
      if (c) m.set(c, (m.get(c) ?? 0) + 1);
    });
    return m;
  }, [list]);

  function toggle(id: string, next?: boolean) {
    setList((p) => p.map((w) => (w.id === id ? { ...w, active: next ?? !w.active } : w)));
    const wf = list.find((w) => w.id === id);
    const nowActive = next ?? !(wf?.active ?? false);
    toast.success(nowActive ? "Workflow etkinleştirildi" : "Workflow duraklatıldı", {
      description: wf?.name,
    });
  }

  function openDetail(id: string) {
    setActiveId(id);
    setDrawerOpen(true);
  }

  function toggleSelect(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function bulkToggle(next: boolean) {
    setList((p) => p.map((w) => (selected.has(w.id) ? { ...w, active: next } : w)));
    toast.success(`${selected.size} workflow ${next ? "etkinleştirildi" : "duraklatıldı"}`);
    setSelected(new Set());
  }

  function exportJson() {
    toast.success("Workflow listesi dışa aktarıldı", { description: `${filtered.length} kayıt · JSON` });
  }

  function runNow(id: string) {
    const wf = list.find((w) => w.id === id);
    toast.success("Manuel çalıştırma kuyruğa alındı", { description: wf?.name });
  }

  const resetFilters = () => {
    setSearch("");
    setOnlyActive(null);
    setCat(null);
  };

  // ── Drawer sekmeleri ────────────────────────────────────────────
  const drawerTabs: DrawerTab[] = activeMeta
    ? [
        {
          value: "steps",
          label: "Adımlar",
          content: <StepChain steps={active.steps} />,
        },
        {
          value: "general",
          label: "Genel",
          content: (
            <div className="divide-y">
              <Field label="Tetikleyici" mono>{active.trigger}</Field>
              <Field label="Kategori">{CATEGORY_LABEL[activeMeta.category]}</Field>
              <Field label="Sahip">{activeMeta.owner}</Field>
              <Field label="Durum">
                <Badge variant={active.active ? "default" : "secondary"} className="text-[10px]">
                  {active.active ? "aktif" : "pasif"}
                </Badge>
              </Field>
              <Field label="Toplam çalışma">{active.runs.toLocaleString("tr-TR")}</Field>
              <Field label="Başarı oranı">%{activeMeta.successRate.toFixed(1)}</Field>
              <Field label="Ort. süre">{fmtMs(activeMeta.avgMs)}</Field>
              <Field label="Adım sayısı">{active.steps.length}</Field>
              <Field label="Son güncelleme">{activeMeta.updatedAt}</Field>
              {activeMeta.lastError && (
                <Field label="Son hata">
                  <span className="text-red-400">{activeMeta.lastError}</span>
                </Field>
              )}
            </div>
          ),
        },
        {
          value: "runs",
          label: "Çalıştırma Geçmişi",
          content: <RunHistory runs={activeMeta.runHistory} />,
        },
        {
          value: "activity",
          label: "Aktivite",
          content: <AuditTimeline events={activeMeta.audit.map(toAudit)} />,
        },
        {
          value: "json",
          label: "JSON",
          content: (
            <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
              {JSON.stringify({ ...active, meta: activeMeta }, null, 2)}
            </pre>
          ),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Olay-tetiklemeli iş akışları: trigger → koşul → eylem zincirleri."
        actions={[
          {
            label: "AI ile Akış",
            icon: Sparkles,
            variant: "default",
            onClick: () =>
              queuePrompt("Sipariş iptal edildiğinde stok iadesi yapan bir workflow tasarla."),
          },
          { label: "Yeni Workflow", icon: Plus, onClick: () => toast.info("Workflow tasarımcısı yakında") },
        ]}
      />
      <PageBody grid={false} className="space-y-4">
        {/* KPI şeridi */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Toplam Çalışma"
              value={kpi.totalRuns.toLocaleString("tr-TR")}
              delta={12}
              trend={kpi.runsTrend}
              icon={Pulse}
              hint="son 24sa"
            />
            <KpiCard
              label="Aktif Workflow"
              value={`${kpi.activeCount}/${list.length}`}
              delta={8}
              trend={kpi.successTrend}
              icon={FlowArrow}
            />
            <KpiCard
              label="Ort. Başarı Oranı"
              value={`%${kpi.avgSuccess.toFixed(1)}`}
              delta={0.6}
              trend={kpi.successTrend}
              icon={CheckCircle}
              hint="tüm akışlar"
            />
            <KpiCard
              label="Hatalı Akış"
              value={kpi.failing}
              delta={kpi.failing}
              invert
              icon={Warning}
              hint="müdahale gerek"
            />
          </div>
        )}

        {/* Filtre şeridi */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Workflow veya tetikleyici ara…"
          onExport={exportJson}
        >
          <FilterChip active={onlyActive === true} onClick={() => setOnlyActive(onlyActive === true ? null : true)}>
            Aktif
          </FilterChip>
          <FilterChip active={onlyActive === false} onClick={() => setOnlyActive(onlyActive === false ? null : false)}>
            Pasif
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={cat === c}
              count={catCounts.get(c) ?? 0}
              onClick={() => setCat(cat === c ? null : c)}
            >
              {CATEGORY_LABEL[c]}
            </FilterChip>
          ))}
        </FilterBar>

        {/* Toplu işlem şeridi */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="xs" variant="outline" className="gap-1" onClick={() => bulkToggle(true)}>
            <PlayCircle className="size-3.5" /> Etkinleştir
          </Button>
          <Button size="xs" variant="outline" className="gap-1" onClick={() => bulkToggle(false)}>
            <PauseCircle className="size-3.5" /> Duraklat
          </Button>
        </BulkBar>

        {/* İçerik */}
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Webhook}
            variant="search"
            title="Eşleşen workflow yok"
            description="Arama ve filtreleri sıfırlayarak tüm iş akışlarını görebilirsiniz."
            action={
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Filtreleri temizle
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.15fr]">
            {/* Liste */}
            <div className="space-y-2">
              {filtered.map((w) => {
                const m = metaFor(w.id);
                const isActiveRow = w.id === activeId;
                const isSel = selected.has(w.id);
                return (
                  <Card
                    key={w.id}
                    onClick={() => openDetail(w.id)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isActiveRow ? "border-primary/40" : "hover:border-primary/20",
                      isSel && "ring-1 ring-primary/40",
                    )}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(w.id)}
                        aria-label={`${w.name} seç`}
                        className="size-4 shrink-0 cursor-pointer accent-primary"
                      />
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                        <Webhook className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{w.name}</p>
                          {m && (
                            <Badge variant="outline" className="shrink-0 text-[9px] capitalize">
                              {CATEGORY_LABEL[m.category]}
                            </Badge>
                          )}
                          {m?.lastError && <Warning className="size-3.5 shrink-0 text-red-400" />}
                        </div>
                        <p className="truncate font-mono text-xs text-muted-foreground">{w.trigger}</p>
                        <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
                          <span>{w.steps.length} adım</span>
                          {m && <span className="text-emerald-400">%{m.successRate.toFixed(1)} başarı</span>}
                          {m && <span>{fmtMs(m.avgMs)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Switch
                          checked={w.active}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(v) => toggle(w.id, v)}
                        />
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {w.runs.toLocaleString("tr-TR")} çalışma
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Adım zinciri önizleme */}
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{active.name}</h3>
                      <Badge variant={active.active ? "default" : "secondary"} className="text-[10px]">
                        {active.active ? "aktif" : "pasif"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{active.trigger}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="xs" variant="outline" className="gap-1" onClick={() => runNow(active.id)}>
                      <ArrowsClockwise className="size-3.5" /> Çalıştır
                    </Button>
                    <Button size="xs" variant="outline" className="gap-1" onClick={() => openDetail(active.id)}>
                      <ListChecks className="size-3.5" /> Detay
                    </Button>
                  </div>
                </div>

                {activeMeta && (
                  <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 p-3 text-center">
                    <Mini label="Başarı" value={`%${activeMeta.successRate.toFixed(1)}`} />
                    <Mini label="Ort. süre" value={fmtMs(activeMeta.avgMs)} />
                    <Mini label="Çalışma" value={active.runs.toLocaleString("tr-TR")} />
                  </div>
                )}

                <StepChain steps={active.steps} />
              </CardContent>
            </Card>
          </div>
        )}
      </PageBody>

      {/* Detay paneli */}
      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={active.name}
        subtitle={active.trigger}
        badge={
          <Badge variant={active.active ? "default" : "secondary"} className="text-[10px]">
            {active.active ? "aktif" : "pasif"}
          </Badge>
        }
        tabs={drawerTabs}
        footer={
          <div className="flex w-full items-center justify-between p-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={active.active} onCheckedChange={(v) => toggle(active.id, v)} />
              {active.active ? "Etkin" : "Duraklatıldı"}
            </label>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => runNow(active.id)}>
              <ArrowsClockwise className="size-4" /> Şimdi çalıştır
            </Button>
          </div>
        }
      />
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StepChain({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-3 before:h-[calc(100%-1.5rem)] before:w-px before:bg-border">
      {steps.map((s, i) => (
        <StepRow key={i} step={s} index={i} />
      ))}
    </ol>
  );
}

function StepRow({ step, index }: { step: WorkflowStep; index: number }) {
  const Icon = STEP_ICON[step.type];
  return (
    <li className="relative flex items-center gap-3">
      <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border", STEP_TONE[step.type])}>
        <Icon className="size-4" />
      </span>
      <div className="flex flex-1 items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <span className="text-[10px] tabular-nums text-muted-foreground">#{index + 1}</span>
        <span className="flex-1 text-sm">{step.label}</span>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">{STEP_LABEL[step.type]}</span>
      </div>
    </li>
  );
}

function RunHistory({ runs }: { runs: WorkflowRun[] }) {
  if (runs.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Çalıştırma kaydı yok.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      {runs.map((r) => {
        const b = RUN_BADGE[r.status];
        const RunIcon = b.icon;
        return (
          <div key={r.id} className="flex items-center gap-3 border-b px-3 py-2.5 text-sm last:border-0">
            <RunIcon className={cn("size-4 shrink-0", b.cls)} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-medium", b.cls)}>{b.label}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{r.trigger}</p>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{fmtMs(r.durationMs)}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground/70">{r.at}</span>
          </div>
        );
      })}
    </div>
  );
}

const AUDIT_ICON = {
  default: GitBranch,
  primary: FlowArrow,
  emerald: CheckCircle,
  amber: Warning,
  red: XCircle,
} as const;

function toAudit(a: WorkflowMeta["audit"][number]): AuditEvent {
  return {
    id: a.id,
    action: a.action,
    actor: a.actor,
    at: a.at,
    tone: a.tone,
    detail: a.detail,
    icon: AUDIT_ICON[a.tone ?? "default"],
  };
}
