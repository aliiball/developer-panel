// Curated prompt chips shown on the AI Copilot empty state and in Spotlight.
export interface PromptChip {
  id: string;
  label: string;
  prompt: string;
  category: "schema" | "module" | "theme" | "api" | "form";
}

export const PROMPT_CHIPS: PromptChip[] = [
  { id: "blog", label: "Blog modülü oluştur", prompt: "Blog modülü oluştur: yazı, kategori ve etiket modelleriyle.", category: "module" },
  { id: "ecom", label: "E-ticaret şeması", prompt: "E-ticaret şeması üret: Product, Order, OrderItem ve Category.", category: "schema" },
  { id: "palette", label: "WCAG AA renk paleti", prompt: "WCAG AA uyumlu bir marka renk paleti oluştur.", category: "theme" },
  { id: "crud", label: "CRUD API endpoint'leri", prompt: "Product modeli için CRUD API endpoint'leri üret.", category: "api" },
  { id: "contact", label: "İletişim formu", prompt: "Bir iletişim formu oluştur: ad, e-posta, konu, mesaj.", category: "form" },
  { id: "fields", label: "Alan öner", prompt: "Customer modeline fiyat ve stok alanları ekle.", category: "schema" },
];

// Per-route contextual hints + quick replies for the Copilot Rail.
export const ROUTE_HINTS: Record<string, { hint: string; quick: string[] }> = {
  "/": {
    hint: "Workspace'in nabzı burada. 'Yeni model oluştur' veya 'bu hafta ne değişti?' diye sorabilirsin.",
    quick: ["Bu hafta ne değişti?", "Yeni model oluştur", "Sağlık özeti"],
  },
  "/ai-copilot": {
    hint: "Ne oluşturmak istersin? Doğal dilden şema, modül, form veya endpoint üretebilirim.",
    quick: ["E-ticaret şeması", "Blog modülü", "WCAG AA palet"],
  },
  "/schema": {
    hint: "Bir model seç, sana alan önereyim. 'Product'a SEO alanları ekle' gibi.",
    quick: ["Yeni model üret", "Eksik index'leri öner", "İlişkileri analiz et"],
  },
  "/schema/": {
    hint: "Bu modele alan ekleyebilirim. 'fiyat ve stok ekle' yaz, önizleyip uygula.",
    quick: ["fiyat ve stok ekle", "SEO alanları ekle", "Alan tiplerini iyileştir"],
  },
  "/erd": {
    hint: "İlişkileri analiz edip eksik foreign key'leri önerebilirim.",
    quick: ["İlişkileri öner", "Döngüsel bağımlılık var mı?"],
  },
  "/forms": {
    hint: "Form alanlarını doğal dilden üretebilirim. 'kayıt formu oluştur' dene.",
    quick: ["Kayıt formu oluştur", "Validation öner"],
  },
  "/modules": {
    hint: "Yeni bir modül scaffold edebilir veya bağımlılıkları çözebilirim.",
    quick: ["Yeni modül scaffold et", "Bağımlılıkları kontrol et"],
  },
  "/permissions": {
    hint: "Bir rol için makul izin seti önerebilirim.",
    quick: ["Editor rolü öner", "Riskli izinleri bul"],
  },
  "/theme": {
    hint: "WCAG kontrastını analiz edip erişilebilir renkler önerebilirim.",
    quick: ["WCAG AA palet üret", "Kontrast hatalarını düzelt"],
  },
  "/api-explorer": {
    hint: "Endpoint dokümanı veya örnek istek üretebilirim.",
    quick: ["Bu endpoint'i dokümante et", "cURL örneği ver"],
  },
  "/code": {
    hint: "Üretilen kodu açıklayabilir veya refactor önerebilirim.",
    quick: ["Bu migration'ı açıkla", "TypeScript tipleri üret"],
  },
};

// Proactive insights surfaced as toasts per route.
export interface ProactiveInsight {
  route: string;
  kind: "insight" | "optimization" | "feature";
  title: string;
  body: string;
}

export const PROACTIVE_INSIGHTS: ProactiveInsight[] = [
  { route: "/", kind: "insight", title: "Endpoint büyümesi", body: "Bu hafta 5 yeni endpoint otomatik üretildi. Dokümantasyonu güncellemek ister misin?" },
  { route: "/schema", kind: "optimization", title: "Eksik index önerisi", body: "Order.placedAt sık filtreleniyor ama index'li değil. Eklemek 1 tık." },
  { route: "/theme", kind: "feature", title: "Kontrast uyarısı", body: "Mevcut accent rengi küçük metinde AA'yı geçemiyor. Düzeltme önerim hazır." },
  { route: "/modules", kind: "insight", title: "Pasif modül", body: "Inventory kurulu ama pasif. Etkinleştirmek E-Commerce stok takibini açar." },
];
