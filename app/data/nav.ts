import {
  SquaresFour,
  Database,
  TreeStructure,
  Table,
  Textbox,
  Stack,
  ShieldCheck,
  Palette,
  Plug,
  Code,
  Pulse,
  GearSix,
  FlowArrow,
  TerminalWindow,
  Image,
  Envelope,
  ChartBar,
  Timer,
  WebhooksLogo,
  Scroll,
  Heartbeat,
  BookOpen,
  Bug,
  Lightbulb,
  RocketLaunch,
  WarningOctagon,
  Flag,
  HardDrives,
  GitMerge,
  Users,
  Key,
  Robot,
  Bell,
  PuzzlePiece,
  Plugs,
  Truck,
  Gauge,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";

/** Section ids — pinli öğeler "pinned" grubundadır, accordion dışında render edilir. */
export type NavGroup =
  | "pinned"
  | "modeling"
  | "builder"
  | "integration"
  | "delivery"
  | "operations"
  | "workspace";

export interface NavItem {
  /** route path (no leading slash for children of shell, "/" for index) */
  to: string;
  label: string;
  icon: Icon;
  /** ⌘1-9 quick switch index */
  hotkey?: number;
  /** short description shown in Spotlight preview */
  desc: string;
  soon?: boolean;
  group: NavGroup;
}

export interface NavSection {
  id: Exclude<NavGroup, "pinned">;
  label: string;
  icon: Icon;
}

/** Accordion bölüm başlıkları — sıra burada belirlenir. */
export const NAV_SECTIONS: NavSection[] = [
  { id: "modeling", label: "Veri Modeli", icon: Database },
  { id: "builder", label: "Oluşturucu", icon: PuzzlePiece },
  { id: "integration", label: "API & Entegrasyon", icon: Plugs },
  { id: "delivery", label: "Teslimat", icon: Truck },
  { id: "operations", label: "Operasyon", icon: Gauge },
  { id: "workspace", label: "Çalışma Alanı", icon: UsersThree },
];

/** Accordion dışında, üstte sabit duran öğeler. */
export const PINNED_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: SquaresFour, hotkey: 1, group: "pinned", desc: "Genel bakış + AI Copilot tek sayfada: metrikler, aktivite ve doğal dilden üretim." },
];

