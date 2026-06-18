// Page-local seed for the Environments & Secrets surface.
// Enterprise-grade: richer var inventory + per-var value history (audit) +
// scope/owner/expiry metadata. Bu dosya yalnızca environments route'u içindir.
import type { EnvName } from "~/data/delivery";

export type EnvVarKind = "secret" | "config" | "reference";

export interface EnvVarHistory {
  id: string;
  /** ne oldu: "değer rotate edildi" */
  action: string;
  actor: string;
  at: string;
  /** maskeli önizleme/diff: "sk_live_…b8e3 → sk_live_…7c41" */
  diff?: string;
  tone?: "default" | "primary" | "emerald" | "amber" | "red";
}

export interface EnvVarRich {
  id: string;
  key: string;
  value: string;
  secret: boolean;
  kind: EnvVarKind;
  env: EnvName;
  /** "Ödeme", "Veritabanı", "Altyapı" — gruplama/etiket */
  category: string;
  owner: string;
  updatedAt: string;
  /** rotate edilmesi gereken gizli anahtarlar için son tarih, yoksa null */
  rotateBy: string | null;
  /** gün cinsinden yaş (rotation/stale tespiti) */
  ageDays: number;
  /** son senkron/deploy ile uyumlu mu */
  synced: boolean;
  history: EnvVarHistory[];
}

// Maskeli value preview üretmek için yardımcı (ilk 6 + son 4 görünür).
export function maskValue(value: string, secret: boolean): string {
  if (!secret) return value;
  if (value.length <= 12) return "•".repeat(value.length);
  return `${value.slice(0, 6)}${"•".repeat(10)}${value.slice(-4)}`;
}

const H = (
  id: string,
  action: string,
  actor: string,
  at: string,
  diff?: string,
  tone?: EnvVarHistory["tone"],
): EnvVarHistory => ({ id, action, actor, at, diff, tone });

