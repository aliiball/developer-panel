// Page-local seed for the Team & Members surface.
// Enriches the shared SEED_MEMBERS with profile, governance and audit detail
// so the page can drive a full enterprise grid (KPI / drawer / audit).
import type { AuditEvent } from "~/components/enterprise";
import {
  SignIn, ShieldCheck, UserPlus, PencilSimple, Prohibit, ArrowsClockwise,
} from "@phosphor-icons/react";
import { SEED_MEMBERS, type Member } from "~/data/platform";

export interface MemberDetail {
  /** kayıt katılma tarihi */
  joinedAt: string;
  /** son giriş IP / cihaz özeti */
  lastSeen: string;
  /** iki faktör doğrulama açık mı */
  mfa: boolean;
  /** kaç ekip/proje üyesi */
  teams: string[];
  /** çözülmüş/atanmış iş sayısı (yoğunluk göstergesi) */
  assigned: number;
  /** 7 günlük etkinlik (sparkline + aktiflik) */
  activity7d: number[];
  /** bölge / lokasyon */
  location: string;
  /** son güncelleyen aktör (governance) */
  updatedBy: string;
  title: string;
  audit: AuditEvent[];
}

const A = (
  id: string, action: string, actor: string, at: string,
  tone: AuditEvent["tone"], icon: AuditEvent["icon"], detail?: string,
): AuditEvent => ({ id, action, actor, at, tone, icon, detail });

// Detay haritası — paylaşılan SEED_MEMBERS id'lerine bağlı.
export const MEMBER_DETAIL: Record<string, MemberDetail> = {
  u1: {
    joinedAt: "14 Oca 2024", lastSeen: "192.168.4.21 · macOS · Chrome", mfa: true,
    teams: ["Platform", "Security"], assigned: 3, activity7d: [8, 12, 9, 14, 11, 16, 13],
    location: "İstanbul, TR", updatedBy: "system", title: "Kurucu / Platform Lead",
    audit: [
      A("a1", "Migration 005'i production'a uyguladı", "Mehmet Yılmaz", "şimdi", "emerald", ShieldCheck, "005_add_subscriptions"),
      A("a2", "Zeynep'i Developer rolüne yükseltti", "Mehmet Yılmaz", "2 sa önce", "primary", PencilSimple, "Viewer → Developer"),
      A("a3", "Oturum açtı", "Mehmet Yılmaz", "bugün 09:12", "default", SignIn, "192.168.4.21"),
    ],
  },
  u2: {
    joinedAt: "02 Mar 2024", lastSeen: "10.0.1.8 · Linux · Firefox", mfa: true,
    teams: ["Platform"], assigned: 7, activity7d: [4, 6, 8, 5, 9, 7, 10],
    location: "Ankara, TR", updatedBy: "Mehmet Yılmaz", title: "Backend Developer",
    audit: [
      A("a1", "FEAT-54 dalını main'e merge etti", "Zeynep Kaya", "12 dk önce", "emerald", ArrowsClockwise, "PR #218"),
      A("a2", "API anahtarı oluşturdu", "Zeynep Kaya", "1 gün önce", "amber", ShieldCheck, "mp_test_sk_b8e2"),
      A("a3", "Developer rolüne yükseltildi", "Mehmet Yılmaz", "3 ay önce", "primary", PencilSimple),
    ],
  },
  u3: {
    joinedAt: "21 Nis 2024", lastSeen: "10.0.1.12 · Windows · Edge", mfa: false,
    teams: ["Platform", "Frontend"], assigned: 5, activity7d: [6, 5, 7, 6, 4, 8, 6],
    location: "İzmir, TR", updatedBy: "system", title: "Frontend Developer",
    audit: [
      A("a1", "Theme editörde 3 token güncelledi", "Ali Demir", "1 sa önce", "primary", PencilSimple),
      A("a2", "Oturum açtı", "Ali Demir", "1 sa önce", "default", SignIn, "10.0.1.12"),
      A("a3", "Ekibe katıldı", "Ali Demir", "21 Nis 2024", "emerald", UserPlus),
    ],
  },
  u4: {
    joinedAt: "08 May 2024", lastSeen: "85.34.2.91 · iOS · Safari", mfa: true,
    teams: ["İçerik"], assigned: 2, activity7d: [2, 3, 1, 4, 2, 3, 2],
    location: "Bursa, TR", updatedBy: "Mehmet Yılmaz", title: "İçerik Editörü",
    audit: [
      A("a1", "12 blog gönderisini yayınladı", "Elif Şahin", "3 sa önce", "emerald", PencilSimple),
      A("a2", "Editor rolüne atandı", "Mehmet Yılmaz", "08 May 2024", "primary", PencilSimple, "Viewer → Editor"),
    ],
  },
  u5: {
    joinedAt: "30 Kas 2023", lastSeen: "—", mfa: false,
    teams: ["Salt Okunur"], assigned: 0, activity7d: [1, 0, 0, 0, 0, 0, 0],
    location: "Antalya, TR", updatedBy: "Mehmet Yılmaz", title: "Harici Danışman",
    audit: [
      A("a1", "Hesabı askıya alındı", "Mehmet Yılmaz", "2 hafta önce", "red", Prohibit, "şüpheli oturum etkinliği"),
      A("a2", "Viewer rolüne düşürüldü", "Mehmet Yılmaz", "1 ay önce", "amber", PencilSimple, "Editor → Viewer"),
    ],
  },
  u6: {
    joinedAt: "—", lastSeen: "—", mfa: false,
    teams: ["Platform"], assigned: 0, activity7d: [0, 0, 0, 0, 0, 0, 0],
    location: "—", updatedBy: "Mehmet Yılmaz", title: "Davet bekliyor",
    audit: [
      A("a1", "Davet gönderildi", "Mehmet Yılmaz", "1 gün önce", "amber", UserPlus, "yeni@acme.com · Developer"),
    ],
  },
};

