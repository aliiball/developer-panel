// Mock data for the Platform surfaces.

// ── Migrations ────────────────────────────────────────────────────
export type MigrationStatus = "applied" | "pending" | "rolled_back";
export interface Migration {
  id: string;
  name: string;
  status: MigrationStatus;
  appliedAt: string | null;
  author: string;
  affectedTables: string[];
  reversible: boolean;
  sql: string;
}

export const SEED_MIGRATIONS: Migration[] = [
  {
    id: "005_add_subscriptions", name: "Abonelik tabloları", status: "pending", appliedAt: null,
    author: "mehmet", affectedTables: ["subscriptions", "plans"], reversible: true,
    sql: "CREATE TABLE plans (\n  id serial PRIMARY KEY,\n  name varchar(64) NOT NULL,\n  price numeric NOT NULL\n);\n\nCREATE TABLE subscriptions (\n  id serial PRIMARY KEY,\n  customer_id integer REFERENCES customers(id),\n  plan_id integer REFERENCES plans(id),\n  status varchar(16) DEFAULT 'active'\n);",
  },
  {
    id: "004_add_reviews", name: "Ürün değerlendirmeleri", status: "pending", appliedAt: null,
    author: "zeynep", affectedTables: ["reviews"], reversible: true,
    sql: "CREATE TABLE reviews (\n  id serial PRIMARY KEY,\n  product_id integer REFERENCES products(id),\n  rating integer NOT NULL,\n  comment text\n);",
  },
  {
    id: "003_add_orders", name: "Sipariş tabloları + index", status: "applied", appliedAt: "2 sa önce",
    author: "ci-bot", affectedTables: ["orders", "order_items"], reversible: true,
    sql: "CREATE TABLE orders (\n  id serial PRIMARY KEY,\n  reference varchar(32) UNIQUE NOT NULL,\n  status varchar(16) DEFAULT 'pending',\n  total numeric NOT NULL,\n  placed_at timestamptz NOT NULL\n);\n\nCREATE INDEX orders_placed_at_idx ON orders (placed_at);",
  },
  {
    id: "002_add_blog", name: "Blog ve kategoriler", status: "applied", appliedAt: "3 gün önce",
    author: "mehmet", affectedTables: ["blog_posts", "categories", "tags"], reversible: true,
    sql: "CREATE TABLE blog_posts (\n  id serial PRIMARY KEY,\n  title varchar(255) NOT NULL,\n  slug varchar(255) UNIQUE NOT NULL,\n  body text NOT NULL\n);",
  },
  {
    id: "001_init", name: "İlk şema (customers, products)", status: "applied", appliedAt: "2 hafta önce",
    author: "mehmet", affectedTables: ["customers", "products"], reversible: false,
    sql: "CREATE TABLE customers (\n  id serial PRIMARY KEY,\n  full_name varchar(255) NOT NULL,\n  email varchar(255) UNIQUE NOT NULL\n);",
  },
  {
    id: "000_drop_legacy", name: "Eski tabloları kaldır", status: "rolled_back", appliedAt: "1 gün önce",
    author: "you", affectedTables: ["legacy_users"], reversible: false,
    sql: "DROP TABLE legacy_users;",
  },
];

// ── Team & members ────────────────────────────────────────────────
export type MemberStatus = "active" | "invited" | "suspended";
export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
  lastActive: string;
  hue: number;
}

export const SEED_MEMBERS: Member[] = [
  { id: "u1", name: "Mehmet Yılmaz", email: "mehmet@acme.com", role: "Admin", status: "active", lastActive: "şimdi", hue: 250 },
  { id: "u2", name: "Zeynep Kaya", email: "zeynep@acme.com", role: "Developer", status: "active", lastActive: "12 dk önce", hue: 160 },
  { id: "u3", name: "Ali Demir", email: "ali@acme.com", role: "Developer", status: "active", lastActive: "1 sa önce", hue: 20 },
  { id: "u4", name: "Elif Şahin", email: "elif@acme.com", role: "Editor", status: "active", lastActive: "3 sa önce", hue: 300 },
  { id: "u5", name: "Can Öztürk", email: "can@acme.com", role: "Viewer", status: "suspended", lastActive: "2 hafta önce", hue: 200 },
  { id: "u6", name: "—", email: "yeni@acme.com", role: "Developer", status: "invited", lastActive: "davet gönderildi", hue: 120 },
];

export const ROLE_OPTIONS = ["Admin", "Developer", "Editor", "Viewer"];

// ── API keys ──────────────────────────────────────────────────────
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string;
  env: "prod" | "staging" | "dev";
  revoked: boolean;
}

export const SEED_API_KEYS: ApiKey[] = [
  { id: "k1", name: "Production server", prefix: "mp_live_sk_9f2a", scopes: ["read", "write"], createdAt: "2 ay önce", lastUsed: "2 dk önce", env: "prod", revoked: false },
  { id: "k2", name: "Mobile app", prefix: "mp_live_sk_3c71", scopes: ["read"], createdAt: "1 ay önce", lastUsed: "18 dk önce", env: "prod", revoked: false },
  { id: "k3", name: "CI pipeline", prefix: "mp_test_sk_b8e2", scopes: ["read", "write", "deploy"], createdAt: "3 hafta önce", lastUsed: "8 dk önce", env: "staging", revoked: false },
  { id: "k4", name: "Eski entegrasyon", prefix: "mp_live_sk_001f", scopes: ["read", "write"], createdAt: "6 ay önce", lastUsed: "3 ay önce", env: "prod", revoked: true },
];

export const SCOPE_OPTIONS = ["read", "write", "deploy", "admin"];

// ── Notifications ─────────────────────────────────────────────────
export type NotificationType = "deploy" | "incident" | "issue" | "mention" | "ai";
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link: string;
}

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", type: "issue", title: "Yeni kritik hata raporu", body: "BUG-142 müşteri tarafından bildirildi (kritik).", at: "12 dk önce", read: false, link: "/issues/BUG-142" },
  { id: "n2", type: "deploy", title: "Dev'e deploy başarılı", body: "v1.9.0-rc1 development ortamına yüklendi.", at: "8 dk önce", read: false, link: "/releases" },
  { id: "n3", type: "incident", title: "Webhook Dispatcher kapalı", body: "Üretimde webhook teslimatı duruyor.", at: "32 dk önce", read: false, link: "/health" },
  { id: "n4", type: "ai", title: "AI triyaj tamamlandı", body: "3 yeni rapor için önem derecesi önerildi.", at: "1 sa önce", read: true, link: "/issues" },
  { id: "n5", type: "deploy", title: "Staging deploy başarısız", body: "v1.8.1 test aşamasında başarısız oldu.", at: "5 sa önce", read: true, link: "/releases" },
  { id: "n6", type: "mention", title: "Bir yorumda etiketlendin", body: "Zeynep seni FEAT-54 üzerinde etiketledi.", at: "6 sa önce", read: true, link: "/roadmap" },
];
