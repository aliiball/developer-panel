// Page-local seed for the AI Agent Runs surface.
// Copilot çalıştırma geçmişini enterprise yoğunlukta besler: maliyet, token,
// model, latency dağılımı, prompt/sonuç/diff ve audit izini içerir.
import type { AgentRun } from "~/stores/copilot-store";

// ── Genişletilmiş çalıştırma metadatası ────────────────────────────
// store'daki AgentRun temel alanlarını bozmadan zenginleştirir.
export interface RunMeta {
  /** çalıştırma kimliği — store run.id ile eşleşir */
  id: string;
  /** kullanılan model */
  model: "claude-opus-4" | "claude-sonnet-4" | "claude-haiku-3.5";
  /** prompt (girdi) token sayısı */
  inputTokens: number;
  /** üretim (çıktı) token sayısı */
  outputTokens: number;
  /** USD cinsinden tahmini maliyet */
  costUsd: number;
  /** çalıştırma sonucu */
  status: "applied" | "previewed" | "discarded" | "error" | "text";
  /** üretimi tetikleyen kişi */
  actor: string;
  /** çalıştırmanın ham kullanıcı promptu */
  prompt: string;
  /** üretilen sonucun insan-okunur özeti */
  summary: string;
  /** uygulanan/önizlenen unified diff (mock) */
  diff?: string;
  /** üretilen ham JSON çıktı (mock) */
  output?: unknown;
  /** zincirleme reasoning adımları */
  steps: { label: string; ms: number }[];
  /** hata mesajı (status=error) */
  errorMessage?: string;
}

// 30 günlük günlük çalıştırma hacmi (sparkline)
export const RUN_VOLUME_TREND = [
  4, 6, 5, 9, 7, 11, 8, 12, 10, 14, 9, 13, 16, 12, 18, 15, 19, 14, 21, 17, 23,
  20, 26, 22, 28, 24, 31, 27, 34, 29,
];

// Başarı (applied+previewed oranı) trendi %
export const SUCCESS_TREND = [
  88, 90, 87, 91, 89, 92, 90, 93, 91, 94, 92, 95, 93, 96,
];

// Ort. latency (ms) trendi
export const LATENCY_TREND = [
  1800, 1650, 1720, 1500, 1580, 1420, 1480, 1350, 1400, 1280, 1320, 1240,
  1300, 1180,
];

// Günlük token harcaması (bin) trendi
export const TOKEN_TREND = [
  12, 14, 11, 18, 15, 22, 17, 25, 20, 29, 23, 31, 27, 34,
];

// ── Model maliyet katsayıları (1M token başına USD) ────────────────
export const MODEL_RATE: Record<RunMeta["model"], { in: number; out: number; label: string }> = {
  "claude-opus-4": { in: 15, out: 75, label: "Opus 4" },
  "claude-sonnet-4": { in: 3, out: 15, label: "Sonnet 4" },
  "claude-haiku-3.5": { in: 0.8, out: 4, label: "Haiku 3.5" },
};

