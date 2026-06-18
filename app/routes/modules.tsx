import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  DownloadSimple,
  Check,
  Stack as Boxes,
  Package as PackageIcon,
  ArrowsClockwise,
  Trash,
  ShieldCheck,
  Star,
  Warning,
  GitBranch,
  Plugs,
  CheckCircle,
  ArrowUp,
  Power,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { DependencyGraph } from "~/components/modules/DependencyGraph";
import { useModuleStore, type ModuleDef } from "~/stores/module-store";
import { MARKETPLACE_MODULES } from "~/data/modules";
import {
  MODULE_META,
  EXTRA_MARKETPLACE,
  metaFor,
  type ModuleMeta,
  type ChangelogEntry,
} from "~/data/seed.modules";
import { moduleIcon } from "~/lib/icon-map";
import { useCopilotStore } from "~/stores/copilot-store";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  KpiCard,
  KpiSkeleton,
  CardSkeleton,
  FilterBar,
  FilterChip,
  BulkBar,
  EmptyState,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { toast } from "sonner";
import { toastUndo } from "~/lib/feedback";

export function meta() {
  return [{ title: "Modules — MetaPanel" }];
}

/* ── Tür ──────────────────────────────────────────────────────────── */
type Status = "installed" | "available";
type Confirm =
  | { kind: "install"; mod: ModuleDef }
  | { kind: "update"; mod: ModuleDef; meta: ModuleMeta }
  | { kind: "remove"; mod: ModuleDef }
  | null;

const CATEGORIES = ["Core", "Commerce", "Content", "Sales", "Insights", "Engagement"];

