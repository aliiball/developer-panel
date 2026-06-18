// Page-local enrichment for the Error Tracking surface.
// Mevcut SEED_ERRORS'u bozmadan, enterprise detay yüzeyi için ek alanlar
// (24 saatlik occurrence dağılımı + son hata mesajları + audit) sağlar.
import { SEED_ERRORS, type ErrorGroup } from "~/data/delivery";
import type { AuditEvent } from "~/components/enterprise";
import {
  GitBranch,
  Sparkle,
  Bug,
  EyeSlash,
  CheckCircle,
  WarningOctagon,
} from "@phosphor-icons/react";

export interface ErrorMeta {
  /** son 24 saat — saat başına occurrence sayısı (24 nokta) */
  occurrences24h: number[];
  /** dağıtım/build sürümü ilk görüldüğü release */
  release: string;
  /** runtime ortamı / handler */
  runtime: string;
  /** kullanıcı segmenti notu */
  impact: string;
  /** son N occurrence örnek mesajı */
  samples: { at: string; message: string }[];
  audit: AuditEvent[];
}

function ramp(base: number, peak: number, spike = false): number[] {
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    let v = base + (peak - base) * Math.pow(t, 1.6);
    if (spike && i > 18) v *= 1.8;
    v += Math.sin(i * 1.3) * (peak * 0.06);
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

export const ERROR_META: Record<string, ErrorMeta> = {
  err_1: {
    occurrences24h: ramp(28, 96, true),
    release: "v2.14.0",
    runtime: "node-22 · checkout-worker",
    impact: "Ödeme akışındaki kuponlu sepetler — gelir-etkili.",
    samples: [
      { at: "2 dk önce", message: "Cannot read properties of undefined (reading 'total') — coupon=WELCOME10" },
      { at: "6 dk önce", message: "Cannot read properties of undefined (reading 'total') — coupon=BLACKFRIDAY" },
      { at: "11 dk önce", message: "Cannot read properties of undefined (reading 'total') — coupon=undefined" },
    ],
    audit: [
      { id: "a1", actor: "AI Copilot", action: "kök neden önerdi: kupon objesi null guard eksik", at: "1 sa önce", icon: Sparkle, tone: "primary", detail: "order-service.ts:88 → coupon?.total" },
      { id: "a2", actor: "Mert Aydın", action: "BUG-142 issue'suna bağladı", at: "2 sa önce", icon: Bug, tone: "amber" },
      { id: "a3", actor: "system", action: "regression tespit etti — v2.14.0 sonrası artış", at: "3 gün önce", icon: WarningOctagon, tone: "red", detail: "0 → 1284 occurrence" },
    ],
  },
  err_2: {
    occurrences24h: ramp(6, 34),
    release: "v2.13.4",
    runtime: "node-22 · payment-gateway",
    impact: "Stripe çağrılarında gecikme — retry kuyruğu doluyor.",
    samples: [
      { at: "18 dk önce", message: "ETIMEDOUT connect 5000ms api.stripe.com:443" },
      { at: "41 dk önce", message: "ETIMEDOUT connect 5000ms api.stripe.com:443" },
    ],
    audit: [
      { id: "a1", actor: "system", action: "ilk görüldü", at: "1 gün önce", icon: WarningOctagon, tone: "red" },
      { id: "a2", actor: "Selin Koç", action: "timeout eşiğini 5s→10s incelemeye aldı", at: "20 sa önce", icon: GitBranch, tone: "default" },
    ],
  },
  err_3: {
    occurrences24h: ramp(4, 18),
    release: "v2.14.0",
    runtime: "node-22 · webhook-dispatcher",
    impact: "Üçüncü taraf endpoint 503 — kullanıcı görmüyor, teslimat geri kalıyor.",
    samples: [
      { at: "32 dk önce", message: "503 Service Unavailable POST https://hooks.partner.io/v1" },
      { at: "55 dk önce", message: "503 Service Unavailable POST https://hooks.partner.io/v1" },
    ],
    audit: [
      { id: "a1", actor: "Mert Aydın", action: "BUG-126 issue'suna bağladı", at: "1 gün önce", icon: Bug, tone: "amber" },
      { id: "a2", actor: "system", action: "exponential backoff retry devrede", at: "2 gün önce", icon: GitBranch, tone: "default" },
    ],
  },
  err_4: {
    occurrences24h: ramp(2, 5),
    release: "v2.12.0",
    runtime: "node-22 · api-validation",
    impact: "Sadece staging — sentetik trafik, prod etkisi yok.",
    samples: [{ at: "3 sa önce", message: "ValidationError: 'foo@' is not a valid email" }],
    audit: [
      { id: "a1", actor: "Ada Yılmaz", action: "durumu 'ignored' yaptı — staging gürültüsü", at: "2 gün önce", icon: EyeSlash, tone: "default" },
    ],
  },
  err_5: {
    occurrences24h: [3, 2, 4, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    release: "v2.11.2",
    runtime: "browser · theme-provider",
    impact: "Tema geçişinde anlık flash — kozmetik, çözüldü.",
    samples: [{ at: "5 gün önce", message: "RenderError: hydration mismatch on theme toggle" }],
    audit: [
      { id: "a1", actor: "Ada Yılmaz", action: "durumu 'resolved' yaptı", at: "5 gün önce", icon: CheckCircle, tone: "emerald" },
      { id: "a2", actor: "Ada Yılmaz", action: "BUG-109 ile düzeltme deploy etti", at: "5 gün önce", icon: GitBranch, tone: "default", detail: "theme-provider.tsx:31" },
    ],
  },
};

// Tabanı doldurmak için ek gerçekçi gruplar (page-local; ortak seed'e dokunmaz).
export const EXTRA_ERRORS: ErrorGroup[] = [
  {
    id: "err_6", title: "RangeError: Maximum call stack size exceeded", culprit: "PricingEngine.recalc()",
    count: 742, users: 188, env: "prod", firstSeen: "12 sa önce", lastSeen: "4 dk önce", status: "unresolved",
    trace: "at PricingEngine.recalc (pricing.ts:204)\nat PricingEngine.recalc (pricing.ts:211)\nat PricingEngine.recalc (pricing.ts:211)\nat CartController.update (cart.ts:96)",
  },
  {
    id: "err_7", title: "PrismaClientKnownRequestError: unique constraint", culprit: "UserRepository.create()",
    count: 311, users: 311, env: "prod", firstSeen: "2 gün önce", lastSeen: "9 dk önce", status: "unresolved",
    trace: "at UserRepository.create (user-repo.ts:44)\nat SignupController.register (signup.ts:71)",
    linkedIssue: "BUG-151",
  },
  {
    id: "err_8", title: "FetchError: ECONNRESET upstream search", culprit: "SearchClient.query()",
    count: 156, users: 73, env: "prod", firstSeen: "1 gün önce", lastSeen: "21 dk önce", status: "unresolved",
    trace: "at SearchClient.query (search-client.ts:58)\nat ProductController.search (product.ts:130)",
  },
  {
    id: "err_9", title: "OutOfMemory: heap limit reached", culprit: "ReportExporter.buildCSV()",
    count: 47, users: 12, env: "staging", firstSeen: "3 gün önce", lastSeen: "6 sa önce", status: "unresolved",
    trace: "at ReportExporter.buildCSV (report-export.ts:88)\nat ReportController.export (report.ts:40)",
  },
  {
    id: "err_10", title: "JWTExpired: token signature expired", culprit: "AuthMiddleware.verify()",
    count: 1893, users: 540, env: "prod", firstSeen: "5 gün önce", lastSeen: "1 dk önce", status: "unresolved",
    trace: "at AuthMiddleware.verify (auth-mw.ts:33)\nat Router.dispatch (router.ts:120)",
    linkedIssue: "BUG-160",
  },
  {
    id: "err_11", title: "TypeError: cart.items.map is not a function", culprit: "CartView.render()",
    count: 88, users: 61, env: "prod", firstSeen: "8 sa önce", lastSeen: "44 dk önce", status: "unresolved",
    trace: "at CartView.render (cart-view.tsx:51)\nat reconcileChildren (react-dom.ts:991)",
  },
  {
    id: "err_12", title: "DeprecationWarning: legacy webhook v1", culprit: "WebhookDispatcher.legacy()",
    count: 24, users: 0, env: "dev", firstSeen: "1 hafta önce", lastSeen: "2 gün önce", status: "ignored",
    trace: "at WebhookDispatcher.legacy (webhook.ts:140)",
  },
  {
    id: "err_13", title: "GraphQLError: field 'invoice' not found", culprit: "BillingResolver.invoice()",
    count: 19, users: 14, env: "staging", firstSeen: "2 gün önce", lastSeen: "9 sa önce", status: "resolved",
    trace: "at BillingResolver.invoice (billing-resolver.ts:77)",
    linkedIssue: "BUG-148",
  },
  {
    id: "err_14", title: "AbortError: request signal aborted", culprit: "UploadService.stream()",
    count: 132, users: 58, env: "prod", firstSeen: "1 gün önce", lastSeen: "12 dk önce", status: "unresolved",
    trace: "at UploadService.stream (upload.ts:62)\nat MediaController.upload (media.ts:88)",
  },
];

// Ek gruplar için makul meta üret (drawer/spark her satırda dolu olsun).
const EXTRA_PEAKS: Record<string, [number, number, boolean]> = {
  err_6: [22, 70, true], err_7: [9, 26, false], err_8: [5, 14, false],
  err_9: [1, 4, false], err_10: [40, 120, true], err_11: [3, 9, false],
  err_12: [1, 2, false], err_13: [0, 1, false], err_14: [4, 13, false],
};
for (const e of EXTRA_ERRORS) {
  const [b, p, s] = EXTRA_PEAKS[e.id] ?? [2, 8, false];
  ERROR_META[e.id] = {
    occurrences24h: ramp(b, p, s),
    release: e.env === "prod" ? "v2.14.0" : "v2.13.4",
    runtime: `node-22 · ${e.culprit.split(".")[0].toLowerCase()}`,
    impact:
      e.users > 200 ? "Geniş kullanıcı kitlesi etkileniyor — öncelikli." :
      e.users > 0 ? "Sınırlı kullanıcı etkisi." : "Kullanıcı-görünmez (arka plan).",
    samples: [{ at: e.lastSeen, message: `${e.title} — ${e.culprit}` }],
    audit: [
      ...(e.linkedIssue ? [{ id: "x1", actor: "Mert Aydın", action: `${e.linkedIssue} issue'suna bağlandı`, at: e.firstSeen, icon: Bug, tone: "amber" as const }] : []),
      { id: "x2", actor: "system", action: "exception grubu oluşturuldu", at: e.firstSeen, icon: WarningOctagon, tone: "red" as const },
    ],
  };
}

export const ALL_ERRORS: ErrorGroup[] = [...SEED_ERRORS, ...EXTRA_ERRORS];
