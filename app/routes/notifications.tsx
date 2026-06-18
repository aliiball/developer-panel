import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toastUndo } from "~/lib/feedback";
import { useListNav } from "~/hooks/use-list-nav";
import {
  RocketLaunch as Rocket,
  Warning as AlertTriangle,
  Bug,
  At as AtSign,
  Sparkle as Sparkles,
  Checks as CheckCheck,
  BellRinging,
  BellSlash,
  EnvelopeOpen,
  Envelope,
  Archive,
  ArrowCounterClockwise,
  Clock,
  Gear,
  SlidersHorizontal,
  Lightning,
  ArrowUpRight,
  CircleNotch,
  type Icon,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import {
  EmptyState,
  KpiCard,
  KpiSkeleton,
  Skeleton,
  FilterBar,
  FilterChip,
  BulkBar,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
} from "~/components/enterprise";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { useNotificationStore } from "~/stores/notification-store";
import type { NotificationItem, NotificationType } from "~/data/platform";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Notifications — MetaPanel" }];
}

/* ── Sayfa-yerel zengin seed ────────────────────────────────────────
 * Store'daki 6 kayıt akış hissi için yeterli değil. Mağazayı bozmadan,
 * sayfa içinde gerçekçi yoğunluk (gruplu zaman + kategori dağılımı) için
 * zaman damgalı, kaynak/aktör metadatalı ek bildirimler üretiyoruz.
 */
interface FeedItem extends NotificationItem {
  /** dakika cinsinden "şu kadar önce" — gruplama + sıralama için */
  ageMin: number;
  source: string;
  actor: string;
  priority: "low" | "normal" | "high" | "critical";
}

const META: Record<NotificationType, { label: string; icon: Icon; tone: string; dot: string }> = {
  deploy: { label: "Deploy", icon: Rocket, tone: "text-sky-400 bg-sky-400/10", dot: "bg-sky-400" },
  incident: { label: "Incident", icon: AlertTriangle, tone: "text-red-400 bg-red-400/10", dot: "bg-red-400" },
  issue: { label: "Issue", icon: Bug, tone: "text-amber-400 bg-amber-400/10", dot: "bg-amber-400" },
  mention: { label: "Mention", icon: AtSign, tone: "text-violet-400 bg-violet-400/10", dot: "bg-violet-400" },
  ai: { label: "AI", icon: Sparkles, tone: "text-primary bg-primary/10", dot: "bg-primary" },
};

const PRIORITY_BADGE: Record<FeedItem["priority"], { label: string; cls: string }> = {
  low: { label: "Düşük", cls: "text-muted-foreground border-border" },
  normal: { label: "Normal", cls: "text-sky-400 border-sky-400/30" },
  high: { label: "Yüksek", cls: "text-amber-400 border-amber-400/30" },
  critical: { label: "Kritik", cls: "text-red-400 border-red-400/30" },
};

const FROM_STORE: Pick<FeedItem, "ageMin" | "source" | "actor" | "priority">[] = [
  { ageMin: 12, source: "Issue Tracker", actor: "müşteri@acme.co", priority: "critical" },
  { ageMin: 8, source: "Deploy Pipeline", actor: "ci-bot", priority: "normal" },
  { ageMin: 32, source: "Health Monitor", actor: "system", priority: "critical" },
  { ageMin: 64, source: "AI Copilot", actor: "ai-copilot", priority: "normal" },
  { ageMin: 300, source: "Deploy Pipeline", actor: "ci-bot", priority: "high" },
  { ageMin: 360, source: "Roadmap", actor: "Zeynep Aydın", priority: "low" },
];

