// Mock data for the 10 expansion-surface pages.

// ── Workflows ─────────────────────────────────────────────────────
export interface WorkflowStep {
  label: string;
  type: "trigger" | "condition" | "action";
}
export interface WorkflowDef {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  runs: number;
  steps: WorkflowStep[];
}

export const WORKFLOWS: WorkflowDef[] = [
  {
    id: "order-paid",
    name: "Sipariş Ödendi → Fatura",
    trigger: "Order.status = paid",
    active: true,
    runs: 1284,
    steps: [
      { label: "Order.status 'paid' oldu", type: "trigger" },
      { label: "Toplam > 0 mı?", type: "condition" },
      { label: "Fatura oluştur", type: "action" },
      { label: "Müşteriye e-posta gönder", type: "action" },
    ],
  },
  {
    id: "welcome",
    name: "Hoş Geldin Akışı",
    trigger: "Customer oluşturuldu",
    active: true,
    runs: 642,
    steps: [
      { label: "Yeni Customer", type: "trigger" },
      { label: "Hoş geldin e-postası", type: "action" },
      { label: "3 gün bekle", type: "action" },
      { label: "Onboarding ipucu gönder", type: "action" },
    ],
  },
  {
    id: "low-stock",
    name: "Düşük Stok Uyarısı",
    trigger: "Product.stock < 10",
    active: false,
    runs: 97,
    steps: [
      { label: "Stock 10'un altına düştü", type: "trigger" },
      { label: "Stok > 0 mı?", type: "condition" },
      { label: "Slack'e bildir", type: "action" },
    ],
  },
  {
    id: "abandoned-cart",
    name: "Terk Edilmiş Sepet",
    trigger: "Sepet 1sa hareketsiz",
    active: true,
    runs: 415,
    steps: [
      { label: "Sepet 1 saat hareketsiz", type: "trigger" },
      { label: "Hatırlatma e-postası", type: "action" },
      { label: "Kupon ekle", type: "action" },
    ],
  },
];

// ── Media ─────────────────────────────────────────────────────────
export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "doc" | "audio";
  size: string;
  hue: number;
  dims?: string;
}

export const MEDIA: MediaItem[] = [
  { id: "m1", name: "hero-banner.png", type: "image", size: "842 KB", hue: 250, dims: "1920×1080" },
  { id: "m2", name: "product-01.jpg", type: "image", size: "412 KB", hue: 160, dims: "1200×1200" },
  { id: "m3", name: "promo.mp4", type: "video", size: "8.4 MB", hue: 20, dims: "1080p" },
  { id: "m4", name: "katalog.pdf", type: "doc", size: "2.1 MB", hue: 0 },
  { id: "m5", name: "product-02.jpg", type: "image", size: "388 KB", hue: 190, dims: "1200×1200" },
  { id: "m6", name: "jingle.mp3", type: "audio", size: "1.2 MB", hue: 300 },
  { id: "m7", name: "avatar-set.png", type: "image", size: "120 KB", hue: 280, dims: "512×512" },
  { id: "m8", name: "sözleşme.pdf", type: "doc", size: "640 KB", hue: 0 },
  { id: "m9", name: "background.jpg", type: "image", size: "1.5 MB", hue: 210, dims: "2560×1440" },
  { id: "m10", name: "intro.mp4", type: "video", size: "12.7 MB", hue: 40, dims: "720p" },
  { id: "m11", name: "logo-dark.png", type: "image", size: "44 KB", hue: 230, dims: "400×120" },
  { id: "m12", name: "rapor-q2.pdf", type: "doc", size: "980 KB", hue: 0 },
];

