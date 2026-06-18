import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  GitMerge,
  Play,
  ArrowUUpLeft as Undo2,
  CheckCircle as CheckCircle2,
  Clock,
  Warning,
  Stack,
  Timer,
  ShieldWarning,
  Database,
  ArrowsClockwise,
  Copy,
  TreeStructure,
  GitBranch,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import type { MigrationStatus } from "~/data/platform";
import {
  SEED_MIGRATION_ROWS,
  MIGRATION_TREND,
  type MigrationRow,
  type MigrationRisk,
} from "~/data/seed.migrations";
import { StatusBadge, type Tone } from "~/components/delivery/badges";
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
} from "~/components/enterprise";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Migrations — MetaPanel" }];
}

const STATUS_TONE: Record<MigrationStatus, Tone> = { applied: "emerald", pending: "amber", rolled_back: "muted" };
const STATUS_LABEL: Record<MigrationStatus, string> = { applied: "uygulandı", pending: "bekliyor", rolled_back: "geri alındı" };
const RISK_TONE: Record<MigrationRisk, Tone> = { low: "emerald", medium: "amber", high: "red" };
const RISK_LABEL: Record<MigrationRisk, string> = { low: "düşük risk", medium: "orta risk", high: "yüksek risk" };
const ENV_LABEL: Record<MigrationRow["env"], string> = { production: "prod", staging: "staging", development: "dev" };
const ENV_TONE: Record<MigrationRow["env"], Tone> = { production: "violet", staging: "sky", development: "muted" };

type StatusFilter = "all" | MigrationStatus;

function fmtDuration(ms: number): string {
  if (ms <= 0) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}