const EXTRA_SEED: FeedItem[] = [
  { id: "n7", type: "mention", title: "Zeynep bir thread'de yanıtladı", body: "“Bu PR'ı staging'e alabilir miyiz?” — FEAT-58 yorumunda seni etiketledi.", at: "3 dk önce", ageMin: 3, read: false, link: "/roadmap", source: "Roadmap", actor: "Zeynep Aydın", priority: "normal" },
  { id: "n8", type: "deploy", title: "Production deploy tamamlandı", body: "v1.9.0 production ortamına sorunsuz yüklendi (0 rollback).", at: "21 dk önce", ageMin: 21, read: false, link: "/releases", source: "Deploy Pipeline", actor: "ci-bot", priority: "high" },
  { id: "n9", type: "ai", title: "AI release notes hazır", body: "v1.9.0 için 14 commit'ten otomatik sürüm notu üretildi.", at: "26 dk önce", ageMin: 26, read: false, link: "/releases", source: "AI Copilot", actor: "ai-copilot", priority: "normal" },
  { id: "n10", type: "incident", title: "Hata oranı eşiği aşıldı", body: "/api/checkout 5xx oranı son 5 dk'da %2.4'e yükseldi (eşik %1).", at: "44 dk önce", ageMin: 44, read: false, link: "/errors", source: "Error Tracking", actor: "system", priority: "critical" },
  { id: "n11", type: "issue", title: "BUG-139 sana atandı", body: "“Mobilde tablo taşması” raporu sana atandı (öncelik: yüksek).", at: "52 dk önce", ageMin: 52, read: true, link: "/issues/BUG-139", source: "Issue Tracker", actor: "Mert Kaya", priority: "high" },
  { id: "n12", type: "deploy", title: "Feature flag açıldı", body: "checkout-v2 bayrağı production'da %25 trafiğe açıldı.", at: "2 sa önce", ageMin: 120, read: true, link: "/feature-flags", source: "Feature Flags", actor: "Ada Yılmaz", priority: "normal" },
  { id: "n13", type: "mention", title: "Code review istendi", body: "PR #482 için inceleme istendi — “API key rotation”.", at: "3 sa önce", ageMin: 180, read: true, link: "/api-keys", source: "GitHub", actor: "Burak Şahin", priority: "normal" },
  { id: "n14", type: "ai", title: "AI triyaj 5 raporu sınıflandırdı", body: "Yeni gelen 5 hata raporu önem ve modüle göre etiketlendi.", at: "4 sa önce", ageMin: 240, read: true, link: "/issues", source: "AI Copilot", actor: "ai-copilot", priority: "low" },
  { id: "n15", type: "incident", title: "Incident #INC-21 çözüldü", body: "Webhook gecikmesi giderildi, MTTR 38 dk.", at: "5 sa önce", ageMin: 290, read: true, link: "/health", source: "Health Monitor", actor: "Ada Yılmaz", priority: "high" },
  { id: "n16", type: "issue", title: "FEAT-61 “in review” oldu", body: "“Toplu export” özelliği review aşamasına geçti.", at: "8 sa önce", ageMin: 480, read: true, link: "/roadmap", source: "Roadmap", actor: "Zeynep Aydın", priority: "low" },
  { id: "n17", type: "deploy", title: "Migration 0042 uygulandı", body: "add_notifications_index migration'ı production'da çalıştı.", at: "9 sa önce", ageMin: 540, read: true, link: "/migrations", source: "Migrations", actor: "ci-bot", priority: "normal" },
  { id: "n18", type: "mention", title: "Yorumda etiketlendin", body: "Mert: “@sen bunu bir sonraki sürüme alalım mı?” — FEAT-55.", at: "1 gün önce", ageMin: 1440, read: true, link: "/roadmap", source: "Roadmap", actor: "Mert Kaya", priority: "low" },
  { id: "n19", type: "ai", title: "Haftalık özet hazır", body: "Geçen hafta 23 deploy, 4 incident, MTTR ortalama 41 dk.", at: "1 gün önce", ageMin: 1500, read: true, link: "/dashboard", source: "AI Copilot", actor: "ai-copilot", priority: "low" },
];