export const NAV_ITEMS: NavItem[] = [
  // ── Veri Modeli ────────────────────────────────────────────────
  { to: "/schema", label: "Schema", icon: Database, hotkey: 3, group: "modeling", desc: "Modeller ve alanlar. Sürükle-bırak alan editörü + canlı JSON." },
  { to: "/erd", label: "ERD", icon: TreeStructure, hotkey: 4, group: "modeling", desc: "Varlık-ilişki diyagramı. Sürüklenebilir node + ilişki çizgileri." },
  { to: "/data", label: "Data", icon: Table, hotkey: 5, group: "modeling", desc: "Model kayıtlarını yönet. Filtre, import/export, inline düzenleme." },
  { to: "/migrations", label: "Migrations", icon: GitMerge, group: "modeling", desc: "Şema migration'ları: uygula, geri al, geçmiş ve SQL önizleme." },

  // ── Oluşturucu ─────────────────────────────────────────────────
  { to: "/forms", label: "Form Builder", icon: Textbox, hotkey: 6, group: "builder", desc: "3 panel form oluşturucu: palet, tuval, alan özellikleri." },
  { to: "/modules", label: "Modules", icon: Stack, hotkey: 7, group: "builder", desc: "Modül paketleri, bağımlılıklar ve marketplace." },
  { to: "/workflows", label: "Workflows", icon: FlowArrow, group: "builder", desc: "Olay-tetiklemeli iş akışları ve adım zincirleri." },
  { to: "/theme", label: "Theme", icon: Palette, hotkey: 9, group: "builder", desc: "Marka renkleri, WCAG kontrast kontrolü, token export." },
  { to: "/code", label: "Code Editor", icon: Code, group: "builder", desc: "Üretilen şema/migration kodu. CodeMirror 6." },

  // ── API & Entegrasyon ──────────────────────────────────────────
  { to: "/api-explorer", label: "API Explorer", icon: Plug, group: "integration", desc: "Auto-generated CRUD endpoint'leri. Mock request/response." },
  { to: "/webhooks", label: "Webhooks", icon: WebhooksLogo, group: "integration", desc: "Giden webhook yönetimi ve teslimat logu." },
  { to: "/email-templates", label: "Email Templates", icon: Envelope, group: "integration", desc: "E-posta şablon editörü ve önizleme." },
  { to: "/api-keys", label: "API Keys", icon: Key, group: "integration", desc: "API anahtarı yaşam döngüsü: oluştur, scope, rotate, revoke." },
  { to: "/docs", label: "Docs", icon: BookOpen, group: "integration", desc: "Otomatik üretilen API dokümanları." },

  // ── Teslimat ───────────────────────────────────────────────────
  { to: "/issues", label: "Issues", icon: Bug, group: "delivery", desc: "Hata raporları için birleşik takip. AI triyaj, önem ve kopya önerir." },
  { to: "/roadmap", label: "Roadmap", icon: Lightbulb, group: "delivery", desc: "Özellik istekleri panosu: öneri→planlandı→geliştiriliyor→yayınlandı. Oylar." },
  { to: "/releases", label: "Releases", icon: RocketLaunch, group: "delivery", desc: "Ortamlar, deploy geçmişi, sürüm/changelog, prod'a yükselt ve geri al." },
  { to: "/flags", label: "Feature Flags", icon: Flag, group: "delivery", desc: "Özellik bayrakları: on/off, kademeli rollout, ortam kapsamı." },
  { to: "/environments", label: "Environments", icon: HardDrives, group: "delivery", desc: "Ortam değişkenleri ve gizli anahtarlar (dev/staging/prod)." },
  { to: "/errors", label: "Error Tracking", icon: WarningOctagon, group: "delivery", desc: "Gruplanmış exception'lar, stack trace, occurrence sayısı. Issue oluştur." },

  // ── Operasyon ──────────────────────────────────────────────────
  { to: "/activity", label: "Activity", icon: Pulse, group: "operations", desc: "Kullanım grafikleri ve filtrelenebilir aktivite akışı." },
  { to: "/logs", label: "Logs", icon: Scroll, group: "operations", desc: "Sistem ve denetim logları." },
  { to: "/health", label: "Health", icon: Heartbeat, group: "operations", desc: "Servis sağlık göstergeleri ve uptime." },
  { to: "/reports", label: "Reports", icon: ChartBar, group: "operations", desc: "Özel rapor oluşturucu ve grafikler." },
  { to: "/scheduler", label: "Scheduler", icon: Timer, group: "operations", desc: "Zamanlanmış görevler (cron)." },
  { to: "/terminal", label: "Terminal", icon: TerminalWindow, group: "operations", desc: "Gömülü komut terminali (mock)." },
  { to: "/media", label: "Media", icon: Image, group: "operations", desc: "Medya kütüphanesi ve dosya yönetimi." },

  // ── Çalışma Alanı ──────────────────────────────────────────────
  { to: "/permissions", label: "Permissions", icon: ShieldCheck, hotkey: 8, group: "workspace", desc: "Rol × izin matrisi. AI ile önerilen izin setleri." },
  { to: "/team", label: "Team", icon: Users, group: "workspace", desc: "Üyeler, davetler ve roller. İnsan yönetimi." },
  { to: "/agent-runs", label: "AI Agent Runs", icon: Robot, group: "workspace", desc: "Copilot üretim geçmişi: prompt, sonuç, süre. AI-first imza." },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "workspace", desc: "Deploy, incident, issue ve mention bildirimleri. Okundu durumu." },
  { to: "/settings", label: "Settings", icon: GearSix, group: "workspace", desc: "Genel, görünüm, AI Copilot ve geliştirici ayarları." },
];

/** Bir bölümün öğeleri. */
export function itemsForSection(id: NavSection["id"]): NavItem[] {
  return NAV_ITEMS.filter((n) => n.group === id);
}

export const ALL_NAV: NavItem[] = [...PINNED_NAV, ...NAV_ITEMS];

export const HOTKEY_NAV = ALL_NAV.filter((n) => n.hotkey).sort(
  (a, b) => (a.hotkey ?? 0) - (b.hotkey ?? 0),
);
