// Mock data for the Delivery & Operations surfaces.

// ── Issues / Roadmap (unified model, two views) ───────────────────
export type IssueType = "bug" | "feature";
export type IssueStatus = "triage" | "in-progress" | "resolved" | "closed";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueSource = "in-app" | "email" | "manual";
export type RoadmapStage = "proposed" | "planned" | "building" | "shipped";

export interface IssueComment {
  id: string;
  author: string;
  authorKind: "customer" | "developer" | "ai";
  body: string;
  time: string;
}

export interface Issue {
  id: string;
  type: IssueType;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  source: IssueSource;
  reporter: string;
  assignee: string | null;
  linkedModel?: string;
  linkedModule?: string;
  votes: number;
  stage?: RoadmapStage; // only for type:"feature"
  createdAt: string;
  comments: IssueComment[];
  aiSuggested?: { severity?: IssueSeverity; duplicateOf?: string; assignee?: string };
}

export const SEED_ISSUES: Issue[] = [
  {
    id: "BUG-142", type: "bug", title: "Sepette kupon iki kez uygulanıyor",
    description: "Müşteri kupon kodunu girip sayfayı yenileyince indirim iki kez düşüyor; toplam negatif olabiliyor.",
    severity: "critical", status: "triage", source: "in-app", reporter: "ayse@acme.com", assignee: null,
    linkedModel: "Order", linkedModule: "ecommerce", votes: 0, createdAt: "12 dk önce",
    comments: [{ id: "c1", author: "ayse@acme.com", authorKind: "customer", body: "Checkout'ta toplam -45₺ göründü, ödeme alınamadı.", time: "12 dk önce" }],
    aiSuggested: { severity: "critical", assignee: "mehmet" },
  },
  {
    id: "BUG-138", type: "bug", title: "Order.placedAt filtresi yavaş",
    description: "Sipariş listesinde tarih filtresi 300ms+ sürüyor; index eksik.",
    severity: "high", status: "in-progress", source: "manual", reporter: "mehmet", assignee: "mehmet",
    linkedModel: "Order", votes: 0, createdAt: "2 sa önce",
    comments: [{ id: "c2", author: "AI Triyaj", authorKind: "ai", body: "Order.placedAt index'siz; migration önerilir.", time: "2 sa önce" }],
  },
  {
    id: "BUG-131", type: "bug", title: "E-posta şablonunda {{firstName}} render olmuyor",
    description: "Hoş geldin e-postasında değişken ham metin olarak gidiyor.",
    severity: "medium", status: "resolved", source: "email", reporter: "destek@acme.com", assignee: "zeynep",
    linkedModule: "blog", votes: 0, createdAt: "1 gün önce", comments: [],
  },
  {
    id: "BUG-126", type: "bug", title: "Webhook teslimatı 503 ile başarısız",
    description: "crm.legacy.net uç noktası aralıklı 503 dönüyor, retry yetersiz.",
    severity: "high", status: "triage", source: "in-app", reporter: "ops@acme.com", assignee: null,
    linkedModule: "api-gateway", votes: 0, createdAt: "3 sa önce", comments: [],
    aiSuggested: { severity: "high", duplicateOf: "BUG-118" },
  },
  {
    id: "BUG-118", type: "bug", title: "Webhook retry sayısı yetersiz",
    description: "Başarısız teslimatlar yalnızca 3 kez deneniyor.",
    severity: "medium", status: "closed", source: "manual", reporter: "mehmet", assignee: "mehmet",
    linkedModule: "api-gateway", votes: 0, createdAt: "4 gün önce", comments: [],
  },
  {
    id: "BUG-109", type: "bug", title: "Mobilde tema geçişi titriyor",
    description: "Koyu/açık geçişinde kısa bir beyaz flaş oluyor.",
    severity: "low", status: "resolved", source: "in-app", reporter: "kullanici@acme.com", assignee: "zeynep",
    votes: 0, createdAt: "5 gün önce", comments: [],
  },
  // Feature requests (same model, type:"feature", with stage)
  {
    id: "FEAT-54", type: "feature", title: "Toplu ürün içe aktarma (CSV)",
    description: "Yöneticiler binlerce ürünü CSV ile yükleyebilmeli.",
    severity: "medium", status: "in-progress", source: "manual", reporter: "ürün ekibi", assignee: "mehmet",
    linkedModule: "ecommerce", votes: 48, stage: "building", createdAt: "1 hafta önce", comments: [],
  },
  {
    id: "FEAT-49", type: "feature", title: "Çoklu dil (i18n) desteği",
    description: "İçerik ve arayüz için yerelleştirme.",
    severity: "medium", status: "triage", source: "in-app", reporter: "global@acme.com", assignee: null,
    votes: 132, stage: "planned", createdAt: "2 hafta önce", comments: [],
  },
  {
    id: "FEAT-61", type: "feature", title: "Webhook imza doğrulama (HMAC)",
    description: "Giden webhook'lara HMAC-SHA256 imza ekle.",
    severity: "low", status: "triage", source: "manual", reporter: "güvenlik", assignee: null,
    linkedModule: "api-gateway", votes: 23, stage: "proposed", createdAt: "4 gün önce", comments: [],
  },
  {
    id: "FEAT-42", type: "feature", title: "Karanlık mod e-posta şablonları",
    description: "E-postalar alıcının tema tercihine uyum sağlasın.",
    severity: "low", status: "resolved", source: "in-app", reporter: "tasarım", assignee: "zeynep",
    votes: 67, stage: "shipped", createdAt: "3 hafta önce", comments: [],
  },
  {
    id: "FEAT-38", type: "feature", title: "Stripe abonelik faturalandırma",
    description: "Tekrarlayan ödeme planları ve abonelikler.",
    severity: "high", status: "in-progress", source: "manual", reporter: "ürün ekibi", assignee: "mehmet",
    linkedModule: "payments", votes: 95, stage: "building", createdAt: "1 hafta önce", comments: [],
  },
];

