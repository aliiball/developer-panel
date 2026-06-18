import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Plus,
  Sparkle as Sparkles,
  Database,
  Link as Link2,
  Clock,
  Table,
  Stack,
  ShieldCheck,
  WarningCircle,
  ArrowSquareOut,
  TrashSimple,
  Copy,
  PencilSimple,
  Key,
  ListBullets,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useSchemaStore, type SchemaModel } from "~/stores/schema-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import { toast } from "sonner";
import {
  EmptyState,
  KpiCard,
  KpiSkeleton,
  CardSkeleton,
  FilterBar,
  FilterChip,
  BulkBar,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
} from "~/components/enterprise";
import {
  MODEL_META,
  DEFAULT_META,
  auditFor,
  type ModelHealth,
} from "~/data/seed.schema";

export function meta() {
  return [{ title: "Schema — MetaPanel" }];
}

/* ── türetilmiş yardımcılar ─────────────────────────────────────────── */

function metaFor(id: string) {
  return MODEL_META[id] ?? DEFAULT_META;
}

const HEALTH_LABEL: Record<ModelHealth, string> = {
  stable: "Stabil",
  draft: "Taslak",
  deprecated: "Kullanımdan kalkıyor",
};

function healthBadge(h: ModelHealth) {
  if (h === "stable")
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] text-emerald-400">
        <ShieldCheck className="size-2.5" /> Stabil
      </Badge>
    );
  if (h === "draft")
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] text-amber-400">
        <PencilSimple className="size-2.5" /> Taslak
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1 text-[10px] text-red-400">
      <WarningCircle className="size-2.5" /> Deprecated
    </Badge>
  );
}

function relationCount(m: SchemaModel) {
  return m.fields.filter((f) => f.type === "relation").length;
}

function fmt(n: number) {
  return n.toLocaleString("tr-TR");
}

/* prisma benzeri şema önizleme (JSON sekmesi için) */
function toPrisma(m: SchemaModel): string {
  const map: Record<string, string> = {
    string: "String",
    text: "String",
    email: "String",
    url: "String",
    number: "Int",
    boolean: "Boolean",
    date: "DateTime",
    json: "Json",
    enum: "String",
    relation: "Relation",
    computed: "String",
  };
  const lines = m.fields.map((f) => {
    const t = f.type === "relation" ? f.relationModel ?? "Relation" : map[f.type] ?? "String";
    const mods: string[] = [];
    if (!f.required) mods.push("?");
    const attrs: string[] = [];
    if (f.unique) attrs.push("@unique");
    if (f.indexed) attrs.push("@index");
    if (f.defaultValue) attrs.push(`@default(${f.defaultValue})`);
    return `  ${f.name.padEnd(16)} ${t}${mods.join("")} ${attrs.join(" ")}`.trimEnd();
  });
  if (m.timestamps) {
    lines.push("  createdAt        DateTime @default(now())");
    lines.push("  updatedAt        DateTime @updatedAt");
  }
  if (m.softDelete) lines.push("  deletedAt        DateTime?");
  return `model ${m.name} {\n${lines.join("\n")}\n\n  @@map("${m.tableName}")\n}`;
}

/* ── sayfa ──────────────────────────────────────────────────────────── */

type HealthFilter = "all" | ModelHealth;

