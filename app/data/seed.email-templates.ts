// Page-local seed for the Email Templates editor surface.
// Genişletilmiş, gerçekçi şablon kayıtları + sürüm geçmişi + gönderim metrikleri.
// Ortak EmailTemplate tipini taban alır, editör için ek alanlar ekler.
import type { EmailTemplate } from "~/data/expansion";

export type TemplateStatus = "published" | "draft" | "archived";

export interface TemplateVersion {
  id: string;
  version: string;
  at: string;
  actor: string;
  note: string;
}

export interface RichTemplate extends EmailTemplate {
  status: TemplateStatus;
  preheader: string;
  fromName: string;
  fromEmail: string;
  /** son 30 günde gönderim */
  sent30d: number;
  openRate: number; // %
  clickRate: number; // %
  bounceRate: number; // %
  /** son 12 dönem gönderim hacmi (sparkline) */
  volumeTrend: number[];
  updatedBy: string;
  locale: string;
  versions: TemplateVersion[];
  /** değişken → örnek değer (canlı önizleme için) */
  sampleData: Record<string, string>;
}

export const RICH_TEMPLATES: RichTemplate[] = [
  {
    id: "welcome",
    name: "Hoş Geldiniz",
    subject: "{{firstName}}, aramıza hoş geldin! 🎉",
    preheader: "Hesabın hazır — ilk adımları birlikte atalım.",
    category: "Onboarding",
    status: "published",
    updated: "2 gün önce",
    updatedBy: "Ada Yılmaz",
    fromName: "MetaPanel Ekibi",
    fromEmail: "merhaba@metapanel.app",
    locale: "tr-TR",
    sent30d: 4820,
    openRate: 61.4,
    clickRate: 24.8,
    bounceRate: 0.6,
    volumeTrend: [320, 410, 380, 450, 520, 490, 540, 610, 580, 640, 700, 720],
    variables: ["firstName", "appName", "ctaUrl"],
    sampleData: { firstName: "Deniz", appName: "MetaPanel", ctaUrl: "https://app.metapanel.app/start" },
    body: "Merhaba {{firstName}},\n\n{{appName}}'e hoş geldin! Hesabın hazır. Hemen başlamak için:\n\n[Panele Git]({{ctaUrl}})\n\nSorun olursa yanıtla, buradayız.",
    versions: [
      { id: "v1", version: "v4", at: "2 gün önce", actor: "Ada Yılmaz", note: "CTA metni güncellendi" },
      { id: "v2", version: "v3", at: "3 hafta önce", actor: "Mert Demir", note: "Emoji eklendi, ön başlık yazıldı" },
      { id: "v3", version: "v2", at: "2 ay önce", actor: "AI Copilot", note: "İlk taslak yeniden yazıldı" },
    ],
  },
  {
    id: "order-confirm",
    name: "Sipariş Onayı",
    subject: "Siparişin alındı — #{{orderRef}}",
    preheader: "Siparişini aldık, hazırlanıyor.",
    category: "Transactional",
    status: "published",
    updated: "5 saat önce",
    updatedBy: "Sistem",
    fromName: "MetaPanel Sipariş",
    fromEmail: "siparis@metapanel.app",
    locale: "tr-TR",
    sent30d: 18240,
    openRate: 72.1,
    clickRate: 41.3,
    bounceRate: 0.3,
    volumeTrend: [1100, 1240, 1310, 1280, 1420, 1390, 1510, 1600, 1580, 1640, 1720, 1810],
    variables: ["firstName", "orderRef", "total", "trackUrl"],
    sampleData: { firstName: "Elif", orderRef: "TR-99214", total: "1.249,90 ₺", trackUrl: "https://app.metapanel.app/track/99214" },
    body: "Merhaba {{firstName}},\n\n#{{orderRef}} numaralı siparişin onaylandı. Toplam: {{total}}.\n\nKargonu takip et: {{trackUrl}}",
    versions: [
      { id: "v1", version: "v7", at: "5 saat önce", actor: "Sistem", note: "Otomatik sürüm — değişken eklendi" },
      { id: "v2", version: "v6", at: "1 ay önce", actor: "Ada Yılmaz", note: "Toplam tutar biçimi düzeltildi" },
    ],
  },
  {
    id: "reset",
    name: "Şifre Sıfırlama",
    subject: "Şifre sıfırlama isteği",
    preheader: "Bu isteği sen yapmadıysan görmezden gel.",
    category: "Security",
    status: "published",
    updated: "1 hafta önce",
    updatedBy: "Mert Demir",
    fromName: "MetaPanel Güvenlik",
    fromEmail: "guvenlik@metapanel.app",
    locale: "tr-TR",
    sent30d: 3120,
    openRate: 58.0,
    clickRate: 49.2,
    bounceRate: 0.4,
    volumeTrend: [210, 240, 220, 260, 280, 250, 300, 290, 310, 280, 330, 340],
    variables: ["firstName", "resetUrl", "expiresIn"],
    sampleData: { firstName: "Kaan", resetUrl: "https://app.metapanel.app/reset/abc123", expiresIn: "30 dakika" },
    body: "Merhaba {{firstName}},\n\nŞifreni sıfırlamak için aşağıdaki bağlantıya tıkla. {{expiresIn}} içinde geçerli.\n\n[Şifremi Sıfırla]({{resetUrl}})",
    versions: [
      { id: "v1", version: "v3", at: "1 hafta önce", actor: "Mert Demir", note: "Süre uyarısı netleştirildi" },
      { id: "v2", version: "v2", at: "3 ay önce", actor: "Ada Yılmaz", note: "Güvenlik uyarısı eklendi" },
    ],
  },
  {
    id: "invoice",
    name: "Fatura",
    subject: "Faturan hazır — {{invoiceNo}}",
    preheader: "Faturanı PDF olarak indirebilirsin.",
    category: "Transactional",
    status: "published",
    updated: "3 gün önce",
    updatedBy: "Sistem",
    fromName: "MetaPanel Finans",
    fromEmail: "fatura@metapanel.app",
    locale: "tr-TR",
    sent30d: 9640,
    openRate: 65.7,
    clickRate: 33.1,
    bounceRate: 0.5,
    volumeTrend: [640, 700, 680, 720, 760, 740, 800, 820, 810, 850, 880, 910],
    variables: ["firstName", "invoiceNo", "amount", "pdfUrl"],
    sampleData: { firstName: "Selin", invoiceNo: "INV-2026-0418", amount: "899,00 ₺", pdfUrl: "https://app.metapanel.app/inv/0418.pdf" },
    body: "Merhaba {{firstName}},\n\n{{invoiceNo}} numaralı faturan ({{amount}}) hazır.\n\n[PDF indir]({{pdfUrl}})",
    versions: [
      { id: "v1", version: "v5", at: "3 gün önce", actor: "Sistem", note: "KDV satırı eklendi" },
    ],
  },
  {
    id: "shipped",
    name: "Kargoya Verildi",
    subject: "Siparişin yola çıktı 🚚 — #{{orderRef}}",
    preheader: "Tahmini teslim: {{eta}}.",
    category: "Transactional",
    status: "published",
    updated: "6 saat önce",
    updatedBy: "AI Copilot",
    fromName: "MetaPanel Kargo",
    fromEmail: "kargo@metapanel.app",
    locale: "tr-TR",
    sent30d: 15310,
    openRate: 78.9,
    clickRate: 52.6,
    bounceRate: 0.3,
    volumeTrend: [980, 1050, 1120, 1090, 1180, 1210, 1260, 1320, 1300, 1380, 1440, 1510],
    variables: ["firstName", "orderRef", "carrier", "trackUrl", "eta"],
    sampleData: { firstName: "Burak", orderRef: "TR-99311", carrier: "Aras Kargo", trackUrl: "https://app.metapanel.app/track/99311", eta: "20 Haziran" },
    body: "Merhaba {{firstName}},\n\n#{{orderRef}} numaralı siparişin {{carrier}} ile yola çıktı. Tahmini teslim: {{eta}}.\n\nTakip et: {{trackUrl}}",
    versions: [
      { id: "v1", version: "v2", at: "6 saat önce", actor: "AI Copilot", note: "Taşıyıcı değişkeni eklendi" },
      { id: "v2", version: "v1", at: "1 hafta önce", actor: "AI Copilot", note: "AI ile oluşturuldu" },
    ],
  },
  {
    id: "abandoned-cart",
    name: "Sepetini Unuttun",
    subject: "{{firstName}}, sepetinde {{itemCount}} ürün bekliyor",
    preheader: "Tükenmeden tamamla — sınırlı stok.",
    category: "Marketing",
    status: "draft",
    updated: "4 saat önce",
    updatedBy: "Ada Yılmaz",
    fromName: "MetaPanel",
    fromEmail: "kampanya@metapanel.app",
    locale: "tr-TR",
    sent30d: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    volumeTrend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    variables: ["firstName", "itemCount", "cartUrl", "discount"],
    sampleData: { firstName: "Yağmur", itemCount: "3", cartUrl: "https://app.metapanel.app/cart", discount: "%10" },
    body: "Merhaba {{firstName}},\n\nSepetinde {{itemCount}} ürün seni bekliyor. Şimdi tamamla, {{discount}} indirim senin:\n\n[Sepete Dön]({{cartUrl}})",
    versions: [
      { id: "v1", version: "v1 (taslak)", at: "4 saat önce", actor: "Ada Yılmaz", note: "İlk taslak oluşturuldu" },
    ],
  },
  {
    id: "trial-ending",
    name: "Deneme Süresi Bitiyor",
    subject: "Denemenin {{daysLeft}} günü kaldı",
    preheader: "Kesintisiz devam için planını seç.",
    category: "Lifecycle",
    status: "published",
    updated: "1 gün önce",
    updatedBy: "Mert Demir",
    fromName: "MetaPanel Ekibi",
    fromEmail: "merhaba@metapanel.app",
    locale: "tr-TR",
    sent30d: 2140,
    openRate: 54.3,
    clickRate: 28.7,
    bounceRate: 0.7,
    volumeTrend: [140, 160, 150, 180, 200, 190, 210, 230, 220, 240, 260, 270],
    variables: ["firstName", "daysLeft", "upgradeUrl", "planName"],
    sampleData: { firstName: "Cem", daysLeft: "3", upgradeUrl: "https://app.metapanel.app/upgrade", planName: "Pro" },
    body: "Merhaba {{firstName}},\n\n{{planName}} denemenin bitmesine {{daysLeft}} gün kaldı. Kesintisiz devam et:\n\n[Planı Yükselt]({{upgradeUrl}})",
    versions: [
      { id: "v1", version: "v3", at: "1 gün önce", actor: "Mert Demir", note: "Plan adı değişkeni eklendi" },
      { id: "v2", version: "v2", at: "1 ay önce", actor: "Ada Yılmaz", note: "Aciliyet tonu yumuşatıldı" },
    ],
  },
  {
    id: "winback",
    name: "Seni Özledik",
    subject: "Uzun zaman oldu {{firstName}} 👋",
    preheader: "Yeniliklerimize bir göz at.",
    category: "Marketing",
    status: "archived",
    updated: "2 ay önce",
    updatedBy: "Ada Yılmaz",
    fromName: "MetaPanel",
    fromEmail: "kampanya@metapanel.app",
    locale: "tr-TR",
    sent30d: 0,
    openRate: 19.2,
    clickRate: 4.1,
    bounceRate: 2.3,
    volumeTrend: [80, 60, 40, 30, 20, 10, 5, 0, 0, 0, 0, 0],
    variables: ["firstName", "returnUrl"],
    sampleData: { firstName: "Pınar", returnUrl: "https://app.metapanel.app/welcome-back" },
    body: "Merhaba {{firstName}},\n\nSeni bir süredir göremedik. Eklediğimiz yeniliklere göz at:\n\n[Geri Dön]({{returnUrl}})",
    versions: [
      { id: "v1", version: "v2", at: "2 ay önce", actor: "Ada Yılmaz", note: "Düşük performans — arşivlendi" },
      { id: "v2", version: "v1", at: "5 ay önce", actor: "Mert Demir", note: "Oluşturuldu" },
    ],
  },
];

export const CATEGORIES = [
  "Onboarding",
  "Transactional",
  "Security",
  "Marketing",
  "Lifecycle",
] as const;

export const STATUS_META: Record<TemplateStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  published: { label: "Yayında", variant: "default" },
  draft: { label: "Taslak", variant: "secondary" },
  archived: { label: "Arşivli", variant: "outline" },
};
