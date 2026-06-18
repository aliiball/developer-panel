import { useMemo, useState } from "react";
import {
  Robot as BotMessageSquare,
  Sparkle as Sparkles,
  FileCode as FileCode2,
  Palette,
  Plug,
  Textbox as FormInput,
  Database,
  Chat as MessageSquare,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  Timer,
  Coins,
  Cpu,
  ChartLineUp,
  Lightning,
  Warning,
  Copy,
  GitDiff,
  Trash,
  ArrowClockwise,
  Brain,
  CurrencyDollar,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useListNav } from "~/hooks/use-list-nav";
import { useCopilotStore, type AgentRun } from "~/stores/copilot-store";
import {
  KpiCard,
  KpiSkeleton,
  TableSkeleton,
  EmptyState,
  FilterBar,
  FilterChip,
  BulkBar,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { StatusBadge, type Tone } from "~/components/delivery/badges";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ALL_NAV } from "~/data/nav";
import {
  EXTRA_RUNS,
  metaFor,
  MODEL_RATE,
  RUN_VOLUME_TREND,
  SUCCESS_TREND,
  LATENCY_TREND,
  TOKEN_TREND,
  type RunMeta,
} from "~/data/seed.agent-runs";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "AI Agent Runs — MetaPanel" }];
}

const KIND_ICON: Record<string, typeof FileCode2> = {
  models: Database, fields: Database, palette: Palette, endpoints: Plug,
  form: FormInput, code: FileCode2, "release-notes": FileCode2, triage: Sparkles,
  permissions: Sparkles,
};

const KIND_LABEL: Record<string, string> = {
  models: "model", fields: "alan", palette: "palet", endpoints: "endpoint",
  form: "form", code: "kod", "release-notes": "sürüm notu", triage: "triyaj",
  permissions: "izin",
};

const STATUS_TONE: Record<RunMeta["status"], Tone> = {
  applied: "emerald",
  previewed: "violet",
  discarded: "muted",
  error: "red",
  text: "sky",
};
const STATUS_LABEL: Record<RunMeta["status"], string> = {
  applied: "uygulandı",
  previewed: "önizlendi",
  discarded: "iptal",
  error: "hata",
  text: "metin",
};

function surfaceLabel(path: string): string {
  if (path.startsWith("/schema/")) return "Schema (model)";
  return ALL_NAV.find((n) => n.to === path)?.label ?? path;
}

type Outcome = "all" | "preview" | "text" | "error";

