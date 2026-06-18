// Page-local enrichment seed for the Issue Detail surface.
// Bu veriler yalnızca detay sayfasını derinleştirmek içindir; ortak
// delivery seed'lerini bozmadan ek bağlam (audit, telemetri, ilişkili
// olaylar) sağlar. Issue id → zenginleştirme eşlemesi.

import type { IssueSeverity, IssueStatus } from "~/data/delivery";

export interface IssueAuditSeed {
  id: string;
  action: string;
  actor?: string;
  at: string;
  tone?: "default" | "primary" | "emerald" | "amber" | "red";
  detail?: string;
}

export interface IssueTelemetry {
  /** kaç ayrı kullanıcı etkilendi */
  affectedUsers: number;
  /** son 24 saatte kaç kez raporlandı / tetiklendi */
  occurrences24h: number;
  /** SLA hedefi (saat) */
  slaTargetHours: number;
  /** açık kalma süresi (saat) */
  ageHours: number;
  /** son 8 dönemdeki olay yoğunluğu (sparkline) */
  trend: number[];
  /** etkilenen ortam */
  env: "dev" | "staging" | "prod";
  /** ilk görülme */
  firstSeen: string;
}

export interface IssueEnrichment {
  telemetry: IssueTelemetry;
  audit: IssueAuditSeed[];
  /** AI triyajın gerekçesi (panelde gösterilir) */
  aiRationale?: string;
  /** AI güven skoru 0–100 */
  aiConfidence?: number;
  /** önerilen düzeltme adımları */
  aiSteps?: string[];
}

// Genel/varsayılan audit akışı — eşleşme yoksa bunun türevi üretilir.
export function defaultAudit(opts: {
  reporter: string;
  source: string;
  createdAt: string;
  assignee: string | null;
  status: IssueStatus;
  severity: IssueSeverity;
}): IssueAuditSeed[] {
  const out: IssueAuditSeed[] = [
    {
      id: "a_open",
      action: `kaydı ${opts.source} üzerinden açtı`,
      actor: opts.reporter,
      at: opts.createdAt,
      tone: "primary",
    },
  ];
  if (opts.assignee) {
    out.push({
      id: "a_assign",
      action: `${opts.assignee} kişisine atadı`,
      actor: "AI Triyaj",
      at: opts.createdAt,
      tone: "default",
    });
  }
  if (opts.status === "in-progress") {
    out.push({ id: "a_wip", action: "durumu 'geliştiriliyor' yaptı", actor: opts.assignee ?? "mehmet", at: "2 sa önce", tone: "amber" });
  }
  if (opts.status === "resolved") {
    out.push({ id: "a_res", action: "durumu 'çözüldü' yaptı", actor: opts.assignee ?? "zeynep", at: "1 gün önce", tone: "emerald" });
  }
  if (opts.status === "closed") {
    out.push({ id: "a_close", action: "kaydı kapattı", actor: opts.assignee ?? "mehmet", at: "4 gün önce", tone: "default" });
  }
  return out;
}

export const ISSUE_ENRICHMENT: Record<string, IssueEnrichment> = {
  "BUG-142": {
    telemetry: {
      affectedUsers: 312, occurrences24h: 1284, slaTargetHours: 4, ageHours: 0.2,
      trend: [40, 95, 180, 240, 410, 690, 980, 1284], env: "prod", firstSeen: "3 gün önce",
    },
    aiConfidence: 91,
    aiRationale:
      "Checkout toplam alanı kupon iki kez uygulandığında negatife düşüyor. OrderService.applyCoupon() içinde idempotency anahtarı yok; sayfa yenilemesi POST'u tekrar tetikliyor.",
    aiSteps: [
      "applyCoupon() çağrısını couponCode + orderId ile idempotent yap",
      "Negatif toplamı sunucuda 0'a clamp et ve uyarı logla",
      "Checkout submit butonuna debounce + disable-on-pending ekle",
    ],
    audit: [
      { id: "a1", action: "kaydı in-app üzerinden açtı", actor: "ayse@acme.com", at: "12 dk önce", tone: "primary", detail: "Checkout'ta toplam -45₺" },
      { id: "a2", action: "olası kök neden tespit etti (güven %91)", actor: "AI Triyaj", at: "11 dk önce", tone: "primary", detail: "OrderService.applyCoupon:88 idempotency yok" },
      { id: "a3", action: "önemi 'kritik' önerdi", actor: "AI Triyaj", at: "11 dk önce", tone: "red" },
      { id: "a4", action: "err_1 hata grubuyla ilişkilendirildi", actor: "system", at: "10 dk önce", tone: "amber", detail: "1.284 olay · 312 kullanıcı" },
    ],
  },
  "BUG-138": {
    telemetry: {
      affectedUsers: 0, occurrences24h: 47, slaTargetHours: 24, ageHours: 2,
      trend: [12, 14, 18, 22, 31, 38, 41, 47], env: "prod", firstSeen: "2 sa önce",
    },
    aiConfidence: 78,
    aiRationale: "Order.placedAt kolonunda index yok; tarih aralığı filtreleri tam tablo taraması yapıyor.",
    aiSteps: ["placedAt için B-tree index migration'ı oluştur", "Migrations sayfasından staging'e uygula", "p95 sorgu süresini doğrula"],
    audit: [
      { id: "a1", action: "kaydı manuel açtı", actor: "mehmet", at: "2 sa önce", tone: "primary" },
      { id: "a2", action: "kendine atadı", actor: "mehmet", at: "2 sa önce" },
      { id: "a3", action: "durumu 'geliştiriliyor' yaptı", actor: "mehmet", at: "2 sa önce", tone: "amber" },
      { id: "a4", action: "index migration önerdi", actor: "AI Triyaj", at: "2 sa önce", tone: "primary", detail: "CREATE INDEX idx_order_placed_at" },
    ],
  },
  "BUG-126": {
    telemetry: {
      affectedUsers: 0, occurrences24h: 203, slaTargetHours: 8, ageHours: 3,
      trend: [60, 72, 88, 110, 140, 168, 190, 203], env: "prod", firstSeen: "2 gün önce",
    },
    aiConfidence: 64,
    aiRationale: "crm.legacy.net aralıklı 503 dönüyor; retry politikası (3 deneme) yetersiz. BUG-118 ile aynı kök neden olabilir.",
    aiSteps: ["Exponential backoff + jitter ekle", "Maksimum deneme sayısını 7'ye çıkar", "Dead-letter kuyruğu ekle"],
    audit: [
      { id: "a1", action: "kaydı in-app üzerinden açtı", actor: "ops@acme.com", at: "3 sa önce", tone: "primary" },
      { id: "a2", action: "BUG-118 ile olası kopya işaretledi", actor: "AI Triyaj", at: "3 sa önce", tone: "amber", detail: "benzerlik %88" },
    ],
  },
};

/** Bir issue için telemetri yoksa makul varsayılan üret. */
export function fallbackTelemetry(opts: {
  votes: number;
  status: IssueStatus;
}): IssueTelemetry {
  return {
    affectedUsers: Math.max(opts.votes, 4),
    occurrences24h: opts.status === "closed" ? 0 : Math.max(opts.votes, 6),
    slaTargetHours: 24,
    ageHours: opts.status === "triage" ? 6 : 36,
    trend: [4, 6, 5, 8, 7, 9, 6, 8],
    env: "staging",
    firstSeen: "birkaç gün önce",
  };
}
