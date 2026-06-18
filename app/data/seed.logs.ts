// Page-local seed for the Logs route — enterprise-grade density.
// Mevcut LogLine tipini genişletir (ek alanlar opsiyonel; ham veri/trace/meta).
import { LOGS, type LogLine, type LogLevel } from "~/data/expansion";

export type { LogLevel } from "~/data/expansion";

export interface LogEntry extends LogLine {
  /** korelasyon/trace ids — denetim için */
  traceId: string;
  spanId?: string;
  /** istek/kullanıcı bağlamı */
  actor?: string;
  ip?: string;
  /** HTTP/iş bağlamı */
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  /** ortam */
  env: "production" | "staging";
  region: string;
  host: string;
  /** ham yapısal alanlar (JSON sekmesi) */
  meta?: Record<string, string | number | boolean>;
  /** error seviyesi için stack izi */
  stack?: string;
}

const KNOWN_SOURCES = ["api", "auth", "db", "webhook", "cache", "scheduler", "migration"];

// Mevcut 12 LOGS kaydını zenginleştirilmiş forma yükselt (id/seviye/mesaj korunur).
const BASE: LogEntry[] = LOGS.map((l, i) => {
  const m = /(\d{3})/.exec(l.message);
  const status = m ? Number(m[1]) : undefined;
  return {
    ...l,
    traceId: `trc_${(0x7a3f01 + i * 1337).toString(16)}`,
    spanId: `spn_${(0x1c0 + i).toString(16)}`,
    env: i % 5 === 0 ? "staging" : "production",
    region: i % 3 === 0 ? "eu-central-1" : "eu-west-1",
    host: `node-${(i % 4) + 1}.metapanel.io`,
    statusCode: status,
    durationMs: /(\d+)ms/.exec(l.message) ? Number(/(\d+)ms/.exec(l.message)![1]) : undefined,
    meta: { source: l.source, level: l.level },
    stack:
      l.level === "error"
        ? `Error: ${l.message}\n    at handler (src/${l.source}/index.ts:142:11)\n    at dispatch (src/runtime/pipeline.ts:88:7)`
        : undefined,
  };
});