export default function Modules() {
  const modules = useModuleStore((s) => s.modules);
  const toggle = useModuleStore((s) => s.toggle);
  const install = useModuleStore((s) => s.install);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // Store'da uninstall yok → kaldırılanları page-local izleriz (mock yaşam döngüsü).
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  // Güncellenmiş modüller (update tıklandı → updateAvailable kapanır).
  const [updated, setUpdated] = useState<Set<string>>(new Set());

  const [loading] = useState(false); // skeleton kapısı (ürün hissi)
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false); // confirm aksiyonu yürütülüyor
  const [drawer, setDrawer] = useState<ModuleDef | null>(null);

  // Tüm modül evreni: kurulu (store) + marketplace adayları, kaldırılanlar çıkar.
  const universe = useMemo<ModuleDef[]>(() => {
    const seen = new Set(modules.map((m) => m.id));
    const candidates = [...MARKETPLACE_MODULES, ...EXTRA_MARKETPLACE].filter(
      (m) => !seen.has(m.id),
    );
    return [...modules, ...candidates].filter((m) => !removed.has(m.id));
  }, [modules, removed]);

  const installedAll = universe.filter((m) => m.installed);
  const availableAll = universe.filter((m) => !m.installed);
  const activeAll = installedAll.filter((m) => m.active);
  const updatable = installedAll.filter(
    (m) => MODULE_META[m.id]?.updateAvailable && !updated.has(m.id),
  );

  const toggleCat = (c: string) =>
    setCats((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  // Filtreli liste.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return universe
      .filter((m) => (status === "all" ? true : status === "installed" ? m.installed : !m.installed))
      .filter((m) => (cats.size === 0 ? true : cats.has(m.category)))
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (metaFor(m.id)?.publisher.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => (metaFor(b.id)?.installs ?? 0) - (metaFor(a.id)?.installs ?? 0));
  }, [universe, query, status, cats]);

  const totalInstalls = installedAll.reduce((s, m) => s + (metaFor(m.id)?.installs ?? 0), 0);
  const totalSize = installedAll.reduce((s, m) => s + (metaFor(m.id)?.sizeMb ?? 0), 0);

  // KPI sparkline'ları için kurulu modüllerin trend ortalaması.
  const aggTrend = useMemo(() => {
    const series = installedAll.map((m) => metaFor(m.id)?.trend).filter(Boolean) as number[][];
    if (series.length === 0) return [];
    const len = Math.min(...series.map((s) => s.length));
    return Array.from({ length: len }, (_, i) =>
      Math.round(series.reduce((sum, s) => sum + s[i], 0) / series.length),
    );
  }, [installedAll]);

  /* ── Eylemler ───────────────────────────────────────────────────── */
  function doInstall(m: ModuleDef) {
    install(m);
    setRemoved((p) => {
      const n = new Set(p);
      n.delete(m.id);
      return n;
    });
    toast.success(`${m.name} kuruldu`, { description: `v${m.version} • bağımlılıklar çözüldü` });
  }
  function doUpdate(m: ModuleDef, meta: ModuleMeta) {
    setUpdated((p) => new Set(p).add(m.id));
    toast.success(`${m.name} güncellendi`, { description: `v${m.version} → v${meta.latest}` });
  }
  function doRemove(m: ModuleDef) {
    const dependents = dependentsOf(m.id, universe);
    setRemoved((p) => new Set(p).add(m.id));
    setSelected((p) => {
      const n = new Set(p);
      n.delete(m.id);
      return n;
    });
    if (drawer?.id === m.id) setDrawer(null);
    toastUndo(`${m.name} kaldırıldı`, {
      description: dependents.length
        ? `${dependents.length} bağımlı modül etkilenebilir`
        : "Bağımlılık çakışması yok",
      onUndo: () =>
        setRemoved((p) => {
          const n = new Set(p);
          n.delete(m.id);
          return n;
        }),
    });
  }

  function runConfirm() {
    if (!confirm || busy) return;
    const c = confirm;
    setBusy(true);
    setTimeout(() => {
      if (c.kind === "install") doInstall(c.mod);
      if (c.kind === "update") doUpdate(c.mod, c.meta);
      if (c.kind === "remove") doRemove(c.mod);
      setBusy(false);
      setConfirm(null);
    }, 600);
  }

  function bulkUpdate() {
    const targets = installedAll.filter(
      (m) => selected.has(m.id) && MODULE_META[m.id]?.updateAvailable && !updated.has(m.id),
    );
    if (targets.length === 0) {
      toast.info("Seçili modüllerde güncelleme yok");
      return;
    }
    setUpdated((p) => {
      const n = new Set(p);
      targets.forEach((m) => n.add(m.id));
      return n;
    });
    toast.success(`${targets.length} modül güncellendi`);
    setSelected(new Set());
  }

  function exportJson() {
    const payload = filtered.map((m) => ({
      id: m.id,
      name: m.name,
      version: m.version,
      installed: m.installed,
      active: m.active,
      category: m.category,
      dependencies: m.dependencies,
      ...(() => {
        const meta = metaFor(m.id);
        return meta
          ? { publisher: meta.publisher, latest: meta.latest, installs: meta.installs, license: meta.license }
          : {};
      })(),
    }));
    void payload;
    toast.success(`${filtered.length} modül dışa aktarıldı`, { description: "modules.json (JSON)" });
  }

  const filtersDirty = query !== "" || status !== "all" || cats.size > 0;

  return (
    <>
      <PageHeader
        title="Modules"
        description="Modül marketplace, sürümler ve bağımlılık yönetimi."
        actions={[
          {
            label: "AI Scaffold",
            icon: Sparkles,
            variant: "default",
            onClick: () =>
              queuePrompt(
                "Yeni bir 'Subscriptions' modülü scaffold et: plan, abonelik ve fatura modelleriyle.",
              ),
          },
        ]}
      />
      <PageBody className="space-y-5">
        {/* ── KPI şeridi ───────────────────────────────────────────── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Kurulu modül"
              value={installedAll.length}
              delta={8}
              trend={aggTrend}
              icon={PackageIcon}
              hint="aktif workspace"
            />
            <KpiCard
              label="Aktif"
              value={activeAll.length}
              delta={4}
              trend={aggTrend.map((v) => Math.round(v * 0.7))}
              icon={Power}
              hint={`${installedAll.length - activeAll.length} pasif`}
            />
            <KpiCard
              label="Güncelleme mevcut"
              value={updatable.length}
              delta={updatable.length ? 2 : 0}
              invert
              icon={ArrowsClockwise}
              hint="bekleyen"
            />
            <KpiCard
              label="Toplam boyut"
              value={`${totalSize.toFixed(1)} MB`}
              delta={3}
              trend={installedAll.map((m) => metaFor(m.id)?.sizeMb ?? 0)}
              icon={Boxes}
              hint={`${(totalInstalls / 1000).toFixed(0)}k indirme`}
            />
          </div>
        )}

        {/* ── Güncelleme şeridi ────────────────────────────────────── */}
        {!loading && updatable.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            <ArrowUp className="size-4 text-amber-400" weight="bold" />
            <span className="text-amber-200/90">
              {updatable.length} modül için güncelleme mevcut.
            </span>
            <span className="flex flex-wrap gap-1.5">
              {updatable.map((m) => (
                <Badge key={m.id} variant="outline" className="font-mono text-[10px] text-amber-300">
                  {m.name} v{m.version}→{MODULE_META[m.id]!.latest}
                </Badge>
              ))}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto gap-1.5"
              onClick={() => {
                setUpdated((p) => {
                  const n = new Set(p);
                  updatable.forEach((m) => n.add(m.id));
                  return n;
                });
                toast.success(`${updatable.length} modül güncellendi`);
              }}
            >
              <ArrowsClockwise className="size-3.5" /> Tümünü güncelle
            </Button>
          </div>
        )}

        {/* ── FilterBar ────────────────────────────────────────────── */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Modül, yayıncı veya kategori ara…"
          onExport={exportJson}
        >
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} count={universe.length}>
            Tümü
          </FilterChip>
          <FilterChip
            active={status === "installed"}
            onClick={() => setStatus("installed")}
            count={installedAll.length}
          >
            Kurulu
          </FilterChip>
          <FilterChip
            active={status === "available"}
            onClick={() => setStatus("available")}
            count={availableAll.length}
          >
            Marketplace
          </FilterChip>
          <span className="mx-1 h-4 w-px bg-border" />
          {CATEGORIES.map((c) => (
            <FilterChip key={c} active={cats.has(c)} onClick={() => toggleCat(c)}>
              {c}
            </FilterChip>
          ))}
        </FilterBar>

        {/* ── BulkBar ──────────────────────────────────────────────── */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={bulkUpdate}>
            <ArrowsClockwise className="size-3.5" /> Güncelle
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const ids = [...selected];
              ids.forEach((id) => {
                const m = universe.find((x) => x.id === id);
                if (m) toggle(m.id);
              });
              toast.success(`${ids.length} modül için durum değiştirildi`);
              setSelected(new Set());
            }}
          >
            <Power className="size-3.5" /> Aç/Kapat
          </Button>
        </BulkBar>

        {/* ── Kart grid ────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          filtersDirty ? (
            <EmptyState
              icon={PackageIcon}
              variant="search"
              title="Eşleşen modül yok"
              description="Arama veya filtreleri gevşetmeyi deneyin."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                    setCats(new Set());
                  }}
                >
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={PackageIcon}
              title="Henüz modül yok"
              description="Marketplace'ten bir modül kurarak başlayın."
            />
          )
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => (
              <ModuleCard
                key={m.id}
                mod={m}
                universe={universe}
                updated={updated.has(m.id)}
                selected={selected.has(m.id)}
                onSelect={() =>
                  setSelected((p) => {
                    const n = new Set(p);
                    n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                    return n;
                  })
                }
                onToggle={() => toggle(m.id)}
                onOpen={() => setDrawer(m)}
                onInstall={() => setConfirm({ kind: "install", mod: m })}
                onUpdate={() => {
                  const meta = MODULE_META[m.id];
                  if (meta) setConfirm({ kind: "update", mod: m, meta });
                }}
                onRemove={() => setConfirm({ kind: "remove", mod: m })}
              />
            ))}
          </div>
        )}

        {/* ── Bağımlılık grafiği ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Boxes className="size-4 text-muted-foreground" /> Bağımlılık Grafiği
              <Badge variant="outline" className="ml-1 font-mono text-[10px]">
                {activeAll.length} aktif
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {installedAll.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title="Grafik için kurulu modül gerekiyor"
                description="Modül kurdukça bağımlılık ilişkileri burada görünür."
              />
            ) : (
              <DependencyGraph modules={installedAll} />
            )}
          </CardContent>
        </Card>
      </PageBody>

      {/* ── DetailDrawer ───────────────────────────────────────────── */}
      <ModuleDrawer
        mod={drawer}
        universe={universe}
        updated={drawer ? updated.has(drawer.id) : false}
        onOpenChange={(v) => !v && setDrawer(null)}
        onToggle={(m) => toggle(m.id)}
        onInstall={(m) => setConfirm({ kind: "install", mod: m })}
        onUpdate={(m) => {
          const meta = MODULE_META[m.id];
          if (meta) setConfirm({ kind: "update", mod: m, meta });
        }}
        onRemove={(m) => setConfirm({ kind: "remove", mod: m })}
      />

      {/* ── Onay diyaloğu ──────────────────────────────────────────── */}
      <ConfirmDialog
        confirm={confirm}
        universe={universe}
        busy={busy}
        onCancel={() => !busy && setConfirm(null)}
        onConfirm={runConfirm}
      />
    </>
  );
}