export const TEAM_MEMBERS_SHORT = ["mehmet", "zeynep", "ali", "elif"];

// ── Releases / Deployments ────────────────────────────────────────
export type EnvName = "dev" | "staging" | "prod";
export type DeployStatus =
  | "queued" | "building" | "testing" | "deploying" | "success" | "failed" | "rolled-back";
export type PipelineStepName = "build" | "test" | "deploy";
export interface PipelineStep {
  name: PipelineStepName;
  status: "pending" | "running" | "passed" | "failed";
  durationMs?: number;
}
export interface Deployment {
  id: string;
  version: string;
  env: EnvName;
  status: DeployStatus;
  steps: PipelineStep[];
  triggeredBy: string;
  time: string;
  durationMs: number;
  changelog: { issueId: string; type: IssueType; title: string }[];
  commit: string;
}
export interface Environment {
  name: EnvName;
  label: string;
  currentVersion: string;
  status: "healthy" | "deploying" | "degraded";
  url: string;
  lastDeploy: string;
}

const okSteps = (b: number, t: number, d: number): PipelineStep[] => [
  { name: "build", status: "passed", durationMs: b },
  { name: "test", status: "passed", durationMs: t },
  { name: "deploy", status: "passed", durationMs: d },
];

export const SEED_ENVIRONMENTS: Environment[] = [
  { name: "dev", label: "Development", currentVersion: "v1.9.0-rc1", status: "healthy", url: "dev.acme.app", lastDeploy: "8 dk önce" },
  { name: "staging", label: "Staging", currentVersion: "v1.8.2", status: "healthy", url: "staging.acme.app", lastDeploy: "2 sa önce" },
  { name: "prod", label: "Production", currentVersion: "v1.8.0", status: "healthy", url: "acme.app", lastDeploy: "1 gün önce" },
];

