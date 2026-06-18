// Page-local seed for the API Keys surface (enterprise-grade).
// platform.ts'teki ApiKey tipini DEĞİŞTİRMEDEN zenginleştirir:
// kullanım metrikleri, sızıntı sinyali, audit geçmişi, son IP/ajan.
import type { ApiKey } from "~/data/platform";

export interface KeyAuditEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
  kind: "created" | "rotated" | "revoked" | "scope" | "used" | "leak" | "limit";
  detail?: string;
}

/** ApiKey + enterprise metrikleri (yalnızca bu sayfada kullanılır). */
export interface RichApiKey extends ApiKey {
  /** son 7 gün günlük çağrı sayısı — sparkline + hacim için */
  usage7d: number[];
  /** son 24 saat toplam çağrı */
  calls24h: number;
  /** 30 günlük toplam çağrı */
  calls30d: number;
  /** dakikadaki istek limiti (rate limit) */
  rateLimit: number;
  /** son kullanım kaynağı */
  lastIp: string;
  lastUserAgent: string;
  /** sahibi / sorumlu */
  owner: string;
  /** otomatik sona erme (varsa) */
  expiresAt: string | null;
  /** sızıntı/risk sinyali: public repo, anormal IP, vb. */
  leak: null | { source: string; at: string; severity: "low" | "high" };
  /** son rotate'ten bu yana geçen gün — yaşlanma uyarısı için */
  ageDays: number;
  audit: KeyAuditEntry[];
}

