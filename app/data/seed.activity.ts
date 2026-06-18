// Page-local seed for the Activity (kullanım analitiği) surface.
// Zengin, gerçekçi aktivite akışı + dönem bazlı kullanım serileri.
import type { ActivityType } from "~/data/activities";

export type Period = "24h" | "7d" | "30d";

export interface RichActivity {
  id: string;
  type: ActivityType;
  title: string;
  target: string;
  /** "5 dk" gibi göreli süre — akışta gösterilir */
  timeAgo: string;
  /** ISO benzeri okunabilir damga — detayda gösterilir */
  at: string;
  actor: string;
  /** olayın hangi dönem penceresine düştüğü */
  period: Period;
  /** opsiyonel diff/detay satırı */
  detail?: string;
  /** sonuç durumu */
  status: "success" | "warning" | "failed";
  /** kaynak yüzey */
  source: string;
}

export const RICH_ACTIVITIES: RichActivity[] = [
  { id: "ev-101", type: "model", title: "Model güncellendi", target: "Customer", timeAgo: "5 dk", at: "18 Haz 14:02", actor: "Ada Yılmaz", period: "24h", status: "success", source: "Schema Designer", detail: "+2 alan, 1 index" },
  { id: "ev-102", type: "module", title: "Modül etkinleştirildi", target: "E-Commerce", timeAgo: "38 dk", at: "18 Haz 13:29", actor: "Ada Yılmaz", period: "24h", status: "success", source: "Modules" },
  { id: "ev-103", type: "migration", title: "Migration uygulandı", target: "003_add_orders", timeAgo: "1 sa", at: "18 Haz 13:05", actor: "ci-bot", period: "24h", status: "success", source: "Migrations", detail: "12 satır DDL, 240ms" },
  { id: "ev-104", type: "api", title: "Endpoint üretildi", target: "/api/products", timeAgo: "2 sa", at: "18 Haz 12:11", actor: "system", period: "24h", status: "success", source: "API Explorer" },
  { id: "ev-105", type: "ai", title: "AI ile şema üretildi", target: "BlogPost + Category", timeAgo: "3 sa", at: "18 Haz 11:20", actor: "AI Copilot", period: "24h", status: "success", source: "AI Copilot", detail: "2 model, 9 alan önerildi" },
  { id: "ev-106", type: "api", title: "Rate limit aşımı", target: "API Gateway", timeAgo: "3 sa", at: "18 Haz 11:02", actor: "system", period: "24h", status: "warning", source: "API Gateway", detail: "429 — istemci 9f12" },
  { id: "ev-107", type: "theme", title: "Marka rengi değişti", target: "Brand Primary", timeAgo: "4 sa", at: "18 Haz 10:14", actor: "Deniz Kaya", period: "24h", status: "success", source: "Theme" },
  { id: "ev-108", type: "model", title: "Alan eklendi", target: "Product.stock", timeAgo: "6 sa", at: "18 Haz 08:40", actor: "Ada Yılmaz", period: "24h", status: "success", source: "Schema Designer" },
  { id: "ev-109", type: "migration", title: "Migration başarısız", target: "004_fk_constraint", timeAgo: "8 sa", at: "18 Haz 06:33", actor: "ci-bot", period: "24h", status: "failed", source: "Migrations", detail: "FK ihlali: orders.user_id" },

  { id: "ev-201", type: "module", title: "Bağımlılık çözüldü", target: "Payments → Auth", timeAgo: "1 gün", at: "17 Haz 16:50", actor: "system", period: "7d", status: "success", source: "Modules" },
  { id: "ev-202", type: "migration", title: "Migration geri alındı", target: "002_drop_legacy", timeAgo: "1 gün", at: "17 Haz 15:22", actor: "Mert Aydın", period: "7d", status: "warning", source: "Migrations", detail: "rollback — 3 tablo etkilendi" },
  { id: "ev-203", type: "api", title: "Rate limit ayarlandı", target: "API Gateway", timeAgo: "2 gün", at: "16 Haz 10:05", actor: "Ada Yılmaz", period: "7d", status: "success", source: "API Gateway", detail: "1000 → 2500 rpm" },
  { id: "ev-204", type: "ai", title: "AI release notu üretti", target: "v2.4.0", timeAgo: "2 gün", at: "16 Haz 09:41", actor: "AI Copilot", period: "7d", status: "success", source: "Releases" },
  { id: "ev-205", type: "model", title: "İlişki kuruldu", target: "Order → Customer", timeAgo: "3 gün", at: "15 Haz 14:18", actor: "Deniz Kaya", period: "7d", status: "success", source: "Schema Designer", detail: "belongsTo (1:N)" },
  { id: "ev-206", type: "module", title: "Modül devre dışı", target: "Legacy CRM", timeAgo: "4 gün", at: "14 Haz 11:30", actor: "Mert Aydın", period: "7d", status: "warning", source: "Modules" },
  { id: "ev-207", type: "api", title: "Webhook tetiklendi", target: "order.created", timeAgo: "5 gün", at: "13 Haz 18:02", actor: "system", period: "7d", status: "success", source: "Webhooks", detail: "204 → partner-x" },

  { id: "ev-301", type: "model", title: "Şema sürümü yayınlandı", target: "schema@v12", timeAgo: "9 gün", at: "09 Haz 10:00", actor: "Ada Yılmaz", period: "30d", status: "success", source: "Schema Designer" },
  { id: "ev-302", type: "migration", title: "Toplu migration", target: "batch_2026_06", timeAgo: "12 gün", at: "06 Haz 02:15", actor: "ci-bot", period: "30d", status: "success", source: "Migrations", detail: "7 migration, 1.4s" },
  { id: "ev-303", type: "ai", title: "AI veri temizliği önerdi", target: "Customer.email", timeAgo: "18 gün", at: "31 May 13:44", actor: "AI Copilot", period: "30d", status: "success", source: "AI Copilot", detail: "412 yinelenen kayıt" },
  { id: "ev-304", type: "api", title: "API anahtarı döndürüldü", target: "prod-key-7", timeAgo: "21 gün", at: "28 May 09:10", actor: "Mert Aydın", period: "30d", status: "warning", source: "API Keys" },
];

