import { useMemo, useState } from "react";
import {
  Play,
  Sparkle as Sparkles,
  Lock,
  LockOpen,
  Plus,
  Trash,
  ArrowCounterClockwise,
  Copy,
  ClockCounterClockwise,
  CheckCircle,
  WarningCircle,
  Pulse,
  Lightning,
  Globe,
  Code,
  Gauge,
  Robot,
  ListMagnifyingGlass,
  type Icon,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { ENDPOINTS, type Endpoint, type HttpMethod } from "~/data/endpoints";
import { useCopilotStore } from "~/stores/copilot-store";
import {
  EmptyState,
  KpiCard,
  FilterBar,
  FilterChip,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "API Explorer — MetaPanel" }];
}

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_TONE: Record<string, string> = {
  GET: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  POST: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  PUT: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  PATCH: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  DELETE: "text-red-400 border-red-500/30 bg-red-500/10",
};

/* ── Page-local seed: header + param editör satırları ──────────────── */
interface KV {
  id: string;
  key: string;
  value: string;
  on: boolean;
}

let kvN = 0;
function kv(key: string, value: string, on = true): KV {
  kvN += 1;
  return { id: `kv_${kvN}`, key, value, on };
}

const DEFAULT_HEADERS: KV[] = [
  kv("Authorization", "Bearer sk_live_••••4a91"),
  kv("Content-Type", "application/json"),
  kv("Accept", "application/json"),
  kv("X-Workspace-Id", "ws_turksab_01"),
];

function defaultParams(e: Endpoint): KV[] {
  if (e.path.includes(":id")) return [kv("id", "1")];
  if (e.method === "GET") return [kv("page", "1"), kv("limit", "20"), kv("sort", "-createdAt", false)];
  return [];
}

/* ── Page-local seed: çağrı geçmişi (mock) ─────────────────────────── */
interface HistoryEntry {
  id: string;
  method: HttpMethod;
  path: string;
  status: number;
  ms: number;
  at: string;
  size: string;
}

const SEED_HISTORY: HistoryEntry[] = [
  { id: "h1", method: "GET", path: "/api/customers", status: 200, ms: 84, at: "az önce", size: "12.4 KB" },
  { id: "h2", method: "POST", path: "/api/orders", status: 201, ms: 142, at: "2 dk önce", size: "0.9 KB" },
  { id: "h3", method: "GET", path: "/api/products/:id", status: 200, ms: 39, at: "5 dk önce", size: "1.2 KB" },
  { id: "h4", method: "PATCH", path: "/api/invoices/:id", status: 200, ms: 118, at: "11 dk önce", size: "0.7 KB" },
  { id: "h5", method: "DELETE", path: "/api/reviews/:id", status: 204, ms: 61, at: "18 dk önce", size: "0 B" },
  { id: "h6", method: "POST", path: "/api/auth/login", status: 401, ms: 27, at: "24 dk önce", size: "0.3 KB" },
  { id: "h7", method: "GET", path: "/api/payments", status: 200, ms: 96, at: "32 dk önce", size: "8.1 KB" },
  { id: "h8", method: "GET", path: "/api/coupons", status: 429, ms: 14, at: "47 dk önce", size: "0.2 KB" },
  { id: "h9", method: "PATCH", path: "/api/products/:id", status: 200, ms: 73, at: "1 sa önce", size: "1.1 KB" },
  { id: "h10", method: "GET", path: "/api/blog-posts", status: 500, ms: 204, at: "1 sa önce", size: "0.4 KB" },
];

/* ── Deterministik türetilmiş metrikler (mock telemetri) ───────────── */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function endpointMeta(e: Endpoint) {
  const h = hash(e.id);
  const p50 = 18 + (h % 60); // ms
  const p99 = p50 + 40 + (h % 180);
  const calls24h = 120 + (h % 9000);
  const errorRate = ((h % 47) / 10).toFixed(1); // %
  const trend = Array.from({ length: 12 }, (_, i) => 40 + ((hash(e.id + i) % 60)));
  return { p50, p99, calls24h, errorRate, trend };
}