/* ── Bağımlılık yardımcıları ──────────────────────────────────────── */
function dependentsOf(id: string, all: ModuleDef[]): ModuleDef[] {
  return all.filter((m) => m.installed && m.dependencies.includes(id));
}
function missingDeps(m: ModuleDef, all: ModuleDef[]): string[] {
  const installedIds = new Set(all.filter((x) => x.installed).map((x) => x.id));
  return m.dependencies.filter((d) => !installedIds.has(d));
}

/* ── Modül kartı ──────────────────────────────────────────────────── */
function ModuleCard({
  mod,
  universe,
  updated,
  selected,
  onSelect,
  onToggle,
  onOpen,
  onInstall,
  onUpdate,
  onRemove,
}: {
  mod: ModuleDef;
  universe: ModuleDef[];
  updated: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onOpen: () => void;
  onInstall: () => void;
  onUpdate: () => void;
  onRemove: () => void;
}) {
  const Icon = moduleIcon(mod.icon);
  const meta = metaFor(mod.id);
  const missing = missingDeps(mod, universe);
  const hasUpdate = !!MODULE_META[mod.id]?.updateAvailable && !updated;

  return (
    <Card
      className={`group flex flex-col transition-colors hover:border-primary/30 ${selected ? "border-primary/50 bg-primary/5" : ""}`}
    >
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          {mod.installed && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              aria-label={`${mod.name} seç`}
              className="mt-1 size-3.5 shrink-0 cursor-pointer accent-primary"
            />
          )}
          <button
            onClick={onOpen}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground transition-colors group-hover:text-foreground"
            aria-label={`${mod.name} detay`}
          >
            <Icon className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <button onClick={onOpen} className="flex items-center gap-1.5 text-left">
              <span className="truncate text-sm font-medium">{mod.name}</span>
              {meta?.verified && (
                <ShieldCheck className="size-3.5 shrink-0 text-emerald-400" weight="regular" />
              )}
            </button>
            <p className="line-clamp-2 text-xs text-muted-foreground">{mod.description}</p>
          </div>
          {mod.installed && (
            <Switch checked={mod.active} onCheckedChange={onToggle} aria-label="Aktif" />
          )}
        </div>

        {/* meta satırı */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-mono">v{mod.version}</span>
          <Badge variant="secondary" className="text-[10px]">
            {mod.category}
          </Badge>
          {meta && (
            <>
              <span className="flex items-center gap-0.5 tabular-nums">
                <Star className="size-3 text-amber-400" weight="regular" /> {meta.rating}
              </span>
              <span className="tabular-nums">{(meta.installs / 1000).toFixed(1)}k</span>
              <span className="truncate">{meta.publisher}</span>
            </>
          )}
        </div>

        {/* bağımlılık göstergesi */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">deps</span>
          {mod.dependencies.length ? (
            mod.dependencies.map((d) => {
              const ok = universe.some((x) => x.id === d && x.installed);
              return (
                <Badge
                  key={d}
                  variant="outline"
                  className={`font-mono text-[10px] ${ok ? "" : "border-red-500/40 text-red-400"}`}
                >
                  {d}
                </Badge>
              );
            })
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {mod.installed ? (
            <Badge
              variant="outline"
              className={`ml-auto gap-1 text-[10px] ${mod.active ? "text-emerald-400" : "text-muted-foreground"}`}
            >
              {mod.active && <Check className="size-2.5" />}
              {mod.active ? "aktif" : "pasif"}
            </Badge>
          ) : missing.length > 0 ? (
            <Badge variant="outline" className="ml-auto gap-1 text-[10px] text-amber-400">
              <Warning className="size-2.5" /> {missing.length} eksik dep
            </Badge>
          ) : null}
        </div>

        {/* aksiyonlar */}
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          {!mod.installed ? (
            <Button size="sm" variant="outline" className="h-7 flex-1 gap-1.5" onClick={onInstall}>
              <DownloadSimple className="size-3.5" /> Kur
            </Button>
          ) : (
            <>
              {hasUpdate && (
                <Button size="sm" variant="default" className="h-7 flex-1 gap-1.5" onClick={onUpdate}>
                  <ArrowsClockwise className="size-3.5" /> Güncelle
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className={hasUpdate ? "h-7 gap-1.5" : "h-7 flex-1 gap-1.5"}
                onClick={onOpen}
              >
                Detay
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                aria-label="Kaldır"
              >
                <Trash className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Detay Drawer ─────────────────────────────────────────────────── */
function ModuleDrawer({
  mod,
  universe,
  updated,
  onOpenChange,
  onToggle,
  onInstall,
  onUpdate,
  onRemove,
}: {
  mod: ModuleDef | null;
  universe: ModuleDef[];
  updated: boolean;
  onOpenChange: (v: boolean) => void;
  onToggle: (m: ModuleDef) => void;
  onInstall: (m: ModuleDef) => void;
  onUpdate: (m: ModuleDef) => void;
  onRemove: (m: ModuleDef) => void;
}) {
  if (!mod) return null;
  const meta = metaFor(mod.id);
  const dependents = dependentsOf(mod.id, universe);
  const missing = missingDeps(mod, universe);
  const hasUpdate = !!MODULE_META[mod.id]?.updateAvailable && !updated;

  const tabs: DrawerTab[] = [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-1 divide-y divide-border/60">
          <Field label="Modül ID" mono>{mod.id}</Field>
          <Field label="Sürüm" mono>v{mod.version}</Field>
          {meta && <Field label="En son" mono>v{meta.latest}</Field>}
          <Field label="Kategori">{mod.category}</Field>
          {meta && <Field label="Yayıncı">{meta.publisher}</Field>}
          {meta && <Field label="Lisans" mono>{meta.license}</Field>}
          {meta && (
            <Field label="Puan">
              <span className="inline-flex items-center gap-1">
                <Star className="size-3 text-amber-400" weight="regular" /> {meta.rating} · {meta.reviews} yorum
              </span>
            </Field>
          )}
          {meta && <Field label="İndirme">{meta.installs.toLocaleString("tr-TR")}</Field>}
          {meta && <Field label="Boyut">{meta.sizeMb.toFixed(1)} MB</Field>}
          {meta && (
            <Field label="Repo" mono>
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3" /> {meta.repo}
              </span>
            </Field>
          )}
          <Field label="Durum">
            {mod.installed ? (mod.active ? "Aktif" : "Pasif (kurulu)") : "Kurulu değil"}
          </Field>
          <Field label="Modeller" mono>{mod.models.length ? mod.models.join(", ") : "—"}</Field>
          <div className="pt-3 text-xs leading-relaxed text-muted-foreground">{mod.description}</div>
        </div>
      ),
    },
    {
      value: "deps",
      label: "Bağımlılık",
      content: (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gereken ({mod.dependencies.length})
            </p>
            {mod.dependencies.length === 0 ? (
              <p className="text-xs text-muted-foreground">Bağımlılık yok — bağımsız modül.</p>
            ) : (
              <ul className="space-y-1.5">
                {mod.dependencies.map((d) => {
                  const dep = universe.find((x) => x.id === d);
                  const ok = !!dep?.installed;
                  return (
                    <li
                      key={d}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Plugs className="size-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{dep?.name ?? d}</span>
                      </span>
                      {ok ? (
                        <Badge variant="outline" className="gap-1 text-[10px] text-emerald-400">
                          <CheckCircle className="size-2.5" weight="regular" /> kurulu
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px] text-red-400">
                          <Warning className="size-2.5" /> eksik
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {missing.length > 0 && (
              <p className="mt-2 text-[11px] text-amber-400">
                Kurulum için {missing.length} bağımlılık önce çözülecek.
              </p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Bu modüle bağımlı ({dependents.length})
            </p>
            {dependents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Hiçbir modül buna bağımlı değil.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dependents.map((d) => (
                  <Badge key={d.id} variant="secondary" className="font-mono text-[10px]">
                    {d.name}
                  </Badge>
                ))}
              </div>
            )}
            {dependents.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Kaldırılırsa bu modüller etkilenebilir.
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "changelog",
      label: "Changelog",
      content: meta ? <Changelog entries={meta.changelog} /> : <p className="text-xs text-muted-foreground">Kayıt yok.</p>,
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={activityFor(mod, meta)} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify({ ...mod, meta }, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open={!!mod}
      onOpenChange={onOpenChange}
      title={mod.name}
      subtitle={meta ? `${meta.publisher} · v${mod.version}` : `v${mod.version}`}
      badge={
        mod.installed ? (
          <Badge variant="outline" className={`text-[10px] ${mod.active ? "text-emerald-400" : "text-muted-foreground"}`}>
            {mod.active ? "aktif" : "pasif"}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">marketplace</Badge>
        )
      }
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          {!mod.installed ? (
            <Button className="flex-1 gap-1.5" onClick={() => onInstall(mod)}>
              <DownloadSimple className="size-4" /> Kur
            </Button>
          ) : (
            <>
              {hasUpdate && (
                <Button className="flex-1 gap-1.5" onClick={() => onUpdate(mod)}>
                  <ArrowsClockwise className="size-4" /> v{MODULE_META[mod.id]!.latest}'e güncelle
                </Button>
              )}
              <Button variant="outline" className="gap-1.5" onClick={() => onToggle(mod)}>
                <Power className="size-4" /> {mod.active ? "Pasifleştir" : "Aktifleştir"}
              </Button>
              <Button
                variant="ghost"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(mod)}
              >
                <Trash className="size-4" /> Kaldır
              </Button>
            </>
          )}
        </div>
      }
    />
  );
}

/* ── Changelog ────────────────────────────────────────────────────── */
function Changelog({ entries }: { entries: ChangelogEntry[] }) {
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">Kayıt yok.</p>;
  return (
    <div className="space-y-4">
      {entries.map((e) => (
        <div key={e.version} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">v{e.version}</Badge>
            <span className="text-[11px] text-muted-foreground">{e.date}</span>
            {e.breaking && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <Warning className="size-2.5" /> breaking
              </Badge>
            )}
          </div>
          <ul className="ml-1 space-y-1">
            {e.notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ── Aktivite üretimi ─────────────────────────────────────────────── */
function activityFor(mod: ModuleDef, meta?: ModuleMeta): AuditEvent[] {
  const events: AuditEvent[] = [];
  if (mod.installed) {
    events.push({
      id: `${mod.id}-status`,
      action: mod.active ? "modülü aktifleştirdi" : "modülü pasifleştirdi",
      actor: "turksab.yonetim",
      at: "az önce",
      icon: Power,
      tone: mod.active ? "emerald" : "default",
    });
  }
  if (meta) {
    meta.changelog.forEach((c, i) => {
      events.push({
        id: `${mod.id}-cl-${c.version}`,
        action: i === 0 ? `v${c.version} yayınlandı` : `v${c.version} sürümü`,
        actor: meta.publisher,
        at: c.date,
        icon: c.breaking ? Warning : ArrowUp,
        tone: c.breaking ? "amber" : "primary",
        detail: c.notes[0],
      });
    });
    events.push({
      id: `${mod.id}-published`,
      action: "marketplace'e eklendi",
      actor: meta.publisher,
      at: "ilk yayın",
      icon: PackageIcon,
      tone: "default",
    });
  }
  return events;
}

/* ── Onay diyaloğu ────────────────────────────────────────────────── */
function ConfirmDialog({
  confirm,
  universe,
  busy,
  onCancel,
  onConfirm,
}: {
  confirm: Confirm;
  universe: ModuleDef[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = confirm !== null;
  if (!confirm) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
        <DialogContent />
      </Dialog>
    );
  }

  const { kind, mod } = confirm;
  const missing = missingDeps(mod, universe);
  const dependents = dependentsOf(mod.id, universe);

  const title =
    kind === "install" ? `${mod.name} kurulsun mu?` : kind === "update" ? `${mod.name} güncellensin mi?` : `${mod.name} kaldırılsın mı?`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "install" && <DownloadSimple className="size-4 text-primary" />}
            {kind === "update" && <ArrowsClockwise className="size-4 text-primary" />}
            {kind === "remove" && <Trash className="size-4 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {kind === "install" &&
              (missing.length
                ? `Önce ${missing.length} bağımlılık (${missing.join(", ")}) çözülecek, ardından kurulacak.`
                : "Tüm bağımlılıklar mevcut. Kurulum güvenli.")}
            {kind === "update" &&
              `v${mod.version} sürümünden v${confirm.kind === "update" ? confirm.meta.latest : ""} sürümüne yükseltilecek.`}
            {kind === "remove" &&
              (dependents.length
                ? `Dikkat: ${dependents.length} modül (${dependents.map((d) => d.name).join(", ")}) buna bağımlı.`
                : "Bu modüle bağımlı başka modül yok. Kaldırma güvenli.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Vazgeç
          </Button>
          <Button
            variant={kind === "remove" ? "destructive" : "default"}
            loading={busy}
            onClick={onConfirm}
          >
            {kind === "install" ? "Kur" : kind === "update" ? "Güncelle" : "Kaldır"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