export const SEED_DEPLOYMENTS: Deployment[] = [
  {
    id: "dpl_8f21", version: "v1.9.0-rc1", env: "dev", status: "success", steps: okSteps(42000, 88000, 19000),
    triggeredBy: "mehmet", time: "8 dk önce", durationMs: 149000, commit: "a1b2c3d",
    changelog: [
      { issueId: "FEAT-54", type: "feature", title: "Toplu ürün içe aktarma (CSV)" },
      { issueId: "BUG-138", type: "bug", title: "Order.placedAt filtresi yavaş" },
    ],
  },
  {
    id: "dpl_8e90", version: "v1.8.2", env: "staging", status: "success", steps: okSteps(40000, 81000, 21000),
    triggeredBy: "ci-bot", time: "2 sa önce", durationMs: 142000, commit: "9f8e7d6",
    changelog: [{ issueId: "BUG-131", type: "bug", title: "E-posta şablonunda {{firstName}} render olmuyor" }],
  },
  {
    id: "dpl_8d11", version: "v1.8.1", env: "staging", status: "failed",
    steps: [{ name: "build", status: "passed", durationMs: 41000 }, { name: "test", status: "failed", durationMs: 52000 }, { name: "deploy", status: "pending" }],
    triggeredBy: "zeynep", time: "5 sa önce", durationMs: 93000, commit: "7c6b5a4",
    changelog: [{ issueId: "BUG-126", type: "bug", title: "Webhook teslimatı 503 ile başarısız" }],
  },
  {
    id: "dpl_8c02", version: "v1.8.0", env: "prod", status: "success", steps: okSteps(44000, 90000, 23000),
    triggeredBy: "mehmet", time: "1 gün önce", durationMs: 157000, commit: "5a4b3c2",
    changelog: [
      { issueId: "FEAT-42", type: "feature", title: "Karanlık mod e-posta şablonları" },
      { issueId: "BUG-109", type: "bug", title: "Mobilde tema geçişi titriyor" },
    ],
  },
];

// ── Error tracking ────────────────────────────────────────────────
export interface ErrorGroup {
  id: string;
  title: string;
  culprit: string;
  count: number;
  users: number;
  env: EnvName;
  firstSeen: string;
  lastSeen: string;
  status: "unresolved" | "resolved" | "ignored";
  trace: string;
  linkedIssue?: string;
}

export const SEED_ERRORS: ErrorGroup[] = [
  {
    id: "err_1", title: "TypeError: Cannot read 'total' of undefined", culprit: "OrderService.applyCoupon()",
    count: 1284, users: 312, env: "prod", firstSeen: "3 gün önce", lastSeen: "2 dk önce", status: "unresolved",
    trace: "at OrderService.applyCoupon (order-service.ts:88)\nat CheckoutController.submit (checkout.ts:142)\nat processTicksAndRejections (node:internal/process/task_queues:95)",
    linkedIssue: "BUG-142",
  },
  {
    id: "err_2", title: "TimeoutError: payment provider timed out", culprit: "PaymentService.charge()",
    count: 418, users: 96, env: "prod", firstSeen: "1 gün önce", lastSeen: "18 dk önce", status: "unresolved",
    trace: "at PaymentService.charge (payment-service.ts:51)\nat OrderController.pay (order.ts:210)",
  },
  {
    id: "err_3", title: "DeliveryError: webhook 503", culprit: "WebhookDispatcher.send()",
    count: 203, users: 0, env: "prod", firstSeen: "2 gün önce", lastSeen: "32 dk önce", status: "unresolved",
    trace: "at WebhookDispatcher.send (webhook.ts:74)\nat Scheduler.tick (scheduler.ts:30)",
    linkedIssue: "BUG-126",
  },
  {
    id: "err_4", title: "ValidationError: invalid email format", culprit: "CustomerValidator.validate()",
    count: 64, users: 41, env: "staging", firstSeen: "4 gün önce", lastSeen: "3 sa önce", status: "ignored",
    trace: "at CustomerValidator.validate (validator.ts:22)",
  },
  {
    id: "err_5", title: "RenderError: theme flash on toggle", culprit: "ThemeProvider.setDark()",
    count: 12, users: 9, env: "prod", firstSeen: "6 gün önce", lastSeen: "5 gün önce", status: "resolved",
    trace: "at ThemeProvider.setDark (theme-provider.tsx:31)",
    linkedIssue: "BUG-109",
  },
];

