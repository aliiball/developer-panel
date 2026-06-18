import { useMemo, useRef, useState } from "react";
import {
  Sparkle as Sparkles,
  ArrowsOutCardinal as Move,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsClockwise,
  GridFour,
  Graph,
  Table as TableIcon,
  Key,
  LinkSimple,
  Stack,
  DownloadSimple,
  Crosshair,
  Database,
  ArrowSquareOut,
  PlusCircle,
  PencilSimple,
  Eye,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useSchemaStore, type SchemaModel } from "~/stores/schema-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  KpiCard,
  FilterBar,
  FilterChip,
  DetailDrawer,
  Field,
  AuditTimeline,
  EmptyState,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { toast } from "sonner";

export function meta() {
  return [{ title: "ERD — MetaPanel" }];
}

interface Pos {
  x: number;
  y: number;
}

const NODE_W = 200;
const HEAD = 34;
const ROW_H = 18;

/* ── Layout motorları ───────────────────────────────────────────────
 * Aynı node setine farklı yerleşim: grid (4 kolon), daire ve dikey
 * "kademe". Drawer/kontrol şeridinden değiştirilebilir.
 */
type LayoutKind = "grid" | "circle" | "stack";

function computeLayout(models: SchemaModel[], kind: LayoutKind): Record<string, Pos> {
  if (kind === "circle") {
    const cx = 520;
    const cy = 340;
    const r = 60 + models.length * 26;
    return Object.fromEntries(
      models.map((m, i) => {
        const a = (i / models.length) * Math.PI * 2 - Math.PI / 2;
        return [m.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }];
      }),
    );
  }
  if (kind === "stack") {
    return Object.fromEntries(
      models.map((m, i) => [
        m.id,
        { x: 60 + (i % 2) * (NODE_W + 120), y: 40 + Math.floor(i / 2) * 200 },
      ]),
    );
  }
  // grid
  return Object.fromEntries(
    models.map((m, i) => [
      m.id,
      { x: 40 + (i % 4) * 250, y: 40 + Math.floor(i / 4) * 240 },
    ]),
  );
}

function nodeHeight(m: SchemaModel) {
  return HEAD + 8 + Math.min(m.fields.length, 6) * ROW_H + (m.fields.length > 6 ? ROW_H : 0);
}

