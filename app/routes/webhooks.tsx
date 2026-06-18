import { useMemo, useState } from "react";
import {
  Plus,
  WebhooksLogo as WebhookIcon,
  Circle,
  CheckCircle,
  XCircle,
  ArrowClockwise,
  PaperPlaneTilt,
  Lightning,
  Timer,
  ChartLineUp,
  Key,
  Copy,
  ArrowsClockwise,
  Trash,
  Pause,
  Play,
  ClockCounterClockwise,
  Warning,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { WEBHOOKS, type WebhookDef } from "~/data/expansion";
import {
  DELIVERY_LOG,
  WEBHOOK_EVENTS,
  SUCCESS_TREND,
  LATENCY_TREND,
  VOLUME_TREND,
  type DeliveryLog,
} from "~/data/seed.webhooks";
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
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Webhooks — MetaPanel" }];
}

const STATUS_TONE = {
  active: "text-emerald-400",
  paused: "text-muted-foreground",
  failing: "text-red-400",
} as const;

const STATUS_LABEL = {
  active: "aktif",
  paused: "duraklatıldı",
  failing: "başarısız",
} as const;

function statusTone(code: number): "ok" | "warn" | "err" {
  if (code === 0) return "err";
  if (code >= 500 || code === 0) return "err";
  if (code >= 400) return "warn";
  return "ok";
}

const TONE_CLS = {
  ok: "text-emerald-400 border-emerald-500/30",
  warn: "text-amber-400 border-amber-500/30",
  err: "text-red-400 border-red-500/30",
} as const;

type LogFilter = "all" | "ok" | "failed" | "retried";

