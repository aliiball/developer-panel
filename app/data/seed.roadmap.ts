// Page-local seed for the Roadmap board.
// Enriches the shared SEED_ISSUES feature requests with extra realistic
// entries so the kanban board has enterprise-grade density (8–20+ items).
// NOTE: this is a NEW page-local file; it does not mutate shared data.
import type { Issue } from "~/data/delivery";

export const ROADMAP_EXTRA_FEATURES: Issue[] = [
  {
    id: "FEAT-67", type: "feature", title: "SSO / SAML kurumsal giriş",
    description: "Okta ve Azure AD ile SAML 2.0 tek oturum açma; SCIM ile otomatik kullanıcı provizyonu.",
    severity: "high", status: "triage", source: "manual", reporter: "kurumsal satış", assignee: null,
    linkedModule: "auth", votes: 214, stage: "planned", createdAt: "5 gün önce", comments: [],
  },
  {
    id: "FEAT-71", type: "feature", title: "Denetim günlüğü dışa aktarımı (SIEM)",
    description: "Audit log'ları Splunk/Datadog'a streaming + günlük CSV arşivi. SOC2 gereksinimi.",
    severity: "high", status: "triage", source: "email", reporter: "guvenlik@acme.com", assignee: null,
    linkedModule: "platform", votes: 88, stage: "proposed", createdAt: "2 gün önce", comments: [],
  },
  {
    id: "FEAT-58", type: "feature", title: "Gerçek zamanlı işbirliği (presence)",
    description: "Şema editöründe aynı anda kimlerin çalıştığını gösteren imleç/presence katmanı.",
    severity: "medium", status: "triage", source: "in-app", reporter: "tasarım", assignee: null,
    votes: 156, stage: "proposed", createdAt: "1 hafta önce", comments: [],
  },
  {
    id: "FEAT-63", type: "feature", title: "Mobil yönetici uygulaması (iOS/Android)",
    description: "Push bildirimli native uygulama: kritik hatalar ve onay bekleyen deploy'lar.",
    severity: "medium", status: "triage", source: "in-app", reporter: "global@acme.com", assignee: null,
    votes: 189, stage: "proposed", createdAt: "9 gün önce", comments: [],
  },
  {
    id: "FEAT-55", type: "feature", title: "GraphQL API katmanı",
    description: "REST'in yanına otomatik üretilen, tip-güvenli GraphQL şeması ve playground.",
    severity: "medium", status: "in-progress", source: "manual", reporter: "platform ekibi", assignee: "ali",
    linkedModule: "api-gateway", votes: 73, stage: "building", createdAt: "2 hafta önce", comments: [],
  },
  {
    id: "FEAT-69", type: "feature", title: "Akıllı anomali tespiti (AI)",
    description: "Hata oranı ve gecikme metriklerinde otomatik anomali alarmı; temel-çizgi öğrenmeli.",
    severity: "low", status: "triage", source: "manual", reporter: "ürün ekibi", assignee: null,
    linkedModule: "platform", votes: 41, stage: "planned", createdAt: "6 gün önce", comments: [],
  },
  {
    id: "FEAT-45", type: "feature", title: "Çevrimdışı PWA modu",
    description: "Bağlantı kesildiğinde okunabilirlik ve kuyruğa alma; yeniden bağlanınca senkron.",
    severity: "low", status: "resolved", source: "in-app", reporter: "kullanici@acme.com", assignee: "elif",
    votes: 58, stage: "shipped", createdAt: "1 ay önce", comments: [],
  },
  {
    id: "FEAT-40", type: "feature", title: "Rol bazlı erişim kontrolü (RBAC)",
    description: "Özel roller, kaynak-seviye izinler ve takım bazlı kapsamlar.",
    severity: "high", status: "resolved", source: "manual", reporter: "kurumsal satış", assignee: "mehmet",
    linkedModule: "auth", votes: 121, stage: "shipped", createdAt: "5 hafta önce", comments: [],
  },
  {
    id: "FEAT-52", type: "feature", title: "Webhook olay yeniden oynatma",
    description: "Başarısız webhook teslimatlarını panelden tek tıkla yeniden gönderme.",
    severity: "medium", status: "in-progress", source: "in-app", reporter: "ops@acme.com", assignee: "ali",
    linkedModule: "api-gateway", votes: 64, stage: "building", createdAt: "10 gün önce", comments: [],
  },
  {
    id: "FEAT-48", type: "feature", title: "Özelleştirilebilir gösterge panosu",
    description: "Sürükle-bırak widget'larla kullanıcıya özel dashboard düzenleri.",
    severity: "low", status: "triage", source: "in-app", reporter: "tasarım", assignee: null,
    votes: 97, stage: "planned", createdAt: "3 hafta önce", comments: [],
  },
];