// Davetli ek kayıtlar — gerçekçi yoğunluk için.
const EXTRA_MEMBERS: Member[] = [
  { id: "u7", name: "Burak Aydın", email: "burak@acme.com", role: "Developer", status: "active", lastActive: "25 dk önce", hue: 40 },
  { id: "u8", name: "Selin Yıldız", email: "selin@acme.com", role: "Editor", status: "active", lastActive: "2 sa önce", hue: 330 },
  { id: "u9", name: "Deniz Arslan", email: "deniz@acme.com", role: "Developer", status: "active", lastActive: "4 sa önce", hue: 190 },
  { id: "u10", name: "Kerem Toprak", email: "kerem@acme.com", role: "Viewer", status: "active", lastActive: "1 gün önce", hue: 80 },
  { id: "u11", name: "—", email: "stajyer@acme.com", role: "Viewer", status: "invited", lastActive: "davet gönderildi", hue: 280 },
  { id: "u12", name: "—", email: "ozgur@partner.com", role: "Developer", status: "invited", lastActive: "davet gönderildi", hue: 10 },
  { id: "u13", name: "Merve Çelik", email: "merve@acme.com", role: "Admin", status: "active", lastActive: "şimdi", hue: 220 },
  { id: "u14", name: "Tolga Eren", email: "tolga@acme.com", role: "Developer", status: "suspended", lastActive: "1 ay önce", hue: 350 },
];