// ── Ek seed çalıştırmaları (store seed'ine eklenecek) ──────────────
// store'daki 4 seed'i tamamlayan 14 ek gerçekçi kayıt → toplam 18.
export const EXTRA_RUNS: AgentRun[] = [
  { id: "run_seed5", prompt: "Order modeline 'paymentStatus' enum alanı ve indeks ekle.", surface: "/schema/order", outcome: "preview", previewKind: "fields", at: "6 sa önce", durationMs: 1180 },
  { id: "run_seed6", prompt: "Checkout endpoint'i için Zod validasyon şeması üret.", surface: "/code", outcome: "preview", previewKind: "code", at: "7 sa önce", durationMs: 2100 },
  { id: "run_seed7", prompt: "İletişim formuna ad, e-posta, mesaj ve KVKK onayı alanları ekle.", surface: "/forms", outcome: "preview", previewKind: "form", at: "9 sa önce", durationMs: 1340 },
  { id: "run_seed8", prompt: "Son 50 hata olayını grupla ve en olası kök nedeni öner.", surface: "/errors", outcome: "preview", previewKind: "triage", at: "11 sa önce", durationMs: 2650 },
  { id: "run_seed9", prompt: "v2.4.0 sürüm notlarını commit'lerden üret (Türkçe).", surface: "/releases", outcome: "preview", previewKind: "release-notes", at: "12 sa önce", durationMs: 1920 },
  { id: "run_seed10", prompt: "Admin/Editor/Viewer rolleri için izin matrisi öner.", surface: "/team", outcome: "preview", previewKind: "permissions", at: "14 sa önce", durationMs: 1560 },
  { id: "run_seed11", prompt: "Products koleksiyonu için REST CRUD endpoint'leri üret.", surface: "/api-explorer", outcome: "preview", previewKind: "endpoints", at: "16 sa önce", durationMs: 2380 },
  { id: "run_seed12", prompt: "Karanlık tema için erişilebilir nötr gri skalası öner.", surface: "/theme", outcome: "preview", previewKind: "palette", at: "18 sa önce", durationMs: 980 },
  { id: "run_seed13", prompt: "Bu workspace'in performans darboğazlarını özetle.", surface: "/", outcome: "text", at: "20 sa önce", durationMs: 740 },
  { id: "run_seed14", prompt: "Blog şeması üret: Post, Author, Tag, Comment ilişkili.", surface: "/ai-copilot", outcome: "preview", previewKind: "models", at: "1 gün önce", durationMs: 1760 },
  { id: "run_seed15", prompt: "Invoice modeline 'currency' ve 'dueDate' alanı ekle.", surface: "/schema/invoice", outcome: "preview", previewKind: "fields", at: "1 gün önce", durationMs: 1120 },
  { id: "run_seed16", prompt: "Stripe webhook handler için TypeScript iskeleti yaz.", surface: "/code", outcome: "preview", previewKind: "code", at: "2 gün önce", durationMs: 2240 },
  { id: "run_seed17", prompt: "Newsletter aboneliği için onay e-postası şablonu öner.", surface: "/forms", outcome: "text", at: "2 gün önce", durationMs: 820 },
  { id: "run_seed18", prompt: "Üretimdeki 502 hatalarını triyaj et ve aksiyon öner.", surface: "/errors", outcome: "preview", previewKind: "triage", at: "3 gün önce", durationMs: 2890 },
];

