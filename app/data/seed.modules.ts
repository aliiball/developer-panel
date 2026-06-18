import type { ModuleDef } from "~/stores/module-store";

/* ── Modül marketplace zenginleştirilmiş metadata ─────────────────────
 * module-store / data/modules ortak dosyalarını DEĞİŞTİRMEDEN, route'un
 * ihtiyaç duyduğu marketplace derinliğini (yayıncı, indirme, changelog,
 * lisans, güncelleme bilgisi, aktivite) bu page-local seed sağlar.
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
  breaking?: boolean;
}

export interface ModuleMeta {
  /** ModuleDef.id ile eşleşir */
  id: string;
  publisher: string;
  /** çalışmaya devam etsin diye semver string */
  latest: string;
  /** kurulu olanın güncel sürümü varsa update mevcut */
  updateAvailable?: boolean;
  installs: number;
  rating: number; // 0..5
  reviews: number;
  /** kurulu boyut (MB) */
  sizeMb: number;
  license: "MIT" | "Apache-2.0" | "Commercial" | "BSL-1.1";
  verified: boolean;
  /** son 12 dönemlik kurulum trendi (sparkline) */
  trend: number[];
  updatedAt: string;
  repo: string;
  changelog: ChangelogEntry[];
}

/** id → meta (route içi join) */
export const MODULE_META: Record<string, ModuleMeta> = {
  ecommerce: {
    id: "ecommerce",
    publisher: "MetaPanel Core",
    latest: "2.5.0",
    updateAvailable: true,
    installs: 18420,
    rating: 4.8,
    reviews: 612,
    sizeMb: 4.2,
    license: "Apache-2.0",
    verified: true,
    trend: [120, 138, 145, 160, 172, 168, 190, 210, 225, 240, 258, 271],
    updatedAt: "3 gün önce",
    repo: "metapanel/mod-ecommerce",
    changelog: [
      { version: "2.5.0", date: "2026-06-15", breaking: false, notes: ["Stripe Tax desteği", "Sepet TTL ayarı", "Order webhook retry"] },
      { version: "2.4.1", date: "2026-05-02", notes: ["Coupon hesaplama düzeltmesi", "Wishlist N+1 sorgu optimizasyonu"] },
      { version: "2.4.0", date: "2026-03-21", breaking: true, notes: ["Order modeli `currency` zorunlu", "Eski v1 checkout API kaldırıldı"] },
    ],
  },
  blog: {
    id: "blog",
    publisher: "MetaPanel Core",
    latest: "1.8.0",
    installs: 9240,
    rating: 4.6,
    reviews: 288,
    sizeMb: 1.8,
    license: "MIT",
    verified: true,
    trend: [60, 64, 70, 68, 75, 80, 78, 82, 90, 88, 95, 101],
    updatedAt: "1 hafta önce",
    repo: "metapanel/mod-blog",
    changelog: [
      { version: "1.8.0", date: "2026-06-08", notes: ["Markdown taslak otomatik kaydetme", "Etiket birleştirme aracı"] },
      { version: "1.7.2", date: "2026-04-30", notes: ["RSS feed cache", "Kategori slug çakışması düzeltildi"] },
    ],
  },
  crm: {
    id: "crm",
    publisher: "Atlas Labs",
    latest: "3.2.0",
    updateAvailable: true,
    installs: 7110,
    rating: 4.4,
    reviews: 196,
    sizeMb: 3.1,
    license: "Commercial",
    verified: true,
    trend: [40, 44, 50, 55, 53, 60, 66, 70, 72, 80, 84, 91],
    updatedAt: "2 gün önce",
    repo: "atlas/mod-crm",
    changelog: [
      { version: "3.2.0", date: "2026-06-16", notes: ["Segment AI önerileri", "Aktivite zaman çizelgesi"] },
      { version: "3.1.2", date: "2026-05-11", notes: ["Adres doğrulama hatası giderildi"] },
    ],
  },
  inventory: {
    id: "inventory",
    publisher: "Atlas Labs",
    latest: "1.2.5",
    installs: 3320,
    rating: 4.1,
    reviews: 74,
    sizeMb: 2.0,
    license: "Commercial",
    verified: false,
    trend: [20, 22, 19, 24, 26, 25, 28, 30, 29, 33, 31, 36],
    updatedAt: "3 hafta önce",
    repo: "atlas/mod-inventory",
    changelog: [
      { version: "1.2.5", date: "2026-05-24", notes: ["Depo bazlı stok seviyeleri", "Düşük stok uyarısı"] },
    ],
  },
  auth: {
    id: "auth",
    publisher: "MetaPanel Core",
    latest: "4.0.0",
    installs: 31050,
    rating: 4.9,
    reviews: 1204,
    sizeMb: 1.1,
    license: "Apache-2.0",
    verified: true,
    trend: [200, 210, 225, 240, 260, 280, 300, 310, 330, 350, 372, 401],
    updatedAt: "5 gün önce",
    repo: "metapanel/mod-auth",
    changelog: [
      { version: "4.0.0", date: "2026-06-13", breaking: true, notes: ["Passkey/WebAuthn", "Eski JWT secret rotasyonu zorunlu", "Scope tabanlı RBAC"] },
      { version: "3.6.1", date: "2026-04-18", notes: ["Rate limit bypass yaması (güvenlik)"] },
    ],
  },
  payments: {
    id: "payments",
    publisher: "MetaPanel Core",
    latest: "2.0.3",
    installs: 14980,
    rating: 4.7,
    reviews: 503,
    sizeMb: 2.6,
    license: "Apache-2.0",
    verified: true,
    trend: [90, 98, 105, 110, 120, 118, 130, 140, 145, 150, 162, 171],
    updatedAt: "4 gün önce",
    repo: "metapanel/mod-payments",
    changelog: [
      { version: "2.0.3", date: "2026-06-10", notes: ["Iyzico 3DS akışı", "Invoice PDF şablonu"] },
      { version: "2.0.0", date: "2026-02-09", breaking: true, notes: ["Yeni Payment intent API", "PayPal v1 kaldırıldı"] },
    ],
  },
  media: {
    id: "media",
    publisher: "MetaPanel Core",
    latest: "1.6.0",
    updateAvailable: true,
    installs: 22300,
    rating: 4.5,
    reviews: 410,
    sizeMb: 0.9,
    license: "MIT",
    verified: true,
    trend: [110, 120, 118, 130, 140, 138, 150, 160, 158, 170, 182, 195],
    updatedAt: "6 gün önce",
    repo: "metapanel/mod-media",
    changelog: [
      { version: "1.6.0", date: "2026-06-12", notes: ["AVIF dönüştürme", "İmzalı CDN URL'leri"] },
      { version: "1.5.1", date: "2026-04-22", notes: ["Yükleme parça boyutu ayarı"] },
    ],
  },
  "api-gateway": {
    id: "api-gateway",
    publisher: "MetaPanel Core",
    latest: "1.0.0",
    installs: 5400,
    rating: 4.3,
    reviews: 132,
    sizeMb: 1.4,
    license: "Apache-2.0",
    verified: true,
    trend: [10, 14, 18, 22, 28, 33, 40, 46, 52, 60, 68, 77],
    updatedAt: "2 hafta önce",
    repo: "metapanel/mod-api-gateway",
    changelog: [
      { version: "1.0.0", date: "2026-05-30", notes: ["GA çıkış", "GraphQL federation", "Per-route rate limit"] },
    ],
  },
};