function statusTone(s: number): string {
  if (s >= 500) return "text-red-400 border-red-500/30 bg-red-500/10";
  if (s === 429) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  if (s >= 400) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
}

function sampleResponse(e: Endpoint): { code: string; status: number } {
  if (e.method === "DELETE") return { code: JSON.stringify({ success: true }, null, 2), status: 204 };
  const body = {
    id: 1,
    model: e.model,
    name: `Örnek ${e.model}`,
    createdAt: "2026-06-12T09:00:00Z",
    updatedAt: "2026-06-18T11:20:00Z",
  };
  const isItem = e.path.includes(":id") || e.method === "POST" || e.method === "PATCH";
  const payload = isItem
    ? body
    : { data: [body, { ...body, id: 2, name: `Örnek ${e.model} 2` }], total: 2, page: 1, perPage: 20 };
  return { code: JSON.stringify(payload, null, 2), status: e.method === "POST" ? 201 : 200 };
}

function requestPreview(e: Endpoint, headers: KV[], params: KV[]): string {
  const qs = e.method === "GET" && params.some((p) => p.on)
    ? "?" + params.filter((p) => p.on).map((p) => `${p.key}=${encodeURIComponent(p.value)}`).join("&")
    : "";
  const path = params.reduce((acc, p) => acc.replace(`:${p.key}`, p.value), e.path);
  const headerLines = headers.filter((h) => h.on).map((h) => `${h.key}: ${h.value}`).join("\n");
  const hasBody = e.method === "POST" || e.method === "PATCH" || e.method === "PUT";
  const body = hasBody ? `\n\n{\n  "${e.model.toLowerCase()}": {\n    "name": "Örnek ${e.model}"\n  }\n}` : "";
  return `${e.method} ${path}${e.method === "GET" ? qs : ""} HTTP/1.1\nHost: api.turksab.app\n${headerLines}${body}`;
}

