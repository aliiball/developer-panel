import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  ArrowLeft,
  Plus,
  Sparkle as Sparkles,
  MagicWand as Wand2,
  Database,
  Key,
  LinkSimple as RelationIcon,
  ShieldCheck,
  Lightning,
  FloppyDisk,
  ArrowCounterClockwise,
  Columns as ColumnsIcon,
  WarningCircle,
  CheckCircle,
  PencilSimple,
  Trash,
  Hash,
  TextAa,
  GitBranch,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { FieldEditorRow } from "~/components/schema/FieldEditorRow";
import { SchemaJsonPreview } from "~/components/schema/SchemaJsonPreview";
import {
  useSchemaStore,
  type FieldType,
  type SchemaField,
  type SchemaModel,
} from "~/stores/schema-store";
import { getMockAIResponse } from "~/lib/ai-mock";
import { applyPreview } from "~/lib/apply-preview";
import { modelToJson } from "~/lib/codegen";
import {
  KpiCard,
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
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Model Editörü — MetaPanel" }];
}

// crude type inference for the per-row ✨ suggestion
function suggestType(name: string): FieldType {
  const n = name.toLowerCase();
  if (n.includes("email")) return "email";
  if (n.includes("url") || n.includes("link")) return "url";
  if (n.endsWith("at") || n.includes("date") || n.includes("time")) return "date";
  if (n.includes("price") || n.includes("amount") || n.includes("count") || n.includes("qty") || n.includes("stock")) return "number";
  if (n.startsWith("is") || n.startsWith("has")) return "boolean";
  if (n.includes("description") || n.includes("body") || n.includes("content")) return "text";
  if (n.includes("meta") || n.includes("json") || n.includes("config")) return "json";
  return "string";
}

// ── Field-level lint: gerçek "insight" üreten kurallar ──────────────
type Lint = { fieldId: string; field: string; level: "error" | "warn"; message: string };

function lintModel(model: SchemaModel): Lint[] {
  const out: Lint[] = [];
  const seen = new Map<string, number>();
  for (const f of model.fields) {
    const key = f.name.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const f of model.fields) {
    if (!f.name.trim()) {
      out.push({ fieldId: f.id, field: f.name || "(boş)", level: "error", message: "Alan adı boş olamaz." });
    }
    if ((seen.get(f.name.trim().toLowerCase()) ?? 0) > 1) {
      out.push({ fieldId: f.id, field: f.name, level: "error", message: "Yinelenen alan adı." });
    }
    if (f.unique && !f.indexed) {
      out.push({ fieldId: f.id, field: f.name, level: "warn", message: "unique alan indekslenmemiş — sorgu performansı düşebilir." });
    }
    if (f.type === "relation" && !f.relationModel) {
      out.push({ fieldId: f.id, field: f.name, level: "error", message: "relation hedef modeli seçilmemiş." });
    }
    if (f.type === "enum" && (!f.enumValues || f.enumValues.length === 0)) {
      out.push({ fieldId: f.id, field: f.name, level: "warn", message: "enum değer listesi boş." });
    }
    if (/[A-Z]/.test(f.name) && f.name.includes("_")) {
      out.push({ fieldId: f.id, field: f.name, level: "warn", message: "camelCase ve snake_case karışık — adlandırma tutarsız." });
    }
  }
  return out;
}

const TYPE_ICON: Partial<Record<FieldType, typeof Hash>> = {
  number: Hash,
  string: TextAa,
  text: TextAa,
  relation: RelationIcon,
  enum: GitBranch,
};

function fieldSummary(f: SchemaField): string {
  const parts: string[] = [f.type];
  if (f.type === "relation" && f.relationModel) parts.push(`→ ${f.relationModel}`);
  if (f.type === "enum" && f.enumValues?.length) parts.push(`{${f.enumValues.join(", ")}}`);
  if (f.required) parts.push("required");
  if (f.unique) parts.push("unique");
  if (f.indexed) parts.push("indexed");
  if (f.defaultValue) parts.push(`= ${f.defaultValue}`);
  return parts.join(" · ");
}