export default function AgentRuns() {
  const storeRuns = useCopilotStore((s) => s.runs);
  const openRail = useCopilotStore((s) => s.openRail);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // store seed'i (4) + page-local extra (14) → enterprise yoğunluk (~18).
  // store'a yazmadan, görüntüleme için birleştiriyoruz; canlı çalıştırmalar
  // (store'a recordRun ile düşenler) en üstte kalır.
  const runs = useMemo<AgentRun[]>(() => {
    const seen = new Set(storeRuns.map((r) => r.id));
    return [...storeRuns, ...EXTRA_RUNS.filter((r) => !seen.has(r.id))];
  }, [storeRuns]);

  const metaById = useMemo(() => {
    const m = new Map<string, RunMeta>();
    runs.forEach((r, i) => m.set(r.id, metaFor(r, i)));
    return m;
  }, [runs]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [surface, setSurface] = useState<string>("all");
  const [model, setModel] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<AgentRun | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [bulkRerunning, setBulkRerunning] = useState(false);

  // ── KPI hesapları ──────────────────────────────────────────────────
  const total = runs.length;
  const previews = runs.filter((r) => r.outcome === "preview").length;
  const errors = [...metaById.values()].filter((m) => m.status === "error").length;
  const successRate = total
    ? Math.round(((total - errors) / total) * 1000) / 10
    : 0;
  const avgDuration = total
    ? Math.round(runs.reduce((s, r) => s + r.durationMs, 0) / total)
    : 0;
  const totalTokens = [...metaById.values()].reduce(
    (s, m) => s + m.inputTokens + m.outputTokens,
    0,
  );
  const totalCost = [...metaById.values()].reduce((s, m) => s + m.costUsd, 0);

  // ── Filtre ───────────────────────────────────────────────────────────
  const surfaces = useMemo(
    () => Array.from(new Set(runs.map((r) => r.surface))),
    [runs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((r) => {
      const m = metaById.get(r.id)!;
      if (outcome === "preview" && r.outcome !== "preview") return false;
      if (outcome === "text" && r.outcome !== "text") return false;
      if (outcome === "error" && m.status !== "error") return false;
      if (surface !== "all" && r.surface !== surface) return false;
      if (model !== "all" && m.model !== model) return false;
      if (q && !`${r.prompt} ${r.previewKind ?? ""} ${m.actor}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [runs, metaById, search, outcome, surface, model]);

  const counts = useMemo(
    () => ({
      all: runs.length,
      preview: runs.filter((r) => r.outcome === "preview").length,
      text: runs.filter((r) => r.outcome === "text").length,
      error: [...metaById.values()].filter((m) => m.status === "error").length,
    }),
    [runs, metaById],
  );

  // ── Aksiyonlar ───────────────────────────────────────────────────────
  function refresh() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Çalıştırma geçmişi yenilendi");
    }, 650);
  }

  function exportRuns() {
    toast.success(`${filtered.length} çalıştırma JSON olarak dışa aktarıldı`, {
      description: "prompt, model, token, maliyet ve sonuç dahil.",
    });
  }

  function rerun(r: AgentRun) {
    setRerunningId(r.id);
    setTimeout(() => {
      queuePrompt(r.prompt);
      setRerunningId(null);
      toast.success("Prompt Copilot'a yeniden kuyruğa alındı", {
        description: r.prompt.length > 60 ? r.prompt.slice(0, 60) + "…" : r.prompt,
      });
    }, 600);
  }

  function bulkRerun() {
    const n = selected.size;
    setBulkRerunning(true);
    setTimeout(() => {
      setBulkRerunning(false);
      setSelected(new Set());
      toast.success(`${n} çalıştırma yeniden kuyruğa alındı`);
    }, 600);
  }

  function bulkArchive() {
    toast.success(`${selected.size} çalıştırma kaydı arşivlendi`);
    setSelected(new Set());
  }

  function toggleSel(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function resetFilters() {
    setSearch("");
    setOutcome("all");
    setSurface("all");
    setModel("all");
  }

  // ── Klavye gezinme (j/↓ · k/↑ · Enter aç · Esc temizle) ───────────────
  const { active, setActive, onKeyDown, containerRef } = useListNav(
    filtered.length,
    (i) => setDrawer(filtered[i]),
  );

  const drawerMeta = drawer ? metaById.get(drawer.id) : undefined;

  const drawerTabs: DrawerTab[] =
    drawer && drawerMeta
      ? [
          {
            value: "overview",
            label: "Genel",
            content: (
              <OverviewTab
                run={drawer}
                meta={drawerMeta}
                onRerun={() => rerun(drawer)}
                rerunning={rerunningId === drawer.id}
              />
            ),
          },
          {
            value: "result",
            label: "Sonuç",
            content: <ResultTab run={drawer} meta={drawerMeta} />,
          },
          {
            value: "activity",
            label: "Aktivite",
            content: <AuditTimeline events={runEvents(drawer, drawerMeta)} />,
          },
          {
            value: "json",
            label: "JSON",
            content: (
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(
                  {
                    id: drawer.id,
                    prompt: drawer.prompt,
                    surface: drawer.surface,
                    outcome: drawer.outcome,
                    previewKind: drawer.previewKind ?? null,
                    model: drawerMeta.model,
                    inputTokens: drawerMeta.inputTokens,
                    outputTokens: drawerMeta.outputTokens,
                    costUsd: drawerMeta.costUsd,
                    status: drawerMeta.status,
                    durationMs: Math.round(drawer.durationMs),
                    output: drawerMeta.output,
                  },
                  null,
                  2,
                )}
              </pre>
            ),
          },
        ]
      : [];

  return (
    <>
      <PageHeader
        title="AI Agent Runs"
        description="Copilot'un her üretiminin geçmişi: prompt, üretilen yüzey, model, token, maliyet ve sonuç."
        actions={[
          { label: "Yenile", icon: ArrowsClockwise, variant: "outline", onClick: refresh },
          {
            label: "Özetle",
            icon: Sparkles,
            variant: "default",
            onClick: () =>
              queuePrompt("Son AI üretimlerini özetle ve en çok hangi yüzeyde, hangi maliyetle kullanıldığını söyle."),
          },
        ]}
      />
      <PageBody className="space-y-4">
        {/* ── KPI şeridi ──────────────────────────────────────────── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Toplam çalıştırma"
              value={total}
              delta={17}
              trend={RUN_VOLUME_TREND}
              icon={Lightning}
              hint="son 30g"
            />
            <KpiCard
              label="Başarı oranı"
              value={`%${successRate}`}
              delta={2.1}
              trend={SUCCESS_TREND}
              icon={CheckCircle}
              hint={`${errors} hata`}
            />
            <KpiCard
              label="Ort. süre"
              value={`${avgDuration}ms`}
              delta={-9}
              trend={LATENCY_TREND}
              icon={Timer}
              invert
              hint="üretim başına"
            />
            <KpiCard
              label="Token / Maliyet"
              value={fmtTokens(totalTokens)}
              delta={14}
              trend={TOKEN_TREND}
              icon={Coins}
              hint={`$${totalCost.toFixed(2)}`}
            />
          </div>
        )}

        {/* ── Insight şeridi ──────────────────────────────────────── */}
        <SurfaceInsight runs={runs} metaById={metaById} />

        {/* ── FilterBar ───────────────────────────────────────────── */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Prompt, kişi veya yüzey ara…"
          onExport={exportRuns}
        >
          <FilterChip active={outcome === "all"} onClick={() => setOutcome("all")} count={counts.all}>
            Tümü
          </FilterChip>
          <FilterChip active={outcome === "preview"} onClick={() => setOutcome("preview")} count={counts.preview}>
            Önizleme
          </FilterChip>
          <FilterChip active={outcome === "text"} onClick={() => setOutcome("text")} count={counts.text}>
            Metin
          </FilterChip>
          <FilterChip active={outcome === "error"} onClick={() => setOutcome("error")} count={counts.error}>
            Hata
          </FilterChip>
          <Select value={surface} onValueChange={(v) => v && setSurface(v)}>
            <SelectTrigger className="h-7 w-auto gap-1.5 rounded-full px-2.5 text-xs">
              <SelectValue placeholder="Yüzey" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm yüzeyler</SelectItem>
              {surfaces.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {surfaceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={model} onValueChange={(v) => v && setModel(v)}>
            <SelectTrigger className="h-7 w-auto gap-1.5 rounded-full px-2.5 text-xs">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm modeller</SelectItem>
              {Object.entries(MODEL_RATE).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        {/* ── BulkBar ─────────────────────────────────────────────── */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={bulkRerun}
            loading={bulkRerunning}
          >
            {!bulkRerunning && <ArrowClockwise className="size-3.5" />} Yeniden çalıştır
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-red-400"
            onClick={bulkArchive}
          >
            <Trash className="size-3.5" /> Arşivle
          </Button>
        </BulkBar>

        {/* ── Çalıştırma listesi ──────────────────────────────────── */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-3.5 py-2">
            <h2 className="text-sm font-semibold">Çalıştırma Geçmişi</h2>
            <div className="flex items-center gap-2.5">
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                ↑↓ gez · Enter aç
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {filtered.length} / {runs.length} kayıt
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-3">
              <TableSkeleton rows={8} cols={5} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              {runs.length === 0 ? (
                <EmptyState
                  icon={BotMessageSquare}
                  title="Henüz çalıştırma yok"
                  description="Copilot'u kullandığınızda her üretim burada izlenir; prompt, model, token ve sonuç ile."
                  action={
                    <Button variant="outline" size="sm" onClick={openRail}>
                      Copilot panelini aç
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  variant="search"
                  title="Eşleşen çalıştırma yok"
                  description="Arama veya filtreleri değiştirin."
                  action={
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Filtreleri sıfırla
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div ref={containerRef} tabIndex={0} onKeyDown={onKeyDown} className="outline-none">
              <ul className="divide-y">
              {filtered.map((r, i) => {
                const m = metaById.get(r.id)!;
                const Icon = r.previewKind
                  ? KIND_ICON[r.previewKind] ?? BotMessageSquare
                  : MessageSquare;
                const sel = selected.has(r.id);
                return (
                  <li
                    key={r.id}
                    data-nav-index={i}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "group flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-accent/40",
                      sel && "bg-primary/5",
                      active === i && "bg-accent/40 ring-1 ring-inset ring-primary/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleSel(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-3.5 shrink-0 accent-primary"
                      aria-label={`${r.id} seç`}
                    />
                    <button
                      onClick={() => setDrawer(r)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
                          m.status === "error" && "bg-red-500/10 text-red-400",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{r.prompt}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>{surfaceLabel(r.surface)}</span>
                          <span>·</span>
                          <span>{m.actor}</span>
                          <span>·</span>
                          <span>{r.at}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="hidden shrink-0 gap-1 font-mono text-[10px] md:inline-flex">
                        <Cpu className="size-3" /> {MODEL_RATE[m.model].label}
                      </Badge>
                      <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums lg:inline">
                        {fmtTokens(m.inputTokens + m.outputTokens)} tok
                      </span>
                      <span className="hidden w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:inline">
                        ${m.costUsd.toFixed(3)}
                      </span>
                      <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
                        {Math.round(r.durationMs)}ms
                      </span>
                      <StatusBadge
                        label={STATUS_LABEL[m.status]}
                        tone={STATUS_TONE[m.status]}
                        className="shrink-0"
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-7 shrink-0 opacity-0 group-hover:opacity-100",
                        rerunningId === r.id && "opacity-100",
                      )}
                      onClick={() => rerun(r)}
                      loading={rerunningId === r.id}
                      aria-label="Yeniden çalıştır"
                    >
                      {rerunningId !== r.id && <ArrowClockwise className="size-3.5" />}
                    </Button>
                  </li>
                );
              })}
              </ul>
            </div>
          )}
        </div>
      </PageBody>

      {/* ── Detay drawer ─────────────────────────────────────────── */}
      <DetailDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        title={drawer ? truncate(drawer.prompt, 64) : ""}
        subtitle={drawer ? `${surfaceLabel(drawer.surface)} · ${drawer.at}` : undefined}
        badge={
          drawerMeta && (
            <StatusBadge label={STATUS_LABEL[drawerMeta.status]} tone={STATUS_TONE[drawerMeta.status]} />
          )
        }
        tabs={drawerTabs}
        footer={
          drawer &&
          drawerMeta && (
            <div className="flex w-full items-center gap-2 p-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => rerun(drawer)}
                loading={rerunningId === drawer.id}
              >
                {rerunningId !== drawer.id && <ArrowClockwise className="size-4" />} Yeniden çalıştır
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard?.writeText(drawer.prompt);
                  toast.success("Prompt kopyalandı");
                }}
              >
                <Copy className="size-4" /> Prompt kopyala
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={openRail}>
                <Sparkles className="size-4" /> Copilot'ta aç
              </Button>
            </div>
          )
        }
      />
    </>
  );
}

// ── Insight şeridi: yüzey dağılımı + en pahalı çalıştırma ─────────────
function SurfaceInsight({
  runs,
  metaById,
}: {
  runs: AgentRun[];
  metaById: Map<string, RunMeta>;
}) {
  const bySurface = useMemo(() => {
    const map = new Map<string, number>();
    runs.forEach((r) => map.set(r.surface, (map.get(r.surface) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [runs]);

  const priciest = useMemo(() => {
    let top: { run: AgentRun; meta: RunMeta } | null = null;
    runs.forEach((r) => {
      const m = metaById.get(r.id)!;
      if (!top || m.costUsd > top.meta.costUsd) top = { run: r, meta: m };
    });
    return top as { run: AgentRun; meta: RunMeta } | null;
  }, [runs, metaById]);

  if (runs.length === 0) return null;
  const maxCount = bySurface[0]?.[1] ?? 1;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ChartLineUp className="size-4 text-primary" />
          <h3 className="text-sm font-medium">En çok üretim yapılan yüzeyler</h3>
        </div>
        <div className="space-y-2">
          {bySurface.map(([s, c]) => (
            <div key={s} className="flex items-center gap-2.5 text-xs">
              <span className="w-28 shrink-0 truncate text-muted-foreground">{surfaceLabel(s)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${(c / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {priciest && (
        <div className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2.5">
            <CurrencyDollar className="mt-0.5 size-4 shrink-0 text-amber-400" weight="fill" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-400">En maliyetli çalıştırma</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{priciest.run.prompt}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Coins className="size-3.5" /> ${priciest.meta.costUsd.toFixed(3)}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Cpu className="size-3.5" /> {MODEL_RATE[priciest.meta.model].label}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Brain className="size-3.5" /> {fmtTokens(priciest.meta.inputTokens + priciest.meta.outputTokens)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Drawer sekmeleri ─────────────────────────────────────────────────
function OverviewTab({
  run,
  meta,
  onRerun,
  rerunning,
}: {
  run: AgentRun;
  meta: RunMeta;
  onRerun: () => void;
  rerunning: boolean;
}) {
  const rate = MODEL_RATE[meta.model];
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Prompt</p>
        <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">{run.prompt}</p>
      </div>

      <div className="space-y-1 divide-y">
        <Field label="Sonuç">
          <StatusBadge label={STATUS_LABEL[meta.status]} tone={STATUS_TONE[meta.status]} />
        </Field>
        <Field label="Yüzey">{surfaceLabel(run.surface)}</Field>
        {run.previewKind && (
          <Field label="Üretim türü">{KIND_LABEL[run.previewKind] ?? run.previewKind}</Field>
        )}
        <Field label="Model" mono>{rate.label}</Field>
        <Field label="Tetikleyen">{meta.actor}</Field>
        <Field label="Süre" mono>{Math.round(run.durationMs)}ms</Field>
        <Field label="Girdi token" mono>{meta.inputTokens.toLocaleString("tr-TR")}</Field>
        <Field label="Çıktı token" mono>{meta.outputTokens.toLocaleString("tr-TR")}</Field>
        <Field label="Maliyet" mono>${meta.costUsd.toFixed(5)}</Field>
        <Field label="Çalıştırma ID" mono>{run.id}</Field>
      </div>

      {meta.errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-muted-foreground">
          <Warning className="mt-0.5 size-3.5 shrink-0 text-red-400" weight="fill" />
          {meta.errorMessage}
        </div>
      )}

      <div className="rounded-lg border bg-card p-3">
        <p className="mb-2 text-xs font-medium">Özet</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{meta.summary}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={onRerun}
        loading={rerunning}
      >
        {!rerunning && <ArrowClockwise className="size-4" />} Bu promptu yeniden çalıştır
      </Button>
    </div>
  );
}

function ResultTab({ run, meta }: { run: AgentRun; meta: RunMeta }) {
  if (run.outcome === "text" || !meta.diff) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="size-4" />
          Metin yanıt — uygulanabilir diff üretilmedi.
        </div>
        <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
          {meta.summary}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GitDiff className="size-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Üretilen diff (önizleme)</p>
      </div>
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
        {meta.diff.split("\n").map((line, i) => (
          <div
            key={i}
            className={cn(
              line.startsWith("+") && "text-emerald-400",
              line.startsWith("-") && "text-red-400",
              line.startsWith("@@") && "text-sky-400",
            )}
          >
            {line || " "}
          </div>
        ))}
      </pre>
      <div className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        {meta.summary}
      </div>
    </div>
  );
}

// ── Audit event üretimi ──────────────────────────────────────────────
function runEvents(run: AgentRun, meta: RunMeta): AuditEvent[] {
  const events: AuditEvent[] = [
    {
      id: `${run.id}-trigger`,
      action: `promptu "${surfaceLabel(run.surface)}" yüzeyinde tetikledi`,
      actor: meta.actor,
      at: run.at,
      icon: Sparkles,
      tone: "primary",
    },
  ];
  let acc = 0;
  meta.steps.forEach((step, i) => {
    acc += step.ms;
    events.push({
      id: `${run.id}-step${i}`,
      action: `${step.label} tamamlandı`,
      actor: MODEL_RATE[meta.model].label,
      at: `+${acc}ms`,
      icon: i === meta.steps.length - 1 && meta.status === "error" ? Warning : Brain,
      tone: i === meta.steps.length - 1 && meta.status === "error" ? "red" : "default",
      detail: `${step.ms}ms`,
    });
  });
  events.push({
    id: `${run.id}-result`,
    action:
      meta.status === "error"
        ? "üretim hatayla sonuçlandı"
        : meta.status === "text"
          ? "metin yanıt döndürüldü"
          : meta.status === "applied"
            ? "önizleme oluşturuldu ve uygulandı"
            : meta.status === "discarded"
              ? "önizleme oluşturuldu, kullanıcı iptal etti"
              : "uygulanabilir önizleme oluşturuldu",
    actor: "MetaPanel",
    at: run.at,
    icon: meta.status === "error" ? XCircle : CheckCircle,
    tone: meta.status === "error" ? "red" : meta.status === "applied" ? "emerald" : "default",
    detail: `${meta.outputTokens.toLocaleString("tr-TR")} token · $${meta.costUsd.toFixed(5)}`,
  });
  return events;
}

// ── Yardımcılar ───────────────────────────────────────────────────────
function fmtTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
