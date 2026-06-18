// Page-local seed for the Dashboard insight surface.
// Richer, deterministic time-series + cross-page rollups + audit feed
// used by the enterprise dashboard. Not shared — only dashboard.tsx imports this.

import type { AuditEvent } from "~/components/enterprise";

/* ── Dönem (period) modeli ──────────────────────────────────────────
 * Her KPI için "şu an" ve "önceki dönem" değeri tutulur; delta buradan
 * türetilir (gerçek dönem karşılaştırması, çıplak sayı değil).
 */
export type PeriodKey = "7d" | "30d" | "90d";

export const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "7d", label: "Son 7 gün", days: 7 },
  { key: "30d", label: "Son 30 gün", days: 30 },
  { key: "90d", label: "Son 90 gün", days: 90 },
];

/* ── Aktivite hacmi zaman serisi (günlük) ───────────────────────────
 * Trend grafiğini besler. 90 günlük deterministik seri; dönem seçimine
 * göre son N gün kesilir.
 */
function genSeries(days: number, base: number, amp: number, seed: number): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = days - 1 - i;
    // deterministik dalga + hafif yükseliş trendi
    const wave = Math.sin((t + seed) / 4.2) * amp + Math.cos((t + seed) / 9) * (amp * 0.4);
    const trend = t * (amp / days) * 1.6;
    const v = Math.max(0, Math.round(base + wave + trend));
    out.push({ label: `g-${t + 1}`, value: v });
  }
  return out;
}

export interface DashSeries {
  apiCalls: { label: string; value: number }[];
  errors: { label: string; value: number }[];
  builds: { label: string; value: number }[];
}

const FULL: DashSeries = {
  apiCalls: genSeries(90, 9200, 2600, 3),
  errors: genSeries(90, 38, 22, 11),
  builds: genSeries(90, 14, 7, 5),
};

/** Dönem için son N günü döndürür. */
export function sliceSeries(period: PeriodKey): DashSeries {
  const days = PERIODS.find((p) => p.key === period)!.days;
  return {
    apiCalls: FULL.apiCalls.slice(-days),
    errors: FULL.errors.slice(-days),
    builds: FULL.builds.slice(-days),
  };
}

const sum = (a: { value: number }[]) => a.reduce((s, p) => s + p.value, 0);
const avg = (a: { value: number }[]) => (a.length ? sum(a) / a.length : 0);

/* ── KPI tanımı (dönem-duyarlı) ─────────────────────────────────────
 * value + previous → delta yüzdesi. trend = sparkline serisi.
 */
export interface KpiDef {
  key: string;
  label: string;
  format: (n: number) => string;
  /** dönem için cari değer */
  current: (s: DashSeries) => number;
  /** önceki eşit uzunluktaki dönem (delta için) */
  previous: (period: PeriodKey) => number;
  trend: (s: DashSeries) => number[];
  invert?: boolean;
  hint?: string;
  to: string;
}

function prevSlice(period: PeriodKey): DashSeries {
  const days = PERIODS.find((p) => p.key === period)!.days;
  const end = FULL.apiCalls.length - days;
  const start = Math.max(0, end - days);
  return {
    apiCalls: FULL.apiCalls.slice(start, end),
    errors: FULL.errors.slice(start, end),
    builds: FULL.builds.slice(start, end),
  };
}

