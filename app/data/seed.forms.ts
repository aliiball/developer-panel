// Page-local seed for the Form Builder surface (forms.tsx).
// Hazır form şablonları + alan başına sahte denetim geçmişi.
import {
  EnvelopeSimple,
  UserCircle,
  CreditCard,
  Megaphone,
  Bug,
  CalendarCheck,
  type Icon,
} from "@phosphor-icons/react";
import type { FormFieldDef, FormFieldKind } from "~/stores/form-store";

type SeedField = Omit<FormFieldDef, "id">;

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: Icon;
  fields: SeedField[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "tpl_contact",
    name: "İletişim Formu",
    description: "Ad, e-posta, konu ve mesaj — klasik iletişim akışı.",
    category: "İletişim",
    icon: EnvelopeSimple,
    fields: [
      { kind: "text", label: "Ad Soyad", required: true, placeholder: "Adınız", helpText: "Tam adınızı girin." },
      { kind: "email", label: "E-posta", required: true, placeholder: "ornek@mail.com" },
      { kind: "select", label: "Konu", required: true, options: ["Genel", "Destek", "Satış", "Geri bildirim"] },
      { kind: "textarea", label: "Mesaj", required: true, placeholder: "Mesajınız…", validation: "min:3" },
    ],
  },
  {
    id: "tpl_signup",
    name: "Üyelik Kaydı",
    description: "Hesap oluşturma: kullanıcı adı, e-posta, parola, KVKK onayı.",
    category: "Hesap",
    icon: UserCircle,
    fields: [
      { kind: "text", label: "Kullanıcı Adı", required: true, placeholder: "kullanici_adi", validation: "regex:^[A-Za-z ]+$" },
      { kind: "email", label: "E-posta", required: true, placeholder: "ornek@mail.com" },
      { kind: "text", label: "Parola", required: true, placeholder: "••••••••", validation: "min:3" },
      { kind: "checkbox", label: "KVKK metnini okudum, onaylıyorum", required: true },
    ],
  },
  {
    id: "tpl_checkout",
    name: "Ödeme / Checkout",
    description: "Fatura bilgileri ve kart alanları — sepet ödeme formu.",
    category: "E-ticaret",
    icon: CreditCard,
    fields: [
      { kind: "heading", label: "Fatura Bilgileri" },
      { kind: "text", label: "Ad Soyad", required: true },
      { kind: "text", label: "Adres", required: true, placeholder: "Mahalle, cadde, no" },
      { kind: "select", label: "Şehir", required: true, options: ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"] },
      { kind: "divider", label: "Ayraç" },
      { kind: "heading", label: "Kart Bilgileri" },
      { kind: "number", label: "Kart Numarası", required: true, validation: "max:255" },
      { kind: "text", label: "Son Kullanma (AA/YY)", required: true, placeholder: "12/28" },
    ],
  },
  {
    id: "tpl_survey",
    name: "Memnuniyet Anketi",
    description: "NPS, derecelendirme ve serbest yorum alanları.",
    category: "Geri bildirim",
    icon: Megaphone,
    fields: [
      { kind: "heading", label: "Deneyiminizi değerlendirin" },
      { kind: "radio", label: "Bizi tavsiye eder misiniz?", required: true, options: ["Kesinlikle", "Olabilir", "Hayır"] },
      { kind: "select", label: "Hangi kanaldan ulaştınız?", options: ["Arama", "Sosyal medya", "Arkadaş tavsiyesi", "Reklam"] },
      { kind: "textarea", label: "Eklemek istedikleriniz", placeholder: "Görüşleriniz…", helpText: "Opsiyonel." },
    ],
  },
  {
    id: "tpl_bug",
    name: "Hata Bildirimi",
    description: "Geliştirici hata raporu: başlık, önem, adımlar, ek dosya.",
    category: "Destek",
    icon: Bug,
    fields: [
      { kind: "text", label: "Hata Başlığı", required: true, placeholder: "Kısa özet", validation: "max:255" },
      { kind: "select", label: "Önem", required: true, options: ["Düşük", "Orta", "Yüksek", "Kritik"] },
      { kind: "textarea", label: "Yeniden Üretme Adımları", required: true, placeholder: "1. … 2. …", validation: "min:3" },
      { kind: "file", label: "Ekran Görüntüsü" },
    ],
  },
  {
    id: "tpl_booking",
    name: "Randevu / Rezervasyon",
    description: "Tarih, kişi sayısı ve iletişim için rezervasyon formu.",
    category: "Operasyon",
    icon: CalendarCheck,
    fields: [
      { kind: "text", label: "Ad Soyad", required: true },
      { kind: "email", label: "E-posta", required: true, placeholder: "ornek@mail.com" },
      { kind: "date", label: "Tarih", required: true },
      { kind: "number", label: "Kişi Sayısı", required: true, placeholder: "2", validation: "max:255" },
      { kind: "textarea", label: "Not", placeholder: "Özel istekleriniz…" },
    ],
  },
];

/* ── Alan tipi başına sahte denetim geçmişi ──────────────────────────
 * Drawer'ın "Aktivite" sekmesinde gösterilir; tipe göre gerçekçi bağlam.
 */
export interface FieldAuditSeed {
  action: string;
  actor: string;
  at: string;
  tone?: "default" | "primary" | "emerald" | "amber" | "red";
  detail?: string;
}

const COMMON: FieldAuditSeed[] = [
  { action: "alanı zorunlu yaptı", actor: "Ada Yılmaz", at: "2 saat önce", tone: "amber", detail: "required: false → true" },
  { action: "yardım metni ekledi", actor: "Mert Kaya", at: "dün 14:20", tone: "emerald" },
  { action: "alanı oluşturdu", actor: "AI Copilot", at: "3 gün önce", tone: "primary" },
];

export const FIELD_AUDIT: Record<FormFieldKind, FieldAuditSeed[]> = {
  text: COMMON,
  email: [
    { action: "e-posta doğrulamasını etkinleştirdi", actor: "Ada Yılmaz", at: "1 saat önce", tone: "primary", detail: "validation: email" },
    ...COMMON.slice(1),
  ],
  number: [
    { action: "max kuralını 255 yaptı", actor: "Mert Kaya", at: "4 saat önce", tone: "primary", detail: "validation: max:255" },
    ...COMMON.slice(1),
  ],
  textarea: [
    { action: "min:3 kuralı ekledi", actor: "Ada Yılmaz", at: "30 dk önce", tone: "primary" },
    ...COMMON.slice(1),
  ],
  select: [
    { action: "seçenekleri güncelledi", actor: "Mert Kaya", at: "1 saat önce", tone: "emerald", detail: "4 seçenek" },
    ...COMMON.slice(2),
  ],
  radio: [
    { action: "seçenek sırasını değiştirdi", actor: "Ada Yılmaz", at: "5 saat önce", tone: "default" },
    ...COMMON.slice(2),
  ],
  checkbox: [
    { action: "KVKK onayını zorunlu yaptı", actor: "Hukuk", at: "dün", tone: "amber" },
    ...COMMON.slice(2),
  ],
  date: COMMON,
  file: [
    { action: "dosya türü kısıtı ekledi", actor: "Mert Kaya", at: "2 saat önce", tone: "primary", detail: ".png .jpg .pdf" },
    ...COMMON.slice(2),
  ],
  heading: [
    { action: "başlık metnini düzenledi", actor: "Ada Yılmaz", at: "1 gün önce", tone: "default" },
  ],
  divider: [
    { action: "ayraç ekledi", actor: "Mert Kaya", at: "1 gün önce", tone: "default" },
  ],
};
