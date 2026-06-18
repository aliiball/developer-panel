// Page-local seed for the Workflows surface (enterprise-grade).
// Extends the base WorkflowDef rows with run history, metrics and audit.
import type { WorkflowDef, WorkflowStep } from "~/data/expansion";

export interface WorkflowRun {
  id: string;
  at: string;
  status: "success" | "failed" | "running" | "skipped";
  durationMs: number;
  trigger: string;
}

export interface WorkflowAudit {
  id: string;
  action: string;
  actor: string;
  at: string;
  tone?: "default" | "primary" | "emerald" | "amber" | "red";
  detail?: string;
}

export type WorkflowCategory = "satış" | "müşteri" | "operasyon" | "pazarlama" | "finans";

export interface WorkflowMeta {
  id: string;
  category: WorkflowCategory;
  owner: string;
  updatedAt: string;
  /** son 24 saatlik çalışma sayısı (sparkline, 12 nokta) */
  trend: number[];
  /** başarı oranı yüzdesi */
  successRate: number;
  /** ortalama çalışma süresi (ms) */
  avgMs: number;
  /** son hata mesajı (varsa) */
  lastError?: string;
  runHistory: WorkflowRun[];
  audit: WorkflowAudit[];
}

// Step zincirlerini de zenginleştiren ek workflow tanımları.
const EXTRA_STEPS: Record<string, WorkflowStep[]> = {
  "refund-flow": [
    { label: "Order.status 'cancelled' oldu", type: "trigger" },
    { label: "Ödeme alınmış mı?", type: "condition" },
    { label: "Stripe iade başlat", type: "action" },
    { label: "Stok iadesi yap", type: "action" },
    { label: "Müşteriye bilgi e-postası", type: "action" },
  ],
  "review-request": [
    { label: "Sipariş teslim edildi", type: "trigger" },
    { label: "Teslimattan 5 gün geçti mi?", type: "condition" },
    { label: "Değerlendirme isteği gönder", type: "action" },
  ],
  "vip-upgrade": [
    { label: "Müşteri toplam harcama > 10.000₺", type: "trigger" },
    { label: "VIP segment'e ekle", type: "action" },
    { label: "Hesap yöneticisine ata", type: "action" },
    { label: "Hoş geldin paketi gönder", type: "action" },
  ],
  "fraud-hold": [
    { label: "Yüksek riskli ödeme algılandı", type: "trigger" },
    { label: "Risk skoru > 80 mi?", type: "condition" },
    { label: "Siparişi beklet", type: "action" },
    { label: "Finans ekibine bildir", type: "action" },
  ],
  "weekly-digest": [
    { label: "Her Pazartesi 09:00", type: "trigger" },
    { label: "Aktif kullanıcı var mı?", type: "condition" },
    { label: "Haftalık özet raporu derle", type: "action" },
    { label: "Yöneticilere e-posta gönder", type: "action" },
  ],
  "subscription-dunning": [
    { label: "Abonelik ödemesi başarısız", type: "trigger" },
    { label: "1. deneme: ödemeyi tekrarla", type: "action" },
    { label: "3 gün bekle", type: "action" },
    { label: "Hatırlatma e-postası", type: "action" },
    { label: "Hâlâ ödenmedi mi?", type: "condition" },
    { label: "Aboneliği askıya al", type: "action" },
  ],
};

// Ek (page-local) workflow tanımları — base WORKFLOWS ile birleştirilir.
export const EXTRA_WORKFLOWS: WorkflowDef[] = [
  { id: "refund-flow", name: "İptal → Otomatik İade", trigger: "Order.status = cancelled", active: true, runs: 268, steps: EXTRA_STEPS["refund-flow"] },
  { id: "review-request", name: "Teslimat Sonrası Değerlendirme", trigger: "Order.delivered", active: true, runs: 1893, steps: EXTRA_STEPS["review-request"] },
  { id: "vip-upgrade", name: "VIP Müşteri Yükseltme", trigger: "Customer.spend > 10000", active: true, runs: 54, steps: EXTRA_STEPS["vip-upgrade"] },
  { id: "fraud-hold", name: "Dolandırıcılık Beklemesi", trigger: "Payment.risk > 80", active: true, runs: 31, steps: EXTRA_STEPS["fraud-hold"] },
  { id: "weekly-digest", name: "Haftalık Yönetici Özeti", trigger: "Cron: Pzt 09:00", active: false, runs: 28, steps: EXTRA_STEPS["weekly-digest"] },
  { id: "subscription-dunning", name: "Abonelik Tahsilat (Dunning)", trigger: "Subscription.payment_failed", active: true, runs: 412, steps: EXTRA_STEPS["subscription-dunning"] },
];