function fmtRows(n: number): string {
  if (n === 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Yıkıcı işlem onayı için diyalog durumu. */
type Confirm =
  | { kind: "apply"; row: MigrationRow }
  | { kind: "rollback"; row: MigrationRow }
  | { kind: "bulk-apply"; ids: string[] }
  | null;

export default function Migrations() {
  const [migrations, setMigrations] = useState<MigrationRow[]>(SEED_MIGRATION_ROWS);
  const [loading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [cols, setCols] = useState({ env: true, risk: true, diff: true, author: true });

  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const counts = useMemo(() => {
    const c = { applied: 0, pending: 0, rolled_back: 0, highRiskPending: 0 };
    for (const m of migrations) {
      c[m.status]++;
      if (m.status === "pending" && m.risk === "high") c.highRiskPending++;
    }
    return c;
  }, [migrations]);

  const avgDuration = useMemo(() => {
    const done = migrations.filter((m) => m.durationMs > 0);
    if (!done.length) return 0;
    return Math.round(done.reduce((s, m) => s + m.durationMs, 0) / done.length);
  }, [migrations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return migrations.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (riskOnly && m.risk !== "high") return false;
      if (!q) return true;
      return (
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q) ||
        m.version.toLowerCase().includes(q) ||
        m.affectedTables.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [migrations, query, status, riskOnly]);

  const activeRow = migrations.find((m) => m.id === openId) ?? null;
  const pendingIds = filtered.filter((m) => m.status === "pending").map((m) => m.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAllPending() {
    setSelected((prev) => {
      if (allPendingSelected) return new Set();
      return new Set(pendingIds);
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }

  function apply(id: string) {
    setMigrations((p) =>
      p.map((m) =>
        m.id === id
          ? {
              ...m,
              status: "applied",
              appliedAt: "az önce",
              durationMs: m.durationMs || 1000,
              audit: [
                {
                  id: `a_${Date.now()}`,
                  action: "production'a uygulandı",
                  actor: "you",
                  at: "az önce",
                  icon: Play,
                  tone: "emerald" as const,
                },
                ...m.audit,
              ],
            }
          : m,
      ),
    );
    toast.success("Migration uygulandı", { description: id });
  }

  function rollback(id: string) {
    const prevState = migrations;
    setMigrations((p) =>
      p.map((m) =>
        m.id === id
          ? {
              ...m,
              status: "rolled_back",
              audit: [
                {
                  id: `a_${Date.now()}`,
                  action: "manuel geri alındı",
                  actor: "you",
                  at: "az önce",
                  icon: Undo2,
                  tone: "amber" as const,
                },
                ...m.audit,
              ],
            }
          : m,
      ),
    );
    toast.success("Migration geri alındı", {
      description: id,
      action: { label: "Geri al", onClick: () => setMigrations(prevState) },
    });
  }

  function bulkApply(ids: string[]) {
    setMigrations((p) =>
      p.map((m) =>
        ids.includes(m.id) && m.status === "pending"
          ? { ...m, status: "applied", appliedAt: "az önce", durationMs: m.durationMs || 1000 }
          : m,
      ),
    );
    clearSelection();
    toast.success(`${ids.length} migration sırayla uygulandı`);
  }

  function exportData() {
    toast.success("Migration geçmişi dışa aktarıldı", {
      description: `${filtered.length} kayıt · JSON panoya kopyalandı`,
    });
  }

  function runConfirm() {
    if (!confirm) return;
    if (confirm.kind === "apply") apply(confirm.row.id);
    else if (confirm.kind === "rollback") rollback(confirm.row.id);
    else if (confirm.kind === "bulk-apply") bulkApply(confirm.ids);
    setConfirm(null);
  }

  const drawerTabs: DrawerTab[] = activeRow
    ? [
        { value: "general", label: "Genel", content: <GeneralTab row={activeRow} /> },
        { value: "sql", label: "SQL / Diff", content: <SqlTab row={activeRow} /> },
        { value: "activity", label: "Aktivite", content: <AuditTimeline events={activeRow.audit} /> },
        {
          value: "json",
          label: "JSON",
          content: (
            <pre className="mp-scroll max-h-[60vh] overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
              <code>{JSON.stringify(activeRow, null, 2)}</code>
            </pre>
          ),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Migrations"
        description="Şema migration'ları: durum, risk, SQL/diff önizleme, uygula / geri al ve denetim geçmişi."
        actions={[
          {
            label: "AI Risk Analizi",
            icon: Sparkles,
            variant: "default",
            onClick: () =>
              queuePrompt("Bekleyen migration'ların riskini değerlendir ve geri alınabilirliğini kontrol et."),
          },
        ]}
      />
      <PageBody className="space-y-4">
        {/* ── Bekleyen / yüksek riskli uyarı şeridi ── */}
        {counts.pending > 0 && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm",
              counts.highRiskPending > 0
                ? "border-red-400/30 bg-red-400/5 text-red-300"
                : "border-amber-400/30 bg-amber-400/5 text-amber-200",
            )}
          >
            <Warning className="size-4 shrink-0" weight="fill" />
            <span className="font-medium">
              {counts.pending} bekleyen migration
              {counts.highRiskPending > 0 && ` · ${counts.highRiskPending} yüksek riskli`}
            </span>
            <span className="text-muted-foreground">
              production'a uygulanmadan önce staging'de doğrulanmalı.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 gap-1.5 text-xs"
              onClick={() => setStatus("pending")}
            >
              Bekleyenleri göster
            </Button>
          </div>
        )}

        {/* ── KPI şeridi ── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Uygulandı"
              value={counts.applied}
              delta={12}
              trend={MIGRATION_TREND.applied}
              icon={CheckCircle2}
              hint="14g"
            />
            <KpiCard
              label="Bekleyen"
              value={counts.pending}
              delta={counts.pending > 0 ? 33 : 0}
              invert
              trend={MIGRATION_TREND.pending}
              icon={Clock}
              hint="kuyruk"
            />
            <KpiCard
              label="Yüksek risk"
              value={counts.highRiskPending}
              delta={counts.highRiskPending > 0 ? 100 : -50}
              invert
              trend={MIGRATION_TREND.failed}
              icon={ShieldWarning}
              hint="bekleyen"
            />
            <KpiCard
              label="Ort. süre"
              value={fmtDuration(avgDuration)}
              delta={-8}
              invert
              trend={MIGRATION_TREND.duration}
              icon={Timer}
              hint="apply"
            />
          </div>
        )}

        {/* ── Filtre şeridi ── */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="id, ad, tablo, yazar veya versiyon ara…"
          onExport={exportData}
          columns={[
            { key: "env", label: "Ortam", visible: cols.env, toggle: () => setCols((c) => ({ ...c, env: !c.env })) },
            { key: "risk", label: "Risk", visible: cols.risk, toggle: () => setCols((c) => ({ ...c, risk: !c.risk })) },
            { key: "diff", label: "Diff özeti", visible: cols.diff, toggle: () => setCols((c) => ({ ...c, diff: !c.diff })) },
            { key: "author", label: "Yazar", visible: cols.author, toggle: () => setCols((c) => ({ ...c, author: !c.author })) },
          ]}
        >
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} count={migrations.length}>
            Tümü
          </FilterChip>
          <FilterChip active={status === "pending"} onClick={() => setStatus("pending")} count={counts.pending}>
            Bekleyen
          </FilterChip>
          <FilterChip active={status === "applied"} onClick={() => setStatus("applied")} count={counts.applied}>
            Uygulandı
          </FilterChip>
          <FilterChip active={status === "rolled_back"} onClick={() => setStatus("rolled_back")} count={counts.rolled_back}>
            Geri alındı
          </FilterChip>
          <FilterChip active={riskOnly} onClick={() => setRiskOnly((v) => !v)} count={counts.highRiskPending}>
            Yalnızca yüksek risk
          </FilterChip>
        </FilterBar>

        {/* ── Toplu işlem şeridi ── */}
        <BulkBar count={selected.size} onClear={clearSelection}>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setConfirm({ kind: "bulk-apply", ids: [...selected] })}
          >
            <Play className="size-3.5" /> Sırayla uygula
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              queuePrompt(`Şu migration'ları toplu uygulamadan önce çakışma ve sıralama riskini incele: ${[...selected].join(", ")}`);
              clearSelection();
            }}
          >
            <Sparkles className="size-3.5" /> AI ile incele
          </Button>
        </BulkBar>

        {/* ── İçerik ── */}
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          query || status !== "all" || riskOnly ? (
            <EmptyState
              variant="search"
              icon={GitMerge}
              title="Eşleşen migration yok"
              description="Arama veya filtreleri değiştirmeyi deneyin."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                    setRiskOnly(false);
                  }}
                >
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Database}
              title="Henüz migration yok"
              description="Şema değişikliklerin burada versiyonlanır ve denetlenir."
            />
          )
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            {/* başlık satırı */}
            <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Checkbox
                checked={allPendingSelected}
                onCheckedChange={toggleSelectAllPending}
                aria-label="Bekleyenleri seç"
                disabled={pendingIds.length === 0}
              />
              <span className="flex-1">migration</span>
              {cols.env && <span className="hidden w-16 sm:block">ortam</span>}
              {cols.risk && <span className="hidden w-20 md:block">risk</span>}
              {cols.diff && <span className="hidden w-24 lg:block">diff</span>}
              {cols.author && <span className="hidden w-36 md:block">yazar · zaman</span>}
              <span className="w-20 text-right">eylem</span>
            </div>

            {filtered.map((m) => {
              const isSelected = selected.has(m.id);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 border-b px-4 py-2.5 text-sm transition-colors last:border-0 hover:bg-accent/30",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(m.id)}
                    disabled={m.status !== "pending"}
                    aria-label={`${m.id} seç`}
                  />
                  <button
                    onClick={() => setOpenId(m.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <GitMerge className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="truncate font-mono text-xs font-medium">{m.id}</code>
                        <StatusBadge label={STATUS_LABEL[m.status]} tone={STATUS_TONE[m.status]} />
                        {!m.reversible && (
                          <span className="text-[10px] text-amber-400" title="geri alınamaz">⚠ irreversible</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{m.name}</p>
                    </div>
                  </button>

                  {cols.env && (
                    <span className="hidden w-16 sm:block">
                      <StatusBadge label={ENV_LABEL[m.env]} tone={ENV_TONE[m.env]} />
                    </span>
                  )}
                  {cols.risk && (
                    <span className="hidden w-20 md:block">
                      <StatusBadge label={RISK_LABEL[m.risk]} tone={RISK_TONE[m.risk]} />
                    </span>
                  )}
                  {cols.diff && (
                    <span className="hidden w-24 items-center gap-1.5 font-mono text-[11px] tabular-nums lg:flex">
                      <span className="text-emerald-400">+{m.added}</span>
                      <span className="text-amber-400">~{m.changed}</span>
                      <span className="text-red-400">-{m.dropped}</span>
                    </span>
                  )}
                  {cols.author && (
                    <span className="hidden w-36 truncate text-xs text-muted-foreground md:block">
                      {m.author} · {m.appliedAt ?? "—"}
                    </span>
                  )}

                  <div className="flex w-20 justify-end">
                    {m.status === "pending" && (
                      <Button
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setConfirm({ kind: "apply", row: m })}
                      >
                        <Play className="size-3.5" /> Uygula
                      </Button>
                    )}
                    {m.status === "applied" && m.reversible && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setConfirm({ kind: "rollback", row: m })}
                      >
                        <Undo2 className="size-3.5" /> Geri Al
                      </Button>
                    )}
                    {m.status === "rolled_back" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs text-muted-foreground"
                        onClick={() => setConfirm({ kind: "apply", row: m })}
                      >
                        <ArrowsClockwise className="size-3.5" /> Tekrar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>

      {/* ── Detay çekmecesi ── */}
      <DetailDrawer
        open={openId !== null}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={activeRow ? <code className="font-mono">{activeRow.id}</code> : ""}
        subtitle={activeRow?.name}
        badge={
          activeRow && (
            <div className="flex items-center gap-1.5">
              <StatusBadge label={STATUS_LABEL[activeRow.status]} tone={STATUS_TONE[activeRow.status]} />
              <StatusBadge label={RISK_LABEL[activeRow.risk]} tone={RISK_TONE[activeRow.risk]} />
            </div>
          )
        }
        tabs={drawerTabs}
        footer={
          activeRow && (
            <div className="flex w-full items-center gap-2 p-3">
              {activeRow.status === "pending" && (
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    setConfirm({ kind: "apply", row: activeRow });
                  }}
                >
                  <Play className="size-4" /> Uygula
                </Button>
              )}
              {activeRow.status === "applied" && activeRow.reversible && (
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => setConfirm({ kind: "rollback", row: activeRow })}
                >
                  <Undo2 className="size-4" /> Geri Al
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  queuePrompt(`${activeRow.id} migration'ının geri alınabilirliğini ve production etkisini değerlendir.`);
                  setOpenId(null);
                }}
              >
                <Sparkles className="size-4" /> AI
              </Button>
            </div>
          )
        }
      />

      {/* ── Onay diyaloğu ── */}
      <Dialog open={confirm !== null} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle(confirm)}</DialogTitle>
            <DialogDescription>{confirmDescription(confirm)}</DialogDescription>
          </DialogHeader>
          {confirm?.kind === "rollback" && !confirm.row.downSql && (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-300">
              <ShieldWarning className="mt-0.5 size-4 shrink-0" weight="fill" />
              Bu migration geri alınamaz (down SQL tanımlı değil). Yalnızca durumu işaretlenir; veri kaybı manuel onarım gerektirir.
            </div>
          )}
          {confirm?.kind === "apply" && confirm.row.risk === "high" && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
              <Warning className="mt-0.5 size-4 shrink-0" weight="fill" />
              Yüksek riskli: {confirm.row.affectedTables.join(", ")} · ~{fmtRows(confirm.row.estRows)} satır etkilenebilir.
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Vazgeç</Button>} />
            <Button
              variant={confirm?.kind === "rollback" ? "outline" : "default"}
              onClick={runConfirm}
              className={cn(confirm?.kind === "rollback" && "border-red-400/40 text-red-300 hover:bg-red-400/10")}
            >
              {confirm?.kind === "rollback" ? "Geri al" : confirm?.kind === "bulk-apply" ? "Tümünü uygula" : "Uygula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function confirmTitle(c: Confirm): string {
  if (!c) return "";
  if (c.kind === "apply") return `${c.row.id} uygulansın mı?`;
  if (c.kind === "rollback") return `${c.row.id} geri alınsın mı?`;
  return `${c.ids.length} migration uygulansın mı?`;
}
function confirmDescription(c: Confirm): string {
  if (!c) return "";
  if (c.kind === "apply") return `${c.row.affectedTables.length} tablo etkilenecek. Bu işlem production şemasını değiştirir.`;
  if (c.kind === "rollback") return "Bu işlem şemayı önceki duruma döndürmeyi dener.";
  return "Migration'lar bağımlılık sırasına göre tek tek uygulanır; biri başarısız olursa kalanlar durur.";
}

/* ── Drawer sekme içerikleri ───────────────────────────────────────── */

function GeneralTab({ row }: { row: MigrationRow }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Eklenen" value={`+${row.added}`} tone="text-emerald-400" icon={Stack} />
        <MiniStat label="Değişen" value={`~${row.changed}`} tone="text-amber-400" icon={ArrowsClockwise} />
        <MiniStat label="Silinen" value={`-${row.dropped}`} tone="text-red-400" icon={Database} />
      </div>

      <div className="divide-y rounded-lg border px-3">
        <Field label="Versiyon" mono>{row.version}</Field>
        <Field label="Ortam">
          <StatusBadge label={ENV_LABEL[row.env]} tone={ENV_TONE[row.env]} />
        </Field>
        <Field label="Risk">
          <StatusBadge label={RISK_LABEL[row.risk]} tone={RISK_TONE[row.risk]} />
        </Field>
        <Field label="Geri alınabilir">{row.reversible ? "evet" : "hayır (irreversible)"}</Field>
        <Field label="Süre" mono>{fmtDuration(row.durationMs)}</Field>
        <Field label="Tahmini satır" mono>{fmtRows(row.estRows)}</Field>
        <Field label="Yazar">{row.author}</Field>
        <Field label="Uygulanma">{row.appliedAt ?? "—"}</Field>
        <Field label="Checksum" mono>{row.checksum}</Field>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Etkilenen tablolar
        </p>
        <div className="flex flex-wrap gap-1.5">
          {row.affectedTables.map((t) => (
            <Badge key={t} variant="outline" className="gap-1 font-mono text-[10px]">
              <Database className="size-3" />
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {row.dependsOn.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <TreeStructure className="size-3" /> Bağımlılıklar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {row.dependsOn.map((d) => (
              <Badge key={d} variant="secondary" className="gap-1 font-mono text-[10px]">
                <GitBranch className="size-3" />
                {d}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SqlTab({ row }: { row: MigrationRow }) {
  function copy(label: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    toast.success(`${label} panoya kopyalandı`);
  }
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
            <Stack className="size-3" /> up — uygula
          </p>
          <Button size="sm" variant="ghost" className="h-6 gap-1 text-[11px]" onClick={() => copy("up SQL", row.sql)}>
            <Copy className="size-3" /> kopyala
          </Button>
        </div>
        <pre className="mp-scroll max-h-72 overflow-auto rounded-lg border border-emerald-400/15 bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
          <code>{row.sql}</code>
        </pre>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-red-400">
            <Undo2 className="size-3" /> down — geri al
          </p>
          {row.downSql && (
            <Button size="sm" variant="ghost" className="h-6 gap-1 text-[11px]" onClick={() => copy("down SQL", row.downSql!)}>
              <Copy className="size-3" /> kopyala
            </Button>
          )}
        </div>
        {row.downSql ? (
          <pre className="mp-scroll max-h-56 overflow-auto rounded-lg border border-red-400/15 bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
            <code>{row.downSql}</code>
          </pre>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
            <ShieldWarning className="size-4 shrink-0" />
            Down SQL tanımlı değil — bu migration geri alınamaz.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: typeof Database;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
      <Icon className={cn("mx-auto mb-1 size-3.5", tone)} />
      <p className={cn("font-mono text-lg font-semibold tabular-nums", tone)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
