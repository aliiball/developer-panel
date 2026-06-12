import {
  LayoutDashboard,
  Sparkles,
  Database,
  Network,
  Table2,
  FormInput,
  Boxes,
  ShieldCheck,
  Palette,
  Plug,
  Code2,
  Activity,
  Settings,
  Workflow,
  Terminal,
  Image,
  Mail,
  BarChart3,
  Timer,
  Webhook,
  ScrollText,
  HeartPulse,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** route path (no leading slash for children of shell, "/" for index) */
  to: string;
  label: string;
  icon: LucideIcon;
  /** ⌘1-9 quick switch index (only the first 9 core items) */
  hotkey?: number;
  /** short description shown in Spotlight preview */
  desc: string;
  soon?: boolean;
  group: "core" | "expansion";
}

export const CORE_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, hotkey: 1, group: "core", desc: "Genel bakış: model/modül/endpoint metrikleri ve son aktiviteler." },
  { to: "/ai-copilot", label: "AI Copilot", icon: Sparkles, hotkey: 2, group: "core", desc: "Doğal dilden şema, modül ve config üret. Panelin kalbi." },
  { to: "/schema", label: "Schema", icon: Database, hotkey: 3, group: "core", desc: "Modeller ve alanlar. Sürükle-bırak alan editörü + canlı JSON." },
  { to: "/erd", label: "ERD", icon: Network, hotkey: 4, group: "core", desc: "Varlık-ilişki diyagramı. Sürüklenebilir node + ilişki çizgileri." },
  { to: "/data", label: "Data", icon: Table2, hotkey: 5, group: "core", desc: "Model kayıtlarını yönet. Filtre, import/export, inline düzenleme." },
  { to: "/forms", label: "Form Builder", icon: FormInput, hotkey: 6, group: "core", desc: "3 panel form oluşturucu: palet, tuval, alan özellikleri." },
  { to: "/modules", label: "Modules", icon: Boxes, hotkey: 7, group: "core", desc: "Modül paketleri, bağımlılıklar ve marketplace." },
  { to: "/permissions", label: "Permissions", icon: ShieldCheck, hotkey: 8, group: "core", desc: "Rol × izin matrisi. AI ile önerilen izin setleri." },
  { to: "/theme", label: "Theme", icon: Palette, hotkey: 9, group: "core", desc: "Marka renkleri, WCAG kontrast kontrolü, token export." },
  { to: "/api-explorer", label: "API Explorer", icon: Plug, group: "core", desc: "Auto-generated CRUD endpoint'leri. Mock request/response." },
  { to: "/code", label: "Code Editor", icon: Code2, group: "core", desc: "Üretilen şema/migration kodu. CodeMirror 6." },
  { to: "/activity", label: "Activity", icon: Activity, group: "core", desc: "Kullanım grafikleri ve filtrelenebilir aktivite akışı." },
  { to: "/settings", label: "Settings", icon: Settings, group: "core", desc: "Genel, görünüm, AI Copilot ve geliştirici ayarları." },
];

export const EXPANSION_NAV: NavItem[] = [
  { to: "/workflows", label: "Workflows", icon: Workflow, group: "expansion", desc: "Olay-tetiklemeli iş akışları ve adım zincirleri." },
  { to: "/terminal", label: "Terminal", icon: Terminal, group: "expansion", desc: "Gömülü komut terminali (mock)." },
  { to: "/media", label: "Media", icon: Image, group: "expansion", desc: "Medya kütüphanesi ve dosya yönetimi." },
  { to: "/email-templates", label: "Email Templates", icon: Mail, group: "expansion", desc: "E-posta şablon editörü ve önizleme." },
  { to: "/reports", label: "Reports", icon: BarChart3, group: "expansion", desc: "Özel rapor oluşturucu ve grafikler." },
  { to: "/scheduler", label: "Scheduler", icon: Timer, group: "expansion", desc: "Zamanlanmış görevler (cron)." },
  { to: "/webhooks", label: "Webhooks", icon: Webhook, group: "expansion", desc: "Giden webhook yönetimi ve teslimat logu." },
  { to: "/logs", label: "Logs", icon: ScrollText, group: "expansion", desc: "Sistem ve denetim logları." },
  { to: "/health", label: "Health", icon: HeartPulse, group: "expansion", desc: "Servis sağlık göstergeleri ve uptime." },
  { to: "/docs", label: "Docs", icon: BookOpen, group: "expansion", desc: "Otomatik üretilen API dokümanları." },
];

export const ALL_NAV = [...CORE_NAV, ...EXPANSION_NAV];

export const HOTKEY_NAV = CORE_NAV.filter((n) => n.hotkey).sort(
  (a, b) => (a.hotkey ?? 0) - (b.hotkey ?? 0),
);
