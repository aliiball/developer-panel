import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Sparkle as Sparkles,
  WarningOctagon as OctagonAlert,
  Users,
  GitBranch,
  Bug,
  CheckCircle,
  EyeSlash,
  ArrowCounterClockwise,
  Stack,
  Pulse,
  ChartLineUp,
  Lightning,
  Clock,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
} from "recharts";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { type ErrorGroup, type EnvName } from "~/data/delivery";
import { ALL_ERRORS, ERROR_META } from "~/data/seed.errors";
import { StatusBadge } from "~/components/delivery/badges";
import { useIssueStore } from "~/stores/issue-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
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

export function meta() {
  return [{ title: "Error Tracking — MetaPanel" }];
}

type ErrStatus = ErrorGroup["status"];

const STATUS_TONE = { unresolved: "red", resolved: "emerald", ignored: "muted" } as const;
const STATUS_LABEL: Record<ErrStatus, string> = {
  unresolved: "açık",
  resolved: "çözüldü",
  ignored: "yok sayıldı",
};
const ENV_TONE: Record<EnvName, string> = {
  dev: "text-sky-400",
  staging: "text-amber-400",
  prod: "text-emerald-400",
};
const ENVS: EnvName[] = ["prod", "staging", "dev"];

function fmt(n: number) {
  return n.toLocaleString("tr");
}

