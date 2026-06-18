import { useMemo, useState } from "react";
import {
  UploadSimple as Upload,
  Image as ImageIcon,
  FileText,
  FilmStrip as Film,
  MusicNotes as Music,
  Database,
  GridFour,
  Rows,
  Trash,
  FolderSimple,
  ArrowsOutSimple,
  Star,
  DownloadSimple,
  Copy,
  Link as LinkIcon,
  PencilSimple,
  Eye,
  ClockCounterClockwise,
  WarningCircle,
  CheckCircle,
  Plus,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { type MediaItem } from "~/data/expansion";
import {
  MEDIA_RECORDS,
  MEDIA_FOLDERS,
  fmtBytes,
  type MediaRecord,
} from "~/data/seed.media";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Media — MetaPanel" }];
}

const TYPE_ICON = { image: ImageIcon, video: Film, doc: FileText, audio: Music } as const;
const TYPE_LABEL = { image: "Görsel", video: "Video", doc: "Doküman", audio: "Ses" } as const;

const FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "image", label: "Görsel" },
  { key: "video", label: "Video" },
  { key: "doc", label: "Doküman" },
  { key: "audio", label: "Ses" },
] as const;

type SortKey = "recent" | "name" | "size" | "usage";

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return "bugün";
  if (d === 1) return "dün";
  if (d < 7) return `${d} gün önce`;
  if (d < 30) return `${Math.floor(d / 7)} hafta önce`;
  return `${Math.floor(d / 30)} ay önce`;
}

function auditFor(item: MediaRecord): AuditEvent[] {
  return [
    {
      id: "a1",
      action: "dosyayı yükledi",
      actor: item.uploadedBy,
      at: relative(item.uploadedAt),
      icon: Upload,
      tone: "primary",
      detail: item.path,
    },
    {
      id: "a2",
      action: "otomatik optimize edildi (WebP/transcode)",
      actor: "system",
      at: relative(item.uploadedAt),
      icon: CheckCircle,
      tone: "emerald",
    },
    ...(item.usage > 0
      ? [
          {
            id: "a3",
            action: `${item.usage} içeriğe bağlandı`,
            actor: "system",
            at: relative(item.uploadedAt),
            icon: LinkIcon,
            tone: "default" as const,
          },
        ]
      : []),
    ...(item.starred
      ? [
          {
            id: "a4",
            action: "favorilere eklendi",
            actor: item.uploadedBy,
            at: relative(item.uploadedAt),
            icon: Star,
            tone: "amber" as const,
          },
        ]
      : []),
  ];
}