/* ── Sayfa ─────────────────────────────────────────────────────────── */
export default function ApiExplorer() {
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<HttpMethod | "ALL">("ALL");
  const [authOnly, setAuthOnly] = useState(false);
  const [selected, setSelected] = useState<Endpoint>(ENDPOINTS[0]);
  const [headers, setHeaders] = useState<KV[]>(DEFAULT_HEADERS);
  const [params, setParams] = useState<KV[]>(() => defaultParams(ENDPOINTS[0]));
  const [response, setResponse] = useState<{ code: string; status: number; ms: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(SEED_HISTORY);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ENDPOINTS.filter((e) => {
      if (methodFilter !== "ALL" && e.method !== methodFilter) return false;
      if (authOnly && !e.auth) return false;
      if (q && !`${e.method} ${e.path} ${e.model} ${e.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, methodFilter, authOnly]);

  const methodCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of ENDPOINTS) m[e.method] = (m[e.method] ?? 0) + 1;
    return m;
  }, []);

  // KPI'lar: katalog + geçmiş telemetrisi üzerinden
  const kpis = useMemo(() => {
    const total = ENDPOINTS.length;
    const auto = ENDPOINTS.filter((e) => e.auto).length;
    const ok = history.filter((h) => h.status < 400).length;
    const successRate = history.length ? Math.round((ok / history.length) * 100) : 100;
    const avgMs = history.length ? Math.round(history.reduce((a, h) => a + h.ms, 0) / history.length) : 0;
    return { total, auto, successRate, avgMs };
  }, [history]);

  function selectEndpoint(e: Endpoint) {
    setSelected(e);
    setParams(defaultParams(e));
    setResponse(null);
  }

  function send() {
    setSending(true);
    setResponse(null);
    const start = Date.now();
    window.setTimeout(() => {
      const { code, status } = sampleResponse(selected);
      const ms = 24 + (hash(selected.id + Date.now()) % 160);
      // auth gerekli ama Authorization header'ı kapalıysa 401 simüle et
      const authHeaderOn = headers.some((h) => h.on && h.key.toLowerCase() === "authorization");
      const effStatus = selected.auth && !authHeaderOn ? 401 : status;
      const effCode = effStatus === 401
        ? JSON.stringify({ error: "unauthorized", message: "Geçerli Bearer token gerekli." }, null, 2)
        : code;
      setResponse({ code: effCode, status: effStatus, ms });
      setSending(false);
      const path = params.reduce((acc, p) => acc.replace(`:${p.key}`, p.value), selected.path);
      const entry: HistoryEntry = {
        id: `h_${Date.now()}`,
        method: selected.method,
        path: selected.path,
        status: effStatus,
        ms,
        at: "az önce",
        size: `${(effCode.length / 1024).toFixed(1)} KB`,
      };
      setHistory((h) => [entry, ...h].slice(0, 30));
      if (effStatus < 400) toast.success(`${effStatus} OK · ${ms}ms`, { description: `${selected.method} ${path} (mock)` });
      else toast.error(`${effStatus}`, { description: `${selected.method} ${path} (mock)` });
      void (Date.now() - start);
    }, 420);
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} kopyalandı`),
      () => toast.error("Kopyalanamadı"),
    );
  }

  function exportHistory() {
    toast.success("Geçmiş dışa aktarıldı", { description: `api-explorer-history.json · ${history.length} kayıt` });
  }

  const meta = endpointMeta(selected);

  // Drawer sekmeleri: Genel / Aktivite / JSON
  const auditEvents: AuditEvent[] = useMemo(
    () => buildAudit(selected),
    [selected.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const drawerTabs: DrawerTab[] = [
    {
      value: "overview",
      label: "Genel",
      content: (
        <div className="divide-y">
          <Field label="Method">
            <Badge variant="outline" className={cn("font-mono text-[10px]", METHOD_TONE[selected.method])}>
              {selected.method}
            </Badge>
          </Field>
          <Field label="Path" mono>{selected.path}</Field>
          <Field label="Model">{selected.model}</Field>
          <Field label="Kaynak">{selected.auto ? "auto-generated CRUD" : "hand-written"}</Field>
          <Field label="Kimlik doğrulama">{selected.auth ? "Bearer token gerekli" : "Herkese açık"}</Field>
          <Field label="p50 / p99 latency" mono>{meta.p50}ms / {meta.p99}ms</Field>
          <Field label="24s çağrı" mono>{meta.calls24h.toLocaleString("tr-TR")}</Field>
          <Field label="Hata oranı (24s)" mono>{meta.errorRate}%</Field>
          <div className="pt-3">
            <p className="mb-1.5 text-xs text-muted-foreground">Açıklama</p>
            <p className="text-sm leading-relaxed">{selected.description}</p>
          </div>
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
        <pre className="mp-scroll overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
          <code>{JSON.stringify({ ...selected, ...meta, trend: undefined }, null, 2)}</code>
        </pre>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="API Explorer"
        description="Auto-generated CRUD endpoint'leri keşfet, header/param düzenle ve mock istek gönder."
        actions={[
          {
            label: "AI Docs",
            icon: Sparkles,
            variant: "default",
            onClick: () =>
              queuePrompt(`${selected.method} ${selected.path} endpoint'i için OpenAPI dokümantasyonu ve örnek istek üret.`),
          },
        ]}
      />
      <PageBody grid={false} className="flex h-full flex-col gap-4">
        {/* KPI şeridi */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Toplam endpoint"
            value={kpis.total}
            delta={4}
            trend={[34, 36, 38, 40, 41, 43, 45, kpis.total]}
            icon={Globe}
            hint="katalog"
          />
          <KpiCard
            label="Auto-generated"
            value={kpis.auto}
            delta={9}
            trend={[28, 30, 33, 36, 38, 40, 43, kpis.auto]}
            icon={Robot}
            hint="CRUD"
          />
          <KpiCard
            label="Başarı oranı"
            value={`${kpis.successRate}%`}
            delta={kpis.successRate >= 80 ? 2 : -6}
            trend={[88, 91, 86, 90, 93, 89, 92, kpis.successRate]}
            icon={CheckCircle}
            hint="oturum"
          />
          <KpiCard
            label="Ort. yanıt"
            value={`${kpis.avgMs}ms`}
            delta={-12}
            invert
            trend={[140, 120, 110, 96, 88, 80, 84, kpis.avgMs]}
            icon={Gauge}
            hint="p50"
          />
        </div>

        {/* Filtre şeridi */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Endpoint, model veya path ara…"
          onExport={exportHistory}
        >
          <FilterChip active={methodFilter === "ALL"} onClick={() => setMethodFilter("ALL")} count={ENDPOINTS.length}>
            Tümü
          </FilterChip>
          {METHODS.map((m) => (
            <FilterChip
              key={m}
              active={methodFilter === m}
              onClick={() => setMethodFilter(methodFilter === m ? "ALL" : m)}
              count={methodCounts[m] ?? 0}
            >
              {m}
            </FilterChip>
          ))}
          <FilterChip active={authOnly} onClick={() => setAuthOnly((v) => !v)}>
            <Lock className="size-3" /> Auth
          </FilterChip>
        </FilterBar>

        {/* Ana 3-kolon editör: liste · request/response · geçmiş */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_260px]">
          {/* Endpoint listesi */}
          <div className="flex min-h-0 flex-col rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <ListMagnifyingGlass className="size-3.5 text-muted-foreground" /> Endpoint'ler
              </span>
              <Badge variant="secondary" className="text-[10px] tabular-nums">{filtered.length}</Badge>
            </div>
            <div className="mp-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="p-2">
                  <EmptyState
                    icon={ListMagnifyingGlass}
                    variant="search"
                    title="Eşleşen endpoint yok"
                    description="Arama veya method filtresini değiştir."
                    action={
                      <Button variant="outline" size="sm" onClick={() => { setQuery(""); setMethodFilter("ALL"); setAuthOnly(false); }}>
                        Filtreleri sıfırla
                      </Button>
                    }
                  />
                </div>
              ) : (
                filtered.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => selectEndpoint(e)}
                    aria-current={selected.id === e.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      selected.id === e.id ? "border-primary/40 bg-accent" : "border-transparent hover:bg-accent/50",
                    )}
                  >
                    <Badge variant="outline" className={cn("w-14 shrink-0 justify-center font-mono text-[10px]", METHOD_TONE[e.method])}>
                      {e.method}
                    </Badge>
                    <span className="truncate font-mono text-xs">{e.path}</span>
                    {e.auth && <Lock className="ml-auto size-3 shrink-0 text-muted-foreground" />}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Request / Response editörü */}
          <div className="flex min-h-0 flex-col gap-4">
            {/* Endpoint başlığı + aksiyonlar */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("font-mono", METHOD_TONE[selected.method])}>
                  {selected.method}
                </Badge>
                <button
                  onClick={() => copy(selected.path, "Path")}
                  className="group flex items-center gap-1.5 font-mono text-sm hover:text-primary"
                  title="Kopyala"
                >
                  {selected.path}
                  <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                {selected.auto && <Badge variant="secondary" className="ml-auto text-[10px]">auto-generated</Badge>}
                <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setDrawerOpen(true)}>
                  <Gauge className="size-3.5" /> Detay
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-8 gap-1.5" onClick={send} disabled={sending}>
                  {sending ? <Pulse className="size-3.5 animate-pulse" /> : <Play className="size-3.5" />}
                  {sending ? "Gönderiliyor…" : "Gönder"}
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => { setHeaders(DEFAULT_HEADERS); setParams(defaultParams(selected)); setResponse(null); toast.info("İstek sıfırlandı"); }}>
                  <ArrowCounterClockwise className="size-3.5" /> Sıfırla
                </Button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {selected.auth ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
                  {selected.auth ? "Bearer token gerekli" : "Herkese açık"}
                </span>
                <span className="ml-auto flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <Lightning className="size-3" /> p50 {meta.p50}ms
                </span>
              </div>
            </div>

            {/* Header & Param editörleri */}
            <div className="grid gap-4 md:grid-cols-2">
              <KvEditor
                title="Headers"
                icon={Code}
                rows={headers}
                onChange={setHeaders}
                keyPlaceholder="Header"
                valuePlaceholder="Değer"
              />
              <KvEditor
                title={selected.method === "GET" ? "Query Params" : "Path Params"}
                icon={ListMagnifyingGlass}
                rows={params}
                onChange={setParams}
                keyPlaceholder="Anahtar"
                valuePlaceholder="Değer"
                emptyHint="Bu endpoint için parametre yok."
              />
            </div>

            {/* Request / Response panelleri */}
            <div className="grid min-h-0 gap-4 md:grid-cols-2">
              <CodeBlock
                title="Request"
                onCopy={() => copy(requestPreview(selected, headers, params), "Request")}
                code={requestPreview(selected, headers, params)}
              />
              <CodeBlock
                title="Response"
                status={response?.status}
                ms={response?.ms}
                loading={sending}
                onCopy={response ? () => copy(response.code, "Response") : undefined}
                code={response?.code}
                emptyHint="'Gönder'e bas → mock yanıt burada belirir."
              />
            </div>
          </div>

          {/* Çağrı geçmişi */}
          <div className="hidden min-h-0 flex-col rounded-xl border bg-card xl:flex">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <ClockCounterClockwise className="size-3.5 text-muted-foreground" /> Geçmiş
              </span>
              {history.length > 0 && (
                <button onClick={() => { setHistory([]); toast.info("Geçmiş temizlendi"); }} className="text-[11px] text-muted-foreground hover:text-foreground">
                  Temizle
                </button>
              )}
            </div>
            <div className="mp-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
              {history.length === 0 ? (
                <div className="p-2">
                  <EmptyState icon={ClockCounterClockwise} title="Geçmiş boş" description="Gönderdiğin istekler burada listelenir." />
                </div>
              ) : (
                <div className="space-y-0.5">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        const ep = ENDPOINTS.find((e) => e.method === h.method && e.path === h.path);
                        if (ep) selectEndpoint(ep);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                    >
                      <Badge variant="outline" className={cn("w-12 shrink-0 justify-center font-mono text-[9px]", METHOD_TONE[h.method])}>
                        {h.method}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{h.path}</span>
                      <span className={cn("shrink-0 rounded border px-1 font-mono text-[9px] tabular-nums", statusTone(h.status))}>
                        {h.status}
                      </span>
                      <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">{h.ms}ms</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBody>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={<span className="font-mono text-sm">{selected.path}</span>}
        subtitle={`${selected.model} · ${selected.auto ? "auto-generated" : "hand-written"}`}
        badge={
          <Badge variant="outline" className={cn("font-mono text-[10px]", METHOD_TONE[selected.method])}>
            {selected.method}
          </Badge>
        }
        tabs={drawerTabs}
        footer={
          <div className="flex w-full items-center gap-2 p-3">
            <Button size="sm" className="flex-1 gap-1.5" onClick={() => { setDrawerOpen(false); send(); }}>
              <Play className="size-3.5" /> Gönder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => queuePrompt(`${selected.method} ${selected.path} endpoint'ini dokümante et.`)}
            >
              <Sparkles className="size-3.5" /> AI Docs
            </Button>
          </div>
        }
      />
    </>
  );
}

/* ── Audit kurgusu (deterministik) ─────────────────────────────────── */
function buildAudit(e: Endpoint): AuditEvent[] {
  const base: AuditEvent[] = [
    { id: `${e.id}-a1`, action: "endpoint kataloğa eklendi", actor: e.auto ? "Codegen" : "Ada Yılmaz", at: "3 gün önce", icon: Plus, tone: "emerald" },
  ];
  if (e.auto) {
    base.push({ id: `${e.id}-a2`, action: `${e.model} modelinden yeniden üretildi`, actor: "Codegen", at: "2 gün önce", icon: Robot, tone: "primary", detail: "schema → openapi → handler" });
  }
  base.push(
    { id: `${e.id}-a3`, action: e.auth ? "Bearer auth zorunlu kılındı" : "herkese açık olarak işaretlendi", actor: "Burak Demir", at: "1 gün önce", icon: e.auth ? Lock : LockOpen, tone: e.auth ? "amber" : "default" },
    { id: `${e.id}-a4`, action: "son mock istek 200 döndü", actor: "system", at: "2 sa önce", icon: CheckCircle, tone: "emerald", detail: `${e.method} ${e.path}` },
  );
  if (hash(e.id) % 3 === 0) {
    base.splice(3, 0, { id: `${e.id}-a5`, action: "rate-limit eşiği aşıldı", actor: "system", at: "5 sa önce", icon: WarningCircle, tone: "amber", detail: "429 · 60 req/dk" });
  }
  return base;
}

/* ── KvEditor: header/param satır editörü ──────────────────────────── */
function KvEditor({
  title,
  icon: Icon,
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  emptyHint,
}: {
  title: string;
  icon: Icon;
  rows: KV[];
  onChange: (rows: KV[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  emptyHint?: string;
}) {
  function patch(id: string, p: Partial<KV>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }
  function remove(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }
  function add() {
    onChange([...rows, kv("", "")]);
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Icon className="size-3.5 text-muted-foreground" /> {title}
        </span>
        <Badge variant="secondary" className="text-[10px] tabular-nums">{rows.filter((r) => r.on).length}/{rows.length}</Badge>
      </div>
      <div className="space-y-1.5 p-2.5">
        {rows.length === 0 && (
          <p className="px-1 py-3 text-center text-xs text-muted-foreground">{emptyHint ?? "Satır yok."}</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={r.on}
              onChange={(e) => patch(r.id, { on: e.target.checked })}
              aria-label={`${r.key || "satır"} aktif`}
              className="size-3.5 shrink-0 accent-primary"
            />
            <Input
              value={r.key}
              onChange={(e) => patch(r.id, { key: e.target.value })}
              placeholder={keyPlaceholder}
              className={cn("h-7 flex-1 font-mono text-xs", !r.on && "opacity-50")}
            />
            <Input
              value={r.value}
              onChange={(e) => patch(r.id, { value: e.target.value })}
              placeholder={valuePlaceholder}
              className={cn("h-7 flex-[1.4] font-mono text-xs", !r.on && "opacity-50")}
            />
            <button
              onClick={() => remove(r.id)}
              aria-label="Satırı sil"
              className="shrink-0 text-muted-foreground transition-colors hover:text-red-400"
            >
              <Trash className="size-3.5" />
            </button>
          </div>
        ))}
        <Separator className="my-1" />
        <button onClick={add} className="flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
          <Plus className="size-3.5" /> Satır ekle
        </button>
      </div>
    </div>
  );
}

/* ── CodeBlock: request/response paneli ────────────────────────────── */
function CodeBlock({
  title,
  code,
  status,
  ms,
  loading,
  onCopy,
  emptyHint,
}: {
  title: string;
  code?: string;
  status?: number;
  ms?: number;
  loading?: boolean;
  onCopy?: () => void;
  emptyHint?: string;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
        <span className="flex items-center gap-2 text-xs font-medium">
          {title}
          {typeof status === "number" && (
            <Badge variant="outline" className={cn("font-mono text-[10px]", statusTone(status))}>
              {status}{typeof ms === "number" && ` · ${ms}ms`}
            </Badge>
          )}
        </span>
        {onCopy && (
          <button onClick={onCopy} aria-label="Kopyala" className="text-muted-foreground transition-colors hover:text-foreground">
            <Copy className="size-3.5" />
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-muted/70" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      ) : code ? (
        <pre className="mp-scroll max-h-72 min-h-[7rem] overflow-auto p-3 font-mono text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      ) : (
        <div className="flex min-h-[7rem] items-center justify-center p-3 text-center text-xs text-muted-foreground">
          {emptyHint}
        </div>
      )}
    </div>
  );
}
