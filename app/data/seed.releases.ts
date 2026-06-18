// Page-local enterprise seed for the Releases surface.
// Zenginleştirilmiş deploy geçmişi: SLA/onay metadata'sı, changelog diff'i ve
// audit izleri. Ortak app/data/delivery.ts dosyasına dokunmadan, yalnızca bu
// sayfanın derinleştirilmesi için ek metadata sağlar (deployment id ile eşlenir).

import type { EnvName, IssueType } from "~/data/delivery";

export interface ReleaseMeta {
  /** deployment id (delivery.ts SEED_DEPLOYMENTS ile eşleşir; yenileri için fallback üretilir) */
  deployId: string;
  /** prod onayını kim verdi (yalnız prod deploy'larında) */
  approvedBy?: string;
  /** deploy stratejisi */
  strategy: "rolling" | "blue-green" | "canary" | "recreate";
  /** trafiğin yüzde kaçı yeni sürümde (canary/rolling) */
  trafficPct: number;
  /** dağıtım sonrası hata oranı (%) */
  errorRate: number;
  /** p95 yanıt süresi (ms) */
  p95Ms: number;
  /** deploy sonrası gözlemlenen kullanıcı sayısı */
  affectedUsers: number;
  /** SLA penceresinde mi tamamlandı (hedef < 15dk) */
  slaMet: boolean;
  /** changelog satırlarına ek diff özeti */
  diffStat: { files: number; additions: number; deletions: number };
  /** ham build artifact boyutu */
  artifactMb: number;
  region: string;
}

export const RELEASE_META: Record<string, ReleaseMeta> = {
  dpl_8f21: {
    deployId: "dpl_8f21", strategy: "rolling", trafficPct: 100, errorRate: 0.04,
    p95Ms: 182, affectedUsers: 0, slaMet: true,
    diffStat: { files: 34, additions: 1280, deletions: 412 }, artifactMb: 28.4, region: "eu-central-1",
  },
  dpl_8e90: {
    deployId: "dpl_8e90", strategy: "blue-green", trafficPct: 100, errorRate: 0.11,
    p95Ms: 204, affectedUsers: 0, slaMet: true,
    diffStat: { files: 6, additions: 142, deletions: 38 }, artifactMb: 27.9, region: "eu-central-1",
  },
  dpl_8d11: {
    deployId: "dpl_8d11", strategy: "rolling", trafficPct: 0, errorRate: 0,
    p95Ms: 0, affectedUsers: 0, slaMet: false,
    diffStat: { files: 11, additions: 320, deletions: 96 }, artifactMb: 28.1, region: "eu-central-1",
  },
  dpl_8c02: {
    deployId: "dpl_8c02", approvedBy: "deniz (release-manager)", strategy: "canary", trafficPct: 100,
    errorRate: 0.08, p95Ms: 196, affectedUsers: 14200, slaMet: true,
    diffStat: { files: 22, additions: 870, deletions: 240 }, artifactMb: 31.2, region: "eu-central-1",
  },
};

// Ek tarihsel deploy'lar — geçmişi 4'ten 12'ye çıkarır (gerçekçi yoğunluk).
// delivery.ts Deployment tipiyle birebir uyumlu (route içinde merge edilir).
export interface ExtraDeployment {
  id: string;
  version: string;
  env: EnvName;
  status: "success" | "failed" | "rolled-back";
  steps: { name: "build" | "test" | "deploy"; status: "passed" | "failed" | "pending"; durationMs?: number }[];
  triggeredBy: string;
  time: string;
  durationMs: number;
  changelog: { issueId: string; type: IssueType; title: string }[];
  commit: string;
}

const ok = (b: number, t: number, d: number): ExtraDeployment["steps"] => [
  { name: "build", status: "passed", durationMs: b },
  { name: "test", status: "passed", durationMs: t },
  { name: "deploy", status: "passed", durationMs: d },
];