function spark(seed: number): number[] {
  const out: number[] = [];
  let v = seed;
  for (let i = 0; i < 12; i++) {
    v = Math.max(0, Math.round(v + Math.sin(i * 1.3 + seed) * (seed / 6) + (i % 3 === 0 ? seed / 8 : -seed / 10)));
    out.push(v);
  }
  return out;
}

export const WORKFLOW_META: Record<string, WorkflowMeta> = {
  "order-paid": {
    id: "order-paid", category: "satış", owner: "Ada Yılmaz", updatedAt: "2 gün önce",
    trend: spark(42), successRate: 99.2, avgMs: 840,
    runHistory: [
      { id: "r1", at: "12 dk önce", status: "success", durationMs: 812, trigger: "ord_8842" },
      { id: "r2", at: "34 dk önce", status: "success", durationMs: 905, trigger: "ord_8839" },
      { id: "r3", at: "1 sa önce", status: "skipped", durationMs: 41, trigger: "ord_8830" },
      { id: "r4", at: "2 sa önce", status: "success", durationMs: 778, trigger: "ord_8821" },
      { id: "r5", at: "3 sa önce", status: "failed", durationMs: 1240, trigger: "ord_8810" },
    ],
    audit: [
      { id: "a1", action: "fatura adımı çalıştı", actor: "system", at: "12 dk önce", tone: "emerald", detail: "invoice #INV-8842" },
      { id: "a2", action: "koşul eşiği güncellendi", actor: "Ada Yılmaz", at: "2 gün önce", tone: "primary", detail: "total > 0" },
      { id: "a3", action: "workflow oluşturuldu", actor: "Ada Yılmaz", at: "3 ay önce", tone: "default" },
    ],
  },
  welcome: {
    id: "welcome", category: "müşteri", owner: "Mert Kaya", updatedAt: "5 gün önce",
    trend: spark(22), successRate: 98.0, avgMs: 320,
    runHistory: [
      { id: "r1", at: "8 dk önce", status: "success", durationMs: 298, trigger: "cus_4521" },
      { id: "r2", at: "1 sa önce", status: "running", durationMs: 0, trigger: "cus_4519" },
      { id: "r3", at: "4 sa önce", status: "success", durationMs: 341, trigger: "cus_4510" },
    ],
    audit: [
      { id: "a1", action: "onboarding ipucu adımı eklendi", actor: "Mert Kaya", at: "5 gün önce", tone: "primary" },
      { id: "a2", action: "workflow etkinleştirildi", actor: "Mert Kaya", at: "1 ay önce", tone: "emerald" },
    ],
  },
  "low-stock": {
    id: "low-stock", category: "operasyon", owner: "Selin Demir", updatedAt: "1 hafta önce",
    trend: spark(8), successRate: 94.1, avgMs: 210, lastError: "Slack webhook 404 — kanal bulunamadı",
    runHistory: [
      { id: "r1", at: "2 gün önce", status: "failed", durationMs: 180, trigger: "prd_221" },
      { id: "r2", at: "5 gün önce", status: "success", durationMs: 205, trigger: "prd_198" },
    ],
    audit: [
      { id: "a1", action: "Slack entegrasyonu hata verdi", actor: "system", at: "2 gün önce", tone: "red", detail: "webhook 404" },
      { id: "a2", action: "workflow devre dışı bırakıldı", actor: "Selin Demir", at: "2 gün önce", tone: "amber" },
    ],
  },
  "abandoned-cart": {
    id: "abandoned-cart", category: "pazarlama", owner: "Selin Demir", updatedAt: "3 gün önce",
    trend: spark(18), successRate: 96.7, avgMs: 410,
    runHistory: [
      { id: "r1", at: "20 dk önce", status: "success", durationMs: 388, trigger: "cart_9921" },
      { id: "r2", at: "55 dk önce", status: "success", durationMs: 402, trigger: "cart_9918" },
      { id: "r3", at: "2 sa önce", status: "skipped", durationMs: 22, trigger: "cart_9901" },
    ],
    audit: [
      { id: "a1", action: "kupon değeri %10 → %15 yapıldı", actor: "Selin Demir", at: "3 gün önce", tone: "primary" },
    ],
  },
  "refund-flow": {
    id: "refund-flow", category: "finans", owner: "Ada Yılmaz", updatedAt: "Dün",
    trend: spark(11), successRate: 97.4, avgMs: 1320,
    runHistory: [
      { id: "r1", at: "40 dk önce", status: "success", durationMs: 1280, trigger: "ord_8801" },
      { id: "r2", at: "3 sa önce", status: "success", durationMs: 1410, trigger: "ord_8790" },
    ],
    audit: [
      { id: "a1", action: "Stripe iade adımı başarılı", actor: "system", at: "40 dk önce", tone: "emerald", detail: "refund re_1Q…" },
      { id: "a2", action: "stok iadesi adımı eklendi", actor: "Ada Yılmaz", at: "Dün", tone: "primary" },
    ],
  },
  "review-request": {
    id: "review-request", category: "pazarlama", owner: "Mert Kaya", updatedAt: "1 hafta önce",
    trend: spark(64), successRate: 99.6, avgMs: 260,
    runHistory: [
      { id: "r1", at: "5 dk önce", status: "success", durationMs: 244, trigger: "ord_8845" },
      { id: "r2", at: "18 dk önce", status: "success", durationMs: 271, trigger: "ord_8844" },
    ],
    audit: [
      { id: "a1", action: "bekleme süresi 3 → 5 gün yapıldı", actor: "Mert Kaya", at: "1 hafta önce", tone: "primary" },
    ],
  },
  "vip-upgrade": {
    id: "vip-upgrade", category: "satış", owner: "Ada Yılmaz", updatedAt: "4 gün önce",
    trend: spark(4), successRate: 100, avgMs: 540,
    runHistory: [{ id: "r1", at: "1 gün önce", status: "success", durationMs: 522, trigger: "cus_4400" }],
    audit: [{ id: "a1", action: "workflow oluşturuldu", actor: "Ada Yılmaz", at: "4 gün önce", tone: "default" }],
  },
  "fraud-hold": {
    id: "fraud-hold", category: "finans", owner: "Güvenlik Ekibi", updatedAt: "Bugün",
    trend: spark(3), successRate: 100, avgMs: 95,
    runHistory: [
      { id: "r1", at: "1 sa önce", status: "success", durationMs: 88, trigger: "pay_7721" },
      { id: "r2", at: "6 sa önce", status: "success", durationMs: 102, trigger: "pay_7705" },
    ],
    audit: [
      { id: "a1", action: "risk eşiği 75 → 80 yapıldı", actor: "Güvenlik Ekibi", at: "Bugün", tone: "amber", detail: "risk > 80" },
    ],
  },
  "weekly-digest": {
    id: "weekly-digest", category: "operasyon", owner: "Mert Kaya", updatedAt: "2 hafta önce",
    trend: spark(2), successRate: 92.8, avgMs: 4200, lastError: "SMTP zaman aşımı",
    runHistory: [
      { id: "r1", at: "3 gün önce", status: "failed", durationMs: 9000, trigger: "cron" },
      { id: "r2", at: "10 gün önce", status: "success", durationMs: 4100, trigger: "cron" },
    ],
    audit: [
      { id: "a1", action: "SMTP zaman aşımı nedeniyle pasif", actor: "system", at: "3 gün önce", tone: "red" },
    ],
  },
  "subscription-dunning": {
    id: "subscription-dunning", category: "finans", owner: "Ada Yılmaz", updatedAt: "6 gün önce",
    trend: spark(14), successRate: 88.5, avgMs: 680,
    runHistory: [
      { id: "r1", at: "30 dk önce", status: "success", durationMs: 654, trigger: "sub_3321" },
      { id: "r2", at: "2 sa önce", status: "failed", durationMs: 720, trigger: "sub_3300" },
      { id: "r3", at: "5 sa önce", status: "success", durationMs: 631, trigger: "sub_3288" },
    ],
    audit: [
      { id: "a1", action: "deneme sayısı 1 → 3 yapıldı", actor: "Ada Yılmaz", at: "6 gün önce", tone: "primary" },
      { id: "a2", action: "ödeme tekrar denemesi başarısız", actor: "system", at: "2 sa önce", tone: "red", detail: "card_declined" },
    ],
  },
};

export const CATEGORY_LABEL: Record<WorkflowCategory, string> = {
  satış: "Satış",
  müşteri: "Müşteri",
  operasyon: "Operasyon",
  pazarlama: "Pazarlama",
  finans: "Finans",
};