function buildFeed(store: NotificationItem[]): FeedItem[] {
  const enriched = store.map((n, i) => ({ ...n, ...(FROM_STORE[i] ?? { ageMin: (i + 1) * 30, source: "System", actor: "system", priority: "normal" as const }) }));
  return [...enriched, ...EXTRA_SEED].sort((a, b) => a.ageMin - b.ageMin);
}

/* ── Zaman gruplama ─────────────────────────────────────────────────*/
function bucketOf(ageMin: number): string {
  if (ageMin < 60) return "Son 1 saat";
  if (ageMin < 24 * 60) return "Bugün";
  if (ageMin < 48 * 60) return "Dün";
  return "Daha eski";
}
const BUCKET_ORDER = ["Son 1 saat", "Bugün", "Dün", "Daha eski"];

const FILTERS: NotificationType[] = ["deploy", "incident", "issue", "mention", "ai"];

interface Prefs {
  channel: Record<NotificationType, boolean>;
  emailDigest: boolean;
  desktopPush: boolean;
  quietHours: boolean;
}
const DEFAULT_PREFS: Prefs = {
  channel: { deploy: true, incident: true, issue: true, mention: true, ai: false },
  emailDigest: true,
  desktopPush: true,
  quietHours: false,
};

export default function Notifications() {
  const navigate = useNavigate();
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const baseFeed = useMemo(() => buildFeed(storeNotifications), [storeNotifications]);

  // Sayfa-yerel etkileşim durumu (store tiplerini bozmadan zenginlik):
  const [loading] = useState(false);
  const [readOverride, setReadOverride] = useState<Record<string, boolean>>({});
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Set<NotificationType>>(new Set());
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const isRead = (n: FeedItem) => readOverride[n.id] ?? n.read;

  // Görünür akış (arşiv + filtre + arama):
  const visible = useMemo(() => {
    return baseFeed.filter((n) => {
      if (archived.has(n.id) !== showArchived) return false;
      if (active.size > 0 && !active.has(n.type)) return false;
      if (unreadOnly && isRead(n)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.source.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFeed, archived, showArchived, active, unreadOnly, search, readOverride]);

  // Zaman gruplaması:
  const grouped = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    for (const n of visible) {
      const b = bucketOf(n.ageMin);
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(n);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({ bucket: b, items: map.get(b)! }));
  }, [visible]);

  // Klavye gezinmesi: gruplar yalnız görsel; index'ler düz "visible" sırasına göre global.
  const openRow = (n: FeedItem) => { doMarkRead(n.id); setOpenId(n.id); };
  const { active: navActive, setActive: setNavActive, onKeyDown, containerRef } =
    useListNav(visible.length, (i) => { const row = visible[i]; if (row) openRow(row); });
  const navIndexOf = useMemo(() => {
    const m = new Map<string, number>();
    visible.forEach((n, i) => m.set(n.id, i));
    return m;
  }, [visible]);

  // KPI metrikleri:
  const liveFeed = baseFeed.filter((n) => !archived.has(n.id));
  const unread = liveFeed.filter((n) => !isRead(n)).length;
  const criticalUnread = liveFeed.filter((n) => !isRead(n) && (n.type === "incident" || n.priority === "critical")).length;
  const mentions = liveFeed.filter((n) => n.type === "mention" && !isRead(n)).length;
  const last24 = baseFeed.filter((n) => n.ageMin < 24 * 60).length;
  const countByType = (t: NotificationType) => liveFeed.filter((n) => n.type === t && !isRead(n)).length;

  // Aksiyonlar:
  const doMarkRead = (id: string) => {
    markRead(id);
    setReadOverride((p) => ({ ...p, [id]: true }));
  };
  const toggleRead = (n: FeedItem) => {
    const next = !isRead(n);
    const prev = readOverride[n.id]; // önceki override (undefined = store değeri)
    setReadOverride((p) => ({ ...p, [n.id]: next }));
    if (next) markRead(n.id);
    toastUndo(next ? "Okundu olarak işaretlendi" : "Okunmadı olarak işaretlendi", {
      description: n.title,
      onUndo: () =>
        setReadOverride((p) => {
          const s = { ...p };
          if (prev === undefined) delete s[n.id];
          else s[n.id] = prev;
          return s;
        }),
    });
  };
  const archiveOne = (id: string) => {
    setArchived((p) => new Set(p).add(id));
    setSelected((p) => { const s = new Set(p); s.delete(id); return s; });
    toastUndo("Bildirim arşivlendi", {
      onUndo: () => setArchived((p) => { const s = new Set(p); s.delete(id); return s; }),
    });
  };
  const onMarkAllRead = () => {
    const prevOverride = readOverride; // geri-al için önceki override durumu
    const prevUnread = liveFeed.filter((n) => !isRead(n)).length;
    markAllRead();
    const all: Record<string, boolean> = {};
    baseFeed.forEach((n) => (all[n.id] = true));
    setReadOverride((p) => ({ ...p, ...all }));
    toastUndo("Tüm bildirimler okundu işaretlendi", {
      description: `${prevUnread} bildirim okundu olarak işaretlendi`,
      onUndo: () => setReadOverride(prevOverride),
    });
  };

  // Toplu işlemler:
  const toggleSelect = (id: string) =>
    setSelected((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const bulkRead = () => {
    const prevOverride = readOverride; // geri-al için önceki override durumu
    const n = selected.size;
    selected.forEach((id) => doMarkRead(id));
    setSelected(new Set());
    toastUndo(`${n} bildirim okundu işaretlendi`, {
      onUndo: () => setReadOverride(prevOverride),
    });
  };
  const bulkArchive = () => {
    const ids = [...selected]; // geri-al için arşivlenenler
    const n = ids.length;
    setArchived((p) => { const s = new Set(p); ids.forEach((id) => s.add(id)); return s; });
    setSelected(new Set());
    toastUndo(`${n} bildirim arşivlendi`, {
      onUndo: () => setArchived((p) => { const s = new Set(p); ids.forEach((id) => s.delete(id)); return s; }),
    });
  };

  const onExport = () => {
    toast.success(`${visible.length} bildirim JSON olarak dışa aktarıldı`, { description: "notifications-export.json" });
  };

  const setPrefChannel = (t: NotificationType, v: boolean) =>
    setPrefs((p) => ({ ...p, channel: { ...p.channel, [t]: v } }));

  // Tercih kaydı: anlık mock — yükleniyor durumu görünür olsun diye kısa gecikme.
  const savePrefs = () => {
    setSavingPrefs(true);
    setTimeout(() => {
      setSavingPrefs(false);
      setPrefsOpen(false);
      toast.success("Tercihler kaydedildi");
    }, 600);
  };

  const openItem = openId ? baseFeed.find((n) => n.id === openId) ?? null : null;

  const auditFor = (n: FeedItem): AuditEvent[] => [
    { id: "a1", action: `“${n.title}” oluşturuldu`, actor: n.source, at: n.at, icon: META[n.type].icon, tone: n.type === "incident" ? "red" : "primary" },
    { id: "a2", action: `kategori: ${META[n.type].label}, öncelik: ${PRIORITY_BADGE[n.priority].label}`, actor: "system", at: n.at, icon: SlidersHorizontal, tone: "default" },
    ...(isRead(n) ? [{ id: "a3", action: "okundu olarak işaretlendi", actor: "sen", at: "az önce", icon: EnvelopeOpen, tone: "emerald" as const }] : []),
  ];

  const hasAnyArchived = baseFeed.some((n) => archived.has(n.id));

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread} okunmamış · ${criticalUnread} kritik · son 24 saatte ${last24} olay`}
        actions={[
          { label: "Tercihler", icon: Gear, onClick: () => setPrefsOpen(true) },
          { label: "Tümünü Okundu İşaretle", icon: CheckCheck, onClick: onMarkAllRead, variant: "default" },
        ]}
      />
      <PageBody>
        <div className="mx-auto max-w-3xl space-y-4">
          {/* KPI şeridi */}
          {loading ? (
            <KpiSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Okunmamış" value={unread} icon={BellRinging} delta={-18} invert trend={[9, 12, 8, 14, 11, 7, unread]} hint="dün'e göre" />
              <KpiCard label="Kritik" value={criticalUnread} icon={AlertTriangle} delta={criticalUnread > 0 ? 33 : -100} invert trend={[0, 1, 2, 1, 3, 2, criticalUnread]} hint="incident + kritik" />
              <KpiCard label="Mention" value={mentions} icon={AtSign} delta={50} trend={[1, 0, 2, 1, 2, 3, mentions]} hint="seni ilgilendiren" />
              <KpiCard label="Son 24 saat" value={last24} icon={Lightning} delta={9} trend={[14, 18, 12, 20, 16, 19, last24]} hint="toplam olay" />
            </div>
          )}

          {/* Filtre şeridi */}
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Bildirimlerde ara (başlık, içerik, kaynak)…"
            onExport={onExport}
          >
            {FILTERS.map((t) => {
              const M = META[t];
              return (
                <FilterChip
                  key={t}
                  active={active.has(t)}
                  count={countByType(t)}
                  onClick={() =>
                    setActive((p) => { const s = new Set(p); s.has(t) ? s.delete(t) : s.add(t); return s; })
                  }
                >
                  {M.label}
                </FilterChip>
              );
            })}
            <FilterChip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
              Yalnız okunmamış
            </FilterChip>
            {hasAnyArchived && (
              <FilterChip active={showArchived} onClick={() => { setShowArchived((v) => !v); setSelected(new Set()); }}>
                Arşiv
              </FilterChip>
            )}
          </FilterBar>

          {/* Toplu işlem şeridi */}
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={bulkRead}>
              <EnvelopeOpen className="size-3.5" /> Okundu işaretle
            </Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={bulkArchive}>
              <Archive className="size-3.5" /> Arşivle
            </Button>
          </BulkBar>

          {/* Akış */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border p-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            search || active.size > 0 || unreadOnly ? (
              <EmptyState
                variant="search"
                icon={BellSlash}
                title="Eşleşen bildirim yok"
                description="Arama veya filtreleri değiştirmeyi dene. Yalnız okunmamış filtresi açıksa kaldır."
                action={
                  <Button size="sm" variant="outline" onClick={() => { setSearch(""); setActive(new Set()); setUnreadOnly(false); }}>
                    Filtreleri temizle
                  </Button>
                }
              />
            ) : showArchived ? (
              <EmptyState icon={Archive} title="Arşiv boş" description="Arşivlediğin bildirimler burada görünür." />
            ) : (
              <EmptyState
                icon={CheckCheck}
                title="Her şey okundu"
                description="Hiç okunmamış bildirimin yok. Yeni deploy, incident ve mention'lar burada belirecek."
              />
            )
          ) : (
            <div
              ref={containerRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              className="space-y-5 outline-none"
            >
              <p className="px-1 text-[11px] text-muted-foreground/60">
                ↑↓ gez · Enter aç · Esc temizle
              </p>
              {grouped.map(({ bucket, items }) => (
                <section key={bucket} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <h2 className="text-xs font-medium text-muted-foreground">{bucket}</h2>
                    <span className="text-[11px] tabular-nums text-muted-foreground/60">{items.length}</span>
                    <Separator className="ml-1 flex-1" />
                  </div>
                  {items.map((n) => {
                    const M = META[n.type];
                    const read = isRead(n);
                    const sel = selected.has(n.id);
                    const idx = navIndexOf.get(n.id) ?? -1;
                    return (
                      <div
                        key={n.id}
                        data-nav-index={idx}
                        onMouseEnter={() => setNavActive(idx)}
                        className={cn(
                          "group/row flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40",
                          !read && "border-primary/20 bg-primary/[0.03]",
                          sel && "border-primary/50 bg-primary/[0.06]",
                          navActive === idx && "ring-1 ring-inset ring-primary/40 bg-accent/40",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSelect(n.id)}
                          aria-label={`${n.title} seç`}
                          className="mt-1 size-4 shrink-0 cursor-pointer rounded border-border accent-primary"
                        />
                        <button
                          onClick={() => { doMarkRead(n.id); setOpenId(n.id); }}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", M.tone)}>
                            <M.icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={cn("truncate text-sm", !read && "font-medium")}>{n.title}</p>
                              {!read && <span className={cn("size-1.5 shrink-0 rounded-full", M.dot)} />}
                              {(n.priority === "critical" || n.priority === "high") && (
                                <Badge variant="outline" className={cn("h-4 shrink-0 px-1.5 text-[10px]", PRIORITY_BADGE[n.priority].cls)}>
                                  {PRIORITY_BADGE[n.priority].label}
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground/60">{n.source} · {n.actor}</p>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <span className="mr-1 text-[11px] tabular-nums text-muted-foreground">{n.at}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-7 p-0 opacity-0 transition-opacity group-hover/row:opacity-100"
                            onClick={() => toggleRead(n)}
                            aria-label={read ? "Okunmadı yap" : "Okundu yap"}
                            title={read ? "Okunmadı yap" : "Okundu yap"}
                          >
                            {read ? <Envelope className="size-3.5" /> : <EnvelopeOpen className="size-3.5" />}
                          </Button>
                          {showArchived ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="size-7 p-0 opacity-0 transition-opacity group-hover/row:opacity-100"
                              onClick={() => setArchived((p) => { const s = new Set(p); s.delete(n.id); return s; })}
                              aria-label="Arşivden çıkar"
                              title="Arşivden çıkar"
                            >
                              <ArrowCounterClockwise className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="size-7 p-0 opacity-0 transition-opacity group-hover/row:opacity-100"
                              onClick={() => archiveOne(n.id)}
                              aria-label="Arşivle"
                              title="Arşivle"
                            >
                              <Archive className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Detay drawer */}
        <DetailDrawer
          open={!!openItem}
          onOpenChange={(v) => !v && setOpenId(null)}
          title={openItem?.title ?? ""}
          subtitle={openItem ? `${META[openItem.type as NotificationType].label} · ${(openItem as FeedItem).source}` : undefined}
          badge={
            openItem ? (
              <Badge variant="outline" className={cn("h-5", PRIORITY_BADGE[(openItem as FeedItem).priority].cls)}>
                {PRIORITY_BADGE[(openItem as FeedItem).priority].label}
              </Badge>
            ) : undefined
          }
          footer={
            openItem ? (
              <div className="flex w-full items-center gap-2 p-3">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleRead(openItem as FeedItem)}>
                  {isRead(openItem as FeedItem) ? <Envelope className="size-4" /> : <EnvelopeOpen className="size-4" />}
                  {isRead(openItem as FeedItem) ? "Okunmadı yap" : "Okundu yap"}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { archiveOne(openItem.id); setOpenId(null); }}>
                  <Archive className="size-4" /> Arşivle
                </Button>
                <Button size="sm" className="ml-auto gap-1.5 bg-primary" onClick={() => { setOpenId(null); navigate(openItem.link); }}>
                  Kaynağa git <ArrowUpRight className="size-4" />
                </Button>
              </div>
            ) : undefined
          }
          tabs={
            openItem
              ? [
                  {
                    value: "genel",
                    label: "Genel",
                    content: (
                      <div className="divide-y">
                        <Field label="Kategori">{META[openItem.type as NotificationType].label}</Field>
                        <Field label="Öncelik">{PRIORITY_BADGE[(openItem as FeedItem).priority].label}</Field>
                        <Field label="Kaynak">{(openItem as FeedItem).source}</Field>
                        <Field label="Aktör">{(openItem as FeedItem).actor}</Field>
                        <Field label="Durum">{isRead(openItem as FeedItem) ? "Okundu" : "Okunmadı"}</Field>
                        <Field label="Zaman">{openItem.at}</Field>
                        <Field label="Bağlantı" mono>{openItem.link}</Field>
                        <div className="pt-3">
                          <p className="text-xs text-muted-foreground">İçerik</p>
                          <p className="mt-1 text-sm leading-relaxed">{openItem.body}</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    value: "aktivite",
                    label: "Aktivite",
                    content: <AuditTimeline events={auditFor(openItem as FeedItem)} />,
                  },
                  {
                    value: "json",
                    label: "JSON",
                    content: (
                      <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {JSON.stringify(
                          {
                            id: openItem.id,
                            type: openItem.type,
                            priority: (openItem as FeedItem).priority,
                            read: isRead(openItem as FeedItem),
                            source: (openItem as FeedItem).source,
                            actor: (openItem as FeedItem).actor,
                            link: openItem.link,
                            at: openItem.at,
                            title: openItem.title,
                            body: openItem.body,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    ),
                  },
                ]
              : undefined
          }
        />

        {/* Tercih paneli */}
        <DetailDrawer
          open={prefsOpen}
          onOpenChange={setPrefsOpen}
          title="Bildirim tercihleri"
          subtitle="Hangi kategorilerden, hangi kanaldan haberdar olacağını yönet"
          footer={
            <div className="flex w-full items-center justify-between gap-2 p-3">
              <Button variant="ghost" size="sm" onClick={() => { setPrefs(DEFAULT_PREFS); toast("Varsayılanlara döndürüldü"); }}>
                Varsayılana dön
              </Button>
              <Button size="sm" className="bg-primary" disabled={savingPrefs} onClick={savePrefs}>
                {savingPrefs && <CircleNotch className="size-4 animate-spin" />}
                {savingPrefs ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Kategoriler</p>
              <div className="space-y-1">
                {FILTERS.map((t) => {
                  const M = META[t];
                  return (
                    <label key={t} className="flex cursor-pointer items-center justify-between rounded-lg border p-2.5">
                      <span className="flex items-center gap-2.5 text-sm">
                        <span className={cn("flex size-7 items-center justify-center rounded-lg", M.tone)}>
                          <M.icon className="size-3.5" />
                        </span>
                        {M.label}
                      </span>
                      <Switch checked={prefs.channel[t]} onCheckedChange={(v) => setPrefChannel(t, v)} />
                    </label>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Teslimat</p>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border p-2.5">
                <span className="flex flex-col">
                  <span className="text-sm">Günlük e-posta özeti</span>
                  <span className="text-[11px] text-muted-foreground">Her sabah 09:00'da özet</span>
                </span>
                <Switch checked={prefs.emailDigest} onCheckedChange={(v) => setPrefs((p) => ({ ...p, emailDigest: v }))} />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border p-2.5">
                <span className="flex flex-col">
                  <span className="text-sm">Masaüstü push</span>
                  <span className="text-[11px] text-muted-foreground">Kritik incident'ler için anlık</span>
                </span>
                <Switch checked={prefs.desktopPush} onCheckedChange={(v) => setPrefs((p) => ({ ...p, desktopPush: v }))} />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border p-2.5">
                <span className="flex flex-col">
                  <span className="text-sm">Sessiz saatler</span>
                  <span className="text-[11px] text-muted-foreground">22:00–08:00 arası bildirimleri ertele</span>
                </span>
                <Switch checked={prefs.quietHours} onCheckedChange={(v) => setPrefs((p) => ({ ...p, quietHours: v }))} />
              </label>
            </div>
          </div>
        </DetailDrawer>
      </PageBody>
    </>
  );
}