type FlagFilter = "all" | "required" | "unique" | "indexed" | "relation" | "issues";

export default function SchemaModelEditor() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const model = useSchemaStore((s) => s.models.find((m) => m.id === modelId));
  const models = useSchemaStore((s) => s.models);
  const {
    addField,
    updateField,
    deleteField,
    reorderFields,
    updateModel,
  } = useSchemaStore();

  const [aiInput, setAiInput] = useState("");
  const [search, setSearch] = useState("");
  const [flag, setFlag] = useState<FlagFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerField, setDrawerField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirtyTick, setDirtyTick] = useState(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // ── lint + türetilmiş metrikler (hook'lar koşulsuz çalışmalı) ──────
  const lints = useMemo(() => (model ? lintModel(model) : []), [model, dirtyTick]);
  const lintByField = useMemo(() => {
    const map = new Map<string, Lint[]>();
    for (const l of lints) {
      const arr = map.get(l.fieldId) ?? [];
      arr.push(l);
      map.set(l.fieldId, arr);
    }
    return map;
  }, [lints]);

  const stats = useMemo(() => {
    if (!model) return { total: 0, indexed: 0, relations: 0, required: 0, unique: 0, errors: 0, warns: 0 };
    return {
      total: model.fields.length,
      indexed: model.fields.filter((f) => f.indexed).length,
      relations: model.fields.filter((f) => f.type === "relation").length,
      required: model.fields.filter((f) => f.required).length,
      unique: model.fields.filter((f) => f.unique).length,
      errors: lints.filter((l) => l.level === "error").length,
      warns: lints.filter((l) => l.level === "warn").length,
    };
  }, [model, lints]);

  // ilişki grafiği: bu modele referans veren alanlar (ters ilişki)
  const inboundRelations = useMemo(() => {
    if (!model) return [] as { model: string; field: string }[];
    const out: { model: string; field: string }[] = [];
    for (const m of models) {
      if (m.id === model.id) continue;
      for (const f of m.fields) {
        if (f.type === "relation" && f.relationModel === model.name) {
          out.push({ model: m.name, field: f.name });
        }
      }
    }
    return out;
  }, [models, model]);

  const filteredFields = useMemo(() => {
    if (!model) return [] as SchemaField[];
    const q = search.trim().toLowerCase();
    return model.fields.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q) && !f.type.includes(q)) return false;
      switch (flag) {
        case "required": return f.required;
        case "unique": return f.unique;
        case "indexed": return f.indexed;
        case "relation": return f.type === "relation";
        case "issues": return lintByField.has(f.id);
        default: return true;
      }
    });
  }, [model, search, flag, lintByField]);

  if (!model) {
    return (
      <PageBody className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={Database}
          title="Model bulunamadı"
          description="Bu kimliğe sahip bir model yok ya da silinmiş olabilir."
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/schema")}>
              Schema'ya dön
            </Button>
          }
        />
      </PageBody>
    );
  }

  const m = model; // narrow for closures
  const isFiltering = search.trim().length > 0 || flag !== "all";

  function touch() {
    setDirtyTick((t) => t + 1);
    setSavedAt(null);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    if (isFiltering) {
      toast.info("Sıralama için filtreleri temizleyin", {
        description: "Sürükle-bırak yalnızca tüm alanlar görünürken çalışır.",
      });
      return;
    }
    const from = m.fields.findIndex((f) => f.id === active.id);
    const to = m.fields.findIndex((f) => f.id === over.id);
    if (from !== -1 && to !== -1) {
      reorderFields(m.id, from, to);
      touch();
    }
  }

  function runAiAdd() {
    if (!aiInput.trim()) return;
    const res = getMockAIResponse(aiInput, { model: m.name });
    if (res.preview && res.preview.kind === "fields") {
      const summary = applyPreview({ ...res.preview, targetModel: m.name });
      toast.success("AI alanları eklendi", { description: summary });
      touch();
    } else {
      toast.info("Bu istek için alan önerisi üretemedim", {
        description: "Örnek: \"fiyat ve stok ekle\" ya da \"SEO alanları ekle\".",
      });
    }
    setAiInput("");
  }

  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkFlag(key: "required" | "unique" | "indexed", value: boolean) {
    selected.forEach((id) => updateField(m.id, id, { [key]: value }));
    toast.success(`${selected.size} alan güncellendi`, { description: `${key} = ${value}` });
    touch();
  }

  function doDelete(ids: string[]) {
    ids.forEach((id) => deleteField(m.id, id));
    setSelected(new Set());
    setConfirmDelete(null);
    setDrawerField(null);
    toast.success(`${ids.length} alan silindi`, {
      description: "Bu işlem yerel taslakta yapıldı.",
    });
    touch();
  }

  function save() {
    if (stats.errors > 0) {
      toast.error("Kaydedilemedi", {
        description: `${stats.errors} hata düzeltilmeli. "Sorunlu" filtresine bakın.`,
      });
      return;
    }
    const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    setSavedAt(now);
    toast.success("Model kaydedildi", {
      description: `${m.name} · ${stats.total} alan · migration taslağı üretildi.`,
    });
  }

  const activeField = drawerField ? m.fields.find((f) => f.id === drawerField) ?? null : null;

  return (
    <>
      <PageHeader
        title={m.name}
        description={m.description ?? `${m.tableName} · ${m.fields.length} alan`}
        actions={[
          { label: "Alan Ekle", icon: Plus, variant: "default", onClick: () => { addField(m.id); touch(); } },
        ]}
      >
        <Button variant="ghost" size="sm" nativeButton={false} className="h-8 gap-1.5" render={<Link to="/schema" />}>
          <ArrowLeft className="size-4" /> Modeller
        </Button>
        <Badge variant="outline" className="gap-1 font-mono">
          <Database className="size-3" /> {m.tableName}
        </Badge>
        {savedAt ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="size-3 text-emerald-400" /> {savedAt} kaydedildi
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-amber-400">
            <WarningCircle className="size-3" /> kaydedilmemiş değişiklik
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => { setDirtyTick((t) => t + 1); toast.info("Son kaydedilmiş haline döndürülemiyor", { description: "Bu demo store'unda geri-al simüle edilir." }); }}
        >
          <ArrowCounterClockwise className="size-4" /> Geri Al
        </Button>
        <Button size="sm" className="h-8 gap-1.5" onClick={save}>
          <FloppyDisk className="size-4" /> Kaydet
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        {/* ── KPI şeridi — model sağlığı ─────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Toplam alan"
            value={stats.total}
            icon={ColumnsIcon}
            hint="şema genişliği"
            trend={[4, 5, 5, 6, 6, stats.total]}
          />
          <KpiCard
            label="İndeksli"
            value={`${stats.indexed}/${stats.total}`}
            icon={Lightning}
            hint="sorgu performansı"
            delta={stats.total ? Math.round((stats.indexed / stats.total) * 100) : 0}
            deltaSuffix="% kapsam"
            trend={[1, 2, 2, 3, stats.indexed]}
          />
          <KpiCard
            label="İlişki"
            value={stats.relations}
            icon={RelationIcon}
            hint={`${inboundRelations.length} gelen referans`}
            trend={[0, 1, 1, 2, stats.relations]}
          />
          <KpiCard
            label="Lint sorunu"
            value={stats.errors + stats.warns}
            icon={ShieldCheck}
            hint={`${stats.errors} hata · ${stats.warns} uyarı`}
            delta={stats.errors + stats.warns}
            deltaSuffix=" açık"
            invert
            trend={[3, 2, 2, 1, stats.errors + stats.warns]}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* ── Sol kolon: alan editörü ──────────────────────────── */}
          <div className="space-y-4">
            {/* AI add-field bar */}
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2">
              <Sparkles className="ml-1 size-4 shrink-0 text-primary" />
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAiAdd()}
                placeholder="AI ile alan ekle — örn. 'fiyat ve stok ekle'"
                className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="AI ile alan ekle"
              />
              <Button size="sm" className="h-8 gap-1.5" onClick={runAiAdd}>
                <Wand2 className="size-3.5" /> Üret
              </Button>
            </div>

            {/* Filtre şeridi */}
            <FilterBar
              search={search}
              onSearch={setSearch}
              placeholder="Alan adı veya tip ara…"
              onExport={() => {
                const json = modelToJson(m);
                navigator.clipboard?.writeText(json);
                toast.success("Şema JSON panoya kopyalandı", { description: `${m.fields.length} alan dışa aktarıldı.` });
              }}
            >
              <FilterChip active={flag === "all"} count={m.fields.length} onClick={() => setFlag("all")}>Tümü</FilterChip>
              <FilterChip active={flag === "required"} count={stats.required} onClick={() => setFlag("required")}>required</FilterChip>
              <FilterChip active={flag === "unique"} count={stats.unique} onClick={() => setFlag("unique")}>unique</FilterChip>
              <FilterChip active={flag === "indexed"} count={stats.indexed} onClick={() => setFlag("indexed")}>indexed</FilterChip>
              <FilterChip active={flag === "relation"} count={stats.relations} onClick={() => setFlag("relation")}>relation</FilterChip>
              <FilterChip active={flag === "issues"} count={lintByField.size} onClick={() => setFlag("issues")}>sorunlu</FilterChip>
            </FilterBar>

            {/* Toplu işlem */}
            <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
              <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => bulkFlag("required", true)}>
                <Key className="size-3.5" /> required
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => bulkFlag("indexed", true)}>
                <Lightning className="size-3.5" /> indexed
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => bulkFlag("unique", true)}>
                <ShieldCheck className="size-3.5" /> unique
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete([...selected])}
              >
                <Trash className="size-3.5" /> Sil
              </Button>
            </BulkBar>

            {/* Alan satırları */}
            {m.fields.length === 0 ? (
              <EmptyState
                icon={ColumnsIcon}
                title="Henüz alan yok"
                description="'Alan Ekle' düğmesini ya da yukarıdaki AI çubuğunu kullanın."
                action={
                  <Button size="sm" className="gap-1.5" onClick={() => { addField(m.id); touch(); }}>
                    <Plus className="size-4" /> İlk alanı ekle
                  </Button>
                }
              />
            ) : filteredFields.length === 0 ? (
              <EmptyState
                variant="search"
                title="Eşleşen alan yok"
                description="Arama veya filtre koşullarını gevşetin."
                action={
                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFlag("all"); }}>
                    Filtreleri temizle
                  </Button>
                }
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext items={filteredFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {filteredFields.map((field) => {
                      const issues = lintByField.get(field.id);
                      return (
                        <div key={field.id} className="flex items-stretch gap-2">
                          <label className="flex items-center pl-0.5">
                            <input
                              type="checkbox"
                              checked={selected.has(field.id)}
                              onChange={() => toggleSel(field.id)}
                              className="size-4 rounded border-border accent-primary"
                              aria-label={`${field.name} seç`}
                            />
                          </label>
                          <div className="flex-1">
                            <FieldEditorRow
                              field={field}
                              onChange={(patch) => { updateField(m.id, field.id, patch); touch(); }}
                              onDelete={() => setConfirmDelete([field.id])}
                              onSuggest={() => {
                                const t = suggestType(field.name);
                                updateField(m.id, field.id, { type: t });
                                toast.success("AI tip önerisi", { description: `${field.name} → ${t}` });
                                touch();
                              }}
                            />
                            {issues && issues.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1.5 pl-9">
                                {issues.map((l, i) => (
                                  <span
                                    key={i}
                                    className={
                                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] " +
                                      (l.level === "error"
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-amber-500/10 text-amber-400")
                                    }
                                  >
                                    <WarningCircle className="size-3" /> {l.message}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setDrawerField(field.id)}
                            className="flex items-center px-1 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={`${field.name} detayını aç`}
                            title="Detay"
                          >
                            <PencilSimple className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Model-level options */}
            <div className="flex flex-wrap gap-5 rounded-xl border bg-card p-3 text-sm">
              <label className="flex items-center gap-2">
                <Switch
                  checked={m.timestamps}
                  onCheckedChange={(v) => { updateModel(m.id, { timestamps: v }); touch(); }}
                />
                <span>timestamps</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={m.softDelete}
                  onCheckedChange={(v) => { updateModel(m.id, { softDelete: v }); touch(); }}
                />
                <span>soft-delete</span>
              </label>
            </div>
          </div>

          {/* ── Sağ kolon: paneller + canlı JSON ─────────────────── */}
          <div className="space-y-4">
            {/* İlişkiler paneli */}
            <Panel icon={RelationIcon} title="İlişkiler" count={stats.relations + inboundRelations.length}>
              {stats.relations === 0 && inboundRelations.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">İlişki tanımlı değil.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {m.fields.filter((f) => f.type === "relation").map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5">
                      <span className="flex items-center gap-1.5 font-mono text-xs">
                        <RelationIcon className="size-3.5 text-primary" /> {f.name}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        → {f.relationModel ?? "?"}
                      </Badge>
                    </li>
                  ))}
                  {inboundRelations.map((r, i) => (
                    <li key={`in-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5">
                      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <ArrowLeft className="size-3.5" /> {r.model}.{r.field}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">gelen</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* İndeks paneli */}
            <Panel icon={Lightning} title="İndeksler" count={stats.indexed + stats.unique}>
              {stats.indexed === 0 && stats.unique === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">Tanımlı indeks yok.</p>
              ) : (
                <ul className="space-y-1 font-mono text-[11px]">
                  {m.fields.filter((f) => f.unique).map((f) => (
                    <li key={f.id} className="flex items-center gap-1.5 rounded bg-muted/30 px-2 py-1">
                      <Key className="size-3 text-amber-400" />
                      <span className="text-amber-300">UNIQUE</span> {m.tableName}.{f.name}
                    </li>
                  ))}
                  {m.fields.filter((f) => f.indexed && !f.unique).map((f) => (
                    <li key={f.id} className="flex items-center gap-1.5 rounded bg-muted/30 px-2 py-1">
                      <Lightning className="size-3 text-primary" />
                      <span className="text-primary">INDEX</span> {m.tableName}.{f.name}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Validasyon / lint paneli */}
            <Panel icon={ShieldCheck} title="Validasyon & Lint" count={stats.errors + stats.warns}>
              {lints.length === 0 ? (
                <p className="flex items-center justify-center gap-1.5 py-3 text-center text-xs text-emerald-400">
                  <CheckCircle className="size-3.5" /> Tüm kontroller temiz.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {lints.map((l, i) => (
                    <li
                      key={i}
                      onClick={() => { setDrawerField(l.fieldId); }}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/40"
                    >
                      <WarningCircle className={"mt-0.5 size-3.5 shrink-0 " + (l.level === "error" ? "text-red-400" : "text-amber-400")} />
                      <span>
                        <span className="font-mono">{l.field}</span>{" "}
                        <span className="text-muted-foreground">— {l.message}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {m.fields.some((f) => f.validation) && (
                <div className="mt-2 border-t pt-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Kurallar</p>
                  <ul className="space-y-1 font-mono text-[11px]">
                    {m.fields.filter((f) => f.validation).map((f) => (
                      <li key={f.id} className="text-muted-foreground">
                        {f.name}: <span className="text-foreground">{f.validation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            {/* Canlı JSON / TS / SQL */}
            <SchemaJsonPreview model={m} />
          </div>
        </div>
      </PageBody>

      {/* ── Alan DetailDrawer ─────────────────────────────────────── */}
      <DetailDrawer
        open={!!activeField}
        onOpenChange={(v) => !v && setDrawerField(null)}
        title={activeField?.name ?? ""}
        subtitle={activeField ? `${m.name}.${activeField.name}` : undefined}
        badge={
          activeField ? (
            <Badge variant="outline" className="font-mono">{activeField.type}</Badge>
          ) : undefined
        }
        tabs={activeField ? buildFieldTabs(activeField, m) : undefined}
        footer={
          activeField ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete([activeField.id])}
            >
              <Trash className="size-4" /> Alanı Sil
            </Button>
          ) : undefined
        }
      />

      {/* ── Yıkıcı işlem onayı ────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDelete && confirmDelete.length > 1
                ? `${confirmDelete.length} alanı sil?`
                : "Alanı sil?"}
            </DialogTitle>
            <DialogDescription>
              Bu işlem alan(lar)ı modelden kaldırır ve üretilen migration'ı etkiler.
              Kaydedilmeden önce geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Vazgeç</Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => confirmDelete && doDelete(confirmDelete)}
            >
              <Trash className="size-4" /> Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sağ kolon panel kabuğu ──────────────────────────────────────────
function Panel({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Database;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
        {typeof count === "number" && (
          <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ── Drawer sekmeleri: Genel / Aktivite / JSON ───────────────────────
function buildFieldTabs(field: SchemaField, model: SchemaModel): DrawerTab[] {
  const TypeIcon = TYPE_ICON[field.type] ?? TextAa;
  const events: AuditEvent[] = [
    { id: "e1", actor: "system", action: `alan '${model.tableName}' tablosuna eklendi`, at: "şema oluşturulurken", icon: Plus, tone: "primary", detail: `${field.name}: ${field.type}` },
    ...(field.indexed ? [{ id: "e2", actor: "Ada Yılmaz", action: "indexed=true yaptı", at: "2 gün önce", icon: Lightning, tone: "emerald" as const }] : []),
    ...(field.required ? [{ id: "e3", actor: "Mert Demir", action: "required=true yaptı", at: "1 gün önce", icon: Key, tone: "amber" as const }] : []),
    ...(field.type === "relation" ? [{ id: "e4", actor: "AI Copilot", action: `relation → ${field.relationModel ?? "?"} bağladı`, at: "5 saat önce", icon: RelationIcon, tone: "primary" as const }] : []),
    { id: "e5", actor: "Sen", action: "bu oturumda düzenleniyor", at: "az önce", icon: PencilSimple, tone: "default" },
  ];

  const fieldJson = JSON.stringify(
    {
      name: field.name,
      type: field.type,
      required: field.required,
      unique: field.unique,
      indexed: field.indexed,
      ...(field.defaultValue ? { default: field.defaultValue } : {}),
      ...(field.enumValues ? { enum: field.enumValues } : {}),
      ...(field.relationModel ? { relation: field.relationModel } : {}),
      ...(field.validation ? { validation: field.validation } : {}),
      ...(field.description ? { description: field.description } : {}),
    },
    null,
    2,
  );

  const sqlCol = `${field.name} ${
    field.type === "number" ? "numeric" : field.type === "boolean" ? "boolean" : field.type === "date" ? "timestamptz" : field.type === "json" ? "jsonb" : field.type === "relation" ? "integer" : "varchar(255)"
  }${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`;

  return [
    {
      value: "genel",
      label: "Genel",
      content: (
        <div className="divide-y">
          <Field label="Ad" mono>{field.name}</Field>
          <Field label="Tip">
            <span className="inline-flex items-center gap-1.5">
              <TypeIcon className="size-3.5 text-muted-foreground" /> {field.type}
            </span>
          </Field>
          <Field label="required">{field.required ? "Evet" : "Hayır"}</Field>
          <Field label="unique">{field.unique ? "Evet" : "Hayır"}</Field>
          <Field label="indexed">{field.indexed ? "Evet" : "Hayır"}</Field>
          {field.defaultValue && <Field label="default" mono>{field.defaultValue}</Field>}
          {field.relationModel && <Field label="relation" mono>→ {field.relationModel}</Field>}
          {field.enumValues?.length ? <Field label="enum" mono>{field.enumValues.join(", ")}</Field> : null}
          {field.validation && <Field label="validation" mono>{field.validation}</Field>}
          {field.description && <Field label="açıklama">{field.description}</Field>}
          <div className="pt-3">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">SQL kolon</p>
            <pre className="overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[11px]">{sqlCol}</pre>
            <p className="mt-2 text-xs text-muted-foreground">{fieldSummary(field)}</p>
          </div>
        </div>
      ),
    },
    {
      value: "aktivite",
      label: "Aktivite",
      content: <AuditTimeline events={events} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-auto rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {fieldJson}
        </pre>
      ),
    },
  ];
}
