import {
  Database,
  Stack,
  Plug,
  Palette,
  Bug,
  ShieldCheck,
  Textbox,
  RocketLaunch,
  Lightbulb,
  MagnifyingGlass,
  Code,
  Gauge,
  Heartbeat,
  Lightning,
  WarningOctagon,
  Flag,
  Lock,
  Key,
  type Icon,
} from "@phosphor-icons/react";

/* ── Copilot önerileri ──────────────────────────────────────────────
 * Dashboard'daki AI hub'ının yan kolonlarını besleyen kart/buton verisi.
 * Her `prompt`, ai-mock router'ın tanıdığı bir niyete denk gelir — yani
 * tıklayınca rail'de anlamlı, bağlama uygun bir yanıt üretir.
 */
export interface CopilotSuggestion {
  label: string;
  hint: string;
  prompt: string;
  icon: Icon;
}

// Sol kolon — "Yetenekler": Copilot'un yapabildikleri.
export const CAPABILITIES: CopilotSuggestion[] = [
  {
    label: "Şema & model",
    hint: "İlişkili modeller üret",
    prompt: "E-ticaret şeması üret: Product, Order, OrderItem ve Category.",
    icon: Database,
  },
  {
    label: "Modül scaffold",
    hint: "Tam özellik modülü",
    prompt: "Blog modülü oluştur: BlogPost, Category ve Tag.",
    icon: Stack,
  },
  {
    label: "API & endpoint",
    hint: "CRUD + dokümantasyon",
    prompt: "Product için 5 standart CRUD endpoint'i üret.",
    icon: Plug,
  },
  {
    label: "Tema & erişilebilirlik",
    hint: "WCAG AA palet",
    prompt: "WCAG AA uyumlu marka paleti oluştur.",
    icon: Palette,
  },
  {
    label: "Triyaj & teslimat",
    hint: "Hata önceliklendirme",
    prompt: "Açık hata raporlarını triyaj et ve olası kopyaları grupla.",
    icon: Bug,
  },
  {
    label: "Yönetişim",
    hint: "İzin & denetim",
    prompt: "Editor rolü için makul bir izin seti öner.",
    icon: ShieldCheck,
  },
  {
    label: "Workspace özeti",
    hint: "Son 30 günün riskleri",
    prompt: "Bu workspace'te son 30 gün ne değişti, özetle ve riskleri sırala.",
    icon: Gauge,
  },
  {
    label: "Servis sağlığı",
    hint: "Uptime & latency",
    prompt: "Servis sağlığını ve uptime'ı özetle.",
    icon: Heartbeat,
  },
  {
    label: "Eksik index'ler",
    hint: "Sorgu hızlandırma",
    prompt: "Eksik index önerilerini göster ve nasıl ekleyeceğimi anlat.",
    icon: Lightning,
  },
  {
    label: "Kök neden analizi",
    hint: "Hata + düzeltme önerisi",
    prompt: "Bu hatanın kök nedenini analiz et ve düzeltme öner.",
    icon: WarningOctagon,
  },
  {
    label: "Flag kontrolü",
    hint: "Riskli rollout denetimi",
    prompt: "Riskli feature flag'leri kontrol et ve kullanılmayanları öner.",
    icon: Flag,
  },
  {
    label: "Secret denetimi",
    hint: "Sızabilecek değişkenler",
    prompt: "Ortam değişkenlerinde sızabilecek secret var mı kontrol et.",
    icon: Lock,
  },
  {
    label: "API anahtarı denetimi",
    hint: "Kullanılmayanları bul",
    prompt: "Kullanılmayan API anahtarlarını bul ve revoke öner.",
    icon: Key,
  },
  {
    label: "Form oluşturucu",
    hint: "Doğrulamalı formlar",
    prompt: "Bir iletişim formu oluştur: ad, e-posta, konu, mesaj.",
    icon: Textbox,
  },
];

// Sağ kolon — "Örnek istemler": hazır prompt kütüphanesi (13 istek).
export const PROMPTS: CopilotSuggestion[] = [
  {
    label: "E-ticaret şeması",
    hint: "İlişkili 4 model, indexler dahil",
    prompt: "E-ticaret şeması üret: Product, Order, OrderItem ve Category.",
    icon: Database,
  },
  {
    label: "Fiyat & stok ekle",
    hint: "Açık modele alan önerisi",
    prompt: "Bu modele fiyat ve stok alanı ekle.",
    icon: Database,
  },
  {
    label: "SEO alanları öner",
    hint: "metaTitle, metaDescription, canonical",
    prompt: "Bu modele SEO alanları ekle: metaTitle, metaDescription, canonicalUrl.",
    icon: MagnifyingGlass,
  },
  {
    label: "Blog modülü oluştur",
    hint: "BlogPost, Category, Tag",
    prompt: "Blog modülü oluştur: BlogPost, Category ve Tag.",
    icon: Stack,
  },
  {
    label: "WCAG AA renk paleti",
    hint: "Kontrastı doğrulanmış indigo palet",
    prompt: "WCAG AA uyumlu marka paleti oluştur.",
    icon: Palette,
  },
  {
    label: "CRUD endpoint'leri",
    hint: "5 standart REST endpoint",
    prompt: "Product için 5 standart CRUD endpoint'i üret.",
    icon: Plug,
  },
  {
    label: "İletişim formu",
    hint: "Doğrulamalı 4 alan",
    prompt: "Bir iletişim formu oluştur: ad, e-posta, konu, mesaj.",
    icon: Textbox,
  },
  {
    label: "Kayıt formu",
    hint: "KVKK onaylı kayıt akışı",
    prompt: "Kayıt formu oluştur: kullanıcı adı, e-posta, şifre, KVKK onayı.",
    icon: Textbox,
  },
  {
    label: "Editor rolü izinleri",
    hint: "Okuma/yazma, silme hariç",
    prompt: "Editor rolü için makul bir izin seti öner.",
    icon: ShieldCheck,
  },
  {
    label: "Hataları triyaj et",
    hint: "Önem + olası kopya tespiti",
    prompt: "Açık hata raporlarını triyaj et ve olası kopyaları grupla.",
    icon: Bug,
  },
  {
    label: "Sürüm notları üret",
    hint: "Changelog'dan markdown",
    prompt: "Son deploy için sürüm notları üret.",
    icon: RocketLaunch,
  },
  {
    label: "İstekleri kümele",
    hint: "Roadmap konsolidasyonu",
    prompt: "Benzer özellik isteklerini kümele ve birleştirme öner.",
    icon: Lightbulb,
  },
  {
    label: "Migration açıkla",
    hint: "up()/down() yorumu",
    prompt: "Seçili migration'ı açıkla: up() ve down() ne yapıyor?",
    icon: Code,
  },
  {
    label: "Yeni veri modeli",
    hint: "Sıfırdan tasarla",
    prompt: "Yeni bir veri modeli tasarlamama yardım et.",
    icon: Database,
  },
];
