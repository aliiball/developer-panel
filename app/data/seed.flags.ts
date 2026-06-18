// Page-local seed: feature flag sahiplik metası + flag bazlı audit geçmişi.
// flags.tsx tarafından kullanılır. Ortak app/data/delivery.ts'i bozmadan zenginleştirir.
import type { AuditEvent } from "~/components/enterprise";

export interface FlagOwnerMeta {
  owner: string;
  team: string;
  /** son 24 saatteki flag değerlendirme (evaluation) sayısı */
  evals24h: number;
}

export const FLAG_OWNERS: Record<string, FlagOwnerMeta> = {
  f1: { owner: "mehmet", team: "Commerce", evals24h: 18240 },
  f2: { owner: "elif", team: "Payments", evals24h: 0 },
  f3: { owner: "zeynep", team: "Growth", evals24h: 412900 },
  f4: { owner: "zeynep", team: "Lifecycle", evals24h: 98410 },
  f5: { owner: "ali", team: "Platform", evals24h: 0 },
};

// Audit kaydı: kind alanı flags.tsx'te ikon eşlemesi için kullanılır.
type FlagAuditEvent = AuditEvent & { kind: "enabled" | "disabled" | "rollout" | "env" | "created" | "edited" };

export const FLAG_AUDIT: Record<string, FlagAuditEvent[]> = {
  f1: [
    { id: "f1a1", kind: "rollout", action: "rollout %10 → %25 yükseltildi", actor: "mehmet", at: "8 dk önce", tone: "primary", detail: "staging · kademeli" },
    { id: "f1a2", kind: "env", action: "staging ortamına eklendi", actor: "mehmet", at: "2 sa önce", tone: "amber" },
    { id: "f1a3", kind: "enabled", action: "flag açıldı", actor: "mehmet", at: "1 gün önce", tone: "emerald" },
    { id: "f1a4", kind: "created", action: "flag oluşturuldu", actor: "mehmet", at: "3 gün önce", detail: "FEAT-54 ile bağlandı" },
  ],
  f2: [
    { id: "f2a1", kind: "edited", action: "açıklama güncellendi", actor: "elif", at: "1 gün önce" },
    { id: "f2a2", kind: "created", action: "flag oluşturuldu", actor: "elif", at: "5 gün önce", tone: "default", detail: "FEAT-38 · kapalı başlatıldı" },
  ],
  f3: [
    { id: "f3a1", kind: "rollout", action: "rollout %100'e tamamlandı", actor: "zeynep", at: "3 gün önce", tone: "emerald", detail: "tam dağıtım" },
    { id: "f3a2", kind: "rollout", action: "rollout %50 → %75", actor: "zeynep", at: "4 gün önce", tone: "primary" },
    { id: "f3a3", kind: "env", action: "prod ortamına eklendi", actor: "zeynep", at: "6 gün önce", tone: "emerald" },
    { id: "f3a4", kind: "rollout", action: "rollout %25 ile başladı", actor: "zeynep", at: "1 hafta önce", tone: "primary" },
    { id: "f3a5", kind: "enabled", action: "flag açıldı", actor: "zeynep", at: "1 hafta önce", tone: "emerald" },
  ],
  f4: [
    { id: "f4a1", kind: "rollout", action: "tüm ortamlarda %100", actor: "system", at: "3 hafta önce", tone: "emerald" },
    { id: "f4a2", kind: "env", action: "prod ortamına eklendi", actor: "zeynep", at: "3 hafta önce", tone: "emerald", detail: "FEAT-42 shipped" },
    { id: "f4a3", kind: "enabled", action: "flag açıldı", actor: "zeynep", at: "3 hafta önce", tone: "emerald" },
  ],
  f5: [
    { id: "f5a1", kind: "edited", action: "HMAC algoritması SHA-256 olarak ayarlandı", actor: "ali", at: "4 gün önce", detail: "güvenlik incelemesi bekliyor" },
    { id: "f5a2", kind: "created", action: "flag oluşturuldu", actor: "ali", at: "4 gün önce", tone: "default", detail: "FEAT-61 · dev" },
  ],
};
