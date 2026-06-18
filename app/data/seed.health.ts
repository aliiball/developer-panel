// Page-local seed for the Health insight surface.
// Servis sağlığı detayları, incident geçmişi, SLA hedefleri ve
// zaman-serisi metrikleri (latency / error rate). Yalnızca health route'u kullanır.

export type Severity = "critical" | "major" | "minor";
export type IncidentStatus = "resolved" | "monitoring" | "investigating" | "identified";
export type Region = "eu-central" | "us-east" | "ap-south";

export interface ServiceMeta {
  id: string;
  region: Region;
  tier: "T0" | "T1" | "T2";
  owner: string;
  dependencies: string[];
  errorRate: number; // % son 24s
  rps: number; // istek/sn
  p95Ms: number;
  slaTarget: number; // %
  slaActual: number; // % son 30g
  lastDeploy: string;
  endpoint: string;
}

// SERVICES (app/data/expansion.ts) ile id eşleşir; ek operasyonel alanlar burada.
export const SERVICE_META: Record<string, ServiceMeta> = {
  api: {
    id: "api", region: "eu-central", tier: "T0", owner: "Platform Ekibi",
    dependencies: ["db", "cache"], errorRate: 0.04, rps: 1240, p95Ms: 86,
    slaTarget: 99.95, slaActual: 99.98, lastDeploy: "2 saat önce", endpoint: "https://api.metapanel.io",
  },
  db: {
    id: "db", region: "eu-central", tier: "T0", owner: "Veri Ekibi",
    dependencies: [], errorRate: 1.8, rps: 3400, p95Ms: 312,
    slaTarget: 99.95, slaActual: 99.41, lastDeploy: "5 gün önce", endpoint: "postgres://primary.db.internal:5432",
  },
  queue: {
    id: "queue", region: "us-east", tier: "T1", owner: "Platform Ekibi",
    dependencies: ["cache"], errorRate: 0.01, rps: 880, p95Ms: 24,
    slaTarget: 99.9, slaActual: 99.99, lastDeploy: "1 gün önce", endpoint: "amqp://queue.internal:5672",
  },
  cache: {
    id: "cache", region: "eu-central", tier: "T1", owner: "Platform Ekibi",
    dependencies: [], errorRate: 0.0, rps: 9600, p95Ms: 6,
    slaTarget: 99.9, slaActual: 100, lastDeploy: "12 gün önce", endpoint: "redis://cache.internal:6379",
  },
  storage: {
    id: "storage", region: "us-east", tier: "T2", owner: "Altyapı Ekibi",
    dependencies: ["api"], errorRate: 0.12, rps: 410, p95Ms: 134,
    slaTarget: 99.9, slaActual: 99.95, lastDeploy: "3 gün önce", endpoint: "s3://metapanel-assets",
  },
  webhook: {
    id: "webhook", region: "ap-south", tier: "T2", owner: "Entegrasyon Ekibi",
    dependencies: ["queue", "api"], errorRate: 18.4, rps: 0, p95Ms: 0,
    slaTarget: 99.5, slaActual: 96.2, lastDeploy: "6 saat önce", endpoint: "https://hooks.metapanel.io/dispatch",
  },
};

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string;
  durationMin: number;
  impact: string;
  acknowledgedBy: string;
  postmortem: boolean;
  timeline: { id: string; action: string; actor: string; at: string; tone: "default" | "primary" | "emerald" | "amber" | "red"; detail?: string }[];
}

