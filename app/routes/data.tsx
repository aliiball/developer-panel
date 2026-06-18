import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  UploadSimple as Upload,
  Download,
  Pencil,
  Check,
  X,
  Trash,
  Database,
  Table as TableIcon,
  Rows,
  CloudArrowUp,
  PencilSimple,
  ClockCounterClockwise,
  CaretLeft,
  CaretRight,
  ShieldCheck,
  Sparkle,
  ArrowsClockwise,
  Copy,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useSchemaStore, type SchemaModel, type SchemaField } from "~/stores/schema-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { toastUndo } from "~/lib/feedback";
import { useListNav } from "~/hooks/use-list-nav";
import {
  EmptyState,
  TableSkeleton,
  KpiSkeleton,
  KpiCard,
  FilterBar,
  FilterChip,
  BulkBar,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";

export function meta() {
  return [{ title: "Data — MetaPanel" }];
}

/* ─────────────────────────────────────────────────────────────────────
 * Data Manager — model kayıtlarının enterprise yönetim yüzeyi.
 * Model seçici + KPI şeridi + FilterBar (arama/durum/kolonlar/export) +
 * BulkBar (toplu sil/export) + inline edit + DetailDrawer (kayıt/JSON/audit)
 * + sayfalama. Seed mock kayıtlar bu dosyada deterministik üretilir.
 * ──────────────────────────────────────────────────────────────────── */

type Cell = string | number | boolean;
type Row = { id: number; _status: RecordStatus; _updatedBy: string; _updatedAt: string } & Record<string, Cell>;

type RecordStatus = "active" | "draft" | "archived";

const STATUS_META: Record<RecordStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Yayında", variant: "default" },
  draft: { label: "Taslak", variant: "secondary" },
  archived: { label: "Arşiv", variant: "outline" },
};

const EDITORS = ["Ada Yılmaz", "Mert Demir", "Selin Kaya", "AI Copilot", "system", "Burak Şen"];
const PAGE_SIZE = 8;

/* Deterministik mock değer üretimi (index-seeded; render path'te Math.random yok). */
function mockValue(f: SchemaField, i: number): Cell {
  const seed = (i * 31 + f.name.length * 7) % 100;
  switch (f.type) {
    case "number":
      return f.name.toLowerCase().includes("price") || f.name.toLowerCase().includes("total")
        ? Number(((i + 1) * 49.9 + seed).toFixed(2))
        : (i + 1) * 7 + (seed % 13);
    case "boolean":
      return seed % 2 === 0;
    case "email":
      return `${["ada", "mert", "selin", "burak", "deniz", "ece", "kaan", "lara"][i % 8]}${i + 1}@mail.com`;
    case "url":
      return `https://example.com/${f.name}/${i + 1}`;
    case "date": {
      const m = ((i % 6) + 1).toString().padStart(2, "0");
      const d = ((i % 27) + 1).toString().padStart(2, "0");
      return `2026-${m}-${d}`;
    }
    case "enum":
      return f.enumValues?.length ? f.enumValues[i % f.enumValues.length] : ["pending", "paid", "shipped"][i % 3];
    case "relation":
      return `#${100 + ((i * 3) % 40)}`;
    case "json":
      return `{ "k": ${i + 1} }`;
    case "text":
      return `${f.name} açıklama metni ${i + 1}`;
    case "computed":
      return (i + 1) * 1.5;
    default:
      return `${f.name}-${i + 1}`;
  }
}

function buildRows(model: SchemaModel, count = 26): Row[] {
  return Array.from({ length: count }, (_, i) => {
    const status: RecordStatus = i % 7 === 0 ? "archived" : i % 4 === 0 ? "draft" : "active";
    const row = {
      id: 1000 + i,
      _status: status,
      _updatedBy: EDITORS[i % EDITORS.length],
      _updatedAt: relativeAt(i),
    } as Row;
    for (const f of model.fields) row[f.name] = mockValue(f, i);
    return row;
  });
}

