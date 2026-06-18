// Page-local enriched seed for the Migrations surface.
// Extends the platform Migration model with audit, risk and run metadata
// without touching the shared app/data/platform.ts contract.
import type { Migration } from "~/data/platform";
import type { AuditEvent } from "~/components/enterprise";
import {
  GitMerge,
  Play,
  ArrowUUpLeft,
  Warning,
  CheckCircle,
  ClockClockwise,
} from "@phosphor-icons/react";

/** Risk seviyesi — DROP/ALTER ağırlıklı migration'lar daha yüksek. */
export type MigrationRisk = "low" | "medium" | "high";

/** Genişletilmiş, sayfa-yerel migration kaydı. */
export interface MigrationRow extends Migration {
  /** semantik versiyon (deploy ile eşleşir) */
  version: string;
  /** uygulama ortamı */
  env: "production" | "staging" | "development";
  risk: MigrationRisk;
  /** schema-diff özeti: eklenen/değişen/silinen DDL sayıları */
  added: number;
  changed: number;
  dropped: number;
  /** son denemenin süresi (ms) — pending ise tahmini */
  durationMs: number;
  /** etkilenen satır sayısı tahmini (online migration için kritik) */
  estRows: number;
  /** bağımlı olduğu önceki migration id'leri */
  dependsOn: string[];
  /** geri-alma (down) SQL'i — yoksa irreversible */
  downSql: string | null;
  /** checksum — drift tespiti için */
  checksum: string;
  /** kayıt başına audit izi */
  audit: AuditEvent[];
}