// ── id → genişletilmiş metadata haritası ───────────────────────────
const ACTORS = ["Ada Yılmaz", "Mert Demir", "Selin Kaya", "Can Öztürk", "AI Otomasyon"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

const DIFF_SAMPLES: Record<string, string> = {
  fields: `@@ model Order @@
   id          String   @id @default(cuid())
   total       Decimal
+  paymentStatus PaymentStatus @default(PENDING)
+  @@index([paymentStatus])`,
  models: `@@ schema.prisma @@
+model Post {
+  id       String   @id @default(cuid())
+  title    String
+  authorId String
+  author   Author   @relation(fields: [authorId], references: [id])
+  tags     Tag[]
+}`,
  code: `@@ src/validators/checkout.ts @@
+export const checkoutSchema = z.object({
+  items: z.array(itemSchema).min(1),
+  email: z.string().email(),
+  total: z.number().positive(),
+});`,
  palette: `@@ theme.tokens.json @@
-  "--neutral-700": "#3a3a3a"
+  "--neutral-700": "#2e2e33"
+  "contrast-check": "AA (7.1:1)"`,
  form: `@@ forms/contact.json @@
+  { "name": "consent", "type": "checkbox",
+    "label": "KVKK metnini onaylıyorum", "required": true }`,
  endpoints: `@@ routes/products.ts @@
+router.get("/products", list);
+router.post("/products", create);
+router.patch("/products/:id", update);
+router.delete("/products/:id", remove);`,
  "release-notes": `@@ CHANGELOG.md @@
+## v2.4.0
+- feat: çoklu para birimi desteği
+- fix: checkout race condition giderildi`,
  permissions: `@@ rbac.matrix @@
+Admin  : *
+Editor : read,write (own)
+Viewer : read`,
  triage: `@@ triage.report @@
+cluster: ECONNRESET (24 olay)
+root-cause: upstream timeout > 5s`,
};

const OUTPUT_SAMPLES: Record<string, unknown> = {
  fields: { model: "Order", added: ["paymentStatus"], index: ["paymentStatus"], enum: ["PENDING", "PAID", "REFUNDED"] },
  models: { models: ["Post", "Author", "Tag", "Comment"], relations: 4 },
  code: { file: "src/validators/checkout.ts", lines: 18, language: "typescript" },
  palette: { colors: 11, contrast: "AA", wcag: "7.1:1" },
  form: { fields: ["name", "email", "message", "consent"], required: 3 },
  endpoints: { resource: "products", methods: ["GET", "POST", "PATCH", "DELETE"] },
  "release-notes": { version: "v2.4.0", entries: 7, language: "tr" },
  permissions: { roles: ["Admin", "Editor", "Viewer"], rules: 9 },
  triage: { clusters: 3, topCluster: "ECONNRESET", events: 24 },
};

const SUMMARY_SAMPLES: Record<string, string> = {
  fields: "Modele yeni alan(lar) ve indeks önerildi; geriye dönük migration güvenli.",
  models: "İlişkili modeller ve foreign-key bağlantıları üretildi; şemaya hazır.",
  code: "Tip-güvenli kod iskeleti üretildi; validasyon ve hata yönetimi dahil.",
  palette: "WCAG AA kontrast doğrulamalı renk skalası üretildi.",
  form: "Form alanları, zorunluluk ve doğrulama kuralları ile önizlendi.",
  endpoints: "REST uç noktaları (CRUD) ve route handler iskeleti üretildi.",
  "release-notes": "Commit geçmişinden kategorize sürüm notları üretildi.",
  permissions: "Rol bazlı izin matrisi önerildi; en az ayrıcalık prensibine uygun.",
  triage: "Hata olayları kümelendi ve en olası kök neden raporlandı.",
};

export function metaFor(run: AgentRun, idx: number): RunMeta {
  const kind = run.previewKind ?? "text";
  const isText = run.outcome === "text";
  // model seçimi: kısa metinler haiku, üretimler sonnet/opus
  const model: RunMeta["model"] = isText
    ? "claude-haiku-3.5"
    : run.durationMs > 2000
      ? "claude-opus-4"
      : "claude-sonnet-4";
  const inputTokens = 320 + ((idx * 137) % 900);
  const outputTokens = isText ? 180 + ((idx * 91) % 400) : 640 + ((idx * 211) % 1800);
  const rate = MODEL_RATE[model];
  const costUsd =
    (inputTokens / 1_000_000) * rate.in + (outputTokens / 1_000_000) * rate.out;
  // status: çoğu uygulandı/önizlendi, biri error
  const status: RunMeta["status"] = isText
    ? "text"
    : idx === 7
      ? "error"
      : idx % 5 === 0
        ? "applied"
        : idx % 4 === 0
          ? "discarded"
          : "previewed";

  const total = Math.round(run.durationMs);
  const steps =
    status === "error"
      ? [
          { label: "Prompt analizi", ms: Math.round(total * 0.3) },
          { label: "Bağlam toplama", ms: Math.round(total * 0.4) },
          { label: "Üretim (kesildi)", ms: Math.round(total * 0.3) },
        ]
      : [
          { label: "Prompt analizi", ms: Math.round(total * 0.18) },
          { label: "Workspace bağlamı", ms: Math.round(total * 0.22) },
          { label: "Üretim", ms: Math.round(total * 0.45) },
          { label: "Doğrulama & diff", ms: Math.round(total * 0.15) },
        ];

  return {
    id: run.id,
    model,
    inputTokens,
    outputTokens,
    costUsd: Math.round(costUsd * 100000) / 100000,
    status,
    actor: pick(ACTORS, idx),
    prompt: run.prompt,
    summary: isText
      ? "Metin yanıt üretildi; uygulanabilir önizleme yok."
      : SUMMARY_SAMPLES[kind] ?? "Önizleme üretildi.",
    diff: isText ? undefined : DIFF_SAMPLES[kind],
    output: isText ? { type: "text", chars: outputTokens * 4 } : OUTPUT_SAMPLES[kind],
    steps,
    errorMessage:
      status === "error"
        ? "Bağlam penceresi aşıldı: ilgili modeller çok büyük. Daha dar kapsamlı bir prompt deneyin."
        : undefined,
  };
}