// Ek gerçekçi kayıtlar — canlı akış hissi için zaman serisi.
const EXTRA: LogEntry[] = [
  {
    id: "lx1", level: "error", time: "10:24:08", source: "api",
    message: "POST /api/checkout 500 — unhandled exception (cart#88421)",
    traceId: "trc_a91002", spanId: "spn_201", env: "production", region: "eu-west-1",
    host: "node-2.metapanel.io", method: "POST", path: "/api/checkout", statusCode: 500,
    durationMs: 1284, actor: "user#9921", ip: "10.0.3.18",
    meta: { cart: "cart#88421", amount: 1299.9, currency: "TRY", retries: 0 },
    stack: "TypeError: Cannot read 'total' of undefined\n    at calc (src/checkout/total.ts:31:18)\n    at POST (src/api/checkout.ts:64:9)",
  },
  {
    id: "lx2", level: "warn", time: "10:24:06", source: "auth",
    message: "Şüpheli giriş: 6 başarısız deneme — ip=185.22.41.9 (Brute-force?)",
    traceId: "trc_a91101", env: "production", region: "eu-central-1",
    host: "node-1.metapanel.io", actor: "user#142", ip: "185.22.41.9",
    meta: { attempts: 6, locked: true, geo: "RU", riskScore: 0.81 },
  },
  {
    id: "lx3", level: "info", time: "10:24:05", source: "scheduler",
    message: "Job 'Günlük rapor' kuyruğa alındı (cron 0 6 * * *)",
    traceId: "trc_a91200", env: "production", region: "eu-west-1",
    host: "node-3.metapanel.io", actor: "system",
    meta: { job: "daily-report", queued: true, eta: "06:00" },
  },
  {
    id: "lx4", level: "debug", time: "10:24:04", source: "cache",
    message: "Cache evict: LRU 312 anahtar boşaltıldı (bellek %86)",
    traceId: "trc_a91301", env: "production", region: "eu-west-1",
    host: "node-4.metapanel.io",
    meta: { evicted: 312, memPct: 86, policy: "LRU" },
  },
  {
    id: "lx5", level: "info", time: "10:24:03", source: "webhook",
    message: "Teslimat başarılı: stripe.events (250ms, attempt 2/3)",
    traceId: "trc_a91401", env: "production", region: "eu-west-1",
    host: "node-2.metapanel.io", statusCode: 200, durationMs: 250,
    meta: { endpoint: "stripe.events", attempt: 2, signature: "valid" },
  },
  {
    id: "lx6", level: "error", time: "10:24:02", source: "db",
    message: "Deadlock tespit edildi: orders ⇄ inventory (tx geri alındı)",
    traceId: "trc_a91501", env: "production", region: "eu-central-1",
    host: "node-1.metapanel.io",
    meta: { tables: "orders,inventory", rolledBack: true, victim: "tx#5521" },
    stack: "SQLSTATE 40P01: deadlock detected\n    at execute (src/db/pool.ts:201:13)\n    at withTx (src/db/tx.ts:44:9)",
  },
  {
    id: "lx7", level: "warn", time: "10:23:46", source: "migration",
    message: "Geri alınamaz migrasyon uyarısı: 004_drop_legacy_orders",
    traceId: "trc_a91601", env: "staging", region: "eu-west-1",
    host: "node-3.metapanel.io", actor: "deploy-bot",
    meta: { migration: "004_drop_legacy_orders", reversible: false, dryRun: true },
  },
  {
    id: "lx8", level: "info", time: "10:23:42", source: "api",
    message: "GET /api/dashboard 200 in 58ms (cache hit)",
    traceId: "trc_a91701", env: "production", region: "eu-west-1",
    host: "node-4.metapanel.io", method: "GET", path: "/api/dashboard",
    statusCode: 200, durationMs: 58, meta: { cache: "hit", rows: 0 },
  },
  {
    id: "lx9", level: "debug", time: "10:23:38", source: "scheduler",
    message: "Heartbeat: worker pool sağlıklı (4/4 aktif, lag 0ms)",
    traceId: "trc_a91801", env: "production", region: "eu-west-1",
    host: "node-2.metapanel.io", meta: { workers: 4, lagMs: 0 },
  },
  {
    id: "lx10", level: "info", time: "10:23:33", source: "auth",
    message: "API anahtarı döndürüldü: key_prod_…f12 (admin#1)",
    traceId: "trc_a91901", env: "production", region: "eu-central-1",
    host: "node-1.metapanel.io", actor: "admin#1",
    meta: { keyId: "key_prod_f12", rotated: true, scope: "read,write" },
  },
];

export const LOG_ENTRIES: LogEntry[] = [...EXTRA, ...BASE].sort((a, b) =>
  b.time.localeCompare(a.time),
);

export const LOG_SOURCES: string[] = Array.from(
  new Set([...KNOWN_SOURCES, ...LOG_ENTRIES.map((l) => l.source)]),
);

export const LEVEL_META: Record<
  LogLevel,
  { label: string; dot: string; chip: string; badge: string }
> = {
  error: { label: "Error", dot: "bg-red-400", chip: "text-red-400 bg-red-400/10", badge: "border-red-500/30 text-red-400 bg-red-500/5" },
  warn: { label: "Warn", dot: "bg-amber-400", chip: "text-amber-400 bg-amber-400/10", badge: "border-amber-500/30 text-amber-400 bg-amber-500/5" },
  info: { label: "Info", dot: "bg-sky-400", chip: "text-sky-400 bg-sky-400/10", badge: "border-sky-500/30 text-sky-400 bg-sky-500/5" },
  debug: { label: "Debug", dot: "bg-muted-foreground", chip: "text-muted-foreground bg-muted", badge: "border-border text-muted-foreground bg-muted/40" },
};
