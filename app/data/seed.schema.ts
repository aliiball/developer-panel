// Page-local enrichment seed for the Schema editor surface.
// Lightweight, derived "governance" metadata keyed by model id — does NOT
// touch the shared schema store; it only adds insight/audit context the
// enterprise editor renders alongside the live model list.
import type { AuditEvent } from "~/components/enterprise";
import {
  PlusCircle,
  PencilSimple,
  LinkSimple,
  TrashSimple,
  Sparkle,
  ShieldCheck,
  Database,
} from "@phosphor-icons/react";

export type ModelHealth = "stable" | "draft" | "deprecated";

export interface ModelMeta {
  health: ModelHealth;
  /** yaklaşık satır sayısı (canlı tahmin) */
  rows: number;
  /** son 14 günlük migration/şema değişiklik trendi (sparkline) */
  changeTrend: number[];
  owner: string;
  updatedAt: string;
  /** modeli referans alan diğer modeller (gelen ilişki) */
  referencedBy: string[];
}

// Model id → governance/insight metadata.
export const MODEL_META: Record<string, ModelMeta> = {
  customer: {
    health: "stable",
    rows: 48230,
    changeTrend: [2, 1, 0, 3, 1, 0, 0, 1, 2, 0, 1, 0, 0, 1],
    owner: "Ada Yılmaz",
    updatedAt: "2 gün önce",
    referencedBy: ["Order", "BlogPost", "Address", "Wishlist"],
  },
  product: {
    health: "stable",
    rows: 12940,
    changeTrend: [0, 1, 1, 2, 4, 3, 2, 1, 1, 0, 2, 3, 1, 0],
    owner: "Mert Kaya",
    updatedAt: "5 saat önce",
    referencedBy: ["Review"],
  },
  order: {
    health: "stable",
    rows: 83110,
    changeTrend: [1, 0, 2, 1, 3, 2, 4, 2, 1, 3, 2, 1, 0, 2],
    owner: "Mert Kaya",
    updatedAt: "1 gün önce",
    referencedBy: ["Invoice", "Payment"],
  },
  category: {
    health: "stable",
    rows: 312,
    changeTrend: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    owner: "Selin Demir",
    updatedAt: "3 hafta önce",
    referencedBy: ["Product", "Category"],
  },
  blogpost: {
    health: "draft",
    rows: 1840,
    changeTrend: [3, 4, 2, 5, 3, 6, 4, 3, 5, 4, 2, 3, 4, 5],
    owner: "Selin Demir",
    updatedAt: "12 saat önce",
    referencedBy: [],
  },
  invoice: {
    health: "stable",
    rows: 79420,
    changeTrend: [0, 1, 0, 0, 1, 0, 2, 1, 0, 0, 1, 0, 0, 1],
    owner: "Finans Ekibi",
    updatedAt: "4 gün önce",
    referencedBy: [],
  },
  address: {
    health: "stable",
    rows: 51200,
    changeTrend: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    owner: "Ada Yılmaz",
    updatedAt: "1 hafta önce",
    referencedBy: [],
  },
  review: {
    health: "draft",
    rows: 8730,
    changeTrend: [2, 3, 1, 4, 2, 3, 1, 2, 3, 4, 2, 1, 3, 2],
    owner: "Mert Kaya",
    updatedAt: "8 saat önce",
    referencedBy: [],
  },
  tag: {
    health: "deprecated",
    rows: 96,
    changeTrend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    owner: "—",
    updatedAt: "2 ay önce",
    referencedBy: [],
  },
  payment: {
    health: "stable",
    rows: 76010,
    changeTrend: [1, 0, 1, 2, 0, 1, 3, 1, 0, 2, 1, 0, 1, 0],
    owner: "Finans Ekibi",
    updatedAt: "6 saat önce",
    referencedBy: [],
  },
  coupon: {
    health: "draft",
    rows: 420,
    changeTrend: [1, 2, 0, 3, 1, 2, 0, 1, 2, 1, 0, 1, 2, 0],
    owner: "Pazarlama",
    updatedAt: "2 gün önce",
    referencedBy: [],
  },
  wishlist: {
    health: "draft",
    rows: 19330,
    changeTrend: [2, 1, 3, 2, 1, 0, 2, 3, 1, 2, 1, 0, 1, 2],
    owner: "Selin Demir",
    updatedAt: "1 gün önce",
    referencedBy: [],
  },
};

export const DEFAULT_META: ModelMeta = {
  health: "draft",
  rows: 0,
  changeTrend: [0, 0, 1, 0, 0, 0, 1],
  owner: "turksab.yonetim@gmail.com",
  updatedAt: "az önce",
  referencedBy: [],
};

// Per-model audit history (id → events). Fallback below for new/unknown models.
export const MODEL_AUDIT: Record<string, AuditEvent[]> = {
  customer: [
    { id: "ca1", action: "alan eklendi: lifetimeValue (number)", actor: "Ada Yılmaz", at: "2 gün önce", icon: PlusCircle, tone: "emerald", detail: "ALTER TABLE customers ADD lifetime_value numeric DEFAULT 0" },
    { id: "ca2", action: "tier enum'una 'enterprise' değeri eklendi", actor: "Ada Yılmaz", at: "9 gün önce", icon: PencilSimple, tone: "amber" },
    { id: "ca3", action: "email alanı unique + indexed işaretlendi", actor: "Mert Kaya", at: "3 hafta önce", icon: ShieldCheck, tone: "primary", detail: "CREATE UNIQUE INDEX customers_email_uq ON customers(email)" },
    { id: "ca4", action: "model oluşturuldu", actor: "system", at: "4 ay önce", icon: Database, tone: "default" },
  ],
  product: [
    { id: "pa1", action: "category ilişkisi eklendi → Category", actor: "Mert Kaya", at: "5 saat önce", icon: LinkSimple, tone: "primary" },
    { id: "pa2", action: "metadata (json) alanı eklendi", actor: "Mert Kaya", at: "1 hafta önce", icon: PlusCircle, tone: "emerald" },
    { id: "pa3", action: "AI ile şema önerisi uygulandı", actor: "AI Copilot", at: "2 hafta önce", icon: Sparkle, tone: "primary" },
  ],
  order: [
    { id: "oa1", action: "status enum'a 'delivered' eklendi", actor: "Mert Kaya", at: "1 gün önce", icon: PencilSimple, tone: "amber" },
    { id: "oa2", action: "placedAt index'lendi", actor: "system", at: "10 gün önce", icon: ShieldCheck, tone: "primary" },
  ],
  tag: [
    { id: "ta1", action: "model deprecated olarak işaretlendi", actor: "Selin Demir", at: "2 ay önce", icon: TrashSimple, tone: "red", detail: "Tags → Label[] inline alana taşındı" },
    { id: "ta2", action: "model oluşturuldu", actor: "system", at: "8 ay önce", icon: Database, tone: "default" },
  ],
};

export function auditFor(modelId: string, modelName: string): AuditEvent[] {
  return (
    MODEL_AUDIT[modelId] ?? [
      { id: `${modelId}-a1`, action: "model oluşturuldu", actor: "turksab.yonetim@gmail.com", at: "az önce", icon: Database, tone: "emerald", detail: `CREATE TABLE ${modelName.toLowerCase()}s (...)` },
    ]
  );
}
