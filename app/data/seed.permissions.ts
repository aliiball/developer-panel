// Page-local seed for the Permissions matrix surface.
// Zenginleştirilmiş izin kategorileri + rol meta + değişiklik audit.
// NOT: app/data/permissions.ts'teki Role/PERMISSION_GROUPS bozulmadan,
// bu sayfa için ek meta ve kategori grupları sağlar.

import type { AuditEvent } from "~/components/enterprise";
import {
  ShieldCheck,
  PencilSimple,
  Sparkle,
  UserPlus,
  Trash,
  FloppyDisk,
  Lock,
} from "@phosphor-icons/react";

/** Her kaynak için insan-okunur kategori başlığı + açıklama. */
export const RESOURCE_META: Record<string, { label: string; description: string }> = {
  models: { label: "Modeller & Şema", description: "Veri modelleri, alanlar ve ilişkiler." },
  modules: { label: "Modüller", description: "Eklenti kurulumu ve görünürlük." },
  data: { label: "Veri", description: "Kayıt okuma/yazma ve dışa aktarım." },
  theme: { label: "Tema & Marka", description: "Renk paleti ve görünüm." },
  settings: { label: "Ayarlar", description: "Sistem yapılandırması ve yönetim." },
};

/** Tek bir izin anahtarının insan-okunur etiketi + risk seviyesi. */
export const ACTION_META: Record<
  string,
  { label: string; risk: "low" | "medium" | "high" }
> = {
  read: { label: "Okuma", risk: "low" },
  create: { label: "Oluşturma", risk: "medium" },
  update: { label: "Güncelleme", risk: "medium" },
  delete: { label: "Silme", risk: "high" },
  toggle: { label: "Aç/Kapat", risk: "medium" },
  install: { label: "Kurulum", risk: "high" },
  write: { label: "Yazma", risk: "medium" },
  export: { label: "Dışa Aktarım", risk: "high" },
  edit: { label: "Düzenleme", risk: "medium" },
  manage: { label: "Yönetim", risk: "high" },
};

/** Rol başına ek meta: kaç kullanıcı atalı, son güncelleme, sahibi. */
export interface RoleMeta {
  users: number;
  updatedAt: string;
  updatedBy: string;
  // KPI sparkline için son 8 dönemde izin sayısı trendi.
  trend: number[];
}

export const ROLE_META: Record<string, RoleMeta> = {
  admin: { users: 3, updatedAt: "2026-01-12", updatedBy: "system", trend: [20, 20, 20, 20, 20, 20, 20, 20] },
  developer: { users: 11, updatedAt: "2026-05-28", updatedBy: "Ada Yılmaz", trend: [9, 10, 10, 11, 11, 11, 12, 11] },
  editor: { users: 24, updatedAt: "2026-06-10", updatedBy: "Mert Demir", trend: [6, 6, 6, 7, 6, 6, 7, 6] },
  viewer: { users: 58, updatedAt: "2026-04-02", updatedBy: "Ada Yılmaz", trend: [5, 5, 5, 5, 5, 5, 5, 5] },
};

/** Yeni roller için makul kullanıcı/zaman varsayılanı. */
export const DEFAULT_ROLE_META: RoleMeta = {
  users: 0,
  updatedAt: "2026-06-18",
  updatedBy: "karacai@yandex.com",
  trend: [0, 0, 0, 0, 0, 0, 0, 0],
};

/** Matris geneli değişiklik denetim akışı (global audit). */
export const SEED_AUDIT: AuditEvent[] = [
  {
    id: "a1",
    actor: "Mert Demir",
    action: "Editor rolüne data.write izni verdi",
    at: "10 Haz 2026, 14:22",
    icon: PencilSimple,
    tone: "emerald",
    detail: "+ data.write",
  },
  {
    id: "a2",
    actor: "AI Copilot",
    action: "Editor rolü için önerilen izin seti uygulandı",
    at: "8 Haz 2026, 09:05",
    icon: Sparkle,
    tone: "primary",
    detail: "7 izin (silme & ayar yönetimi hariç)",
  },
  {
    id: "a3",
    actor: "Ada Yılmaz",
    action: "Developer rolünden settings.manage iznini kaldırdı",
    at: "28 May 2026, 17:40",
    icon: PencilSimple,
    tone: "amber",
    detail: "− settings.manage",
  },
  {
    id: "a4",
    actor: "Ada Yılmaz",
    action: "Reviewer rolünü oluşturdu",
    at: "21 May 2026, 11:12",
    icon: UserPlus,
    tone: "default",
    detail: "models.read, data.read",
  },
  {
    id: "a5",
    actor: "system",
    action: "Admin rolü sistem rolü olarak kilitlendi",
    at: "12 Oca 2026, 08:00",
    icon: Lock,
    tone: "default",
  },
];

/** Bir role özgü audit üretmek için yardımcı. */
export function roleAudit(roleName: string, isSystem?: boolean): AuditEvent[] {
  if (isSystem) {
    return [
      {
        id: `${roleName}-sys`,
        actor: "system",
        action: `${roleName} sistem rolü — düzenleme kilitli`,
        at: "12 Oca 2026, 08:00",
        icon: Lock,
        tone: "default",
      },
    ];
  }
  return SEED_AUDIT.filter((e) => e.action.toLowerCase().includes(roleName.toLowerCase())).concat([
    {
      id: `${roleName}-created`,
      actor: "Ada Yılmaz",
      action: `${roleName} rolü oluşturuldu`,
      at: "21 May 2026, 11:12",
      icon: ShieldCheck,
      tone: "default",
    },
  ]);
}

export const ICONS = { ShieldCheck, PencilSimple, Sparkle, UserPlus, Trash, FloppyDisk, Lock };