// Free-positioned ERD. Nodes draggable via pointer events; relation fields are
// drawn as edges between model boxes.
export default function ERD() {
  const allModels = useSchemaStore((s) => s.models);
  const models = useMemo(() => allModels.slice(0, 12), [allModels]);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const [layout, setLayout] = useState<LayoutKind>("grid");
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState("");
  const [onlyRelated, setOnlyRelated] = useState(false);
  const [onlyTimestamps, setOnlyTimestamps] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pos, setPos] = useState<Record<string, Pos>>(() => computeLayout(models, "grid"));

  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // Tüm ilişki kenarları (filtreden bağımsız sayım için).
  const allEdges = useMemo(
    () =>
      models.flatMap((m) =>
        m.fields
          .filter((f) => f.type === "relation" && f.relationModel)
          .map((f) => {
            const target = models.find((t) => t.name === f.relationModel);
            return target
              ? { from: m.id, to: target.id, label: f.name, self: target.id === m.id }
              : null;
          })
          .filter(Boolean) as { from: string; to: string; label: string; self: boolean }[],
      ),
    [models],
  );

  // İlişkiye bağlı node id seti (izole modelleri ayırt etmek için).
  const relatedIds = useMemo(() => {
    const s = new Set<string>();
    allEdges.forEach((e) => {
      s.add(e.from);
      s.add(e.to);
    });
    return s;
  }, [allEdges]);

  // Görünür node'lar: arama + filtre çipleri.
  const q = query.trim().toLowerCase();
  const visibleModels = useMemo(
    () =>
      models.filter((m) => {
        if (q && !m.name.toLowerCase().includes(q) && !m.tableName.toLowerCase().includes(q))
          return false;
        if (onlyRelated && !relatedIds.has(m.id)) return false;
        if (onlyTimestamps && !m.timestamps) return false;
        return true;
      }),
    [models, q, onlyRelated, onlyTimestamps, relatedIds],
  );
  const visibleIds = useMemo(() => new Set(visibleModels.map((m) => m.id)), [visibleModels]);

  // Sadece iki ucu da görünür olan kenarları çiz.
  const edges = useMemo(
    () => allEdges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to)),
    [allEdges, visibleIds],
  );

  const totalFields = models.reduce((a, m) => a + m.fields.length, 0);
  const isolated = models.filter((m) => !relatedIds.has(m.id)).length;
  const indexedCount = models.reduce(
    (a, m) => a + m.fields.filter((f) => f.indexed).length,
    0,
  );

  function onPointerDown(e: React.PointerEvent, id: string) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos[id];
    drag.current = { id, dx: e.clientX - p.x * zoom, dy: e.clientY - p.y * zoom, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { id, dx, dy } = drag.current;
    drag.current.moved = true;
    setPos((prev) => ({
      ...prev,
      [id]: { x: (e.clientX - dx) / zoom, y: (e.clientY - dy) / zoom },
    }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  function center(id: string) {
    const p = pos[id];
    const m = models.find((mm) => mm.id === id);
    const h = m ? nodeHeight(m) : HEAD;
    return { x: p.x + NODE_W / 2, y: p.y + h / 2 };
  }

  function applyLayout(kind: LayoutKind) {
    setLayout(kind);
    setPos(computeLayout(models, kind));
    toast.success(`Yerleşim: ${LAYOUT_LABEL[kind]} uygulandı`);
  }

  function fit() {
    setZoom(1);
    setPos(computeLayout(models, layout));
    toast.info("Görünüm sıfırlandı");
  }

  function exportJson() {
    const payload = {
      generatedAt: new Date().toISOString(),
      layout,
      nodes: models.map((m) => ({
        id: m.id,
        name: m.name,
        table: m.tableName,
        fields: m.fields.length,
        position: pos[m.id],
      })),
      edges: allEdges.map((e) => ({ from: e.from, to: e.to, via: e.label })),
    };
    try {
      void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
      toast.success("ERD JSON panoya kopyalandı", {
        description: `${models.length} node · ${allEdges.length} ilişki`,
      });
    } catch {
      toast.success("ERD JSON dışa aktarıldı");
    }
  }

  const selectedModel = selected ? models.find((m) => m.id === selected) ?? null : null;

  return (
    <>
      <PageHeader
        title="ERD"
        description="Varlık-ilişki diyagramı. Node'ları sürükleyin; ilişkiler otomatik çizilir."
        actions={[
          {
            label: "Export",
            icon: DownloadSimple,
            variant: "outline",
            onClick: exportJson,
          },
          {
            label: "AI: İlişki Öner",
            icon: Sparkles,
            variant: "default",
            onClick: () => {
              queuePrompt(
                "Mevcut modeller arasında eksik ilişkileri ve foreign key'leri öner.",
              );
              toast.info("Copilot ilişkileri analiz ediyor…");
            },
          },
        ]}
      />
      <PageBody grid={false} className="space-y-4 p-4">
        {/* KPI şeridi */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Varlık (Node)"
            value={models.length}
            delta={9}
            trend={[6, 7, 7, 8, 9, 10, 12, models.length]}
            icon={TableIcon}
            hint="şemada"
          />
          <KpiCard
            label="İlişki (Edge)"
            value={allEdges.length}
            delta={14}
            trend={[3, 4, 5, 5, 6, 7, 8, allEdges.length]}
            icon={LinkSimple}
            hint="foreign key"
          />
          <KpiCard
            label="İzole varlık"
            value={isolated}
            delta={isolated > 0 ? 25 : 0}
            invert
            trend={[3, 3, 2, 2, 2, 1, 1, isolated]}
            icon={Crosshair}
            hint="bağlantısız"
          />
          <KpiCard
            label="Indexed alan"
            value={indexedCount}
            delta={6}
            trend={[10, 11, 12, 12, 13, 14, 15, indexedCount]}
            icon={Key}
            hint={`${totalFields} alan içinde`}
          />
        </div>

        {/* Kontrol şeridi: arama + filtre çipleri + layout/zoom */}
        <div className="space-y-2">
          <FilterBar
            search={query}
            onSearch={setQuery}
            placeholder="Varlık / tablo ara…"
            onExport={exportJson}
          >
            <FilterChip active={onlyRelated} onClick={() => setOnlyRelated((v) => !v)}>
              İlişkili
            </FilterChip>
            <FilterChip
              active={onlyTimestamps}
              onClick={() => setOnlyTimestamps((v) => !v)}
            >
              Timestamps
            </FilterChip>
          </FilterBar>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/60 px-2.5 py-2">
            <span className="text-xs font-medium text-muted-foreground">Yerleşim</span>
            <div className="flex items-center gap-1">
              <LayoutButton
                active={layout === "grid"}
                icon={GridFour}
                label="Grid"
                onClick={() => applyLayout("grid")}
              />
              <LayoutButton
                active={layout === "circle"}
                icon={Graph}
                label="Daire"
                onClick={() => applyLayout("circle")}
              />
              <LayoutButton
                active={layout === "stack"}
                icon={Stack}
                label="Kademe"
                onClick={() => applyLayout("stack")}
              />
            </div>

            <div className="mx-1 h-5 w-px bg-border" />

            <span className="text-xs font-medium text-muted-foreground">Zoom</span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Uzaklaş"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            >
              <MagnifyingGlassMinus />
            </Button>
            <span className="w-10 text-center font-mono text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Yakınlaş"
              onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}
            >
              <MagnifyingGlassPlus />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={fit}>
              <ArrowsClockwise className="size-3.5" /> Sıfırla
            </Button>

            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <TableIcon className="size-3" /> {visibleModels.length}/{models.length}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <LinkSimple className="size-3" /> {edges.length} edge
              </Badge>
            </div>
          </div>
        </div>

        {/* Tuval */}
        {visibleModels.length === 0 ? (
          <EmptyState
            icon={Database}
            variant="search"
            title="Eşleşen varlık yok"
            description="Arama veya filtre kriterlerini gevşetin; tüm node'ları görmek için filtreleri temizleyin."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setOnlyRelated(false);
                  setOnlyTimestamps(false);
                }}
              >
                Filtreleri temizle
              </Button>
            }
          />
        ) : (
          <div
            ref={wrap}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="mp-grid relative h-[calc(100vh-21rem)] overflow-hidden rounded-xl border"
          >
            {/* Köşedeki canlı istatistik (mini-harita hissi) */}
            <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-lg border bg-card/90 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                <Move className="size-3" /> {layout} · {Math.round(zoom * 100)}%
              </div>
            </div>

            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ transform: `scale(${zoom})`, width: "200%", height: "200%" }}
            >
              <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
                {edges.map((e, i) => {
                  const a = center(e.from);
                  const b = center(e.to);
                  const mx = (a.x + b.x) / 2;
                  const hot =
                    selected && (e.from === selected || e.to === selected);
                  return (
                    <g key={i} opacity={selected && !hot ? 0.18 : 1}>
                      <path
                        d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
                        fill="none"
                        stroke="var(--primary)"
                        strokeOpacity={hot ? 0.85 : 0.4}
                        strokeWidth={hot ? 2.2 : 1.5}
                      />
                      <circle cx={b.x} cy={b.y} r={3.5} fill="var(--primary)" />
                    </g>
                  );
                })}
              </svg>

              {visibleModels.map((m) => {
                const active = selected === m.id;
                const dim = selected && !active;
                return (
                  <div
                    key={m.id}
                    style={{ left: pos[m.id].x, top: pos[m.id].y, width: NODE_W }}
                    className={
                      "absolute rounded-lg border bg-card shadow-sm transition-[box-shadow,border-color,opacity] " +
                      (active
                        ? "border-primary/60 ring-1 ring-primary/40"
                        : "hover:border-primary/40") +
                      (dim ? " opacity-50" : "")
                    }
                    onClick={() => {
                      if (drag.current?.moved) return;
                      setSelected(m.id);
                    }}
                  >
                    <div
                      onPointerDown={(e) => onPointerDown(e, m.id)}
                      className="flex cursor-grab items-center gap-1.5 rounded-t-lg border-b bg-muted/50 px-2.5 py-1.5 active:cursor-grabbing"
                    >
                      <Move className="size-3 text-muted-foreground" />
                      <span className="truncate text-xs font-semibold">{m.name}</span>
                      {!relatedIds.has(m.id) && (
                        <Crosshair className="size-3 text-amber-400" />
                      )}
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                        {m.fields.length}
                      </span>
                    </div>
                    <div className="space-y-0.5 p-2">
                      {m.fields.slice(0, 6).map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-2 font-mono text-[10px]"
                        >
                          <span
                            className={
                              "flex items-center gap-1 truncate " +
                              (f.type === "relation" ? "text-primary" : "")
                            }
                          >
                            {f.unique && <Key className="size-2.5 text-amber-400" />}
                            {f.type === "relation" && <LinkSimple className="size-2.5" />}
                            {f.name}
                          </span>
                          <span className="shrink-0 text-muted-foreground">{f.type}</span>
                        </div>
                      ))}
                      {m.fields.length > 6 && (
                        <div className="font-mono text-[10px] text-muted-foreground">
                          +{m.fields.length - 6} daha
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PageBody>

      <NodeDrawer
        model={selectedModel}
        edges={allEdges}
        models={models}
        related={selectedModel ? relatedIds.has(selectedModel.id) : false}
        onOpenChange={(v) => !v && setSelected(null)}
        onAsk={(p) => {
          queuePrompt(p);
          toast.info("Copilot'a iletildi…");
        }}
        onFocus={(id) => {
          setSelected(id);
        }}
      />
    </>
  );
}

/* ── Yerleşim butonu ────────────────────────────────────────────────── */
const LAYOUT_LABEL: Record<LayoutKind, string> = {
  grid: "Grid",
  circle: "Daire",
  stack: "Kademe",
};

function LayoutButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof GridFour;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="gap-1.5"
      onClick={onClick}
      aria-pressed={active}
    >
      <Icon className="size-3.5" /> {label}
    </Button>
  );
}

/* ── Seçili node detay drawer'ı ─────────────────────────────────────── */
function NodeDrawer({
  model,
  edges,
  models,
  related,
  onOpenChange,
  onAsk,
  onFocus,
}: {
  model: SchemaModel | null;
  edges: { from: string; to: string; label: string; self: boolean }[];
  models: SchemaModel[];
  related: boolean;
  onOpenChange: (v: boolean) => void;
  onAsk: (prompt: string) => void;
  onFocus: (id: string) => void;
}) {
  if (!model) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} title="" />;
  }

  const nameById = (id: string) => models.find((m) => m.id === id)?.name ?? id;
  const outgoing = edges.filter((e) => e.from === model.id);
  const incoming = edges.filter((e) => e.to === model.id && e.from !== model.id);

  const audit: AuditEvent[] = [
    {
      id: "a1",
      actor: "Schema Studio",
      action: `"${model.name}" varlığı diyagrama eklendi`,
      at: "2 gün önce",
      icon: PlusCircle,
      tone: "emerald",
      detail: `tablo: ${model.tableName}`,
    },
    {
      id: "a2",
      actor: "AI Copilot",
      action: `${outgoing.length} ilişki alanı tespit edildi`,
      at: "6 saat önce",
      icon: LinkSimple,
      tone: "primary",
      detail: outgoing.map((e) => `${e.label} → ${nameById(e.to)}`).join(", ") || "ilişki yok",
    },
    {
      id: "a3",
      actor: "turksab.yonetim",
      action: "alan sırası diyagram üzerinde düzenlendi",
      at: "3 saat önce",
      icon: PencilSimple,
      tone: "default",
    },
  ];

  const tabs: DrawerTab[] = [
    {
      value: "genel",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card/50 p-1">
            <Field label="Varlık">{model.name}</Field>
            <Field label="Tablo" mono>
              {model.tableName}
            </Field>
            <Field label="Alan sayısı">{model.fields.length}</Field>
            <Field label="İlişki">
              {outgoing.length} giden · {incoming.length} gelen
            </Field>
            <Field label="Durum">
              {related ? (
                <Badge variant="secondary">Bağlı</Badge>
              ) : (
                <Badge variant="destructive">İzole</Badge>
              )}
            </Field>
            <Field label="Özellik">
              <span className="inline-flex flex-wrap justify-end gap-1">
                {model.timestamps && <Badge variant="outline">timestamps</Badge>}
                {model.softDelete && <Badge variant="outline">soft-delete</Badge>}
              </span>
            </Field>
          </div>

          {model.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {model.description}
            </p>
          )}

          {/* Alanlar */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Alanlar</p>
            <div className="overflow-hidden rounded-lg border">
              {model.fields.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5 font-mono text-[11px] last:border-0"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {f.unique && <Key className="size-3 text-amber-400" />}
                    {f.type === "relation" && (
                      <LinkSimple className="size-3 text-primary" />
                    )}
                    {f.name}
                    {f.required && <span className="text-red-400">*</span>}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {f.type === "relation" ? `→ ${f.relationModel}` : f.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* İlişkili varlıklar */}
          {(outgoing.length > 0 || incoming.length > 0) && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                İlişkili varlıklar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {outgoing.map((e, i) => (
                  <button
                    key={`o${i}`}
                    onClick={() => onFocus(e.to)}
                    className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <ArrowSquareOut className="size-3" />
                    {nameById(e.to)}
                    <span className="text-[10px] text-muted-foreground">({e.label})</span>
                  </button>
                ))}
                {incoming.map((e, i) => (
                  <button
                    key={`i${i}`}
                    onClick={() => onFocus(e.from)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed bg-card px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Eye className="size-3" />
                    {nameById(e.from)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      value: "aktivite",
      label: "Aktivite",
      content: <AuditTimeline events={audit} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(
            {
              id: model.id,
              name: model.name,
              tableName: model.tableName,
              timestamps: model.timestamps,
              softDelete: model.softDelete,
              fields: model.fields.map((f) => ({
                name: f.name,
                type: f.type,
                required: f.required,
                unique: f.unique,
                indexed: f.indexed,
                ...(f.relationModel ? { relationModel: f.relationModel } : {}),
              })),
            },
            null,
            2,
          )}
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open
      onOpenChange={onOpenChange}
      title={model.name}
      subtitle={`${model.tableName} · ${model.fields.length} alan`}
      badge={
        related ? (
          <Badge variant="secondary">{outgoing.length + incoming.length} ilişki</Badge>
        ) : (
          <Badge variant="destructive">İzole</Badge>
        )
      }
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              onAsk(
                `${model.name} (${model.tableName}) varlığı için indeks ve ilişki iyileştirmeleri öner.`,
              )
            }
          >
            <Sparkles className="size-3.5" /> AI: Öneri al
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => {
              void navigator.clipboard?.writeText(model.tableName);
              toast.success("Tablo adı kopyalandı", { description: model.tableName });
            }}
          >
            <DownloadSimple className="size-3.5" /> Tablo adı
          </Button>
        </div>
      }
    />
  );
}
