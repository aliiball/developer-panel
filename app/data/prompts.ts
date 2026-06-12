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
  // ── Delivery & Operations ──
  "/issues": {
    hint: "Yeni raporları triyaj edebilir, önem derecesi ve olası kopyaları önerebilirim.",
    quick: ["Açık hataları triyaj et", "Kopya raporları grupla", "Bu hafta gelen kritikler"],
  },
  "/issues/": {
    hint: "Bu raporun önem derecesini, atamasını ve olası kopyasını önerebilirim.",
    quick: ["Önem derecesi öner", "Kök neden analizi", "Benzer rapor var mı?"],
  },
  "/roadmap": {
    hint: "Benzer istekleri kümeleyip birleştirme önerebilir, öncelik sıralayabilirim.",
    quick: ["Benzer istekleri kümele", "En çok oylananları özetle", "Bu çeyrek için öncelik öner"],
  },
  "/releases": {
    hint: "Changelog'dan sürüm notları üretebilir, riskli deploy'ları işaretleyebilirim.",
    quick: ["Sürüm notları üret", "Son başarısız deploy'u analiz et"],
  },
  "/errors": {
    hint: "Hataları analiz edip kök neden ve düzeltme önerebilir, issue açabilirim.",
    quick: ["Bu hatayı analiz et", "Kök neden öner", "En çok etkileyen hata"],
  },
  "/flags": {
    hint: "Riskli flag'leri %100 öncesi kontrol edip kullanılmayanları önerebilirim.",
    quick: ["Riskli flag'leri kontrol et", "Kullanılmayan flag'ler"],
  },
  "/environments": {
    hint: "Eksik veya riskli ortam değişkenlerini ve sızabilecek anahtarları bulabilirim.",
    quick: ["Riskli env değişkenlerini bul", "Eksik secret var mı?"],
  },
  // ── Platform ──
  "/migrations": {
    hint: "Bekleyen migration'ların riskini değerlendirip geri alınabilirliği kontrol edebilirim.",
    quick: ["Bekleyen migration riski", "Bu migration'ı açıkla"],
  },
  "/team": {
    hint: "Bir rol için makul izin seti önerebilir, fazla yetkili üyeleri işaretleyebilirim.",
    quick: ["Editor için izin öner", "Fazla yetkili üyeler"],
  },
  "/api-keys": {
    hint: "Kullanılmayan veya aşırı yetkili anahtarları bulabilirim.",
    quick: ["Kullanılmayan anahtarları bul", "Riskli scope'lar"],
  },
  "/agent-runs": {
    hint: "Son AI üretimlerini özetleyip en çok kullanılan yüzeyleri söyleyebilirim.",
    quick: ["Son üretimleri özetle", "En çok hangi sayfada?"],
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
  { route: "/issues", kind: "insight", title: "Triyaj bekliyor", body: "2 kritik müşteri raporu triyaj bekliyor. AI önem derecesi önerebilir." },
  { route: "/releases", kind: "optimization", title: "Sürüm farkı", body: "Staging, prod'dan 2 sürüm ileride. Prod'a yükseltmeyi planlamak ister misin?" },
  { route: "/errors", kind: "feature", title: "Yeni hata grubu", body: "OrderService.applyCoupon() üretimde 1.2K kez patladı. Issue açmak 1 tık." },
];