export const SEED_ENV_VARS_RICH: EnvVarRich[] = [
  // ── Production ──────────────────────────────────────────────────────
  {
    id: "p-db", key: "DATABASE_URL", value: "postgres://prod-db.acme.internal:5432/acme",
    secret: true, kind: "secret", env: "prod", category: "Veritabanı", owner: "Platform Ekibi",
    updatedAt: "2 hafta önce", rotateBy: "12 gün sonra", ageDays: 14, synced: true,
    history: [
      H("h1", "değeri görüntüledi", "Ada Yılmaz", "3 saat önce", undefined, "default"),
      H("h2", "değer rotate edildi", "Platform Ekibi", "2 hafta önce", "…/acme_old → …/acme", "primary"),
      H("h3", "prod ortamına eşitlendi", "Deploy Bot", "2 hafta önce", "deploy #482", "emerald"),
    ],
  },
  {
    id: "p-stripe", key: "STRIPE_SECRET_KEY", value: "sk_live_51Hx7c2a9f2a7c41b8e3d6",
    secret: true, kind: "secret", env: "prod", category: "Ödeme", owner: "Finans Servisi",
    updatedAt: "1 ay önce", rotateBy: "3 gün sonra", ageDays: 32, synced: true,
    history: [
      H("h1", "rotation hatırlatması gönderildi", "AI Copilot", "1 gün önce", "rotateBy < 7 gün", "amber"),
      H("h2", "değeri görüntüledi", "Mert Demir", "5 gün önce", undefined, "default"),
      H("h3", "değer oluşturuldu", "Finans Servisi", "1 ay önce", "yeni live key", "primary"),
    ],
  },
  {
    id: "p-redis", key: "REDIS_URL", value: "redis://prod-cache.acme.internal:6379",
    secret: false, kind: "config", env: "prod", category: "Altyapı", owner: "Platform Ekibi",
    updatedAt: "3 hafta önce", rotateBy: null, ageDays: 21, synced: true,
    history: [H("h1", "değer güncellendi", "Platform Ekibi", "3 hafta önce", "6380 → 6379", "primary")],
  },
  {
    id: "p-app", key: "APP_URL", value: "https://acme.app",
    secret: false, kind: "config", env: "prod", category: "Altyapı", owner: "Web Ekibi",
    updatedAt: "2 ay önce", rotateBy: null, ageDays: 64, synced: true,
    history: [H("h1", "değer oluşturuldu", "Web Ekibi", "2 ay önce", undefined, "primary")],
  },
  {
    id: "p-rate", key: "RATE_LIMIT_PER_MIN", value: "100",
    secret: false, kind: "config", env: "prod", category: "API", owner: "API Ekibi",
    updatedAt: "1 hafta önce", rotateBy: null, ageDays: 7, synced: false,
    history: [
      H("h1", "deploy ile uyumsuz", "Deploy Bot", "2 gün önce", "kod: 120, env: 100", "red"),
      H("h2", "değer güncellendi", "API Ekibi", "1 hafta önce", "60 → 100", "primary"),
    ],
  },
  {
    id: "p-jwt", key: "JWT_SIGNING_KEY", value: "whsec_a1b2c3d4e5f60718293a4b5c6d7e8f90",
    secret: true, kind: "secret", env: "prod", category: "Auth", owner: "Güvenlik Ekibi",
    updatedAt: "5 ay önce", rotateBy: "Süresi geçti", ageDays: 158, synced: true,
    history: [
      H("h1", "stale uyarısı: 90 günü aştı", "AI Copilot", "2 ay önce", "ageDays 158", "red"),
      H("h2", "değer oluşturuldu", "Güvenlik Ekibi", "5 ay önce", undefined, "primary"),
    ],
  },
  {
    id: "p-sentry", key: "SENTRY_DSN", value: "https://abc123@o45.ingest.sentry.io/12",
    secret: false, kind: "reference", env: "prod", category: "Gözlemlenebilirlik", owner: "SRE",
    updatedAt: "1 ay önce", rotateBy: null, ageDays: 30, synced: true,
    history: [H("h1", "değer oluşturuldu", "SRE", "1 ay önce", undefined, "primary")],
  },
  {
    id: "p-smtp", key: "SMTP_PASSWORD", value: "Sm7p-Pr0d-9x2k-aa31-zzqq",
    secret: true, kind: "secret", env: "prod", category: "E-posta", owner: "Platform Ekibi",
    updatedAt: "6 gün önce", rotateBy: "84 gün sonra", ageDays: 6, synced: true,
    history: [H("h1", "değer rotate edildi", "Platform Ekibi", "6 gün önce", "•••• → ••••", "primary")],
  },

  // ── Staging ─────────────────────────────────────────────────────────
  {
    id: "s-db", key: "DATABASE_URL", value: "postgres://staging-db.acme.internal:5432/acme",
    secret: true, kind: "secret", env: "staging", category: "Veritabanı", owner: "Platform Ekibi",
    updatedAt: "2 sa önce", rotateBy: "20 gün sonra", ageDays: 1, synced: true,
    history: [H("h1", "değeri görüntüledi", "Zeynep Kaya", "2 sa önce", undefined, "default")],
  },
  {
    id: "s-stripe", key: "STRIPE_SECRET_KEY", value: "sk_test_51Hx7c2a9f2a7c41b8e3",
    secret: true, kind: "secret", env: "staging", category: "Ödeme", owner: "Finans Servisi",
    updatedAt: "5 gün önce", rotateBy: null, ageDays: 5, synced: true,
    history: [H("h1", "değer güncellendi", "Finans Servisi", "5 gün önce", "test key", "primary")],
  },
  {
    id: "s-flags", key: "FEATURE_FLAGS_URL", value: "https://flags.acme.internal",
    secret: false, kind: "reference", env: "staging", category: "Altyapı", owner: "Platform Ekibi",
    updatedAt: "5 gün önce", rotateBy: null, ageDays: 5, synced: true,
    history: [H("h1", "değer oluşturuldu", "Platform Ekibi", "5 gün önce", undefined, "primary")],
  },
  {
    id: "s-app", key: "APP_URL", value: "https://staging.acme.app",
    secret: false, kind: "config", env: "staging", category: "Altyapı", owner: "Web Ekibi",
    updatedAt: "1 ay önce", rotateBy: null, ageDays: 30, synced: false,
    history: [H("h1", "deploy ile uyumsuz", "Deploy Bot", "4 gün önce", "branch farkı", "red")],
  },
  {
    id: "s-debug", key: "DEBUG", value: "true",
    secret: false, kind: "config", env: "staging", category: "Diagnostik", owner: "QA",
    updatedAt: "3 gün önce", rotateBy: null, ageDays: 3, synced: true,
    history: [H("h1", "değer güncellendi", "QA", "3 gün önce", "false → true", "amber")],
  },

  // ── Development ─────────────────────────────────────────────────────
  {
    id: "d-db", key: "DATABASE_URL", value: "postgres://localhost:5432/acme_dev",
    secret: true, kind: "secret", env: "dev", category: "Veritabanı", owner: "Geliştirici",
    updatedAt: "8 dk önce", rotateBy: null, ageDays: 0, synced: true,
    history: [H("h1", "değer güncellendi", "Ada Yılmaz", "8 dk önce", "yerel db", "primary")],
  },
  {
    id: "d-debug", key: "DEBUG", value: "true",
    secret: false, kind: "config", env: "dev", category: "Diagnostik", owner: "Geliştirici",
    updatedAt: "8 dk önce", rotateBy: null, ageDays: 0, synced: true,
    history: [H("h1", "değer oluşturuldu", "Ada Yılmaz", "8 dk önce", undefined, "primary")],
  },
  {
    id: "d-stripe", key: "STRIPE_SECRET_KEY", value: "sk_test_dev_0000111122223333",
    secret: true, kind: "secret", env: "dev", category: "Ödeme", owner: "Geliştirici",
    updatedAt: "1 gün önce", rotateBy: null, ageDays: 1, synced: true,
    history: [H("h1", "değer oluşturuldu", "Mert Demir", "1 gün önce", "mock key", "primary")],
  },
  {
    id: "d-mailhog", key: "SMTP_HOST", value: "localhost:1025",
    secret: false, kind: "config", env: "dev", category: "E-posta", owner: "Geliştirici",
    updatedAt: "2 gün önce", rotateBy: null, ageDays: 2, synced: true,
    history: [H("h1", "değer oluşturuldu", "Geliştirici", "2 gün önce", "mailhog", "primary")],
  },
];