/* ── Ek marketplace adayları (henüz kurulmamış) ───────────────────────
 * data/modules.ts'teki 3 marketplace modülüne ek olarak route'a daha
 * gerçekçi yoğunluk veren 6 aday daha. ModuleDef sözleşmesine uyumlu.
 */
export const EXTRA_MARKETPLACE: ModuleDef[] = [
  {
    id: "search",
    name: "Search & Index",
    description: "Tam metin arama, faceting ve typo-tolerans.",
    icon: "Plug",
    version: "1.4.0",
    active: false,
    installed: false,
    category: "Insights",
    dependencies: ["auth"],
    models: [],
  },
  {
    id: "reviews",
    name: "Ratings & Reviews",
    description: "Ürün puanlama, yorum moderasyonu ve rozetler.",
    icon: "Users",
    version: "0.7.2",
    active: false,
    installed: false,
    category: "Engagement",
    dependencies: ["auth", "media", "ecommerce"],
    models: ["Review"],
  },
  {
    id: "loyalty",
    name: "Loyalty & Points",
    description: "Puan biriktirme, kademeler ve ödül kampanyaları.",
    icon: "CreditCard",
    version: "1.1.0",
    active: false,
    installed: false,
    category: "Engagement",
    dependencies: ["auth", "ecommerce"],
    models: [],
  },
  {
    id: "webhooks-pro",
    name: "Webhooks Pro",
    description: "İmzalı webhook teslimatı, retry ve dead-letter.",
    icon: "Plug",
    version: "2.0.1",
    active: false,
    installed: false,
    category: "Core",
    dependencies: ["api-gateway"],
    models: [],
  },
  {
    id: "audit-log",
    name: "Audit Log",
    description: "Değişmez denetim kaydı ve uyumluluk dışa aktarımı.",
    icon: "KeyRound",
    version: "1.3.0",
    active: false,
    installed: false,
    category: "Core",
    dependencies: ["auth"],
    models: [],
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    description: "Plan, abonelik ve tekrarlayan faturalama.",
    icon: "CreditCard",
    version: "0.5.0",
    active: false,
    installed: false,
    category: "Commerce",
    dependencies: ["auth", "payments"],
    models: ["Plan", "Subscription", "Invoice"],
  },
];