const EXTRA_DETAIL: Record<string, MemberDetail> = {
  u7: { joinedAt: "12 Şub 2025", lastSeen: "10.0.2.4 · Linux · Chrome", mfa: true, teams: ["Platform"], assigned: 6, activity7d: [5, 7, 6, 8, 7, 9, 8], location: "İstanbul, TR", updatedBy: "Mehmet Yılmaz", title: "Backend Developer", audit: [A("a1", "Oturum açtı", "Burak Aydın", "25 dk önce", "default", SignIn)] },
  u8: { joinedAt: "03 Mar 2025", lastSeen: "85.34.9.2 · macOS · Safari", mfa: true, teams: ["İçerik"], assigned: 4, activity7d: [3, 4, 3, 5, 4, 4, 5], location: "Ankara, TR", updatedBy: "Elif Şahin", title: "İçerik Editörü", audit: [A("a1", "Roadmap'te 2 kart düzenledi", "Selin Yıldız", "2 sa önce", "primary", PencilSimple)] },
  u9: { joinedAt: "19 Şub 2025", lastSeen: "10.0.2.9 · Windows · Chrome", mfa: false, teams: ["Frontend"], assigned: 5, activity7d: [4, 5, 6, 4, 7, 5, 6], location: "İzmir, TR", updatedBy: "system", title: "Frontend Developer", audit: [A("a1", "Oturum açtı", "Deniz Arslan", "4 sa önce", "default", SignIn)] },
  u10: { joinedAt: "01 Nis 2025", lastSeen: "85.34.1.40 · iOS · Safari", mfa: false, teams: ["Salt Okunur"], assigned: 0, activity7d: [1, 1, 0, 1, 0, 1, 0], location: "Bursa, TR", updatedBy: "Mehmet Yılmaz", title: "Analist", audit: [A("a1", "Viewer olarak eklendi", "Mehmet Yılmaz", "01 Nis 2025", "emerald", UserPlus)] },
  u11: { joinedAt: "—", lastSeen: "—", mfa: false, teams: ["Salt Okunur"], assigned: 0, activity7d: [0, 0, 0, 0, 0, 0, 0], location: "—", updatedBy: "Elif Şahin", title: "Davet bekliyor", audit: [A("a1", "Davet gönderildi", "Elif Şahin", "3 sa önce", "amber", UserPlus, "stajyer@acme.com · Viewer")] },
  u12: { joinedAt: "—", lastSeen: "—", mfa: false, teams: ["Platform"], assigned: 0, activity7d: [0, 0, 0, 0, 0, 0, 0], location: "—", updatedBy: "Mehmet Yılmaz", title: "Davet bekliyor (harici)", audit: [A("a1", "Davet gönderildi", "Mehmet Yılmaz", "5 sa önce", "amber", UserPlus, "ozgur@partner.com · Developer")] },
  u13: { joinedAt: "07 Haz 2024", lastSeen: "192.168.4.30 · macOS · Chrome", mfa: true, teams: ["Platform", "Security"], assigned: 1, activity7d: [9, 11, 10, 12, 13, 12, 14], location: "İstanbul, TR", updatedBy: "system", title: "Ürün Yöneticisi / Admin", audit: [A("a1", "API anahtarını iptal etti", "Merve Çelik", "şimdi", "red", Prohibit, "mp_live_sk_001f"), A("a2", "Oturum açtı", "Merve Çelik", "şimdi", "default", SignIn)] },
  u14: { joinedAt: "11 Eyl 2024", lastSeen: "—", mfa: false, teams: ["Platform"], assigned: 0, activity7d: [0, 0, 0, 0, 0, 0, 0], location: "İzmir, TR", updatedBy: "Mehmet Yılmaz", title: "Sözleşmesi sonlandı", audit: [A("a1", "Hesabı askıya alındı", "Mehmet Yılmaz", "1 ay önce", "red", Prohibit, "sözleşme bitişi")] },
};

export const TEAM_MEMBERS: Member[] = [...SEED_MEMBERS, ...EXTRA_MEMBERS];
export const TEAM_DETAIL: Record<string, MemberDetail> = { ...MEMBER_DETAIL, ...EXTRA_DETAIL };

// Boş detay fallback (uydurma yeni davetler için).
export const EMPTY_DETAIL: MemberDetail = {
  joinedAt: "—", lastSeen: "—", mfa: false, teams: [], assigned: 0,
  activity7d: [0, 0, 0, 0, 0, 0, 0], location: "—", updatedBy: "—",
  title: "Davet bekliyor", audit: [],
};