export const SEED_MIGRATION_ROWS: MigrationRow[] = [
  {
    id: "008_partition_events",
    name: "events tablosunu aya göre partition'la",
    status: "pending",
    appliedAt: null,
    author: "zeynep",
    affectedTables: ["events", "events_2026_06"],
    reversible: false,
    version: "v2.4.0",
    env: "production",
    risk: "high",
    added: 12,
    changed: 1,
    dropped: 0,
    durationMs: 0,
    estRows: 4_200_000,
    dependsOn: ["003_add_orders"],
    downSql: null,
    checksum: "sha256:9f1c…a02",
    sql: "-- 4.2M satır taşınacak, uzun kilit riski\nALTER TABLE events RENAME TO events_legacy;\n\nCREATE TABLE events (\n  id bigserial,\n  occurred_at timestamptz NOT NULL,\n  kind varchar(64) NOT NULL,\n  payload jsonb\n) PARTITION BY RANGE (occurred_at);\n\nCREATE TABLE events_2026_06 PARTITION OF events\n  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');\n\nINSERT INTO events SELECT * FROM events_legacy;",
    audit: [
      { id: "a1", action: "migration oluşturuldu", actor: "zeynep", at: "20 dk önce", icon: GitMerge, tone: "primary" },
      { id: "a2", action: "risk yüksek olarak işaretledi — online taşıma önerildi", actor: "AI Copilot", at: "18 dk önce", icon: Warning, tone: "amber", detail: "DROP/RENAME + 4.2M satır INSERT" },
    ],
  },
  {
    id: "007_user_mfa",
    name: "kullanıcı MFA alanları",
    status: "pending",
    appliedAt: null,
    author: "ali",
    affectedTables: ["users", "mfa_devices"],
    reversible: true,
    version: "v2.3.2",
    env: "staging",
    risk: "low",
    added: 6,
    changed: 1,
    dropped: 0,
    durationMs: 0,
    estRows: 0,
    dependsOn: ["001_init"],
    downSql: "DROP TABLE mfa_devices;\nALTER TABLE users DROP COLUMN mfa_enabled;",
    checksum: "sha256:3b7e…11d",
    sql: "ALTER TABLE users ADD COLUMN mfa_enabled boolean NOT NULL DEFAULT false;\n\nCREATE TABLE mfa_devices (\n  id serial PRIMARY KEY,\n  user_id integer REFERENCES users(id) ON DELETE CASCADE,\n  kind varchar(16) NOT NULL,\n  secret text NOT NULL,\n  created_at timestamptz DEFAULT now()\n);",
    audit: [
      { id: "a1", action: "migration oluşturuldu", actor: "ali", at: "1 sa önce", icon: GitMerge, tone: "primary" },
    ],
  },
  {
    id: "006_add_audit_log",
    name: "audit_log tablosu + index",
    status: "pending",
    appliedAt: null,
    author: "mehmet",
    affectedTables: ["audit_log"],
    reversible: true,
    version: "v2.3.1",
    env: "development",
    risk: "low",
    added: 9,
    changed: 0,
    dropped: 0,
    durationMs: 0,
    estRows: 0,
    dependsOn: [],
    downSql: "DROP TABLE audit_log;",
    checksum: "sha256:c41a…77f",
    sql: "CREATE TABLE audit_log (\n  id bigserial PRIMARY KEY,\n  actor_id integer,\n  action varchar(64) NOT NULL,\n  entity varchar(64),\n  meta jsonb,\n  at timestamptz DEFAULT now()\n);\n\nCREATE INDEX audit_log_at_idx ON audit_log (at DESC);",
    audit: [
      { id: "a1", action: "migration oluşturuldu", actor: "mehmet", at: "2 sa önce", icon: GitMerge, tone: "primary" },
    ],
  },
  {
    id: "005_add_subscriptions",
    name: "abonelik tabloları",
    status: "applied",
    appliedAt: "1 sa önce",
    author: "mehmet",
    affectedTables: ["subscriptions", "plans"],
    reversible: true,
    version: "v2.3.0",
    env: "production",
    risk: "medium",
    added: 11,
    changed: 0,
    dropped: 0,
    durationMs: 1840,
    estRows: 0,
    dependsOn: ["001_init"],
    downSql: "DROP TABLE subscriptions;\nDROP TABLE plans;",
    checksum: "sha256:5d2f…9ac",
    sql: "CREATE TABLE plans (\n  id serial PRIMARY KEY,\n  name varchar(64) NOT NULL,\n  price numeric NOT NULL\n);\n\nCREATE TABLE subscriptions (\n  id serial PRIMARY KEY,\n  customer_id integer REFERENCES customers(id),\n  plan_id integer REFERENCES plans(id),\n  status varchar(16) DEFAULT 'active'\n);",
    audit: [
      { id: "a1", action: "migration oluşturuldu", actor: "mehmet", at: "3 sa önce", icon: GitMerge, tone: "primary" },
      { id: "a2", action: "staging'de doğrulandı", actor: "ci-bot", at: "2 sa önce", icon: CheckCircle, tone: "emerald" },
      { id: "a3", action: "production'a uygulandı (1.84s)", actor: "mehmet", at: "1 sa önce", icon: Play, tone: "emerald", detail: "2 tablo, 0 satır taşındı" },
    ],
  },
  {
    id: "004_add_reviews",
    name: "ürün değerlendirmeleri",
    status: "applied",
    appliedAt: "5 sa önce",
    author: "zeynep",
    affectedTables: ["reviews"],
    reversible: true,
    version: "v2.2.0",
    env: "production",
    risk: "low",
    added: 7,
    changed: 0,
    dropped: 0,
    durationMs: 420,
    estRows: 0,
    dependsOn: ["001_init"],
    downSql: "DROP TABLE reviews;",
    checksum: "sha256:81bc…4e0",
    sql: "CREATE TABLE reviews (\n  id serial PRIMARY KEY,\n  product_id integer REFERENCES products(id),\n  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),\n  comment text\n);",
    audit: [
      { id: "a1", action: "migration oluşturuldu", actor: "zeynep", at: "7 sa önce", icon: GitMerge, tone: "primary" },
      { id: "a2", action: "production'a uygulandı (0.42s)", actor: "zeynep", at: "5 sa önce", icon: Play, tone: "emerald" },
    ],
  },
  {
    id: "003_add_orders",
    name: "sipariş tabloları + index",
    status: "applied",
    appliedAt: "2 gün önce",
    author: "ci-bot",
    affectedTables: ["orders", "order_items"],
    reversible: true,
    version: "v2.1.0",
    env: "production",
    risk: "medium",
    added: 14,
    changed: 2,
    dropped: 0,
    durationMs: 2110,
    estRows: 0,
    dependsOn: ["001_init"],
    downSql: "DROP INDEX orders_placed_at_idx;\nDROP TABLE order_items;\nDROP TABLE orders;",
    checksum: "sha256:a0e3…2bb",
    sql: "CREATE TABLE orders (\n  id serial PRIMARY KEY,\n  reference varchar(32) UNIQUE NOT NULL,\n  status varchar(16) DEFAULT 'pending',\n  total numeric NOT NULL,\n  placed_at timestamptz NOT NULL\n);\n\nCREATE INDEX orders_placed_at_idx ON orders (placed_at);",
    audit: [
      { id: "a1", action: "migration oluşturuldu", actor: "ci-bot", at: "2 gün önce", icon: GitMerge, tone: "primary" },
      { id: "a2", action: "production'a uygulandı (2.11s)", actor: "ci-bot", at: "2 gün önce", icon: Play, tone: "emerald" },
    ],
  },
  {
    id: "002_add_blog",
    name: "blog ve kategoriler",
    status: "applied",
    appliedAt: "3 gün önce",
    author: "mehmet",
    affectedTables: ["blog_posts", "categories", "tags"],
    reversible: true,
    version: "v2.0.0",
    env: "production",
    risk: "low",
    added: 18,
    changed: 0,
    dropped: 0,
    durationMs: 980,
    estRows: 0,
    dependsOn: ["001_init"],
    downSql: "DROP TABLE tags;\nDROP TABLE categories;\nDROP TABLE blog_posts;",
    checksum: "sha256:6f9d…c13",
    sql: "CREATE TABLE blog_posts (\n  id serial PRIMARY KEY,\n  title varchar(255) NOT NULL,\n  slug varchar(255) UNIQUE NOT NULL,\n  body text NOT NULL\n);",
    audit: [
      { id: "a1", action: "production'a uygulandı (0.98s)", actor: "mehmet", at: "3 gün önce", icon: Play, tone: "emerald" },
    ],
  },
  {
    id: "001_init",
    name: "ilk şema (customers, products)",
    status: "applied",
    appliedAt: "2 hafta önce",
    author: "mehmet",
    affectedTables: ["customers", "products"],
    reversible: false,
    version: "v1.0.0",
    env: "production",
    risk: "high",
    added: 16,
    changed: 0,
    dropped: 0,
    durationMs: 640,
    estRows: 0,
    dependsOn: [],
    downSql: null,
    checksum: "sha256:0001…000",
    sql: "CREATE TABLE customers (\n  id serial PRIMARY KEY,\n  full_name varchar(255) NOT NULL,\n  email varchar(255) UNIQUE NOT NULL\n);\n\nCREATE TABLE products (\n  id serial PRIMARY KEY,\n  name varchar(255) NOT NULL,\n  price numeric NOT NULL\n);",
    audit: [
      { id: "a1", action: "baz şema uygulandı (irreversible)", actor: "mehmet", at: "2 hafta önce", icon: Play, tone: "emerald" },
    ],
  },
  {
    id: "000_drop_legacy",
    name: "eski tabloları kaldır",
    status: "rolled_back",
    appliedAt: "1 gün önce",
    author: "you",
    affectedTables: ["legacy_users"],
    reversible: false,
    version: "v1.9.3",
    env: "production",
    risk: "high",
    added: 0,
    changed: 0,
    dropped: 4,
    durationMs: 310,
    estRows: 12_400,
    dependsOn: [],
    downSql: null,
    checksum: "sha256:dead…beef",
    sql: "DROP TABLE legacy_users;",
    audit: [
      { id: "a1", action: "production'a uygulandı", actor: "you", at: "1 gün önce", icon: Play, tone: "amber" },
      { id: "a2", action: "foreign-key ihlali — otomatik geri alındı", actor: "system", at: "1 gün önce", icon: ArrowUUpLeft, tone: "red", detail: "ERROR: still referenced by sessions.user_id" },
      { id: "a3", action: "yeniden çalıştırma planlandı", actor: "you", at: "22 sa önce", icon: ClockClockwise, tone: "default" },
    ],
  },
];

/** 14 günlük deploy/migration hacmi — KPI sparkline'ları için. */
export const MIGRATION_TREND = {
  applied: [1, 0, 2, 1, 3, 0, 1, 2, 1, 0, 4, 1, 2, 3],
  pending: [0, 1, 1, 2, 2, 3, 2, 3, 4, 4, 3, 4, 3, 4],
  failed: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
  duration: [640, 980, 2110, 420, 1840, 900, 1200, 1100, 1600, 1300, 1050, 1900, 1400, 1840],
};