const fmtCompact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${Math.round(n)}`;

export const KPI_DEFS: KpiDef[] = [
  {
    key: "apiCalls",
    label: "API Çağrısı",
    format: fmtCompact,
    current: (s) => sum(s.apiCalls),
    previous: (p) => sum(prevSlice(p).apiCalls),
    trend: (s) => s.apiCalls.map((d) => d.value),
    hint: "gateway",
    to: "/api-explorer",
  },
  {
    key: "errorRate",
    label: "Hata Olayı",
    format: (n) => fmtCompact(n),
    current: (s) => sum(s.errors),
    previous: (p) => sum(prevSlice(p).errors),
    trend: (s) => s.errors.map((d) => d.value),
    invert: true,
    hint: "tracking",
    to: "/errors",
  },
  {
    key: "p95",
    label: "p95 Yanıt (ms)",
    format: (n) => `${Math.round(n)}`,
    current: (s) => 120 + avg(s.errors) * 1.4,
    previous: (p) => 120 + avg(prevSlice(p).errors) * 1.4,
    trend: (s) => s.errors.map((d) => Math.round(120 + d.value * 1.4)),
    invert: true,
    hint: "edge",
    to: "/health",
  },
  {
    key: "deploys",
    label: "Deploy",
    format: (n) => `${Math.round(n)}`,
    current: (s) => sum(s.builds),
    previous: (p) => sum(prevSlice(p).builds),
    trend: (s) => s.builds.map((d) => d.value),
    hint: "CI/CD",
    to: "/releases",
  },
];

export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/* ── Çapraz-sayfa özet kartları ─────────────────────────────────────
 * Dashboard'un "tek bakışta workspace" rolü: diğer yüzeylerin sağlık
 * göstergeleri tek yerde. Her kart kendi sayfasına derin link verir.
 */
export type SummaryTone = "emerald" | "amber" | "red" | "default";

export interface SummaryCard {
  key: string;
  title: string;
  to: string;
  primary: string;
  caption: string;
  tone: SummaryTone;
  rows: { label: string; value: string; tone?: SummaryTone }[];
}

export const SUMMARY_CARDS: SummaryCard[] = [
  {
    key: "delivery",
    title: "Teslimat",
    to: "/issues",
    primary: "4 açık hata",
    caption: "2 kritik · SLA içinde",
    tone: "amber",
    rows: [
      { label: "Kritik", value: "2", tone: "red" },
      { label: "İncelemede", value: "5" },
      { label: "Bu hafta kapanan", value: "11", tone: "emerald" },
      { label: "Ort. çözüm", value: "1.8g" },
    ],
  },
  {
    key: "releases",
    title: "Sürümler",
    to: "/releases",
    primary: "v2.4.0 staging",
    caption: "prod'a hazır · 2 bekleyen",
    tone: "default",
    rows: [
      { label: "Bekleyen deploy", value: "2" },
      { label: "Bu ay sürüm", value: "6", tone: "emerald" },
      { label: "Başarı oranı", value: "%97", tone: "emerald" },
      { label: "Son rollback", value: "12g önce" },
    ],
  },
  {
    key: "errors",
    title: "Hata İzleme",
    to: "/errors",
    primary: "1.2K olay / 24s",
    caption: "3 yeni issue grubu",
    tone: "red",
    rows: [
      { label: "Etkilenen kullanıcı", value: "84", tone: "amber" },
      { label: "Yeni grup", value: "3", tone: "red" },
      { label: "Çözülen", value: "9", tone: "emerald" },
      { label: "Crash-free", value: "%99.4", tone: "emerald" },
    ],
  },
  {
    key: "platform",
    title: "Platform",
    to: "/migrations",
    primary: "23 migration",
    caption: "şema senkron · 47 endpoint",
    tone: "emerald",
    rows: [
      { label: "Bekleyen migration", value: "0", tone: "emerald" },
      { label: "Endpoint", value: "47" },
      { label: "API key", value: "8 aktif" },
      { label: "Uptime", value: "%99.98", tone: "emerald" },
    ],
  },
];

/* ── Trafik kaynak dağılımı (donut) ─────────────────────────────────*/
export const TRAFFIC_SOURCES = [
  { label: "REST API", value: 52 },
  { label: "GraphQL", value: 23 },
  { label: "Webhooks", value: 14 },
  { label: "Admin UI", value: 7 },
  { label: "Diğer", value: 4 },
];

/* ── Ortam başına istek hacmi (stacked bar) ─────────────────────────*/
export const ENV_VOLUME = [
  { env: "production", read: 6200, write: 1800 },
  { env: "staging", read: 1400, write: 900 },
  { env: "preview", read: 620, write: 410 },
  { env: "dev", read: 340, write: 280 },
];

/* ── Workspace audit timeline (DetailDrawer Aktivite sekmesi) ────────*/
export const WORKSPACE_AUDIT: AuditEvent[] = [
  { id: "w1", actor: "ci-bot", action: "v2.4.0 sürümünü staging'e deploy etti", at: "12 dk önce", tone: "emerald", detail: "release/v2.4.0 · 4m 12s" },
  { id: "w2", actor: "Ada Yılmaz", action: "Order.placedAt için index ekledi", at: "48 dk önce", tone: "primary", detail: "migration 024_idx_order_placed_at" },
  { id: "w3", actor: "AI Copilot", action: "5 yeni endpoint için OpenAPI dokümanı üretti", at: "1 sa önce", tone: "primary" },
  { id: "w4", actor: "system", action: "Hata oranı eşiği aşıldı, uyarı tetiklendi", at: "2 sa önce", tone: "red", detail: "p95 > 400ms (5 dk pencere)" },
  { id: "w5", actor: "Mert Demir", action: "Payments modülünü production'da etkinleştirdi", at: "3 sa önce", tone: "amber", detail: "feature-flag: payments_v2 → %100" },
  { id: "w6", actor: "you", action: "Brand Primary rengini güncelledi", at: "5 sa önce", tone: "default", detail: "#6E56CF → #7C66E0" },
  { id: "w7", actor: "ci-bot", action: "002_drop_legacy migration'ını geri aldı", at: "1 gün önce", tone: "amber" },
  { id: "w8", actor: "AI Copilot", action: "12 issue için otomatik triyaj çalıştırdı", at: "1 gün önce", tone: "primary", detail: "8 etiketlendi · 3 yinelenen kapatıldı" },
];

/* ── "Dikkat gerektiren" öne çıkanlar (insight derinliği) ───────────*/
export type HighlightTone = "red" | "amber" | "emerald" | "primary";

export interface Highlight {
  id: string;
  tone: HighlightTone;
  title: string;
  detail: string;
  to: string;
  cta: string;
}

export const HIGHLIGHTS: Highlight[] = [
  { id: "h1", tone: "red", title: "Hata oranı dünden %34 yüksek", detail: "Çoğunluk /api/checkout 500'lerinden geliyor.", to: "/errors", cta: "Olayları gör" },
  { id: "h2", tone: "amber", title: "2 deploy staging'de bekliyor", detail: "v2.4.0 ve hotfix/payments prod onayı bekliyor.", to: "/releases", cta: "Sürümler" },
  { id: "h3", tone: "primary", title: "Order.placedAt index'siz filtreleniyor", detail: "Tahmini sorgu süresi %60 düşebilir.", to: "/migrations", cta: "Migration" },
  { id: "h4", tone: "emerald", title: "Crash-free oranı %99.4'e yükseldi", detail: "Son sürümle birlikte 0.6 puan iyileşme.", to: "/health", cta: "Sağlık" },
];