// ── Email templates ───────────────────────────────────────────────
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  updated: string;
  variables: string[];
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Hoş Geldiniz",
    subject: "{{firstName}}, aramıza hoş geldin!",
    category: "Onboarding",
    updated: "2 gün önce",
    variables: ["firstName", "appName", "ctaUrl"],
    body: "Merhaba {{firstName}},\n\n{{appName}}'e hoş geldin! Hesabın hazır. Hemen başlamak için:\n\n[Panele Git]({{ctaUrl}})\n\nSorun olursa yanıtla, buradayız.",
  },
  {
    id: "order-confirm",
    name: "Sipariş Onayı",
    subject: "Siparişin alındı — #{{orderRef}}",
    category: "Transactional",
    updated: "5 saat önce",
    variables: ["firstName", "orderRef", "total", "trackUrl"],
    body: "Merhaba {{firstName}},\n\n#{{orderRef}} numaralı siparişin onaylandı. Toplam: {{total}}.\n\nKargonu takip et: {{trackUrl}}",
  },
  {
    id: "reset",
    name: "Şifre Sıfırlama",
    subject: "Şifre sıfırlama isteği",
    category: "Security",
    updated: "1 hafta önce",
    variables: ["firstName", "resetUrl", "expiresIn"],
    body: "Merhaba {{firstName}},\n\nŞifreni sıfırlamak için aşağıdaki bağlantıya tıkla. {{expiresIn}} içinde geçerli.\n\n[Şifremi Sıfırla]({{resetUrl}})",
  },
  {
    id: "invoice",
    name: "Fatura",
    subject: "Faturan hazır — {{invoiceNo}}",
    category: "Transactional",
    updated: "3 gün önce",
    variables: ["firstName", "invoiceNo", "amount", "pdfUrl"],
    body: "Merhaba {{firstName}},\n\n{{invoiceNo}} numaralı faturan ({{amount}}) hazır.\n\n[PDF indir]({{pdfUrl}})",
  },
];

// ── Scheduler (cron) ──────────────────────────────────────────────
export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  human: string;
  nextRun: string;
  lastStatus: "success" | "failed" | "running";
  enabled: boolean;
}

export const CRON_JOBS: CronJob[] = [
  { id: "j1", name: "Günlük yedek", schedule: "0 3 * * *", human: "Her gün 03:00", nextRun: "12s sonra", lastStatus: "success", enabled: true },
  { id: "j2", name: "Stok senkron", schedule: "*/15 * * * *", human: "Her 15 dk", nextRun: "8 dk sonra", lastStatus: "success", enabled: true },
  { id: "j3", name: "Haftalık rapor", schedule: "0 9 * * 1", human: "Pzt 09:00", nextRun: "3 gün sonra", lastStatus: "success", enabled: true },
  { id: "j4", name: "Önbellek temizliği", schedule: "0 * * * *", human: "Saat başı", nextRun: "24 dk sonra", lastStatus: "failed", enabled: false },
  { id: "j5", name: "Terk edilmiş sepet taraması", schedule: "*/30 * * * *", human: "Her 30 dk", nextRun: "11 dk sonra", lastStatus: "running", enabled: true },
  { id: "j6", name: "Aylık fatura kapanışı", schedule: "0 0 1 * *", human: "Ayın 1'i 00:00", nextRun: "19 gün sonra", lastStatus: "success", enabled: true },
];

// ── Webhooks ──────────────────────────────────────────────────────
export interface WebhookDef {
  id: string;
  url: string;
  events: string[];
  status: "active" | "paused" | "failing";
  lastDelivery: string;
  successRate: number;
}

export const WEBHOOKS: WebhookDef[] = [
  { id: "w1", url: "https://hooks.acme.com/orders", events: ["order.created", "order.paid"], status: "active", lastDelivery: "2 dk önce", successRate: 99.8 },
  { id: "w2", url: "https://api.partner.io/sync", events: ["product.updated"], status: "active", lastDelivery: "11 dk önce", successRate: 98.1 },
  { id: "w3", url: "https://slack.com/webhook/T0/B1", events: ["customer.created"], status: "paused", lastDelivery: "2 gün önce", successRate: 100 },
  { id: "w4", url: "https://crm.legacy.net/in", events: ["order.created", "invoice.created"], status: "failing", lastDelivery: "1 sa önce", successRate: 62.4 },
];

export interface WebhookDelivery {
  id: string;
  event: string;
  status: number;
  time: string;
}
export const WEBHOOK_DELIVERIES: WebhookDelivery[] = [
  { id: "d1", event: "order.paid", status: 200, time: "2 dk önce" },
  { id: "d2", event: "order.created", status: 200, time: "6 dk önce" },
  { id: "d3", event: "product.updated", status: 200, time: "11 dk önce" },
  { id: "d4", event: "invoice.created", status: 500, time: "18 dk önce" },
  { id: "d5", event: "order.created", status: 200, time: "24 dk önce" },
  { id: "d6", event: "invoice.created", status: 503, time: "32 dk önce" },
];

// ── Logs ──────────────────────────────────────────────────────────
export type LogLevel = "info" | "warn" | "error" | "debug";
export interface LogLine {
  id: string;
  level: LogLevel;
  time: string;
  source: string;
  message: string;
}