export default function Errors() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ErrorGroup[]>(ALL_ERRORS);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ErrStatus | "all">("all");
  const [envFilter, setEnvFilter] = useState<EnvName | "all">("all");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const submitReport = useIssueStore((s) => s.submitReport);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // ── Derived ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return errors.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (envFilter !== "all" && e.env !== envFilter) return false;
      if (q && !(`${e.title} ${e.culprit} ${e.linkedIssue ?? ""}`.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [errors, search, statusFilter, envFilter]);

  const stats = useMemo(() => {
    const unresolved = errors.filter((e) => e.status === "unresolved");
    const totalEvents = errors.reduce((a, e) => a + e.count, 0);
    const affectedUsers = unresolved.reduce((a, e) => a + e.users, 0);
    const prodOpen = unresolved.filter((e) => e.env === "prod").length;
    // saat-bazlı toplam (tüm gruplar) → KPI sparkline
    const hourly = Array.from({ length: 24 }, (_, i) =>
      errors.reduce((a, e) => a + (ERROR_META[e.id]?.occurrences24h?.[i] ?? 0), 0),
    );
    // "oran": son saat / önceki saat occurrence — hız göstergesi
    const last = hourly[23] || 0;
    const prev = hourly[22] || 1;
    const ratePct = Math.round(((last - prev) / Math.max(prev, 1)) * 100);
    return { unresolvedCount: unresolved.length, totalEvents, affectedUsers, prodOpen, hourly, ratePct };
  }, [errors]);

  const selCount = Object.values(sel).filter(Boolean).length;
  const selIds = Object.keys(sel).filter((k) => sel[k]);
  const active = drawerId ? errors.find((e) => e.id === drawerId) ?? null : null;

  // ── Actions ────────────────────────────────────────────────────
  function setStatus(ids: string[], status: ErrStatus, verb: string) {
    setErrors((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, status } : e)));
    toast.success(verb, {
      description: ids.length === 1 ? undefined : `${ids.length} grup güncellendi`,
      action: {
        label: "Geri al",
        onClick: () =>
          setErrors((prev2) =>
            prev2.map((e) =>
              ids.includes(e.id)
                ? { ...e, status: ALL_ERRORS.find((o) => o.id === e.id)!.status }
                : e,
            ),
          ),
      },
    });
  }

  function createIssue(e: ErrorGroup) {
    if (e.linkedIssue) {
      navigate(`/issues/${e.linkedIssue}`);
      return;
    }
    const id = submitReport({
      title: e.title,
      description: `${e.culprit} — ${e.count} kez, ${e.users} kullanıcı etkilendi (${e.env}).`,
      severity: e.users > 100 ? "critical" : "high",
      source: "manual",
      reporter: "error-tracker",
      aiSuggested: { severity: e.users > 100 ? "critical" : "high" },
    });
    setErrors((prev) => prev.map((x) => (x.id === e.id ? { ...x, linkedIssue: id } : x)));
    toast.success("Issue oluşturuldu", { description: `${id} ← ${e.title}` });
  }

  function exportJson() {
    toast.success("Export hazır", {
      description: `${filtered.length} exception grubu JSON olarak indirildi`,
    });
  }

  function reload() {
    setLoading(true);
    setErrors([]);
    setTimeout(() => {
      setErrors(ALL_ERRORS);
      setLoading(false);
      toast.success("Exception grupları yenilendi");
    }, 650);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setEnvFilter("all");
  }

  const hasFilters = search !== "" || statusFilter !== "all" || envFilter !== "all";

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Error Tracking"
        description="Gruplanmış exception'lar — occurrence oranı, etkilenen kullanıcı, stack trace ve audit."
        actions={[
          {
            label: "Yenile",
            icon: ArrowCounterClockwise,
            variant: "outline",
            onClick: reload,
          },
          {
            label: "AI: Kök Neden",
            icon: Sparkles,
            variant: "default",
            onClick: () => {
              const t = active ?? stats.unresolvedCount > 0 ? (active ?? errors[0]) : errors[0];
              if (!t) return toast.error("Analiz edilecek grup yok");
              queuePrompt(`Bu hatayı analiz et ve kök neden öner: ${t.title} (${t.culprit}).`);
              toast.success("AI Copilot'a gönderildi", { description: t.title });
            },
          },
        ]}
      />

      <PageBody className="space-y-4">
        {/* KPI şeridi */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Olay oranı (son saat)"
              value={stats.ratePct > 0 ? `+${stats.ratePct}%` : `${stats.ratePct}%`}
              delta={stats.ratePct}
              trend={stats.hourly}
              icon={Pulse}
              hint="saat-üstü"
              invert
            />
            <KpiCard
              label="Etkilenen kullanıcı"
              value={fmt(stats.affectedUsers)}
              delta={12}
              trend={stats.hourly.map((v) => v * 1.4)}
              icon={Users}
              hint="açık gruplar"
              invert
            />
            <KpiCard
              label="Açık exception"
              value={stats.unresolvedCount}
              delta={-8}
              trend={[14, 13, 15, 16, 14, 13, stats.unresolvedCount]}
              icon={OctagonAlert}
              invert
            />
            <KpiCard
              label="Toplam olay (24s)"
              value={fmt(stats.totalEvents)}
              delta={stats.prodOpen > 2 ? 23 : 5}
              trend={stats.hourly}
              icon={Lightning}
              hint={`${stats.prodOpen} prod açık`}
              invert
            />
          </div>
        )}

        {/* Filtre şeridi */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Başlık, culprit veya issue ara…"
          onExport={exportJson}
        >
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            Tümü
          </FilterChip>
          {(["unresolved", "resolved", "ignored"] as ErrStatus[]).map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              count={errors.filter((e) => e.status === s).length}
            >
              {STATUS_LABEL[s]}
            </FilterChip>
          ))}
          <span className="mx-0.5 h-4 w-px bg-border" />
          {ENVS.map((env) => (
            <FilterChip
              key={env}
              active={envFilter === env}
              onClick={() => setEnvFilter(envFilter === env ? "all" : env)}
              count={errors.filter((e) => e.env === env).length}
            >
              {env}
            </FilterChip>
          ))}
        </FilterBar>

        {/* Toplu işlem */}
        <BulkBar count={selCount} onClear={() => setSel({})}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5"
            onClick={() => {
              setStatus(selIds, "resolved", "Çözüldü olarak işaretlendi");
              setSel({});
            }}
          >
            <CheckCircle className="size-3.5" /> Çözüldü
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5"
            onClick={() => {
              setStatus(selIds, "ignored", "Yok sayıldı");
              setSel({});
            }}
          >
            <EyeSlash className="size-3.5" /> Yok say
          </Button>
        </BulkBar>

        {/* İçerik */}
        {loading ? (
          <TableSkeleton rows={7} cols={5} />
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              variant="search"
              icon={OctagonAlert}
              title="Eşleşen exception yok"
              description="Arama ve filtreleri gevşetmeyi dene."
              action={
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="Hata yok — temiz!"
              description="Şu an gruplanmış aktif exception bulunmuyor."
            />
          )
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            {/* header */}
            <div className="flex items-center gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <input
                type="checkbox"
                aria-label="Tümünü seç"
                className="size-3.5 accent-primary"
                checked={selCount > 0 && selCount === filtered.length}
                ref={(el) => {
                  if (el) el.indeterminate = selCount > 0 && selCount < filtered.length;
                }}
                onChange={(e) =>
                  setSel(
                    e.target.checked
                      ? Object.fromEntries(filtered.map((x) => [x.id, true]))
                      : {},
                  )
                }
              />
              <span className="flex-1">Exception</span>
              <span className="hidden w-24 text-right sm:block">Olay</span>
              <span className="hidden w-16 text-right md:block">Kullanıcı</span>
              <span className="hidden w-24 lg:block">Trend</span>
              <span className="w-16 text-right">Son</span>
            </div>

            {filtered.map((e) => {
              const meta = ERROR_META[e.id];
              const checked = !!sel[e.id];
              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center gap-3 border-b px-3 py-2.5 text-sm transition-colors last:border-0 hover:bg-accent/40",
                    checked && "bg-accent/30",
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label={`${e.title} seç`}
                    className="size-3.5 shrink-0 accent-primary"
                    checked={checked}
                    onChange={(ev) => setSel((p) => ({ ...p, [e.id]: ev.target.checked }))}
                  />
                  <button
                    onClick={() => setDrawerId(e.id)}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <OctagonAlert
                        className={cn(
                          "size-4 shrink-0",
                          e.status === "unresolved" ? "text-red-400" : "text-muted-foreground",
                        )}
                      />
                      <span className="truncate font-medium">{e.title}</span>
                      <StatusBadge label={STATUS_LABEL[e.status]} tone={STATUS_TONE[e.status]} />
                      {e.linkedIssue && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 text-[10px] font-medium text-amber-400">
                          <Bug className="size-2.5" />
                          {e.linkedIssue}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 truncate font-mono text-[11px] text-muted-foreground">
                      {e.culprit}
                      <span className={cn("not-italic", ENV_TONE[e.env])}>· {e.env}</span>
                    </span>
                  </button>
                  <span className="hidden w-24 text-right tabular-nums sm:block">{fmt(e.count)}</span>
                  <span className="hidden w-16 items-center justify-end gap-1 text-right tabular-nums text-muted-foreground md:flex">
                    <Users className="size-3" />
                    {e.users}
                  </span>
                  <span className="hidden h-8 w-24 lg:block">
                    {meta && <Spark data={meta.occurrences24h} status={e.status} />}
                  </span>
                  <span className="w-16 truncate text-right text-[11px] text-muted-foreground">
                    {e.lastSeen}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="px-1 text-[11px] text-muted-foreground">
            {filtered.length} / {errors.length} exception grubu · {fmt(stats.affectedUsers)} kullanıcı etkilendi
          </p>
        )}
      </PageBody>

      <ErrorDrawer
        error={active}
        onClose={() => setDrawerId(null)}
        onCreateIssue={createIssue}
        onResolve={(id) => setStatus([id], "resolved", "Çözüldü olarak işaretlendi")}
        onIgnore={(id) => setStatus([id], "ignored", "Yok sayıldı")}
        onAi={(e) => {
          queuePrompt(`Bu hatayı analiz et ve kök neden öner: ${e.title} (${e.culprit}).`);
          toast.success("AI Copilot'a gönderildi", { description: e.title });
        }}
      />
    </>
  );
}

// ── Sparkline (satır içi mini occurrence trendi) ──────────────────
function Spark({ data, status }: { data: number[]; status: ErrStatus }) {
  const stroke =
    status === "resolved" ? "#34d399" : status === "ignored" ? "#94a3b8" : "#f87171";
  const d = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={d} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`rs-${stroke}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.4}
          fill={`url(#rs-${stroke})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── DetailDrawer ──────────────────────────────────────────────────
function ErrorDrawer({
  error,
  onClose,
  onCreateIssue,
  onResolve,
  onIgnore,
  onAi,
}: {
  error: ErrorGroup | null;
  onClose: () => void;
  onCreateIssue: (e: ErrorGroup) => void;
  onResolve: (id: string) => void;
  onIgnore: (id: string) => void;
  onAi: (e: ErrorGroup) => void;
}) {
  const e = error;
  const meta = e ? ERROR_META[e.id] : undefined;

  const tabs: DrawerTab[] = e
    ? [
        {
          value: "general",
          label: "Genel",
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Olay" value={fmt(e.count)} />
                <Metric label="Kullanıcı" value={String(e.users)} />
                <Metric label="Ortam" value={e.env} tone={ENV_TONE[e.env]} />
              </div>

              {/* occurrence trend (24s) */}
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
                  <ChartLineUp className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Son 24 saat occurrence</span>
                </div>
                <div className="h-28 w-full p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={(meta?.occurrences24h ?? []).map((v, i) => ({
                        h: `${String(i).padStart(2, "0")}:00`,
                        v,
                      }))}
                      margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="drawer-spark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="h" hide />
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        formatter={(v) => [`${v} olay`, ""] as [string, string]}
                      />
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="#f87171"
                        strokeWidth={1.6}
                        fill="url(#drawer-spark)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-0.5 rounded-xl border bg-card px-3 py-1">
                <Field label="Culprit" mono>{e.culprit}</Field>
                <Field label="Runtime" mono>{meta?.runtime ?? "—"}</Field>
                <Field label="İlk görülen release" mono>{meta?.release ?? "—"}</Field>
                <Field label="İlk görüldü">{e.firstSeen}</Field>
                <Field label="Son görüldü">{e.lastSeen}</Field>
                <Field label="Bağlı issue">
                  {e.linkedIssue ? (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Bug className="size-3" />
                      {e.linkedIssue}
                    </span>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>

              {meta?.impact && (
                <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                  {meta.impact}
                </p>
              )}

              {/* son occurrence örnekleri */}
              {meta?.samples && meta.samples.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Son occurrence örnekleri
                  </p>
                  <div className="space-y-1.5">
                    {meta.samples.map((s, i) => (
                      <div key={i} className="rounded-lg border bg-muted/20 px-2.5 py-1.5">
                        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="size-2.5" />
                          {s.at}
                        </p>
                        <p className="mt-0.5 break-all font-mono text-[11px] text-foreground/90">
                          {s.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        },
        {
          value: "stack",
          label: "Stack",
          content: (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
                <Stack className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Stack Trace</span>
              </div>
              <pre className="mp-scroll max-h-[60vh] overflow-auto p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                <code>{e.trace}</code>
              </pre>
            </div>
          ),
        },
        {
          value: "activity",
          label: "Aktivite",
          content: <AuditTimeline events={(meta?.audit as AuditEvent[]) ?? []} />,
        },
        {
          value: "json",
          label: "JSON",
          content: (
            <pre className="mp-scroll max-h-[60vh] overflow-auto rounded-xl border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <code>{JSON.stringify({ ...e, occurrences24h: meta?.occurrences24h }, null, 2)}</code>
            </pre>
          ),
        },
      ]
    : [];

  return (
    <DetailDrawer
      open={!!e}
      onOpenChange={(v) => !v && onClose()}
      title={e?.title ?? ""}
      subtitle={e ? `${e.culprit} · ${e.env}` : undefined}
      badge={
        e ? <StatusBadge label={STATUS_LABEL[e.status]} tone={STATUS_TONE[e.status]} /> : undefined
      }
      tabs={tabs}
      footer={
        e ? (
          <div className="flex w-full flex-wrap gap-2 p-4">
            <Button
              className="flex-1 gap-1.5"
              variant={e.linkedIssue ? "outline" : "default"}
              onClick={() => onCreateIssue(e)}
            >
              <Bug className="size-4" />
              {e.linkedIssue ? `Issue: ${e.linkedIssue}` : "Issue Oluştur"}
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => onAi(e)}>
              <Sparkles className="size-4" /> AI
            </Button>
            {e.status !== "resolved" && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => onResolve(e.id)}
              >
                <CheckCircle className="size-4" /> Çöz
              </Button>
            )}
            {e.status !== "ignored" && (
              <Button variant="ghost" className="gap-1.5" onClick={() => onIgnore(e.id)}>
                <EyeSlash className="size-4" /> Yok say
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <div className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