export const SEED_RICH_KEYS: RichApiKey[] = [
  {
    id: "k1", name: "Production server", prefix: "mp_live_sk_9f2a", scopes: ["read", "write"],
    createdAt: "2 ay önce", lastUsed: "2 dk önce", env: "prod", revoked: false,
    usage7d: [820, 910, 1040, 980, 1120, 1080, 1240], calls24h: 28430, calls30d: 812400,
    rateLimit: 600, lastIp: "34.120.18.7", lastUserAgent: "metapanel-go/1.4 (server)",
    owner: "Mehmet Yılmaz", expiresAt: null, leak: null, ageDays: 61,
    audit: [
      { id: "a1", action: "anahtarı kullandı", actor: "metapanel-go/1.4", at: "2 dk önce", kind: "used", detail: "GET /v1/orders · 200" },
      { id: "a2", action: "rate limit %82'ye ulaştı", actor: "system", at: "1 sa önce", kind: "limit", detail: "494/600 req/dk" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Mehmet Yılmaz", at: "2 ay önce", kind: "created", detail: "scope: read, write" },
    ],
  },
  {
    id: "k2", name: "Mobile app", prefix: "mp_live_sk_3c71", scopes: ["read"],
    createdAt: "1 ay önce", lastUsed: "18 dk önce", env: "prod", revoked: false,
    usage7d: [410, 520, 480, 610, 540, 590, 620], calls24h: 14210, calls30d: 401200,
    rateLimit: 300, lastIp: "92.44.18.220", lastUserAgent: "MetaApp/3.2 (iOS 17.4)",
    owner: "Zeynep Kaya", expiresAt: null, leak: null, ageDays: 31,
    audit: [
      { id: "a1", action: "anahtarı kullandı", actor: "MetaApp/3.2", at: "18 dk önce", kind: "used", detail: "GET /v1/profile · 200" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Zeynep Kaya", at: "1 ay önce", kind: "created", detail: "scope: read" },
    ],
  },
  {
    id: "k3", name: "CI pipeline", prefix: "mp_test_sk_b8e2", scopes: ["read", "write", "deploy"],
    createdAt: "3 hafta önce", lastUsed: "8 dk önce", env: "staging", revoked: false,
    usage7d: [120, 90, 140, 80, 160, 110, 95], calls24h: 1840, calls30d: 41200,
    rateLimit: 120, lastIp: "104.18.32.9", lastUserAgent: "github-actions/runner",
    owner: "ci-bot", expiresAt: "3 ay sonra", leak: null, ageDays: 21,
    audit: [
      { id: "a1", action: "deploy tetikledi", actor: "github-actions", at: "8 dk önce", kind: "used", detail: "POST /v1/deploy · 202" },
      { id: "a2", action: "scope ekledi", actor: "Ali Demir", at: "2 hafta önce", kind: "scope", detail: "+ deploy" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "ci-bot", at: "3 hafta önce", kind: "created", detail: "scope: read, write" },
    ],
  },
  {
    id: "k4", name: "Eski entegrasyon", prefix: "mp_live_sk_001f", scopes: ["read", "write"],
    createdAt: "6 ay önce", lastUsed: "3 ay önce", env: "prod", revoked: true,
    usage7d: [0, 0, 0, 0, 0, 0, 0], calls24h: 0, calls30d: 0,
    rateLimit: 300, lastIp: "78.135.4.11", lastUserAgent: "python-requests/2.28",
    owner: "Elif Şahin", expiresAt: null, leak: null, ageDays: 183,
    audit: [
      { id: "a1", action: "anahtarı iptal etti", actor: "Mehmet Yılmaz", at: "3 ay önce", kind: "revoked", detail: "kullanım dışı — temizlik" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Elif Şahin", at: "6 ay önce", kind: "created" },
    ],
  },
  {
    id: "k5", name: "Webhook dispatcher", prefix: "mp_live_sk_7d44", scopes: ["read", "write"],
    createdAt: "4 ay önce", lastUsed: "1 dk önce", env: "prod", revoked: false,
    usage7d: [2200, 2410, 2380, 2600, 2550, 2710, 2890], calls24h: 64200, calls30d: 1840000,
    rateLimit: 1000, lastIp: "35.190.22.4", lastUserAgent: "metapanel-dispatch/2.1",
    owner: "Mehmet Yılmaz", expiresAt: null, leak: null, ageDays: 122,
    audit: [
      { id: "a1", action: "anahtarı kullandı", actor: "metapanel-dispatch", at: "1 dk önce", kind: "used", detail: "POST /v1/hooks · 200" },
      { id: "a2", action: "rate limit %94'e ulaştı", actor: "system", at: "22 dk önce", kind: "limit", detail: "940/1000 req/dk" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Mehmet Yılmaz", at: "4 ay önce", kind: "created" },
    ],
  },
  {
    id: "k6", name: "Analytics export", prefix: "mp_live_sk_a19c", scopes: ["read"],
    createdAt: "5 ay önce", lastUsed: "6 sa önce", env: "prod", revoked: false,
    usage7d: [40, 38, 0, 42, 0, 39, 41], calls24h: 41, calls30d: 1180,
    rateLimit: 60, lastIp: "188.32.7.90", lastUserAgent: "metabase/0.49 connector",
    owner: "Elif Şahin", expiresAt: null,
    leak: { source: "github.com/acme/data-jobs (public repo)", at: "9 sa önce", severity: "high" },
    ageDays: 152,
    audit: [
      { id: "a1", action: "OLASI SIZINTI tespit edildi", actor: "Secret Scanner", at: "9 sa önce", kind: "leak", detail: "github.com/acme/data-jobs · README.md" },
      { id: "a2", action: "anahtarı kullandı", actor: "metabase/0.49", at: "6 sa önce", kind: "used", detail: "GET /v1/metrics · 200" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Elif Şahin", at: "5 ay önce", kind: "created" },
    ],
  },
  {
    id: "k7", name: "Partner — LogiShip", prefix: "mp_live_sk_c502", scopes: ["read", "write"],
    createdAt: "8 ay önce", lastUsed: "2 gün önce", env: "prod", revoked: false,
    usage7d: [310, 0, 280, 0, 0, 290, 0], calls24h: 0, calls30d: 6400,
    rateLimit: 200, lastIp: "203.0.113.42", lastUserAgent: "LogiShip-Connector/1.0",
    owner: "Ali Demir", expiresAt: "yakında (12 gün)", leak: null, ageDays: 243,
    audit: [
      { id: "a1", action: "yaşlanma uyarısı (>180 gün)", actor: "system", at: "1 gün önce", kind: "limit", detail: "rotate önerilir" },
      { id: "a2", action: "anahtarı kullandı", actor: "LogiShip-Connector", at: "2 gün önce", kind: "used", detail: "POST /v1/shipments · 201" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Ali Demir", at: "8 ay önce", kind: "created" },
    ],
  },
  {
    id: "k8", name: "Staging seed", prefix: "mp_test_sk_4e88", scopes: ["read", "write", "admin"],
    createdAt: "10 gün önce", lastUsed: "4 sa önce", env: "staging", revoked: false,
    usage7d: [60, 80, 40, 70, 90, 55, 65], calls24h: 420, calls30d: 9800,
    rateLimit: 120, lastIp: "10.0.4.18", lastUserAgent: "seed-cli/0.3",
    owner: "Zeynep Kaya", expiresAt: "7 gün sonra", leak: null, ageDays: 10,
    audit: [
      { id: "a1", action: "anahtarı kullandı", actor: "seed-cli", at: "4 sa önce", kind: "used", detail: "POST /v1/seed · 200" },
      { id: "a2", action: "anahtarı oluşturdu", actor: "Zeynep Kaya", at: "10 gün önce", kind: "created", detail: "scope: read, write, admin" },
    ],
  },
  {
    id: "k9", name: "Dev playground", prefix: "mp_test_sk_2af0", scopes: ["read"],
    createdAt: "2 gün önce", lastUsed: "hiç", env: "dev", revoked: false,
    usage7d: [0, 0, 0, 0, 0, 0, 0], calls24h: 0, calls30d: 0,
    rateLimit: 60, lastIp: "—", lastUserAgent: "—",
    owner: "Ali Demir", expiresAt: "30 gün sonra", leak: null, ageDays: 2,
    audit: [
      { id: "a2", action: "anahtarı oluşturdu", actor: "Ali Demir", at: "2 gün önce", kind: "created", detail: "scope: read" },
    ],
  },
  {
    id: "k10", name: "Marketing automation", prefix: "mp_live_sk_8b13", scopes: ["read", "write"],
    createdAt: "7 ay önce", lastUsed: "40 dk önce", env: "prod", revoked: false,
    usage7d: [180, 220, 210, 260, 240, 230, 270], calls24h: 5800, calls30d: 162000,
    rateLimit: 300, lastIp: "146.75.28.5", lastUserAgent: "n8n-workflow/1.0",
    owner: "Elif Şahin", expiresAt: null, leak: null, ageDays: 214,
    audit: [
      { id: "a1", action: "yaşlanma uyarısı (>180 gün)", actor: "system", at: "3 gün önce", kind: "limit", detail: "rotate önerilir" },
      { id: "a2", action: "anahtarı kullandı", actor: "n8n-workflow", at: "40 dk önce", kind: "used", detail: "GET /v1/contacts · 200" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Elif Şahin", at: "7 ay önce", kind: "created" },
    ],
  },
  {
    id: "k11", name: "Legacy reporting", prefix: "mp_live_sk_0c9d", scopes: ["read"],
    createdAt: "1 yıl önce", lastUsed: "5 ay önce", env: "prod", revoked: true,
    usage7d: [0, 0, 0, 0, 0, 0, 0], calls24h: 0, calls30d: 0,
    rateLimit: 60, lastIp: "62.210.5.1", lastUserAgent: "curl/7.68",
    owner: "ci-bot", expiresAt: null, leak: null, ageDays: 365,
    audit: [
      { id: "a1", action: "anahtarı iptal etti", actor: "system", at: "5 ay önce", kind: "revoked", detail: "180 gün kullanılmadı — otomatik" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "ci-bot", at: "1 yıl önce", kind: "created" },
    ],
  },
  {
    id: "k12", name: "Support tooling", prefix: "mp_live_sk_f7e0", scopes: ["read", "write", "admin"],
    createdAt: "3 ay önce", lastUsed: "11 dk önce", env: "prod", revoked: false,
    usage7d: [90, 110, 95, 130, 120, 105, 140], calls24h: 2100, calls30d: 58000,
    rateLimit: 200, lastIp: "51.158.9.77", lastUserAgent: "support-desk/2.0",
    owner: "Can Öztürk", expiresAt: null,
    leak: { source: "anormal IP — TR dışı erişim (RU)", at: "2 sa önce", severity: "low" },
    ageDays: 92,
    audit: [
      { id: "a1", action: "anormal erişim işaretlendi", actor: "Threat Monitor", at: "2 sa önce", kind: "leak", detail: "IP 185.220.x (RU) · daha önce görülmedi" },
      { id: "a2", action: "anahtarı kullandı", actor: "support-desk", at: "11 dk önce", kind: "used", detail: "PATCH /v1/tickets · 200" },
      { id: "a3", action: "anahtarı oluşturdu", actor: "Can Öztürk", at: "3 ay önce", kind: "created", detail: "scope: read, write, admin" },
    ],
  },
];