/** Tip bazında okunabilir etiket + ton (rozet/timeline için). */
export const TYPE_META: Record<ActivityType, { label: string; tone: "default" | "primary" | "emerald" | "amber" | "red" }> = {
  model: { label: "Model", tone: "primary" },
  module: { label: "Modül", tone: "emerald" },
  migration: { label: "Migration", tone: "amber" },
  api: { label: "API", tone: "default" },
  theme: { label: "Tema", tone: "default" },
  ai: { label: "AI", tone: "primary" },
};

// Dönem bazlı kullanım serileri (recharts).
export interface UsagePoint {
  label: string;
  api: number;
  ai: number;
  events: number;
}

export const USAGE_SERIES: Record<Period, UsagePoint[]> = {
  "24h": [
    { label: "00:00", api: 410, ai: 12, events: 6 },
    { label: "04:00", api: 280, ai: 5, events: 3 },
    { label: "08:00", api: 920, ai: 22, events: 11 },
    { label: "12:00", api: 1480, ai: 31, events: 17 },
    { label: "16:00", api: 1310, ai: 28, events: 14 },
    { label: "20:00", api: 760, ai: 14, events: 8 },
  ],
  "7d": [
    { label: "Pzt", api: 8200, ai: 96, events: 42 },
    { label: "Sal", api: 9100, ai: 110, events: 51 },
    { label: "Çar", api: 11800, ai: 142, events: 63 },
    { label: "Per", api: 10400, ai: 121, events: 55 },
    { label: "Cum", api: 13600, ai: 168, events: 72 },
    { label: "Cmt", api: 6100, ai: 61, events: 28 },
    { label: "Paz", api: 4800, ai: 44, events: 19 },
  ],
  "30d": [
    { label: "1. Hafta", api: 52000, ai: 540, events: 240 },
    { label: "2. Hafta", api: 61000, ai: 612, events: 281 },
    { label: "3. Hafta", api: 58000, ai: 588, events: 263 },
    { label: "4. Hafta", api: 67000, ai: 701, events: 312 },
  ],
};

// Kaynak yüzeylere göre kullanım dağılımı (bar).
export const SOURCE_USAGE: { label: string; value: number }[] = [
  { label: "API Gateway", value: 142 },
  { label: "Schema Designer", value: 86 },
  { label: "AI Copilot", value: 54 },
  { label: "Migrations", value: 47 },
  { label: "Modules", value: 33 },
  { label: "Webhooks", value: 21 },
];

/** Dönem KPI özetleri: değer + dönem-üstü yüzde delta + sparkline. */
export const PERIOD_KPIS: Record<
  Period,
  { apiCalls: { value: string; delta: number; trend: number[] }; aiRuns: { value: string; delta: number; trend: number[] }; events: { value: string; delta: number; trend: number[] }; errorRate: { value: string; delta: number; trend: number[] } }
> = {
  "24h": {
    apiCalls: { value: "5.2K", delta: 8, trend: [410, 280, 920, 1480, 1310, 760] },
    aiRuns: { value: "112", delta: 14, trend: [12, 5, 22, 31, 28, 14] },
    events: { value: "59", delta: -4, trend: [6, 3, 11, 17, 14, 8] },
    errorRate: { value: "%1.2", delta: -6, trend: [3, 2, 4, 5, 3, 2] },
  },
  "7d": {
    apiCalls: { value: "64K", delta: 12, trend: [8200, 9100, 11800, 10400, 13600, 6100, 4800] },
    aiRuns: { value: "752", delta: 19, trend: [96, 110, 142, 121, 168, 61, 44] },
    events: { value: "330", delta: 6, trend: [42, 51, 63, 55, 72, 28, 19] },
    errorRate: { value: "%2.1", delta: 9, trend: [320, 410, 380, 520, 610, 480, 470] },
  },
  "30d": {
    apiCalls: { value: "238K", delta: 23, trend: [52000, 61000, 58000, 67000] },
    aiRuns: { value: "2.4K", delta: 17, trend: [540, 612, 588, 701] },
    events: { value: "1.1K", delta: 11, trend: [240, 281, 263, 312] },
    errorRate: { value: "%1.8", delta: -3, trend: [2, 3, 2, 2] },
  },
};
