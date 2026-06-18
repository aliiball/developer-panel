import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  Pulse,
  WarningCircle,
  XCircle,
  Bug,
  Info,
  ArrowsClockwise,
  Copy,
  Stack,
  ClockCounterClockwise,
  GlobeHemisphereWest,
  ListChecks,
  ShareNetwork,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
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
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  LOG_ENTRIES,
  LOG_SOURCES,
  LEVEL_META,
  type LogEntry,
  type LogLevel,
} from "~/data/seed.logs";

export function meta() {
  return [{ title: "Logs — MetaPanel" }];
}

const LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];
const WINDOWS: { key: string; label: string }[] = [
  { key: "15m", label: "Son 15 dk" },
  { key: "1h", label: "Son 1 sa" },
  { key: "24h", label: "Son 24 sa" },
];

function levelIcon(level: LogLevel) {
  return level === "error" ? XCircle : level === "warn" ? WarningCircle : level === "debug" ? Bug : Info;
}

export default function Logs() {
  // ── durum
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set());
  const [source, setSource] = useState<string | "all">("all");
  const [win, setWin] = useState("1h");
  const [live, setLive] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<LogEntry | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  // canlı akış simülasyonu için zaman damgası ofseti (yeniden render tetikler)
  const [tick, setTick] = useState(0);
  const streamRef = useRef<HTMLDivElement>(null);

  // ilk yük (skeleton → veri)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 480);
    return () => clearTimeout(t);
  }, []);

  // canlı akış: periyodik "yeni satır geldi" hissi (mock; gerçek kayıt eklemez,
  // sadece akış göstergesini canlı tutar + en üste kaydırır)
  useEffect(() => {
    if (!live || loading) return;
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      streamRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(iv);
  }, [live, loading]);

  // ── türetilmiş veri
  const counts = useMemo(() => {
    const c: Record<LogLevel, number> = { error: 0, warn: 0, info: 0, debug: 0 };
    for (const l of LOG_ENTRIES) c[l.level]++;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return LOG_ENTRIES.filter((l) => {
      if (levels.size > 0 && !levels.has(l.level)) return false;
      if (source !== "all" && l.source !== source) return false;
      if (needle) {
        const hay = `${l.message} ${l.source} ${l.traceId} ${l.actor ?? ""} ${l.path ?? ""} ${l.statusCode ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [q, levels, source]);

  const errorRate = useMemo(() => {
    const total = LOG_ENTRIES.length || 1;
    return Math.round((counts.error / total) * 1000) / 10;
  }, [counts]);

  // seviye dağılımı sparkline'ları (mock zaman serisi — insight hissi)
  const spark = {
    volume: [38, 42, 36, 51, 47, 44, 58, 62],
    error: [1, 0, 2, 1, 3, 2, 4, 3],
    warn: [4, 3, 5, 4, 6, 5, 4, 6],
    latency: [42, 58, 51, 88, 64, 318, 128, 58],
  };

  // ── seçim
  const toggleLevel = (lv: LogLevel) =>
    setLevels((prev) => {
      const n = new Set(prev);
      n.has(lv) ? n.delete(lv) : n.add(lv);
      return n;
    });
  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const togglePin = (id: string) =>
    setPinned((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── eylemler
  const exportRows = (rows: LogEntry[], fmt: "json" | "csv") => {
    if (rows.length === 0) return toast.error("Dışa aktarılacak log yok.");
    toast.success(`${rows.length} log ${fmt.toUpperCase()} olarak panoya hazırlandı`, {
      description: `${win} penceresi · ${levels.size || "tüm"} seviye filtresi`,
    });
  };
  const copyTrace = (id: string) => {
    toast.success("Trace ID kopyalandı", { description: id });
  };
  const resetFilters = () => {
    setQ("");
    setLevels(new Set());
    setSource("all");
  };

  const hasFilter = q.trim() !== "" || levels.size > 0 || source !== "all";

  // ── drawer sekmeleri
  const drawerTabs: DrawerTab[] | undefined = active
    ? buildTabs(active, () => copyTrace(active.traceId))
    : undefined;

  return (
    <>
      <PageHeader
        title="Logs"
        description="Sistem ve denetim log akışı — canlı tail, seviye/kaynak/zaman filtresi, satır detayı ve export."
        actions={[
          {
            label: live ? "Canlı" : "Duraklatıldı",
            icon: live ? Pause : Play,
            variant: live ? "default" : "outline",
            onClick: () => {
              setLive((v) => !v);
              toast.message(live ? "Akış duraklatıldı" : "Canlı akış sürdürülüyor");
            },
          },
          {
            label: "Yenile",
            icon: ArrowsClockwise,
            variant: "outline",
            onClick: () => {
              setLoading(true);
              setTimeout(() => setLoading(false), 420);
            },
          },
        ]}
      />

      <PageBody grid={false} className="space-y-3">
        {/* ── KPI şeridi */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Toplam hacim"
              value={LOG_ENTRIES.length}
              delta={12}
              trend={spark.volume}
              icon={Pulse}
              hint={WINDOWS.find((w) => w.key === win)?.label}
              onClick={() => setLevels(new Set())}
            />
            <KpiCard
              label="Hata oranı"
              value={`${errorRate}%`}
              delta={8}
              invert
              trend={spark.error}
              icon={XCircle}
              hint={`${counts.error} error`}
              onClick={() => setLevels(new Set<LogLevel>(["error"]))}
            />
            <KpiCard
              label="Uyarılar"
              value={counts.warn}
              delta={-15}
              invert
              trend={spark.warn}
              icon={WarningCircle}
              onClick={() => setLevels(new Set<LogLevel>(["warn"]))}
            />
            <KpiCard
              label="p95 yanıt"
              value="318ms"
              delta={22}
              invert
              trend={spark.latency}
              icon={ClockCounterClockwise}
              hint="db yavaş sorgu"
            />
          </div>
        )}

        {/* ── filtre şeridi */}
        <FilterBar
          search={q}
          onSearch={setQ}
          placeholder="Mesaj, kaynak, trace, path veya status ara…"
          onExport={() => exportRows(filtered, "json")}
        >
          {LEVELS.map((lv) => (
            <FilterChip
              key={lv}
              active={levels.has(lv)}
              count={counts[lv]}
              onClick={() => toggleLevel(lv)}
            >
              {LEVEL_META[lv].label}
            </FilterChip>
          ))}

          {/* kaynak seçimi — basit native select (ui/select ağırlığına gerek yok) */}
          <div className="relative">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-7 rounded-full border border-border bg-card pl-2.5 pr-7 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus:border-primary/50"
              aria-label="Kaynak filtresi"
            >
              <option value="all">Tüm kaynaklar</option>
              {LOG_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* zaman penceresi */}
          {WINDOWS.map((w) => (
            <FilterChip key={w.key} active={win === w.key} onClick={() => setWin(w.key)}>
              {w.label}
            </FilterChip>
          ))}
        </FilterBar>

        {/* ── toplu işlem şeridi */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              exportRows(
                LOG_ENTRIES.filter((l) => selected.has(l.id)),
                "json",
              );
            }}
          >
            <ShareNetwork className="size-3.5" /> Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              selected.forEach((id) => togglePin(id));
              toast.success(`${selected.size} satır sabitlendi`);
            }}
          >
            <ListChecks className="size-3.5" /> Sabitle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const first = LOG_ENTRIES.find((l) => selected.has(l.id));
              if (first) copyTrace(first.traceId);
            }}
          >
            <Copy className="size-3.5" /> Trace kopyala
          </Button>
        </BulkBar>

        {/* ── akış */}
        {loading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant={hasFilter ? "search" : "default"}
            icon={hasFilter ? Pulse : Stack}
            title={hasFilter ? "Eşleşen log yok" : "Henüz log yok"}
            description={
              hasFilter
                ? "Arama veya seviye/kaynak filtreleri bu pencerede sonuç döndürmedi."
                : "Seçili zaman penceresinde kayıt bulunamadı."
            }
            action={
              hasFilter ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Filtreleri temizle
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div
            ref={streamRef}
            className="mp-scroll max-h-[calc(100vh-22rem)] overflow-y-auto rounded-xl border bg-[#0b0b0e] p-1.5 font-mono text-xs"
          >
            <div className="flex items-center justify-between px-2 py-1 text-[10px]">
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  live ? "text-emerald-400" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    live ? "animate-pulse bg-emerald-400" : "bg-muted-foreground",
                  )}
                />
                {live ? "canlı akış · tail -f" : "akış duraklatıldı"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {filtered.length} satır {live && tick > 0 ? `· ${tick} güncelleme` : ""}
              </span>
            </div>

            {filtered.map((l) => {
              const meta = LEVEL_META[l.level];
              const isSel = selected.has(l.id);
              const isPin = pinned.has(l.id);
              return (
                <div
                  key={l.id}
                  className={cn(
                    "group flex items-start gap-2 rounded px-2 py-1 transition-colors hover:bg-white/5",
                    isSel && "bg-primary/10",
                    isPin && "ring-1 ring-inset ring-amber-500/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSel(l.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 size-3 shrink-0 accent-primary opacity-0 transition-opacity group-hover:opacity-100 [&:checked]:opacity-100"
                    aria-label={`Satır seç: ${l.id}`}
                  />
                  <button
                    onClick={() => setActive(l)}
                    className="flex flex-1 items-start gap-2 text-left"
                  >
                    <span className="shrink-0 text-muted-foreground">{l.time}</span>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded px-1.5 text-[10px] uppercase",
                        meta.chip,
                      )}
                    >
                      <span className={cn("size-1 rounded-full", meta.dot)} />
                      {l.level}
                    </span>
                    <span className="shrink-0 text-primary/70">[{l.source}]</span>
                    <span className="truncate text-foreground/90">{l.message}</span>
                    {l.statusCode != null && (
                      <span
                        className={cn(
                          "ml-auto shrink-0 tabular-nums",
                          l.statusCode >= 500
                            ? "text-red-400"
                            : l.statusCode >= 400
                              ? "text-amber-400"
                              : "text-emerald-400",
                        )}
                      >
                        {l.statusCode}
                      </span>
                    )}
                    {l.durationMs != null && (
                      <span className="shrink-0 tabular-nums text-muted-foreground/70">
                        {l.durationMs}ms
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>

      {/* ── satır detay drawer */}
      <DetailDrawer
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        title={active ? active.message : ""}
        subtitle={active ? `${active.source} · ${active.time} · ${active.env}` : undefined}
        badge={
          active ? (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase",
                LEVEL_META[active.level].badge,
              )}
            >
              {active.level}
            </span>
          ) : undefined
        }
        tabs={drawerTabs}
        footer={
          active ? (
            <div className="flex w-full items-center gap-2 p-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => copyTrace(active.traceId)}
              >
                <Copy className="size-3.5" /> Trace
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  togglePin(active.id);
                  toast.success(
                    pinned.has(active.id) ? "Sabitleme kaldırıldı" : "Satır sabitlendi",
                  );
                }}
              >
                <ListChecks className="size-3.5" />
                {pinned.has(active.id) ? "Sabiti kaldır" : "Sabitle"}
              </Button>
              <Button
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() => exportRows([active], "json")}
              >
                <ShareNetwork className="size-3.5" /> Export
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}

/* ── drawer sekme içeriği ──────────────────────────────────────────── */
function buildTabs(l: LogEntry, onCopyTrace: () => void): DrawerTab[] {
  const LevelIcon = levelIcon(l.level);

  const events: AuditEvent[] = [
    {
      id: "e1",
      action: `olay '${l.level}' seviyesinde kaydedildi`,
      actor: l.source,
      at: `${l.time} · az önce`,
      icon: LevelIcon,
      tone: l.level === "error" ? "red" : l.level === "warn" ? "amber" : "primary",
      detail: l.message,
    },
    {
      id: "e2",
      action: `${l.host} (${l.region}) üzerinde işlendi`,
      actor: "runtime",
      at: l.time,
      icon: GlobeHemisphereWest,
      tone: "default",
      detail: l.traceId,
    },
  ];
  if (l.actor) {
    events.unshift({
      id: "e0",
      action: "isteği başlattı",
      actor: l.actor,
      at: l.time,
      icon: Pulse,
      tone: "primary",
      detail: l.ip ? `ip=${l.ip}` : undefined,
    });
  }
  if (l.level === "error") {
    events.push({
      id: "e3",
      action: "uyarı kuralı tetiklendi → on-call bildirildi",
      actor: "alertmanager",
      at: l.time,
      icon: WarningCircle,
      tone: "red",
      detail: "PagerDuty · sev2",
    });
  }

  const rawJson = JSON.stringify(
    {
      id: l.id,
      level: l.level,
      time: l.time,
      source: l.source,
      message: l.message,
      env: l.env,
      region: l.region,
      host: l.host,
      traceId: l.traceId,
      spanId: l.spanId,
      method: l.method,
      path: l.path,
      statusCode: l.statusCode,
      durationMs: l.durationMs,
      actor: l.actor,
      ip: l.ip,
      meta: l.meta,
    },
    null,
    2,
  );

  return [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card/40 p-3">
            <Field label="Seviye">
              <span className="inline-flex items-center gap-1.5">
                <LevelIcon className="size-3.5" />
                {LEVEL_META[l.level].label}
              </span>
            </Field>
            <Field label="Kaynak" mono>
              {l.source}
            </Field>
            <Field label="Zaman" mono>
              {l.time}
            </Field>
            <Field label="Ortam">
              {l.env} · {l.region}
            </Field>
            <Field label="Host" mono>
              {l.host}
            </Field>
          </div>

          {(l.method || l.statusCode != null || l.durationMs != null) && (
            <div className="rounded-lg border bg-card/40 p-3">
              {l.method && (
                <Field label="İstek" mono>
                  {l.method} {l.path}
                </Field>
              )}
              {l.statusCode != null && (
                <Field label="Status" mono>
                  {l.statusCode}
                </Field>
              )}
              {l.durationMs != null && (
                <Field label="Süre" mono>
                  {l.durationMs}ms
                </Field>
              )}
            </div>
          )}

          <div className="rounded-lg border bg-card/40 p-3">
            <Field label="Trace ID" mono>
              <button onClick={onCopyTrace} className="inline-flex items-center gap-1 hover:text-primary">
                {l.traceId} <Copy className="size-3" />
              </button>
            </Field>
            {l.spanId && (
              <Field label="Span ID" mono>
                {l.spanId}
              </Field>
            )}
            {l.actor && <Field label="Aktör" mono>{l.actor}</Field>}
            {l.ip && <Field label="IP" mono>{l.ip}</Field>}
          </div>

          {l.stack && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Stack izi</p>
              <pre className="mp-scroll max-h-48 overflow-auto rounded-lg border bg-[#0b0b0e] p-3 font-mono text-[11px] leading-relaxed text-red-300/90">
                {l.stack}
              </pre>
            </div>
          )}
        </div>
      ),
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={events} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="mp-scroll overflow-auto rounded-lg border bg-[#0b0b0e] p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
          {rawJson}
        </pre>
      ),
    },
  ];
}