export const LOGS: LogLine[] = [
  { id: "l1", level: "info", time: "10:24:01", source: "api", message: "GET /api/products 200 in 42ms" },
  { id: "l2", level: "info", time: "10:24:00", source: "auth", message: "Kullanıcı oturum açtı: user#142" },
  { id: "l3", level: "warn", time: "10:23:58", source: "db", message: "Yavaş sorgu: orders (placed_at index'i yok) 318ms" },
  { id: "l4", level: "error", time: "10:23:55", source: "webhook", message: "Teslimat başarısız: crm.legacy.net 503" },
  { id: "l5", level: "info", time: "10:23:51", source: "api", message: "POST /api/orders 201 in 88ms" },
  { id: "l6", level: "debug", time: "10:23:50", source: "cache", message: "Cache miss: product:1042" },
  { id: "l7", level: "info", time: "10:23:47", source: "scheduler", message: "Job 'Stok senkron' tamamlandı (1.2s)" },
  { id: "l8", level: "warn", time: "10:23:44", source: "auth", message: "Rate limit yaklaşıldı: 92/100 ip=10.0.0.4" },
  { id: "l9", level: "error", time: "10:23:40", source: "api", message: "POST /api/payments 500 — provider timeout" },
  { id: "l10", level: "info", time: "10:23:39", source: "migration", message: "003_add_orders uygulandı" },
  { id: "l11", level: "debug", time: "10:23:37", source: "db", message: "Bağlantı havuzu: 6/20 aktif" },
  { id: "l12", level: "info", time: "10:23:35", source: "api", message: "GET /api/customers 200 in 31ms" },
];

// ── Health ────────────────────────────────────────────────────────
export interface ServiceHealth {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  uptime: number;
  spark: number[];
}

export const SERVICES: ServiceHealth[] = [
  { id: "api", name: "API Gateway", status: "operational", latencyMs: 42, uptime: 99.98, spark: [40, 44, 41, 38, 45, 42, 39, 42] },
  { id: "db", name: "PostgreSQL", status: "degraded", latencyMs: 188, uptime: 99.41, spark: [60, 90, 120, 150, 170, 188, 160, 188] },
  { id: "queue", name: "Job Queue", status: "operational", latencyMs: 12, uptime: 99.99, spark: [10, 12, 11, 13, 12, 11, 12, 12] },
  { id: "cache", name: "Redis Cache", status: "operational", latencyMs: 3, uptime: 100, spark: [3, 4, 3, 2, 3, 3, 4, 3] },
  { id: "storage", name: "Object Storage", status: "operational", latencyMs: 67, uptime: 99.95, spark: [70, 65, 68, 66, 64, 67, 69, 67] },
  { id: "webhook", name: "Webhook Dispatcher", status: "down", latencyMs: 0, uptime: 96.2, spark: [80, 60, 40, 20, 0, 0, 0, 0] },
];

// ── Docs sections ─────────────────────────────────────────────────
export interface DocSection {
  id: string;
  title: string;
  body: string;
}
export const DOC_SECTIONS: DocSection[] = [
  {
    id: "auth",
    title: "Kimlik Doğrulama",
    body: "Tüm istekler `Authorization: Bearer <token>` başlığı gerektirir. Token'ı `/api/auth/login` ile alın. Token'lar 24 saat geçerlidir; süresi dolanlar 401 döndürür.",
  },
  {
    id: "pagination",
    title: "Sayfalama",
    body: "Liste uçları `?page=1&pageSize=20` parametrelerini kabul eder. Yanıt `{ data, total, page }` zarfı döndürür. Maks pageSize 100'dür.",
  },
  {
    id: "errors",
    title: "Hata Formatı",
    body: "Hatalar `{ error: { code, message, details? } }` biçimindedir. 4xx istemci, 5xx sunucu hatasıdır. `details` alan-bazlı doğrulama mesajları içerir.",
  },
  {
    id: "rate-limit",
    title: "Hız Limiti",
    body: "Varsayılan 100 istek/dakika/IP. Limit aşılırsa 429 ve `Retry-After` başlığı döner. API Gateway modülünden ayarlanabilir.",
  },
  {
    id: "webhooks",
    title: "Webhook'lar",
    body: "Olaylar (order.created, order.paid, customer.created …) kayıtlı uç noktalara POST edilir. İmza `X-Signature` başlığında HMAC-SHA256 ile gönderilir. 3 kez yeniden denenir.",
  },
];