export const INCIDENTS: Incident[] = [
  {
    id: "INC-241", title: "Webhook Dispatcher tamamen kapalı", service: "webhook",
    severity: "critical", status: "investigating", startedAt: "2026-06-18 11:42", durationMin: 148,
    impact: "Tüm giden webhook teslimatları kuyruğa alınıyor, müşteri entegrasyonları gecikiyor.",
    acknowledgedBy: "Mert Aydın", postmortem: false,
    timeline: [
      { id: "t1", action: "incident açıldı — sağlık probu 5xx döndürüyor", actor: "PagerDuty", at: "11:42", tone: "red", detail: "probe https://hooks.metapanel.io/health → 503" },
      { id: "t2", action: "incident sahiplenildi", actor: "Mert Aydın", at: "11:47", tone: "primary" },
      { id: "t3", action: "kök neden araştırılıyor: dispatcher pod CrashLoopBackOff", actor: "Mert Aydın", at: "12:05", tone: "amber", detail: "kube: webhook-dispatcher-7d9 restart x14" },
      { id: "t4", action: "kuyruk derinliği 12.4K mesaja ulaştı", actor: "system", at: "13:30", tone: "amber" },
    ],
  },
  {
    id: "INC-238", title: "PostgreSQL replikasyon gecikmesi", service: "db",
    severity: "major", status: "monitoring", startedAt: "2026-06-18 09:15", durationMin: 92,
    impact: "Okuma replikalarında p95 latency 3 kat arttı; raporlama sorguları yavaş.",
    acknowledgedBy: "Selin Koç", postmortem: false,
    timeline: [
      { id: "t1", action: "yüksek replikasyon lag uyarısı", actor: "Prometheus", at: "09:15", tone: "amber", detail: "replica_lag = 42s (eşik 10s)" },
      { id: "t2", action: "incident sahiplenildi", actor: "Selin Koç", at: "09:21", tone: "primary" },
      { id: "t3", action: "uzun süren analitik sorgu sonlandırıldı", actor: "Selin Koç", at: "09:48", tone: "default", detail: "pid 88421 — 38 dk süren VACUUM" },
      { id: "t4", action: "lag normale döndü, izleme aşamasında", actor: "system", at: "10:47", tone: "emerald", detail: "replica_lag = 1.2s" },
    ],
  },
  {
    id: "INC-235", title: "API Gateway hız limiti yanlış tetiklendi", service: "api",
    severity: "minor", status: "resolved", startedAt: "2026-06-17 16:30", resolvedAt: "2026-06-17 17:02", durationMin: 32,
    impact: "Bazı müşteriler limit altındayken 429 aldı; ~3% istek etkilendi.",
    acknowledgedBy: "Ada Yılmaz", postmortem: true,
    timeline: [
      { id: "t1", action: "429 oranında ani artış", actor: "Grafana", at: "16:30", tone: "amber" },
      { id: "t2", action: "hatalı rate-limit deploy'u geri alındı", actor: "Ada Yılmaz", at: "16:54", tone: "primary", detail: "rollback v3.18.2 → v3.18.1" },
      { id: "t3", action: "incident çözüldü", actor: "Ada Yılmaz", at: "17:02", tone: "emerald" },
    ],
  },
  {
    id: "INC-231", title: "Object Storage yavaş yükleme", service: "storage",
    severity: "minor", status: "resolved", startedAt: "2026-06-15 22:10", resolvedAt: "2026-06-15 22:55", durationMin: 45,
    impact: "Medya yüklemelerinde p95 600ms üstüne çıktı.", acknowledgedBy: "Can Demir", postmortem: false,
    timeline: [
      { id: "t1", action: "yükleme latency uyarısı", actor: "Datadog", at: "22:10", tone: "amber" },
      { id: "t2", action: "CDN edge cache temizlendi", actor: "Can Demir", at: "22:40", tone: "primary" },
      { id: "t3", action: "incident çözüldü", actor: "Can Demir", at: "22:55", tone: "emerald" },
    ],
  },
  {
    id: "INC-228", title: "Redis bellek baskısı", service: "cache",
    severity: "major", status: "resolved", startedAt: "2026-06-12 03:20", resolvedAt: "2026-06-12 04:10", durationMin: 50,
    impact: "maxmemory eşiğine ulaşıldı, eviction oranı yükseldi.", acknowledgedBy: "Selin Koç", postmortem: true,
    timeline: [
      { id: "t1", action: "bellek kullanımı %94", actor: "Prometheus", at: "03:20", tone: "amber" },
      { id: "t2", action: "TTL'siz anahtarlar tespit edildi ve temizlendi", actor: "Selin Koç", at: "03:55", tone: "primary", detail: "1.2M orphan session key" },
      { id: "t3", action: "incident çözüldü", actor: "Selin Koç", at: "04:10", tone: "emerald" },
    ],
  },
  {
    id: "INC-219", title: "Job Queue tüketici durması", service: "queue",
    severity: "minor", status: "resolved", startedAt: "2026-06-08 14:02", resolvedAt: "2026-06-08 14:20", durationMin: 18,
    impact: "Arka plan işleri 18 dk gecikti.", acknowledgedBy: "Mert Aydın", postmortem: false,
    timeline: [
      { id: "t1", action: "tüketici heartbeat kayboldu", actor: "system", at: "14:02", tone: "amber" },
      { id: "t2", action: "worker pod yeniden başlatıldı", actor: "Mert Aydın", at: "14:15", tone: "primary" },
      { id: "t3", action: "incident çözüldü", actor: "Mert Aydın", at: "14:20", tone: "emerald" },
    ],
  },
];

// 24 saatlik metrik serisi (saat başına bir nokta) — latency p95 ve error rate.
export interface MetricPoint {
  t: string;
  p95: number;
  errorRate: number;
  rps: number;
}

export const METRICS_24H: MetricPoint[] = Array.from({ length: 24 }, (_, h) => {
  const spike = h >= 9 && h <= 13; // db/webhook olaylarıyla örtüşen pencere
  const base = 78 + Math.round(18 * Math.sin(h / 3));
  return {
    t: `${String(h).padStart(2, "0")}:00`,
    p95: Math.max(40, base + (spike ? 120 + (h - 9) * 24 : 0)),
    errorRate: +(0.05 + (spike ? 0.9 + (h - 9) * 0.4 : Math.random() * 0.08)).toFixed(2),
    rps: 900 + Math.round(420 * Math.sin(h / 4)) + (spike ? -180 : 0),
  };
});

// 30 günlük uptime özeti (status-page tarzı bar) — günlük uptime %.
export const UPTIME_30D: { day: number; uptime: number }[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  let uptime = 100;
  if (day === 12) uptime = 99.86; // Redis
  if (day === 25) uptime = 99.92; // Storage
  if (day === 30) uptime = 97.4; // bugün — webhook + db
  if (day === 29) uptime = 99.78;
  return { day, uptime };
});
