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
];

// Sağ kolon — "Örnek istemler": hazır prompt kütüphanesi.
export const PROMPTS: CopilotSuggestion[] = [
  {
    label: "Fiyat & stok ekle",
    hint: "Açık modele alan önerisi",
    prompt: "Bu modele fiyat ve stok alanı ekle.",
    icon: Database,
  },
  {
    label: "SEO alanları",
    hint: "metaTitle, canonical",
    prompt: "Bu modele SEO alanları ekle: metaTitle, metaDescription, canonicalUrl.",
    icon: MagnifyingGlass,
  },
  {
    label: "İletişim formu",
    hint: "Doğrulamalı 4 alan",
    prompt: "Bir iletişim formu oluştur: ad, e-posta, konu, mesaj.",
    icon: Textbox,
  },
  {
    label: "Kayıt formu",
    hint: "KVKK onaylı akış",
    prompt: "Kayıt formu oluştur: kullanıcı adı, e-posta, şifre, KVKK onayı.",
    icon: Textbox,
  },
  {
    label: "Sürüm notları",
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
];