function relativeAt(i: number): string {
  const opts = ["az önce", "5 dk önce", "32 dk önce", "2 saat önce", "dün", "3 gün önce", "1 hafta önce", "2 hafta önce"];
  return opts[i % opts.length];
}

function cellToString(v: Cell): string {
  return typeof v === "boolean" ? (v ? "true" : "false") : String(v);
}

/* Audit event mock'u — kayda özgü deterministik geçmiş. */
function auditFor(row: Row, model: SchemaModel): AuditEvent[] {
  const firstEditable = model.fields[0]?.name ?? "field";
  return [
    {
      id: `${row.id}-1`,
      action: `${model.name} kaydı oluşturuldu`,
      actor: EDITORS[(row.id + 2) % EDITORS.length],
      at: "12 gün önce",
      icon: Plus,
      tone: "emerald",
      detail: `id=${row.id} · ${model.tableName}`,
    },
    {
      id: `${row.id}-2`,
      action: `"${firstEditable}" alanı güncellendi`,
      actor: EDITORS[(row.id + 1) % EDITORS.length],
      at: "6 gün önce",
      icon: PencilSimple,
      tone: "primary",
      detail: `${firstEditable}: "${cellToString(row[firstEditable] ?? "")}"`,
    },
    {
      id: `${row.id}-3`,
      action: "AI Copilot doğrulama çalıştırdı",
      actor: "AI Copilot",
      at: "3 gün önce",
      icon: Sparkle,
      tone: "amber",
      detail: "0 ihlal · şema kuralları geçti",
    },
    {
      id: `${row.id}-4`,
      action: `durum "${STATUS_META[row._status].label}" olarak ayarlandı`,
      actor: row._updatedBy,
      at: row._updatedAt,
      icon: ShieldCheck,
      tone: row._status === "archived" ? "red" : "default",
    },
  ];
}

function sparkFor(seed: number, len = 12): number[] {
  return Array.from({ length: len }, (_, i) => 20 + ((seed * (i + 3) * 7) % 60) + (i % 3) * 4);
}