export default function Webhooks() {
  const [hooks, setHooks] = useState<WebhookDef[]>(WEBHOOKS);
  const [log] = useState<DeliveryLog[]>(DELIVERY_LOG);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LogFilter>("all");
  const [hookFilter, setHookFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [drawer, setDrawer] = useState<DeliveryLog | null>(null);
  const [secretHook, setSecretHook] = useState<WebhookDef | null>(null);
  const [testEvent, setTestEvent] = useState<string>(WEBHOOK_EVENTS[0]);

  // ── KPI hesapları ────────────────────────────────────────────────
  const total = log.length;
  const okCount = log.filter((d) => statusTone(d.status) === "ok").length;
  const failed = log.filter((d) => statusTone(d.status) === "err").length;
  const retried = log.filter((d) => d.attempts.length > 1).length;
  const successRate = total ? Math.round((okCount / total) * 1000) / 10 : 0;
  const avgLatency = total
    ? Math.round(log.reduce((s, d) => s + d.durationMs, 0) / total)
    : 0;
  const failingHooks = hooks.filter((h) => h.status === "failing").length;

  // ── Teslimat logu filtre ─────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return log.filter((d) => {
      if (hookFilter !== "all" && d.hookId !== hookFilter) return false;
      if (filter === "ok" && statusTone(d.status) !== "ok") return false;
      if (filter === "failed" && statusTone(d.status) !== "err") return false;
      if (filter === "retried" && d.attempts.length <= 1) return false;
      if (q && !`${d.event} ${d.endpoint} ${d.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [log, search, filter, hookFilter]);

  const counts = useMemo(
    () => ({
      all: log.length,
      ok: log.filter((d) => statusTone(d.status) === "ok").length,
      failed: log.filter((d) => statusTone(d.status) === "err").length,
      retried: log.filter((d) => d.attempts.length > 1).length,
    }),
    [log],
  );

  // ── Aksiyonlar ───────────────────────────────────────────────────
  function toggle(id: string) {
    setHooks((p) =>
      p.map((h) =>
        h.id === id
          ? { ...h, status: h.status === "paused" ? "active" : "paused" }
          : h,
      ),
    );
    const h = hooks.find((x) => x.id === id);
    toast.success(h?.status === "paused" ? "Webhook etkinleştirildi" : "Webhook duraklatıldı");
  }

  function refresh() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Teslimat logu yenilendi");
    }, 650);
  }

  function sendTest() {
    toast.promise(new Promise((r) => setTimeout(r, 900)), {
      loading: `Test gönderiliyor: ${testEvent}…`,
      success: `Test "${testEvent}" gönderildi · 200 OK (147ms)`,
      error: "Test başarısız",
    });
  }

  function redeliver(d: DeliveryLog) {
    toast.promise(new Promise((r) => setTimeout(r, 800)), {
      loading: `${d.id} yeniden gönderiliyor…`,
      success: `${d.event} yeniden gönderildi`,
      error: "Yeniden gönderim başarısız",
    });
  }

  function exportLog() {
    toast.success(`${filtered.length} teslimat JSON olarak dışa aktarıldı`);
  }

  function rotateSecret(h: WebhookDef) {
    toast.success(`Signing secret döndürüldü · ${h.url}`, {
      description: "Eski secret 24 saat boyunca geçerli kalır.",
    });
  }

  function bulkRedeliver() {
    toast.success(`${selected.size} teslimat yeniden kuyruğa alındı`);
    setSelected(new Set());
  }

  function toggleSel(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function hookOf(id: string) {
    return hooks.find((h) => h.id === id);
  }

  // ── Drawer içeriği ───────────────────────────────────────────────
  const drawerTabs: DrawerTab[] = drawer
    ? [
        {
          value: "overview",
          label: "Genel",
          content: <OverviewTab d={drawer} hookUrl={hookOf(drawer.hookId)?.url} />,
        },
        {
          value: "payload",
          label: "Payload",
          content: (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">İstek gövdesi (JSON)</p>
                <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(drawer.payload, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Yanıt gövdesi</p>
                <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                  {drawer.responseBody}
                </pre>
              </div>
            </div>
          ),
        },
        {
          value: "retry",
          label: "Retry",
          content: <AuditTimeline events={retryEvents(drawer)} />,
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Giden webhook uç noktaları, teslimat sağlığı ve retry izlenebilirliği."
        actions={[
          { label: "Yenile", icon: ArrowsClockwise, variant: "outline", onClick: refresh },
          { label: "Yeni Webhook", icon: Plus, variant: "default", onClick: () => toast.success("Yeni webhook (mock)") },
        ]}
      />
      <PageBody className="space-y-4">
        {/* ── KPI şeridi ─────────────────────────────────────────── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Başarı oranı"
              value={`%${successRate}`}
              delta={1.4}
              trend={SUCCESS_TREND}
              icon={CheckCircle}
              hint="son 14g"
            />
            <KpiCard
              label="Başarısız teslimat"
              value={failed}
              delta={failed > 0 ? 12 : 0}
              trend={SUCCESS_TREND.map((v) => 100 - v)}
              icon={XCircle}
              invert
              hint="bekleyen retry"
            />
            <KpiCard
              label="Ort. yanıt süresi"
              value={`${avgLatency}ms`}
              delta={-6}
              trend={LATENCY_TREND}
              icon={Timer}
              invert
              hint="p50"
            />
            <KpiCard
              label="Teslimat hacmi"
              value={VOLUME_TREND[VOLUME_TREND.length - 1].toLocaleString("tr-TR")}
              delta={8}
              trend={VOLUME_TREND}
              icon={ChartLineUp}
              hint="bugün"
            />
          </div>
        )}

        {/* Insight uyarısı */}
        {failingHooks > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5 text-sm">
            <Warning className="mt-0.5 size-4 shrink-0 text-amber-400" weight="regular" />
            <p className="text-muted-foreground">
              <span className="font-medium text-amber-400">{failingHooks} endpoint başarısız durumda.</span>{" "}
              <span className="font-mono text-xs">crm.legacy.net</span> son 1 saatte ardışık 5xx döndürüyor; retry bütçesi tükeniyor. İmza secret veya endpoint erişilebilirliğini kontrol edin.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
          {/* ── Webhook endpoint listesi ───────────────────────── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-sm font-semibold">Uç Noktalar</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{hooks.length} endpoint</span>
            </div>
            {hooks.map((h) => (
              <div
                key={h.id}
                className="space-y-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent",
                      STATUS_TONE[h.status],
                    )}
                  >
                    <WebhookIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm">{h.url}</p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px]",
                        STATUS_TONE[h.status],
                      )}
                    >
                      <Circle className="size-2 fill-current" /> {STATUS_LABEL[h.status]} · {h.lastDelivery}
                    </span>
                  </div>
                  <Switch
                    checked={h.status !== "paused"}
                    onCheckedChange={() => toggle(h.id)}
                    aria-label={`${h.url} durumunu değiştir`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {h.events.map((e) => (
                    <Badge key={e} variant="secondary" className="font-mono text-[10px]">
                      {e}
                    </Badge>
                  ))}
                  <span
                    className={cn(
                      "ml-auto text-xs tabular-nums",
                      h.successRate < 90 ? "text-red-400" : "text-muted-foreground",
                    )}
                  >
                    %{h.successRate} başarı
                  </span>
                </div>
                <div className="flex items-center gap-1.5 border-t pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={() => setSecretHook(h)}
                  >
                    <Key className="size-3.5" /> Secret
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={() => {
                      setTestEvent(h.events[0] ?? WEBHOOK_EVENTS[0]);
                      sendTest();
                    }}
                  >
                    <PaperPlaneTilt className="size-3.5" /> Test
                  </Button>
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    {h.status === "paused" ? <Pause className="size-3" /> : <Play className="size-3" />}
                    {h.status === "paused" ? "duraklatıldı" : "dinleniyor"}
                  </span>
                </div>
              </div>
            ))}

            {/* Test gönder paneli */}
            <div className="space-y-2.5 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Lightning className="size-4 text-primary" weight="regular" />
                <h3 className="text-sm font-medium">Test gönder</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Seçili event ile örnek payload'ı tüm aktif uç noktalara iletir.
              </p>
              <div className="flex items-center gap-2">
                <Select value={testEvent} onValueChange={(v) => v && setTestEvent(v)}>
                  <SelectTrigger className="h-9 flex-1 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEBHOOK_EVENTS.map((e) => (
                      <SelectItem key={e} value={e} className="font-mono text-xs">
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-9 gap-1.5 bg-primary" onClick={sendTest}>
                  <PaperPlaneTilt className="size-4" /> Gönder
                </Button>
              </div>
            </div>
          </section>

          {/* ── Teslimat logu grid ─────────────────────────────── */}
          <section className="space-y-3">
            <FilterBar
              search={search}
              onSearch={setSearch}
              placeholder="Event, endpoint veya teslimat ID ara…"
              onExport={exportLog}
            >
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>
                Tümü
              </FilterChip>
              <FilterChip active={filter === "ok"} onClick={() => setFilter("ok")} count={counts.ok}>
                Başarılı
              </FilterChip>
              <FilterChip active={filter === "failed"} onClick={() => setFilter("failed")} count={counts.failed}>
                Başarısız
              </FilterChip>
              <FilterChip active={filter === "retried"} onClick={() => setFilter("retried")} count={counts.retried}>
                Retry'lı
              </FilterChip>
              <Select value={hookFilter} onValueChange={(v) => v && setHookFilter(v)}>
                <SelectTrigger className="h-7 w-auto gap-1.5 rounded-full px-2.5 text-xs">
                  <SelectValue placeholder="Endpoint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm endpoint'ler</SelectItem>
                  {hooks.map((h) => (
                    <SelectItem key={h.id} value={h.id} className="font-mono text-xs">
                      {h.url.replace(/^https?:\/\//, "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBar>

            <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={bulkRedeliver}>
                <ArrowClockwise className="size-3.5" /> Yeniden gönder
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-red-400"
                onClick={() => {
                  toast.success(`${selected.size} teslimat kaydı arşivlendi`);
                  setSelected(new Set());
                }}
              >
                <Trash className="size-3.5" /> Arşivle
              </Button>
            </BulkBar>

            <div className="rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-3.5 py-2">
                <h2 className="text-sm font-semibold">Teslimat Logu</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {filtered.length} / {log.length} kayıt
                </span>
              </div>

              {loading ? (
                <div className="p-3">
                  <TableSkeleton rows={8} cols={4} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    variant="search"
                    title="Eşleşen teslimat yok"
                    description="Arama veya filtreleri değiştirin."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setFilter("all");
                          setHookFilter("all");
                        }}
                      >
                        Filtreleri sıfırla
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((d) => {
                    const tone = statusTone(d.status);
                    const sel = selected.has(d.id);
                    const hook = hookOf(d.hookId);
                    return (
                      <li
                        key={d.id}
                        className={cn(
                          "group flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-accent/40",
                          sel && "bg-primary/5",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSel(d.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-3.5 shrink-0 accent-primary"
                          aria-label={`${d.id} seç`}
                        />
                        <button
                          onClick={() => setDrawer(d)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <Badge
                            variant="outline"
                            className={cn("w-11 shrink-0 justify-center font-mono text-[10px]", TONE_CLS[tone])}
                          >
                            {d.status === 0 ? "ERR" : d.status}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-xs">{d.event}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {hook?.url.replace(/^https?:\/\//, "")}
                            </p>
                          </div>
                          {d.attempts.length > 1 && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                              <ArrowClockwise className="size-2.5" /> {d.attempts.length}
                            </span>
                          )}
                          <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
                            {d.durationMs}ms
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{d.time}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={() => redeliver(d)}
                          aria-label="Yeniden gönder"
                        >
                          <ArrowClockwise className="size-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </PageBody>

      {/* ── Teslimat detay drawer ─────────────────────────────── */}
      <DetailDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        title={drawer?.event ?? ""}
        subtitle={drawer?.id}
        badge={
          drawer && (
            <Badge
              variant="outline"
              className={cn("font-mono text-[10px]", TONE_CLS[statusTone(drawer.status)])}
            >
              {drawer.status === 0 ? "CONNECTION ERROR" : drawer.status}
            </Badge>
          )
        }
        tabs={drawerTabs}
        footer={
          drawer && (
            <div className="flex w-full items-center gap-2 p-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => redeliver(drawer)}>
                <ArrowClockwise className="size-4" /> Yeniden gönder
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(drawer.payload, null, 2));
                  toast.success("Payload kopyalandı");
                }}
              >
                <Copy className="size-4" /> Payload kopyala
              </Button>
            </div>
          )
        }
      />

      {/* ── İmza secret drawer ────────────────────────────────── */}
      <DetailDrawer
        open={!!secretHook}
        onOpenChange={(v) => !v && setSecretHook(null)}
        title="Signing secret"
        subtitle={secretHook?.url}
        badge={<Badge variant="secondary" className="gap-1 text-[10px]"><Key className="size-3" /> HMAC-SHA256</Badge>}
        footer={
          secretHook && (
            <div className="flex w-full items-center gap-2 p-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => rotateSecret(secretHook)}>
                <ArrowsClockwise className="size-4" /> Secret döndür
              </Button>
            </div>
          )
        }
      >
        {secretHook && <SecretPanel hook={secretHook} />}
      </DetailDrawer>
    </>
  );
}

// ── Drawer alt bileşenleri ─────────────────────────────────────────
function OverviewTab({ d, hookUrl }: { d: DeliveryLog; hookUrl?: string }) {
  const tone = statusTone(d.status);
  return (
    <div className="space-y-1 divide-y">
      <div className="pb-1">
        <Field label="Event">
          <span className="font-mono text-xs">{d.event}</span>
        </Field>
        <Field label="Endpoint" mono>{hookUrl ?? d.endpoint}</Field>
        <Field label="Durum">
          <span className={cn("inline-flex items-center gap-1", TONE_CLS[tone].split(" ")[0])}>
            {tone === "ok" ? <CheckCircle className="size-3.5" weight="regular" /> : <XCircle className="size-3.5" weight="regular" />}
            {d.status === 0 ? "Bağlantı hatası" : `HTTP ${d.status}`}
          </span>
        </Field>
        <Field label="Süre" mono>{d.durationMs}ms</Field>
        <Field label="Deneme sayısı" mono>{d.attempts.length}</Field>
        <Field label="Zaman">{d.time}</Field>
        <Field label="Teslimat ID" mono>{d.id}</Field>
      </div>
      <div className="pt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">İmza başlığı</p>
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-2.5 font-mono text-[11px]">
          {`X-MetaPanel-Signature: sha256=${pseudoHash(d.id)}`}
        </pre>
      </div>
    </div>
  );
}

function SecretPanel({ hook }: { hook: WebhookDef }) {
  const secret = `whsec_${pseudoHash(hook.id).slice(0, 40)}`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Bu secret, giden isteklerin <span className="font-mono text-xs">X-MetaPanel-Signature</span> başlığını HMAC-SHA256 ile imzalamak için kullanılır. Uç noktanız payload bütünlüğünü bu değerle doğrular.
      </p>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Aktif secret</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">{secret}</code>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => {
              navigator.clipboard?.writeText(secret);
              toast.success("Secret kopyalandı");
            }}
            aria-label="Secret kopyala"
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="mb-2 text-xs font-medium">Doğrulama örneği</p>
        <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
{`const sig = req.headers["x-metapanel-signature"];
const expected = "sha256=" +
  hmac("sha256", "${secret}", req.rawBody);
if (!timingSafeEqual(sig, expected)) reject(401);`}
        </pre>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
        <Warning className="mt-0.5 size-3.5 shrink-0 text-amber-400" weight="regular" />
        Secret'ı döndürdüğünüzde eski değer 24 saat boyunca geçerli kalır; bu sürede entegrasyonunuzu güncelleyin.
      </div>
    </div>
  );
}

// ── Yardımcılar ────────────────────────────────────────────────────
function retryEvents(d: DeliveryLog): AuditEvent[] {
  return d.attempts.map((a) => {
    const tone = a.status === 0 || a.status >= 500 ? "red" : a.status >= 400 ? "amber" : "emerald";
    return {
      id: `${d.id}-a${a.n}`,
      action: `Deneme #${a.n} → ${a.status === 0 ? "bağlantı hatası" : `HTTP ${a.status}`} (${a.ms}ms)`,
      actor: "delivery-engine",
      at: a.at,
      icon: a.status >= 200 && a.status < 300 ? CheckCircle : a.status === 0 ? Warning : ClockCounterClockwise,
      tone: tone as AuditEvent["tone"],
      detail: a.note,
    };
  });
}

function pseudoHash(seed: string): string {
  const chars = "0123456789abcdef";
  let out = "";
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < 64; i++) {
    n = (n * 1103515245 + 12345) >>> 0;
    out += chars[n & 15];
  }
  return out;
}
