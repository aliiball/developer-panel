// Page-local seed for the AI Copilot surface — categorized prompt library,
// capability cards and a richer past-session history. Kept out of the shared
// data layer so the Copilot page can own its depth.
import type { Icon } from "@phosphor-icons/react";
import {
  Database,
  Stack,
  Palette,
  PlugsConnected,
  TextAlignLeft,
  ShieldCheck,
  Code,
  BugBeetle,
  Tag,
  FlowArrow,
} from "@phosphor-icons/react";

// ── Categorized prompt library ────────────────────────────────────
export type PromptCategory =
  | "schema"
  | "module"
  | "theme"
  | "api"
  | "form"
  | "permission"
  | "delivery"
  | "code";

export interface CopilotPrompt {
  id: string;
  label: string;
  prompt: string;
  category: PromptCategory;
  /** kısa açıklama, kütüphane kartında alt satır */
  hint: string;
}

export interface PromptCategoryMeta {
  key: PromptCategory;
  label: string;
  icon: Icon;
}

export const PROMPT_CATEGORIES: PromptCategoryMeta[] = [
  { key: "schema", label: "Şema", icon: Database },
  { key: "module", label: "Modül", icon: Stack },
  { key: "theme", label: "Tema", icon: Palette },
  { key: "api", label: "API", icon: PlugsConnected },
  { key: "form", label: "Form", icon: TextAlignLeft },
  { key: "permission", label: "İzin", icon: ShieldCheck },
  { key: "delivery", label: "Teslimat", icon: FlowArrow },
  { key: "code", label: "Kod", icon: Code },
];

export const PROMPT_LIBRARY: CopilotPrompt[] = [
  // schema
  { id: "lib_ecom", label: "E-ticaret şeması", prompt: "E-ticaret şeması üret: Product, Order, OrderItem ve Category.", category: "schema", hint: "İlişkili 4 model, indexler dahil" },
  { id: "lib_fields", label: "Fiyat & stok ekle", prompt: "Customer modeline fiyat ve stok alanları ekle.", category: "schema", hint: "Açık modele alan önerisi" },
  { id: "lib_seo", label: "SEO alanları öner", prompt: "Bu modele SEO alanları ekle: metaTitle, metaDescription, canonicalUrl.", category: "schema", hint: "metaTitle, metaDescription, canonical" },
  // module
  { id: "lib_blog", label: "Blog modülü oluştur", prompt: "Blog modülü oluştur: yazı, kategori ve etiket modelleriyle.", category: "module", hint: "BlogPost, Category, Tag" },
  // theme
  { id: "lib_palette", label: "WCAG AA renk paleti", prompt: "WCAG AA uyumlu bir marka renk paleti oluştur.", category: "theme", hint: "Kontrastı doğrulanmış indigo palet" },
  // api
  { id: "lib_crud", label: "CRUD endpoint'leri", prompt: "Product modeli için CRUD API endpoint'leri üret.", category: "api", hint: "5 standart REST endpoint" },
  // form
  { id: "lib_contact", label: "İletişim formu", prompt: "Bir iletişim formu oluştur: ad, e-posta, konu, mesaj.", category: "form", hint: "Doğrulamalı 4 alan" },
  { id: "lib_signup", label: "Kayıt formu", prompt: "Bir kayıt formu oluştur: kullanıcı adı, e-posta, şifre, KVKK onayı.", category: "form", hint: "KVKK onaylı kayıt akışı" },
  // permission
  { id: "lib_perm", label: "Editor rolü izinleri", prompt: "Editor rolü için makul bir izin seti öner.", category: "permission", hint: "Okuma/yazma, silme hariç" },
  // delivery
  { id: "lib_triage", label: "Hataları triyaj et", prompt: "Açık hata raporlarını triyaj et: önem derecesi ve kopyaları öner.", category: "delivery", hint: "Önem + olası kopya tespiti" },
  { id: "lib_release", label: "Sürüm notları üret", prompt: "Son deploy'a giren değişikliklerden sürüm notları üret.", category: "delivery", hint: "Changelog'dan markdown" },
  { id: "lib_cluster", label: "İstekleri kümele", prompt: "Benzer özellik isteklerini temalara kümele ve birleştirme öner.", category: "delivery", hint: "Roadmap konsolidasyonu" },
  // code
  { id: "lib_migration", label: "Migration açıkla", prompt: "Bu migration'ı açıkla ve geri alınabilirliğini değerlendir.", category: "code", hint: "up()/down() yorumu" },
];

// ── Capability cards (yetenek kartları) ───────────────────────────
export interface Capability {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  /** "açık" örnek prompt — karta tıklayınca composer'a yazılır */
  example: string;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "cap_schema",
    title: "Şema & model tasarımı",
    description: "Doğal dilden ilişkili modeller, alanlar ve indexler üretir; açık modele alan önerir.",
    icon: Database,
    example: "E-ticaret şeması üret: Product, Order, OrderItem ve Category.",
  },
  {
    id: "cap_module",
    title: "Modül scaffold",
    description: "Tam bir özellik modülünü modelleri, formları ve endpoint'leriyle iskeletler.",
    icon: Stack,
    example: "Blog modülü oluştur: yazı, kategori ve etiket modelleriyle.",
  },
  {
    id: "cap_api",
    title: "API & endpoint",
    description: "CRUD endpoint'leri, dokümantasyon ve örnek istekler üretir.",
    icon: PlugsConnected,
    example: "Product modeli için CRUD API endpoint'leri üret.",
  },
  {
    id: "cap_theme",
    title: "Tema & erişilebilirlik",
    description: "WCAG kontrastını analiz eder, erişilebilir marka paletleri önerir.",
    icon: Palette,
    example: "WCAG AA uyumlu bir marka renk paleti oluştur.",
  },
  {
    id: "cap_triage",
    title: "Triyaj & teslimat",
    description: "Hataları önem derecesine göre sınıflar, kopyaları bulur, sürüm notları yazar.",
    icon: BugBeetle,
    example: "Açık hata raporlarını triyaj et: önem derecesi ve kopyaları öner.",
  },
  {
    id: "cap_governance",
    title: "Yönetişim",
    description: "Rol izinlerini, kullanılmayan API anahtarlarını ve riskli ortam değişkenlerini denetler.",
    icon: ShieldCheck,
    example: "Editor rolü için makul bir izin seti öner.",
  },
];

// ── Category badge metadata for runs/sessions ─────────────────────
export const PREVIEW_KIND_LABEL: Record<string, string> = {
  models: "Modeller",
  fields: "Alanlar",
  palette: "Palet",
  endpoints: "Endpoint'ler",
  form: "Form",
  permissions: "İzinler",
  code: "Kod",
  triage: "Triyaj",
  "release-notes": "Sürüm notları",
};

export const SURFACE_LABEL: Record<string, string> = {
  "/ai-copilot": "AI Copilot",
  "/schema": "Şema",
  "/theme": "Tema",
  "/": "Genel Bakış",
  "/errors": "Hata İzleme",
  "/releases": "Sürümler",
  "/issues": "Hatalar",
};

export const TAG_ICON: Record<string, Icon> = {
  preview: Tag,
  text: TextAlignLeft,
};