export default function Data() {
  const models = useSchemaStore((s) => s.models);
  const [modelId, setModelId] = useState(models[0]?.id);
  const model = useMemo(() => models.find((m) => m.id === modelId) ?? models[0], [models, modelId]);

  /* Kayıtlar lokal state'te tutulur ki inline edit / sil optimistic olsun. */
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // Model değişince yeniden "yükle" (skeleton + seed).
  useEffect(() => {
    setLoading(true);
    setSelected(new Set());
    setPage(0);
    const t = setTimeout(() => {
      setRows(model ? buildRows(model) : []);
      setLoading(false);
    }, 360);
    return () => clearTimeout(t);
  }, [modelId, model]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RecordStatus | "all">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  const [drawerRow, setDrawerRow] = useState<Row | null>(null);

  // Async/yıkıcı aksiyon yükleniyor durumları
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyImport, setBusyImport] = useState(false);

  // Inline edit state
  const [editing, setEditing] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Görünür kolonlar (model alanlarının ilk 6'sı + kontrol)
  const baseFields = useMemo(() => (model ? model.fields.slice(0, 6) : []), [model]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => setHidden(new Set()), [modelId]);
  const visibleFields = baseFields.filter((f) => !hidden.has(f.name));

  /* ── Filtre + arama ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r._status !== statusFilter) return false;
      if (!q) return true;
      if (String(r.id).includes(q)) return true;
      return baseFields.some((f) => cellToString(r[f.name]).toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter, baseFields]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  /* ── Klavye gezinme (j/↓, k/↑, Enter drawer açar, Esc temizler) ── */
  const { active, setActive, onKeyDown, containerRef } = useListNav(
    paged.length,
    (i) => paged[i] && setDrawerRow(paged[i]),
  );

  /* ── KPI'lar ── */
  const kpis = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r._status === "active").length;
    const drafts = rows.filter((r) => r._status === "draft").length;
    const archived = rows.filter((r) => r._status === "archived").length;
    return { total, active, drafts, archived };
  }, [rows]);

  const statusCounts = useMemo(() => {
    const c: Record<RecordStatus | "all", number> = { all: rows.length, active: 0, draft: 0, archived: 0 };
    for (const r of rows) c[r._status]++;
    return c;
  }, [rows]);

  /* ── Seçim ── */
  const allPageSelected = paged.length > 0 && paged.every((r) => selected.has(r.id));
  function toggleAllPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) paged.forEach((r) => next.delete(r.id));
      else paged.forEach((r) => next.add(r.id));
      return next;
    });
  }
  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /* ── Aksiyonlar ── */
  function exportData(scope: "all" | "selected", fmt: "csv" | "json") {
    const target = scope === "selected" ? rows.filter((r) => selected.has(r.id)) : filtered;
    toast.success(`${target.length} kayıt ${fmt.toUpperCase()} olarak export edildi`, {
      description: `${model?.tableName ?? "table"}.${fmt} · ${scope === "selected" ? "seçili" : "filtrelenmiş"} kapsam`,
    });
  }

  function bulkDelete() {
    if (busyDelete || selected.size === 0) return;
    const ids = new Set(selected);
    const removed = rows.filter((r) => ids.has(r.id));
    setBusyDelete(true);
    setTimeout(() => {
      setRows((prev) => prev.filter((r) => !ids.has(r.id)));
      setSelected(new Set());
      setBusyDelete(false);
      toastUndo(`${removed.length} kayıt silindi`, {
        description: `${model?.name} · geri almak için bekleyin`,
        onUndo: () => {
          setRows((prev) => [...removed, ...prev].sort((a, b) => a.id - b.id));
          toast.info(`${removed.length} kayıt geri yüklendi`);
        },
      });
    }, 600);
  }

  function deleteOne(row: Row) {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setDrawerRow(null);
    toastUndo(`#${row.id} silindi`, {
      onUndo: () => {
        setRows((prev) => [row, ...prev].sort((a, b) => a.id - b.id));
        toast.info(`#${row.id} geri yüklendi`);
      },
    });
  }

  function startEdit(row: Row, field: string) {
    setEditing({ id: row.id, field });
    setEditValue(cellToString(row[field]));
  }
  function commitEdit() {
    if (!editing) return;
    const { id, field } = editing;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const original = r[field];
        let coerced: Cell = editValue;
        if (typeof original === "number") coerced = Number(editValue) || 0;
        else if (typeof original === "boolean") coerced = editValue === "true";
        return { ...r, [field]: coerced, _updatedBy: "turksab.yonetim@gmail.com", _updatedAt: "az önce" };
      }),
    );
    setEditing(null);
    toast.success(`"${field}" güncellendi`, { description: `#${id} · optimistic kaydedildi` });
  }
  function cancelEdit() {
    setEditing(null);
  }

  function addRecord() {
    if (!model) return;
    const newId = (rows.reduce((mx, r) => Math.max(mx, r.id), 1000) + 1);
    const fresh = {
      id: newId,
      _status: "draft" as RecordStatus,
      _updatedBy: "turksab.yonetim@gmail.com",
      _updatedAt: "az önce",
    } as Row;
    for (const f of model.fields) fresh[f.name] = mockValue(f, rows.length);
    setRows((prev) => [fresh, ...prev]);
    setPage(0);
    toast.success(`Yeni ${model.name} kaydı eklendi`, { description: `#${newId} · taslak olarak oluşturuldu` });
  }

  function importData() {
    if (busyImport) return;
    setBusyImport(true);
    setTimeout(() => {
      setBusyImport(false);
      toast.info("CSV/JSON import sihirbazı", { description: `${model?.tableName} · alan eşleme adımı (mock)` });
    }, 600);
  }

  const colKey = (f: SchemaField) => f.name;

  /* ── Drawer içeriği ── */
  const drawerTabs: DrawerTab[] = useMemo(() => {
    if (!drawerRow || !model) return [];
    const r = drawerRow;
    return [
      {
        value: "general",
        label: "Genel",
        content: (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <Field label="ID" mono>
                #{r.id}
              </Field>
              <Field label="Durum">
                <Badge variant={STATUS_META[r._status].variant} className="text-[10px]">
                  {STATUS_META[r._status].label}
                </Badge>
              </Field>
              <Field label="Model" mono>
                {model.name} · {model.tableName}
              </Field>
              <Field label="Son güncelleyen">{r._updatedBy}</Field>
              <Field label="Güncellenme">{r._updatedAt}</Field>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Alanlar</p>
              <div className="rounded-lg border">
                {model.fields.map((f, i) => (
                  <div
                    key={f.id}
                    className={cn(
                      "flex items-start justify-between gap-4 px-3 py-2 text-sm",
                      i < model.fields.length - 1 && "border-b",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {f.name}
                      <span className="rounded bg-muted px-1 text-[10px] font-mono text-muted-foreground/80">
                        {f.type}
                      </span>
                      {f.required && <span className="text-[10px] text-red-400">*</span>}
                    </span>
                    <span className="max-w-[55%] truncate text-right font-mono text-xs">
                      {cellToString(r[f.name] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ),
      },
      {
        value: "activity",
        label: "Aktivite",
        content: <AuditTimeline events={auditFor(r, model)} />,
      },
      {
        value: "json",
        label: "JSON",
        content: (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ham kayıt</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={() => {
                  toast.success("JSON panoya kopyalandı");
                }}
              >
                <Copy className="size-3.5" /> Kopyala
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
              {JSON.stringify(
                {
                  id: r.id,
                  __status: r._status,
                  ...Object.fromEntries(model.fields.map((f) => [f.name, r[f.name]])),
                  __meta: { updatedBy: r._updatedBy, updatedAt: r._updatedAt, table: model.tableName },
                },
                null,
                2,
              )}
            </pre>
          </div>
        ),
      },
    ];
  }, [drawerRow, model]);

  return (
    <>
      <PageHeader
        title="Data Manager"
        description="Model kayıtlarını görüntüle, düzenle ve toplu yönet (mock veri)."
        actions={[
          { label: "Yeni Kayıt", icon: Plus, variant: "default", onClick: addRecord },
          { label: "Import", icon: Upload, onClick: importData },
          { label: "Export", icon: Download, onClick: () => exportData("all", "json") },
        ]}
      >
        <Select value={modelId} onValueChange={(v) => v && setModelId(v)}>
          <SelectTrigger className="h-8 w-48">
            <span className="flex items-center gap-1.5">
              <Database className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <PageBody className="space-y-4">
        {/* KPI şeridi */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Toplam Kayıt"
              value={kpis.total}
              delta={6}
              trend={sparkFor(3)}
              icon={Rows}
              hint={model?.tableName}
            />
            <KpiCard
              label="Yayında"
              value={kpis.active}
              delta={4}
              trend={sparkFor(7)}
              icon={ShieldCheck}
              onClick={() => setStatusFilter("active")}
            />
            <KpiCard
              label="Taslak"
              value={kpis.drafts}
              delta={statusCounts.draft > 4 ? 12 : -3}
              trend={sparkFor(11)}
              icon={PencilSimple}
              onClick={() => setStatusFilter("draft")}
            />
            <KpiCard
              label="Arşiv"
              value={kpis.archived}
              delta={2}
              invert
              trend={sparkFor(5)}
              icon={CloudArrowUp}
              onClick={() => setStatusFilter("archived")}
            />
          </div>
        )}

        {/* Filtre şeridi */}
        <FilterBar
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={`${model?.name ?? ""} kayıtlarında ara…`}
          onExport={() => exportData("all", "csv")}
          columns={baseFields.map((f) => ({
            key: colKey(f),
            label: f.name,
            visible: !hidden.has(f.name),
            toggle: () =>
              setHidden((prev) => {
                const next = new Set(prev);
                next.has(f.name) ? next.delete(f.name) : next.add(f.name);
                return next;
              }),
          }))}
        >
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              count={statusCounts[s]}
              onClick={() => {
                setStatusFilter(s);
                setPage(0);
              }}
            >
              {s === "all" ? "Tümü" : STATUS_META[s as RecordStatus].label}
            </FilterChip>
          ))}
        </FilterBar>

        {/* Toplu işlem şeridi */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => exportData("selected", "csv")}>
            <Download className="size-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => exportData("selected", "json")}>
            <Download className="size-3.5" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => {
              const ids = new Set(selected);
              const prevStatus = new Map(rows.filter((r) => ids.has(r.id)).map((r) => [r.id, r._status]));
              const count = ids.size;
              setRows((prev) =>
                prev.map((r) =>
                  ids.has(r.id) ? { ...r, _status: "archived", _updatedAt: "az önce" } : r,
                ),
              );
              setSelected(new Set());
              toastUndo(`${count} kayıt arşivlendi`, {
                onUndo: () => {
                  setRows((prev) =>
                    prev.map((r) =>
                      prevStatus.has(r.id) ? { ...r, _status: prevStatus.get(r.id)! } : r,
                    ),
                  );
                  toast.info(`${count} kayıt geri yüklendi`);
                },
              });
            }}
          >
            <CloudArrowUp className="size-3.5" /> Arşivle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={busyDelete}
            className="h-7 gap-1.5 text-red-400 hover:text-red-300"
            onClick={bulkDelete}
          >
            <Trash className="size-3.5" /> Sil
          </Button>
        </BulkBar>

        {/* İçerik */}
        {loading ? (
          <TableSkeleton rows={8} cols={Math.min(7, visibleFields.length + 3)} />
        ) : filtered.length === 0 ? (
          search || statusFilter !== "all" ? (
            <EmptyState
              icon={MagnifyingGlass}
              variant="search"
              title="Eşleşen kayıt yok"
              description="Arama veya durum filtresini gevşetmeyi deneyin."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={TableIcon}
              title={`${model?.name ?? "Model"} henüz kayıt içermiyor`}
              description="İlk kaydı ekleyerek veya bir CSV/JSON dosyası import ederek başlayın."
              action={
                <Button size="sm" className="gap-1.5" onClick={addRecord}>
                  <Plus className="size-4" /> Yeni Kayıt
                </Button>
              }
            />
          )
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-end border-b bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground/70">
              <span className="font-mono">↑↓ gez · Enter aç · Esc temizle</span>
            </div>
            <div
              ref={containerRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              className="overflow-x-auto outline-none"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={toggleAllPage}
                        aria-label="Sayfadaki tümünü seç"
                      />
                    </th>
                    <th className="w-16 px-2 py-2.5 font-medium">ID</th>
                    {visibleFields.map((f) => (
                      <th key={f.id} className="px-3 py-2.5 font-medium">
                        <span className="flex items-center gap-1">
                          {f.name}
                          <span className="rounded bg-muted px-1 text-[9px] font-mono text-muted-foreground/70">
                            {f.type}
                          </span>
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium">Durum</th>
                    <th className="px-3 py-2.5 font-medium">Güncelleme</th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => {
                    const isSel = selected.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        data-nav-index={i}
                        onMouseEnter={() => setActive(i)}
                        className={cn(
                          "border-b transition-colors last:border-0 hover:bg-accent/30",
                          isSel && "bg-primary/5",
                          active === i && "bg-accent/40 ring-1 ring-inset ring-primary/40",
                        )}
                      >
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isSel} onCheckedChange={() => toggleOne(r.id)} aria-label={`#${r.id} seç`} />
                        </td>
                        <td
                          className="cursor-pointer px-2 py-2 font-mono text-xs text-muted-foreground"
                          onClick={() => setDrawerRow(r)}
                        >
                          #{r.id}
                        </td>
                        {visibleFields.map((f) => {
                          const isEditing = editing?.id === r.id && editing.field === f.name;
                          const v = r[f.name];
                          return (
                            <td key={f.id} className="px-3 py-2">
                              {isEditing ? (
                                <span className="flex items-center gap-1">
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitEdit();
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    className="h-7 w-full min-w-24 rounded border bg-background px-1.5 text-sm outline-none focus:border-primary/50"
                                  />
                                  <button
                                    onClick={commitEdit}
                                    className="text-emerald-400 hover:text-emerald-300"
                                    aria-label="Kaydet"
                                  >
                                    <Check className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-muted-foreground hover:text-foreground"
                                    aria-label="İptal"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </span>
                              ) : (
                                <button
                                  className="group/cell flex max-w-[14rem] items-center gap-1.5 text-left"
                                  onDoubleClick={() => startEdit(r, f.name)}
                                  onClick={() => setDrawerRow(r)}
                                  title="Çift tıkla: düzenle"
                                >
                                  {typeof v === "boolean" ? (
                                    <Badge variant={v ? "default" : "secondary"} className="text-[10px]">
                                      {String(v)}
                                    </Badge>
                                  ) : (
                                    <span
                                      className={cn(
                                        "truncate",
                                        typeof v === "number" && "font-mono tabular-nums",
                                      )}
                                    >
                                      {cellToString(v)}
                                    </span>
                                  )}
                                  <Pencil className="size-3 shrink-0 opacity-0 transition-opacity group-hover/cell:opacity-50" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2">
                          <Badge variant={STATUS_META[r._status].variant} className="text-[10px]">
                            {STATUS_META[r._status].label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          <span className="block">{r._updatedAt}</span>
                          <span className="block truncate text-[10px] text-muted-foreground/70">{r._updatedBy}</span>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setDrawerRow(r)}
                            aria-label="Detay"
                          >
                            <ClockCounterClockwise className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sayfalama */}
            <div className="flex items-center justify-between gap-3 border-t px-3 py-2.5 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {filtered.length} kayıttan {safePage * PAGE_SIZE + 1}–
                {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} arası
              </span>
              <span className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <CaretLeft className="size-3.5" /> Önceki
                </Button>
                <span className="px-1 tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Sonraki <CaretRight className="size-3.5" />
                </Button>
              </span>
            </div>
          </div>
        )}
      </PageBody>

      {/* Detay paneli */}
      <DetailDrawer
        open={!!drawerRow}
        onOpenChange={(v) => !v && setDrawerRow(null)}
        title={drawerRow ? `#${drawerRow.id}` : ""}
        subtitle={model ? `${model.name} · ${model.tableName}` : undefined}
        badge={
          drawerRow ? (
            <Badge variant={STATUS_META[drawerRow._status].variant} className="text-[10px]">
              {STATUS_META[drawerRow._status].label}
            </Badge>
          ) : undefined
        }
        tabs={drawerTabs}
        footer={
          drawerRow ? (
            <div className="flex w-full items-center gap-2 p-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === drawerRow.id
                        ? { ...r, _status: r._status === "archived" ? "active" : "archived", _updatedAt: "az önce" }
                        : r,
                    ),
                  );
                  toast.success(drawerRow._status === "archived" ? "Yayına alındı" : "Arşivlendi");
                  setDrawerRow(null);
                }}
              >
                <ArrowsClockwise className="size-4" />
                {drawerRow._status === "archived" ? "Yayına al" : "Arşivle"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto gap-1.5 text-red-400 hover:text-red-300"
                onClick={() => deleteOne(drawerRow)}
              >
                <Trash className="size-4" /> Sil
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}