export const EXTRA_DEPLOYMENTS: ExtraDeployment[] = [
  {
    id: "dpl_8bf3", version: "v1.7.4", env: "prod", status: "success", steps: ok(43000, 86000, 22000),
    triggeredBy: "ci-bot", time: "3 gün önce", durationMs: 151000, commit: "3f2e1d0",
    changelog: [{ issueId: "FEAT-38", type: "feature", title: "Stripe abonelik faturalandırma (faz 1)" }],
  },
  {
    id: "dpl_8ae2", version: "v1.7.3", env: "staging", status: "rolled-back", steps: ok(41000, 79000, 20000),
    triggeredBy: "zeynep", time: "3 gün önce", durationMs: 140000, commit: "2d1c0b9",
    changelog: [{ issueId: "BUG-118", type: "bug", title: "Webhook retry sayısı yetersiz" }],
  },
  {
    id: "dpl_89d1", version: "v1.7.2", env: "prod", status: "success", steps: ok(45000, 91000, 24000),
    triggeredBy: "mehmet", time: "5 gün önce", durationMs: 160000, commit: "1c0b9a8",
    changelog: [
      { issueId: "FEAT-49", type: "feature", title: "Çoklu dil (i18n) altyapısı" },
      { issueId: "BUG-109", type: "bug", title: "Mobilde tema geçişi titriyor" },
    ],
  },
  {
    id: "dpl_88c0", version: "v1.7.1", env: "dev", status: "success", steps: ok(38000, 72000, 17000),
    triggeredBy: "ali", time: "6 gün önce", durationMs: 127000, commit: "0b9a8f7",
    changelog: [{ issueId: "FEAT-61", type: "feature", title: "Webhook HMAC imza doğrulama" }],
  },
  {
    id: "dpl_87b9", version: "v1.7.0", env: "prod", status: "success", steps: ok(46000, 94000, 25000),
    triggeredBy: "deniz", time: "1 hafta önce", durationMs: 165000, commit: "9a8f7e6",
    changelog: [{ issueId: "FEAT-54", type: "feature", title: "Toplu ürün içe aktarma (CSV) önizleme" }],
  },
  {
    id: "dpl_86a8", version: "v1.6.9", env: "staging", status: "failed",
    steps: [{ name: "build", status: "passed", durationMs: 40000 }, { name: "test", status: "failed", durationMs: 61000 }, { name: "deploy", status: "pending" }],
    triggeredBy: "ci-bot", time: "1 hafta önce", durationMs: 101000, commit: "8f7e6d5",
    changelog: [],
  },
  {
    id: "dpl_8597", version: "v1.6.8", env: "dev", status: "success", steps: ok(37000, 70000, 16000),
    triggeredBy: "elif", time: "2 hafta önce", durationMs: 123000, commit: "7e6d5c4",
    changelog: [{ issueId: "FEAT-42", type: "feature", title: "Karanlık mod e-posta şablonları (taslak)" }],
  },
  {
    id: "dpl_8486", version: "v1.6.7", env: "prod", status: "success", steps: ok(44000, 88000, 23000),
    triggeredBy: "deniz", time: "2 hafta önce", durationMs: 155000, commit: "6d5c4b3",
    changelog: [{ issueId: "BUG-131", type: "bug", title: "E-posta şablonunda değişken render hatası" }],
  },
];

// Region/env başına ortam sağlık metrikleri (KPI ve detay drawer için).
export const ENV_HEALTH: Record<EnvName, { uptime: number; errorRate: number; p95Ms: number; rps: number }> = {
  dev: { uptime: 99.1, errorRate: 0.9, p95Ms: 142, rps: 4 },
  staging: { uptime: 99.6, errorRate: 0.3, p95Ms: 168, rps: 22 },
  prod: { uptime: 99.98, errorRate: 0.06, p95Ms: 196, rps: 1840 },
};

export const DEPLOY_FREQ_TREND = [3, 4, 2, 5, 6, 4, 7, 5, 8, 6, 9, 7];
export const LEAD_TIME_TREND = [320, 290, 310, 260, 240, 250, 220, 210, 230, 200, 190, 185];
export const CHANGE_FAIL_TREND = [18, 16, 20, 14, 12, 15, 11, 13, 9, 10, 8, 7];
export const MTTR_TREND = [42, 38, 45, 30, 28, 32, 24, 26, 20, 22, 18, 15];
