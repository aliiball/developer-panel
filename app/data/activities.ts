export type ActivityType = "model" | "module" | "migration" | "api" | "theme" | "ai";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  target: string;
  timeAgo: string;
  actor: string;
}

export const ACTIVITIES: ActivityItem[] = [
  { id: "a1", type: "model", title: "Model güncellendi", target: "Customer", timeAgo: "5 dk", actor: "you" },
  { id: "a2", type: "module", title: "Modül etkinleştirildi", target: "E-Commerce", timeAgo: "1 sa", actor: "you" },
  { id: "a3", type: "migration", title: "Migration uygulandı", target: "003_add_orders", timeAgo: "2 sa", actor: "ci-bot" },
  { id: "a4", type: "api", title: "Endpoint üretildi", target: "/api/products", timeAgo: "3 sa", actor: "system" },
  { id: "a5", type: "theme", title: "Marka rengi değişti", target: "Brand Primary", timeAgo: "5 sa", actor: "you" },
  { id: "a6", type: "ai", title: "AI ile şema üretildi", target: "BlogPost + Category", timeAgo: "6 sa", actor: "copilot" },
  { id: "a7", type: "model", title: "Alan eklendi", target: "Product.stock", timeAgo: "8 sa", actor: "you" },
  { id: "a8", type: "module", title: "Bağımlılık çözüldü", target: "Payments → Auth", timeAgo: "1 gün", actor: "system" },
  { id: "a9", type: "migration", title: "Migration geri alındı", target: "002_drop_legacy", timeAgo: "1 gün", actor: "you" },
  { id: "a10", type: "api", title: "Rate limit ayarlandı", target: "API Gateway", timeAgo: "2 gün", actor: "you" },
];