/** marketplace modülleri için de meta (kurulum öncesi vitrin verisi) */
export const MARKETPLACE_META: Record<string, ModuleMeta> = {
  analytics: { id: "analytics", publisher: "Insight Co", latest: "0.9.0", installs: 4120, rating: 4.2, reviews: 88, sizeMb: 1.5, license: "MIT", verified: true, trend: [12, 16, 20, 24, 30, 36, 42, 48, 55, 62, 70, 79], updatedAt: "1 hafta önce", repo: "insightco/mod-analytics", changelog: [{ version: "0.9.0", date: "2026-06-05", notes: ["Funnel builder beta", "Olay debounce"] }] },
  i18n: { id: "i18n", publisher: "Community", latest: "1.1.0", installs: 8800, rating: 4.4, reviews: 210, sizeMb: 0.6, license: "MIT", verified: false, trend: [40, 44, 48, 52, 58, 60, 66, 70, 74, 80, 86, 92], updatedAt: "5 gün önce", repo: "community/mod-i18n", changelog: [{ version: "1.1.0", date: "2026-06-09", notes: ["ICU mesaj formatı", "RTL desteği"] }] },
  notifications: { id: "notifications", publisher: "Atlas Labs", latest: "2.2.0", installs: 11200, rating: 4.5, reviews: 340, sizeMb: 1.2, license: "Commercial", verified: true, trend: [60, 66, 70, 78, 84, 90, 98, 104, 112, 120, 128, 137], updatedAt: "3 gün önce", repo: "atlas/mod-notifications", changelog: [{ version: "2.2.0", date: "2026-06-14", notes: ["Push (FCM/APNs)", "Şablon değişkenleri"] }] },
  search: { id: "search", publisher: "Insight Co", latest: "1.4.0", installs: 6300, rating: 4.6, reviews: 145, sizeMb: 2.2, license: "Apache-2.0", verified: true, trend: [20, 24, 28, 34, 40, 46, 52, 58, 64, 72, 80, 88], updatedAt: "4 gün önce", repo: "insightco/mod-search", changelog: [{ version: "1.4.0", date: "2026-06-11", notes: ["Synonym sözlüğü", "Faceted filtreler"] }] },
  reviews: { id: "reviews", publisher: "Community", latest: "0.7.2", installs: 2100, rating: 3.9, reviews: 41, sizeMb: 0.8, license: "MIT", verified: false, trend: [4, 6, 8, 10, 12, 11, 14, 16, 18, 20, 22, 25], updatedAt: "2 hafta önce", repo: "community/mod-reviews", changelog: [{ version: "0.7.2", date: "2026-05-28", notes: ["Spam filtresi", "Yıldız dağılımı widget"] }] },
  loyalty: { id: "loyalty", publisher: "Atlas Labs", latest: "1.1.0", installs: 3800, rating: 4.3, reviews: 97, sizeMb: 1.1, license: "Commercial", verified: true, trend: [10, 12, 16, 18, 22, 26, 30, 34, 38, 42, 48, 54], updatedAt: "1 hafta önce", repo: "atlas/mod-loyalty", changelog: [{ version: "1.1.0", date: "2026-06-07", notes: ["Kademe kuralları", "Süresi dolan puanlar"] }] },
  "webhooks-pro": { id: "webhooks-pro", publisher: "MetaPanel Core", latest: "2.0.1", installs: 5900, rating: 4.7, reviews: 160, sizeMb: 0.7, license: "Apache-2.0", verified: true, trend: [18, 22, 26, 30, 36, 40, 46, 52, 58, 64, 70, 77], updatedAt: "6 gün önce", repo: "metapanel/mod-webhooks-pro", changelog: [{ version: "2.0.1", date: "2026-06-10", notes: ["Dead-letter kuyruğu", "HMAC imzalama"] }] },
  "audit-log": { id: "audit-log", publisher: "MetaPanel Core", latest: "1.3.0", installs: 7400, rating: 4.8, reviews: 220, sizeMb: 0.9, license: "Apache-2.0", verified: true, trend: [30, 34, 40, 46, 52, 58, 64, 70, 76, 82, 90, 98], updatedAt: "3 gün önce", repo: "metapanel/mod-audit-log", changelog: [{ version: "1.3.0", date: "2026-06-15", notes: ["WORM saklama", "CSV/JSON dışa aktarım"] }] },
  subscriptions: { id: "subscriptions", publisher: "MetaPanel Core", latest: "0.5.0", installs: 1500, rating: 4.0, reviews: 22, sizeMb: 1.3, license: "BSL-1.1", verified: true, trend: [2, 3, 4, 6, 8, 10, 12, 15, 18, 22, 26, 31], updatedAt: "8 gün önce", repo: "metapanel/mod-subscriptions", changelog: [{ version: "0.5.0", date: "2026-06-02", notes: ["Proration", "Deneme süresi", "Webhook olayları"] }] },
};

export function metaFor(id: string): ModuleMeta | undefined {
  return MODULE_META[id] ?? MARKETPLACE_META[id];
}