export default function Media() {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [items, setItems] = useState<MediaRecord[]>(MEDIA_RECORDS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<MediaRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTo, setMoveTo] = useState<string>(MEDIA_FOLDERS[0]);

  // ── türetilmiş veriler ──────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: items.length, image: 0, video: 0, doc: 0, audio: 0 } as Record<string, number>;
    for (const m of items) c[m.type]++;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const list = items.filter(
      (m) =>
        (filter === "all" || m.type === filter) &&
        (folder === "all" || m.folder === folder) &&
        (m.name.toLowerCase().includes(q.toLowerCase()) ||
          m.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))),
    );
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "tr");
        case "size":
          return b.bytes - a.bytes;
        case "usage":
          return b.usage - a.usage;
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });
    return sorted;
  }, [items, filter, folder, q, sort]);

  // ── KPI'lar ─────────────────────────────────────────────────────
  const totalBytes = useMemo(() => items.reduce((s, m) => s + m.bytes, 0), [items]);
  const unused = useMemo(() => items.filter((m) => m.usage === 0).length, [items]);
  const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024; // 5 GB
  const usedPct = Math.round((totalBytes / STORAGE_QUOTA) * 100);

  // ── seçim ───────────────────────────────────────────────────────
  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach((m) => next.delete(m.id));
        return next;
      }
      return new Set([...prev, ...filtered.map((m) => m.id)]);
    });
  }
  const clearSel = () => setSelected(new Set());

  // ── eylemler ────────────────────────────────────────────────────
  function reload() {
    setLoading(true);
    setTimeout(() => {
      setItems(MEDIA_RECORDS);
      setLoading(false);
      toast.success("Kütüphane yenilendi");
    }, 650);
  }

  function doDelete(ids: string[]) {
    const removed = items.filter((m) => ids.includes(m.id));
    setItems((prev) => prev.filter((m) => !ids.includes(m.id)));
    clearSel();
    setActive(null);
    setConfirmDelete(false);
    toast.success(`${ids.length} dosya silindi`, {
      description: removed.map((m) => m.name).slice(0, 3).join(", ") + (ids.length > 3 ? "…" : ""),
      action: {
        label: "Geri al",
        onClick: () => {
          setItems((prev) => [...removed, ...prev]);
          toast.success("Silme geri alındı");
        },
      },
    });
  }

  function doMove(ids: string[], to: string) {
    setItems((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, folder: to } : m)));
    clearSel();
    setMoveOpen(false);
    toast.success(`${ids.length} dosya "${to}" klasörüne taşındı`);
  }

  function toggleStar(item: MediaRecord) {
    setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, starred: !m.starred } : m)));
    setActive((a) => (a && a.id === item.id ? { ...a, starred: !a.starred } : a));
    toast.success(item.starred ? "Favorilerden çıkarıldı" : "Favorilere eklendi");
  }

  function exportData() {
    toast.success("Medya envanteri dışa aktarıldı", {
      description: `${filtered.length} kayıt · JSON`,
    });
  }

  const selCount = selected.size;
  const noData = items.length === 0;
  const noResults = !noData && filtered.length === 0;

  return (
    <>
      <PageHeader
        title="Media"
        description="Medya kütüphanesi — görsel, video, doküman ve ses dosyalarını yönetin."
        actions={[
          { label: "Yenile", icon: ClockCounterClockwise, variant: "ghost", onClick: reload },
          {
            label: "Yükle",
            icon: Upload,
            variant: "default",
            onClick: () => toast.success("Dosya yükleme başlatıldı (mock)"),
          },
        ]}
      />
      <PageBody className="space-y-4">
        {/* ── KPI şeridi ── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Toplam dosya"
              value={items.length}
              delta={12}
              trend={[8, 10, 9, 12, 14, 13, 16, items.length]}
              icon={Database}
              hint="bu ay"
            />
            <KpiCard
              label="Depolama"
              value={fmtBytes(totalBytes)}
              delta={6}
              trend={[40, 55, 62, 70, 88, 95, 110, totalBytes / (1024 * 1024)]}
              icon={FolderSimple}
              hint={`${usedPct}% / 5 GB`}
            />
            <KpiCard
              label="Görsel oranı"
              value={`${Math.round((counts.image / Math.max(items.length, 1)) * 100)}%`}
              delta={-3}
              trend={[60, 58, 55, 57, 54, 52, 50, counts.image]}
              icon={ImageIcon}
              hint="kütüphane"
            />
            <KpiCard
              label="Kullanılmayan"
              value={unused}
              delta={unused}
              deltaSuffix=""
              invert
              trend={[1, 2, 2, 3, 3, 4, 3, unused]}
              icon={WarningCircle}
              hint="referanssız"
            />
          </div>
        )}

        {/* ── Filtre şeridi ── */}
        <FilterBar
          search={q}
          onSearch={setQ}
          placeholder="Dosya adı veya etiket ara…"
          onExport={exportData}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              active={filter === f.key}
              onClick={() => setFilter(f.key)}
              count={counts[f.key]}
            >
              {f.label}
            </FilterChip>
          ))}
        </FilterBar>

        {/* ── İkincil kontroller: klasör + sıralama + görünüm ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={folder} onValueChange={(v) => typeof v === "string" && setFolder(v)}>
            <SelectTrigger size="sm" className="w-44">
              <FolderSimple className="size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Klasör" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm klasörler</SelectItem>
              {MEDIA_FOLDERS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">En yeni</SelectItem>
              <SelectItem value="name">İsim (A→Z)</SelectItem>
              <SelectItem value="size">Boyut (büyük)</SelectItem>
              <SelectItem value="usage">Kullanım (çok)</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs tabular-nums text-muted-foreground">
              {filtered.length} / {items.length}
            </span>
            <div className="flex items-center rounded-lg border p-0.5">
              <button
                onClick={() => setView("grid")}
                aria-label="Izgara görünüm"
                aria-pressed={view === "grid"}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <GridFour className="size-4" />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="Liste görünüm"
                aria-pressed={view === "list"}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Rows className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Toplu işlem şeridi ── */}
        <BulkBar count={selCount} onClear={clearSel}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setMoveTo(MEDIA_FOLDERS[0]);
              setMoveOpen(true);
            }}
          >
            <FolderSimple className="size-3.5" /> Taşı
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success(`${selCount} bağlantı kopyalandı`)}>
            <Copy className="size-3.5" /> Kopyala
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash className="size-3.5" /> Sil
          </Button>
        </BulkBar>

        {/* ── İçerik ── */}
        {loading ? (
          view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          )
        ) : noData ? (
          <EmptyState
            icon={ImageIcon}
            title="Kütüphane boş"
            description="Henüz hiç medya yüklenmedi. İlk dosyanı yükleyerek başla."
            action={
              <Button size="sm" className="gap-1.5" onClick={() => toast.success("Yükleme (mock)")}>
                <Plus className="size-4" /> Dosya yükle
              </Button>
            }
          />
        ) : noResults ? (
          <EmptyState
            variant="search"
            icon={ImageIcon}
            title="Sonuç bulunamadı"
            description="Arama veya filtre kriterlerini değiştirmeyi dene."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ("");
                  setFilter("all");
                  setFolder("all");
                }}
              >
                Filtreleri temizle
              </Button>
            }
          />
        ) : view === "grid" ? (
          <>
            {/* Upload dropzone */}
            <button
              onClick={() => toast.info("Sürükle-bırak yükleme (mock)")}
              className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed bg-card/50 py-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Upload className="size-5" />
              <span className="text-sm">Dosyaları buraya sürükle veya tıkla</span>
            </button>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {filtered.map((m) => (
                <MediaCard
                  key={m.id}
                  item={m}
                  selected={selected.has(m.id)}
                  onToggle={() => toggle(m.id)}
                  onOpen={() => setActive(m)}
                  onStar={() => toggleStar(m)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleAllVisible}
                aria-label="Tümünü seç"
              />
              <span className="flex-1">Dosya</span>
              <span className="hidden w-24 sm:block">Klasör</span>
              <span className="hidden w-20 text-right md:block">Boyut</span>
              <span className="hidden w-16 text-right lg:block">Kullanım</span>
              <span className="hidden w-28 lg:block">Yüklenme</span>
              <span className="w-8" />
            </div>
            {filtered.map((m) => {
              const Icon = TYPE_ICON[m.type];
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 border-b px-3 py-2 text-sm transition-colors last:border-0 hover:bg-accent/30",
                    selected.has(m.id) && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    checked={selected.has(m.id)}
                    onCheckedChange={() => toggle(m.id)}
                    aria-label={`${m.name} seç`}
                  />
                  <button
                    onClick={() => setActive(m)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-md"
                      style={{ background: `linear-gradient(135deg, oklch(0.4 0.12 ${m.hue}), oklch(0.25 0.06 ${m.hue}))` }}
                    >
                      <Icon className="size-4 text-white/80" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{m.name}</span>
                        {m.starred && <Star className="size-3 shrink-0 text-amber-400" weight="fill" />}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {TYPE_LABEL[m.type]}
                        {m.dims ? ` · ${m.dims}` : ""}
                        {m.duration ? ` · ${m.duration}` : ""}
                      </span>
                    </span>
                  </button>
                  <span className="hidden w-24 truncate text-xs text-muted-foreground sm:block">{m.folder}</span>
                  <span className="hidden w-20 text-right text-xs tabular-nums text-muted-foreground md:block">{m.size}</span>
                  <span className="hidden w-16 text-right lg:block">
                    {m.usage === 0 ? (
                      <Badge variant="destructive" className="text-[9px]">atıl</Badge>
                    ) : (
                      <span className="text-xs tabular-nums text-muted-foreground">{m.usage}×</span>
                    )}
                  </span>
                  <span className="hidden w-28 text-xs text-muted-foreground lg:block">{relative(m.uploadedAt)}</span>
                  <button
                    onClick={() => setActive(m)}
                    aria-label="Detay"
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ArrowsOutSimple className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>

      {/* ── Detay Drawer ── */}
      <MediaDrawer
        item={active}
        onClose={() => setActive(null)}
        onStar={toggleStar}
        onDelete={(m) => doDelete([m.id])}
      />

      {/* ── Sil onayı ── */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dosyaları sil</DialogTitle>
            <DialogDescription>
              {selCount} dosya kalıcı olarak silinecek. Referanslı dosyalar bağlı içeriklerden de
              kaldırılır. Bu işlem geri alınabilir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              İptal
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => doDelete([...selected])}>
              <Trash className="size-3.5" /> {selCount} dosyayı sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Taşı diyaloğu ── */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klasöre taşı</DialogTitle>
            <DialogDescription>
              Seçili {selCount} dosya hedef klasöre taşınacak.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={moveTo} onValueChange={(v) => typeof v === "string" && setMoveTo(v)}>
              <SelectTrigger className="w-full">
                <FolderSimple className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIA_FOLDERS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(false)}>
              İptal
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => doMove([...selected], moveTo)}>
              <FolderSimple className="size-3.5" /> Taşı
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Grid kartı ────────────────────────────────────────────────── */
function MediaCard({
  item,
  selected,
  onToggle,
  onOpen,
  onStar,
}: {
  item: MediaRecord;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onStar: () => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary/40",
        selected && "border-primary/60 ring-1 ring-primary/30",
      )}
    >
      {/* seçim + favori üst katman */}
      <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 data-[on=true]:opacity-100" data-on={selected}>
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`${item.name} seç`} />
      </div>
      <button
        onClick={onStar}
        aria-label="Favori"
        className={cn(
          "absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-md bg-background/60 backdrop-blur transition-opacity",
          item.starred ? "opacity-100 text-amber-400" : "opacity-0 text-muted-foreground group-hover:opacity-100 hover:text-foreground",
        )}
      >
        <Star className="size-3.5" weight={item.starred ? "fill" : "regular"} />
      </button>

      <button onClick={onOpen} className="block w-full" aria-label={`${item.name} detay`}>
        <div
          className="relative flex aspect-square items-center justify-center"
          style={{ background: `linear-gradient(135deg, oklch(0.4 0.12 ${item.hue}), oklch(0.25 0.06 ${item.hue}))` }}
        >
          <Icon className="size-8 text-white/70" />
          {item.duration && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/50 px-1 text-[10px] tabular-nums text-white">
              {item.duration}
            </span>
          )}
          {item.usage === 0 && (
            <span className="absolute bottom-1.5 left-1.5 rounded bg-red-500/80 px-1 text-[9px] font-medium text-white">
              atıl
            </span>
          )}
        </div>
        <div className="space-y-1 p-2">
          <p className="truncate text-xs font-medium">{item.name}</p>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[9px]">{TYPE_LABEL[item.type]}</Badge>
            <span className="text-[10px] tabular-nums text-muted-foreground">{item.size}</span>
          </div>
        </div>
      </button>
    </div>
  );
}

/* ── Detay paneli ──────────────────────────────────────────────── */
function MediaDrawer({
  item,
  onClose,
  onStar,
  onDelete,
}: {
  item: MediaRecord | null;
  onClose: () => void;
  onStar: (m: MediaRecord) => void;
  onDelete: (m: MediaRecord) => void;
}) {
  if (!item) return null;
  const Icon = TYPE_ICON[item.type];

  const preview = (
    <div className="space-y-4">
      <div
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border"
        style={{ background: `linear-gradient(135deg, oklch(0.4 0.12 ${item.hue}), oklch(0.25 0.06 ${item.hue}))` }}
      >
        <Icon className="size-12 text-white/70" />
        {item.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs tabular-nums text-white">
            {item.duration}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Önizleme açıldı")}>
          <Eye className="size-3.5" /> Önizle
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("İndiriliyor…")}>
          <DownloadSimple className="size-3.5" /> İndir
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Bağlantı kopyalandı", { description: item.path })}>
          <LinkIcon className="size-3.5" /> Bağlantı
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Yeniden adlandır (mock)")}>
          <PencilSimple className="size-3.5" /> Düzenle
        </Button>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <Field label="Tür">{TYPE_LABEL[item.type]}</Field>
        <Field label="Boyut">{item.size}</Field>
        {item.dims && <Field label="Boyutlar">{item.dims}</Field>}
        {item.duration && <Field label="Süre">{item.duration}</Field>}
        <Field label="Klasör">{item.folder}</Field>
        <Field label="Yükleyen">{item.uploadedBy}</Field>
        <Field label="Yüklenme">{relative(item.uploadedAt)}</Field>
        {item.alt && <Field label="Alt metin">{item.alt}</Field>}
      </div>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
          ))}
        </div>
      )}
    </div>
  );

  const usage = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm">
        <LinkIcon className="size-4 text-muted-foreground" />
        <span className="flex-1">
          Bu dosya{" "}
          <span className="font-medium tabular-nums">{item.usage}</span> içerikte referanslanıyor.
        </span>
      </div>
      {item.usage === 0 ? (
        <EmptyState
          variant="default"
          icon={WarningCircle}
          title="Hiçbir yerde kullanılmıyor"
          description="Bu dosya atıl. Depolama tasarrufu için silmeyi değerlendirebilirsin."
        />
      ) : (
        <ul className="space-y-1.5">
          {Array.from({ length: Math.min(item.usage, 5) }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <FileText className="size-3.5 text-muted-foreground" />
                {["Anasayfa", "Kampanya sayfası", "Ürün-A", "E-bülten #42", "Blog yazısı"][i]}
              </span>
              <Badge variant="secondary" className="text-[9px]">canlı</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const raw = {
    id: item.id,
    name: item.name,
    type: item.type,
    folder: item.folder,
    bytes: item.bytes,
    size: item.size,
    dims: item.dims,
    duration: item.duration,
    path: item.path,
    usage: item.usage,
    tags: item.tags,
    alt: item.alt,
    starred: !!item.starred,
    uploadedBy: item.uploadedBy,
    uploadedAt: item.uploadedAt,
  };

  const tabs: DrawerTab[] = [
    { value: "preview", label: "Önizleme", content: preview },
    { value: "usage", label: "Kullanım", content: usage },
    { value: "activity", label: "Aktivite", content: <AuditTimeline events={auditFor(item)} /> },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(raw, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open={!!item}
      onOpenChange={(v) => !v && onClose()}
      title={item.name}
      subtitle={`${TYPE_LABEL[item.type]} · ${item.size} · ${item.folder}`}
      badge={
        item.usage === 0 ? (
          <Badge variant="destructive" className="text-[10px]">atıl</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">{item.usage}× kullanım</Badge>
        )
      }
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onStar(item)}>
            <Star className="size-3.5" weight={item.starred ? "fill" : "regular"} />
            {item.starred ? "Favoriden çıkar" : "Favori"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => onDelete(item)}
          >
            <Trash className="size-3.5" /> Sil
          </Button>
        </div>
      }
    />
  );
}

// Geriye dönük tip uyumu (eski MediaItem tüketicileri kırılmasın).
export type { MediaItem };