// ── Feature flags ─────────────────────────────────────────────────
export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPct: number;
  envs: EnvName[];
  linkedFeature?: string;
  updatedAt: string;
}

export const SEED_FLAGS: FeatureFlag[] = [
  { id: "f1", key: "csv_bulk_import", description: "Toplu CSV ürün içe aktarma", enabled: true, rolloutPct: 25, envs: ["dev", "staging"], linkedFeature: "FEAT-54", updatedAt: "8 dk önce" },
  { id: "f2", key: "subscription_billing", description: "Stripe abonelik faturalandırma", enabled: false, rolloutPct: 0, envs: ["dev"], linkedFeature: "FEAT-38", updatedAt: "1 gün önce" },
  { id: "f3", key: "new_checkout_ui", description: "Yeni ödeme akışı arayüzü", enabled: true, rolloutPct: 100, envs: ["dev", "staging", "prod"], updatedAt: "3 gün önce" },
  { id: "f4", key: "dark_email_templates", description: "Karanlık mod e-posta şablonları", enabled: true, rolloutPct: 100, envs: ["dev", "staging", "prod"], linkedFeature: "FEAT-42", updatedAt: "3 hafta önce" },
  { id: "f5", key: "webhook_hmac", description: "Webhook HMAC imzalama", enabled: false, rolloutPct: 0, envs: ["dev"], linkedFeature: "FEAT-61", updatedAt: "4 gün önce" },
];

// ── Environments & secrets ────────────────────────────────────────
export interface EnvVar {
  id: string;
  key: string;
  value: string;
  secret: boolean;
  env: EnvName;
  updatedAt: string;
}

export const SEED_ENV_VARS: EnvVar[] = [
  { id: "e1", key: "DATABASE_URL", value: "postgres://prod-db.acme.internal:5432/acme", secret: true, env: "prod", updatedAt: "2 hafta önce" },
  { id: "e2", key: "STRIPE_SECRET_KEY", value: "sk_live_51Hx7c2a9f2a7c41b8e3d6", secret: true, env: "prod", updatedAt: "1 ay önce" },
  { id: "e3", key: "REDIS_URL", value: "redis://prod-cache.acme.internal:6379", secret: false, env: "prod", updatedAt: "3 hafta önce" },
  { id: "e4", key: "APP_URL", value: "https://acme.app", secret: false, env: "prod", updatedAt: "2 ay önce" },
  { id: "e5", key: "RATE_LIMIT_PER_MIN", value: "100", secret: false, env: "prod", updatedAt: "1 hafta önce" },
  { id: "e6", key: "DATABASE_URL", value: "postgres://staging-db.acme.internal:5432/acme", secret: true, env: "staging", updatedAt: "2 sa önce" },
  { id: "e7", key: "STRIPE_SECRET_KEY", value: "sk_test_51Hx7c2a9f2a7c41b8e3", secret: true, env: "staging", updatedAt: "5 gün önce" },
  { id: "e8", key: "FEATURE_FLAGS_URL", value: "https://flags.acme.internal", secret: false, env: "staging", updatedAt: "5 gün önce" },
  { id: "e9", key: "DATABASE_URL", value: "postgres://localhost:5432/acme_dev", secret: true, env: "dev", updatedAt: "8 dk önce" },
  { id: "e10", key: "DEBUG", value: "true", secret: false, env: "dev", updatedAt: "8 dk önce" },
];