export default function Schema() {
  const navigate = useNavigate();
  const models = useSchemaStore((s) => s.models);
  const addModel = useSchemaStore((s) => s.addModel);
  const updateModel = useSchemaStore((s) => s.updateModel);
  const deleteModel = useSchemaStore((s) => s.deleteModel);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [params, setParams] = useSearchParams();

  // create dialog state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [timestamps, setTimestamps] = useState(true);
  const [softDelete, setSoftDelete] = useState(false);

  // surface state
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState<HealthFilter>("all");
  const [onlyWithRelations, setOnlyWithRelations] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);

  // ?new=1 from Spotlight / Dashboard opens the create dialog.
  useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  // ilk yükleniş skeleton'u
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 360);
    return () => clearTimeout(t);
  }, []);

  /* ── KPI ── */
  const totalFields = models.reduce((a, m) => a + m.fields.length, 0);
  const totalRelations = models.reduce((a, m) => a + relationCount(m), 0);
  const indexedFields = models.reduce(
    (a, m) => a + m.fields.filter((f) => f.indexed).length,
    0,
  );
  const draftCount = models.filter((m) => metaFor(m.id).health === "draft").length;

  /* ── filtre ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q) && !m.tableName.toLowerCase().includes(q))
        return false;
      if (health !== "all" && metaFor(m.id).health !== health) return false;
      if (onlyWithRelations && relationCount(m) === 0) return false;
      return true;
    });
  }, [models, query, health, onlyWithRelations]);

  const healthCounts = useMemo(() => {
    const c = { stable: 0, draft: 0, deprecated: 0 } as Record<ModelHealth, number>;
    for (const m of models) c[metaFor(m.id).health]++;
    return c;
  }, [models]);

  const detail = detailId ? models.find((m) => m.id === detailId) ?? null : null;

  /* ── eylemler ── */
  function resetCreate() {
    setName("");
    setDesc("");
    setTimestamps(true);
    setSoftDelete(false);
  }

  function create() {
    if (!name.trim()) return;
    const id = addModel({
      name: name.trim(),
      description: desc.trim() || undefined,
      timestamps,
      softDelete,
    });
    toast.success("Model oluşturuldu", { description: name.trim() });
    resetCreate();
    setOpen(false);
    navigate(`/schema/${id}`);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exportSchema() {
    const payload = filtered.map((m) => ({
      name: m.name,
      tableName: m.tableName,
      fields: m.fields.length,
      relations: relationCount(m),
      timestamps: m.timestamps,
      softDelete: m.softDelete,
    }));
    void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    toast.success("Şema export edildi", {
      description: `${payload.length} model JSON olarak panoya kopyalandı.`,
    });
  }

  function duplicate(m: SchemaModel) {
    const newName = `${m.name}Copy`;
    const id = addModel({
      name: newName,
      description: m.description,
      timestamps: m.timestamps,
      softDelete: m.softDelete,
      fields: m.fields.map((f) => ({ ...f, id: `${f.id}_c` })),
    });
    toast.success("Model kopyalandı", { description: newName });
    navigate(`/schema/${id}`);
  }

  function bulkDeprecate() {
    toast.info(`${selected.size} model "deprecated" olarak işaretlendi`, {
      description: "Migration üretildiğinde uygulanır.",
    });
    setSelected(new Set());
  }

  function bulkDelete() {
    const ids = [...selected];
    const removed = ids
      .map((id) => models.find((m) => m.id === id))
      .filter(Boolean) as SchemaModel[];
    ids.forEach((id) => deleteModel(id));
    setSelected(new Set());
    toast.success(`${ids.length} model silindi`, {
      description: "Geri almak için tıklayın.",
      action: {
        label: "Geri al",
        onClick: () =>
          removed.forEach((m) =>
            addModel({
              id: m.id,
              name: m.name,
              tableName: m.tableName,
              description: m.description,
              timestamps: m.timestamps,
              softDelete: m.softDelete,
              fields: m.fields,
            }),
          ),
      },
    });
  }

  const filtersActive = query.trim() !== "" || health !== "all" || onlyWithRelations;
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  /* ── detay sekmeleri ── */
  const drawerTabs: DrawerTab[] = detail ? buildTabs(detail) : [];

  return (
    <>
      <PageHeader
        title="Schema"
        description="Veri modelleri, alan tanımları ve ilişkiler. Bir modele tıklayıp alan editörünü, kartın detayına tıklayıp özetini açın."
        actions={[
          { label: "Yeni Model", icon: Plus, variant: "default", onClick: () => setOpen(true) },
          {
            label: "AI ile Oluştur",
            icon: Sparkles,
            onClick: () =>
              queuePrompt(
                "E-ticaret şeması üret: Product, Order, OrderItem ve Category.",
              ),
          },
        ]}
      />
      <PageBody>
        {/* KPI şeridi */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Model"
              value={models.length}
              delta={9}
              trend={[8, 9, 9, 10, 10, 11, 12, models.length]}
              icon={Database}
              hint="çalışma alanı"
            />
            <KpiCard
              label="Toplam alan"
              value={totalFields}
              delta={6}
              trend={[40, 42, 45, 49, 52, 55, 58, totalFields]}
              icon={Table}
              hint="tüm modeller"
            />
            <KpiCard
              label="İlişki"
              value={totalRelations}
              delta={4}
              trend={[6, 7, 8, 9, 10, 11, 12, totalRelations]}
              icon={Link2}
              hint="relation alanları"
            />
            <KpiCard
              label="Index'li alan"
              value={indexedFields}
              delta={draftCount > 0 ? -2 : 3}
              invert={false}
              trend={[18, 19, 20, 21, 22, 23, 24, indexedFields]}
              icon={Key}
              hint={`${draftCount} taslak model`}
            />
          </div>
        )}

        {/* Filtre şeridi */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Model veya tablo ara…"
          onExport={exportSchema}
        >
          <FilterChip active={health === "all"} onClick={() => setHealth("all")} count={models.length}>
            Tümü
          </FilterChip>
          <FilterChip
            active={health === "stable"}
            onClick={() => setHealth("stable")}
            count={healthCounts.stable}
          >
            Stabil
          </FilterChip>
          <FilterChip
            active={health === "draft"}
            onClick={() => setHealth("draft")}
            count={healthCounts.draft}
          >
            Taslak
          </FilterChip>
          <FilterChip
            active={health === "deprecated"}
            onClick={() => setHealth("deprecated")}
            count={healthCounts.deprecated}
          >
            Deprecated
          </FilterChip>
          <FilterChip
            active={onlyWithRelations}
            onClick={() => setOnlyWithRelations((v) => !v)}
          >
            İlişkili
          </FilterChip>
        </FilterBar>

        {/* Toplu işlem şeridi */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={bulkDeprecate}>
            <WarningCircle className="size-3.5" /> Deprecated işaretle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-red-400 hover:text-red-300"
            onClick={bulkDelete}
          >
            <TrashSimple className="size-3.5" /> Sil
          </Button>
        </BulkBar>

        {/* İçerik: kart grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        ) : models.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Henüz model yok"
            description="İlk veri modelini oluşturarak şemayı kurmaya başlayın. Tablo adı otomatik türetilir."
            action={
              <Button onClick={() => setOpen(true)} className="gap-1.5">
                <Plus className="size-4" /> İlk modeli oluştur
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="search"
            icon={Stack}
            title="Eşleşen model yok"
            description="Arama veya filtreleri gevşetmeyi deneyin."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setHealth("all");
                  setOnlyWithRelations(false);
                }}
              >
                Filtreleri temizle
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-0.5 text-xs text-muted-foreground">
              <button
                onClick={() =>
                  setSelected(
                    allFilteredSelected ? new Set() : new Set(filtered.map((m) => m.id)),
                  )
                }
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <Checkbox checked={allFilteredSelected} className="pointer-events-none" />
                {allFilteredSelected ? "Seçimi kaldır" : "Tümünü seç"}
              </button>
              <span className="tabular-nums">
                {filtered.length}
                {filtersActive ? ` / ${models.length}` : ""} model
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => {
                const meta = metaFor(m.id);
                const rels = relationCount(m);
                const checked = selected.has(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => setDetailId(m.id)}
                    className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(m.id);
                        }}
                        className="pt-0.5"
                      >
                        <Checkbox checked={checked} aria-label={`${m.name} seç`} />
                      </div>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Database className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{m.name}</span>
                          {healthBadge(meta.health)}
                        </div>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {m.tableName}
                        </span>
                      </div>
                    </div>

                    {m.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {m.description}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ListBullets className="size-3.5" />
                        <span className="tabular-nums text-foreground">{m.fields.length}</span> alan
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Link2 className="size-3.5" />
                        <span className="tabular-nums text-foreground">{rels}</span> ilişki
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Table className="size-3.5" />
                        <span className="tabular-nums text-foreground">{fmt(meta.rows)}</span> satır
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {meta.updatedAt}
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/schema/${m.id}`);
                        }}
                      >
                        Editör <ArrowSquareOut className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PageBody>

      {/* Detay paneli */}
      <DetailDrawer
        open={detail !== null}
        onOpenChange={(v) => !v && setDetailId(null)}
        title={detail?.name ?? ""}
        subtitle={detail?.tableName}
        badge={detail ? healthBadge(metaFor(detail.id).health) : undefined}
        tabs={drawerTabs}
        footer={
          detail && (
            <div className="flex w-full items-center gap-2 p-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => duplicate(detail)}
              >
                <Copy className="size-3.5" /> Kopyala
              </Button>
              <Button
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() => navigate(`/schema/${detail.id}`)}
              >
                <PencilSimple className="size-3.5" /> Alan editörü
              </Button>
            </div>
          )
        }
      />

      {/* Oluştur akışı */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetCreate();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model adı</Label>
              <Input
                id="model-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="örn. Subscription"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Tablo adı otomatik türetilir (snake_case, çoğul).
                {name.trim() && (
                  <>
                    {" → "}
                    <span className="font-mono text-foreground">
                      {toTablePreview(name)}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-desc">Açıklama (opsiyonel)</Label>
              <Textarea
                id="model-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Bu model neyi temsil ediyor?"
                rows={2}
              />
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">timestamps</span>
                  <span className="text-xs text-muted-foreground">
                    createdAt / updatedAt otomatik eklenir
                  </span>
                </span>
                <Switch checked={timestamps} onCheckedChange={setTimestamps} />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">soft delete</span>
                  <span className="text-xs text-muted-foreground">
                    Kalıcı silme yerine deletedAt işaretlenir
                  </span>
                </span>
                <Switch checked={softDelete} onCheckedChange={setSoftDelete} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button onClick={create} disabled={!name.trim()}>
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── detay sekmeleri builder ─────────────────────────────────────────── */

function buildTabs(m: SchemaModel): DrawerTab[] {
  const meta = metaFor(m.id);
  const rels = m.fields.filter((f) => f.type === "relation");
  return [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Alan" value={m.fields.length} />
            <Stat label="İlişki" value={rels.length} />
            <Stat label="Satır" value={fmt(meta.rows)} />
          </div>

          {m.description && (
            <p className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              {m.description}
            </p>
          )}

          <div className="rounded-lg border">
            <Field label="Tablo adı" mono>
              {m.tableName}
            </Field>
            <div className="border-t" />
            <Field label="Durum">{HEALTH_LABEL[meta.health]}</Field>
            <div className="border-t" />
            <Field label="Sahip">{meta.owner}</Field>
            <div className="border-t" />
            <Field label="timestamps">{m.timestamps ? "Açık" : "Kapalı"}</Field>
            <div className="border-t" />
            <Field label="soft delete">{m.softDelete ? "Açık" : "Kapalı"}</Field>
            <div className="border-t" />
            <Field label="Son güncelleme">{meta.updatedAt}</Field>
          </div>

          {/* Alan listesi */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Alanlar</p>
            <div className="space-y-1">
              {m.fields.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
                >
                  <span className="font-mono font-medium">{f.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {f.type === "relation" ? `→ ${f.relationModel ?? "rel"}` : f.type}
                  </Badge>
                  <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    {f.required && <span title="zorunlu" className="text-amber-400">req</span>}
                    {f.unique && <span title="benzersiz">uniq</span>}
                    {f.indexed && (
                      <span title="indexed" className="inline-flex items-center gap-0.5">
                        <Key className="size-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gelen ilişkiler */}
          {meta.referencedBy.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Bu modeli referans alanlar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {meta.referencedBy.map((r) => (
                  <Badge key={r} variant="outline" className="gap-1 text-[10px]">
                    <Link2 className="size-2.5" /> {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={auditFor(m.id, m.name)} />,
    },
    {
      value: "json",
      label: "Şema",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Prisma şeması (önizleme)</span>
            <Button
              variant="outline"
              size="xs"
              className="gap-1"
              onClick={() => {
                void navigator.clipboard?.writeText(toPrisma(m));
                toast.success("Şema panoya kopyalandı");
              }}
            >
              <Copy className="size-3" /> Kopyala
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
            {toPrisma(m)}
          </pre>
          <p className="text-xs text-muted-foreground">Ham model JSON</p>
          <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(m, null, 2)}
          </pre>
        </div>
      ),
    },
  ];
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-2.5 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* dialog önizlemesi için lokal tablo-adı türetimi (store ile aynı kural) */
function toTablePreview(name: string): string {
  const snake = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!snake) return "";
  return snake.endsWith("s") ? snake : `${snake}s`;
}
