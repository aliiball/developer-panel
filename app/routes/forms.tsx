import { useMemo, useState } from "react";
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
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  Sparkle as Sparkles,
  Eraser,
  TextT,
  Hash,
  Envelope,
  TextAlignLeft,
  CaretDown,
  CheckSquare,
  RadioButton,
  Calendar,
  UploadSimple,
  TextH,
  Minus,
  Stack,
  ListChecks,
  Asterisk,
  FloppyDisk,
  FileDashed,
  DeviceMobile,
  Monitor,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  PlusCircle,
  ClockCounterClockwise,
  PencilSimple,
  Info,
  type Icon,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { CanvasField } from "~/components/forms/FormCanvas";
import { FieldRenderer } from "~/components/forms/FieldRenderer";
import {
  useFormStore,
  type FormFieldDef,
  type FormFieldKind,
} from "~/stores/form-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import {
  KpiCard,
  EmptyState,
  DetailDrawer,
  Field as DetailField,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import {
  FORM_TEMPLATES,
  FIELD_AUDIT,
  type FormTemplate,
} from "~/data/seed.forms";

export function meta() {
  return [{ title: "Form Builder — MetaPanel" }];
}

/* ── Palet kategorileri ─────────────────────────────────────────────
 * Düz liste yerine anlam gruplarına ayrılmış palet: temel girdiler,
 * seçim alanları, yapı/düzen elemanları.
 */
interface PaletteItem {
  kind: FormFieldKind;
  label: string;
  icon: Icon;
  hint: string;
}
interface PaletteGroup {
  title: string;
  items: PaletteItem[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    title: "Temel Girdiler",
    items: [
      { kind: "text", label: "Metin", icon: TextT, hint: "Tek satır serbest metin" },
      { kind: "number", label: "Sayı", icon: Hash, hint: "Sayısal değer" },
      { kind: "email", label: "E-posta", icon: Envelope, hint: "E-posta formatı doğrular" },
      { kind: "textarea", label: "Uzun metin", icon: TextAlignLeft, hint: "Çok satırlı alan" },
      { kind: "date", label: "Tarih", icon: Calendar, hint: "Tarih seçici" },
      { kind: "file", label: "Dosya", icon: UploadSimple, hint: "Dosya yükleme" },
    ],
  },
  {
    title: "Seçim Alanları",
    items: [
      { kind: "select", label: "Açılır liste", icon: CaretDown, hint: "Tek seçim dropdown" },
      { kind: "radio", label: "Seçenek", icon: RadioButton, hint: "Tekli radio grubu" },
      { kind: "checkbox", label: "Onay kutusu", icon: CheckSquare, hint: "Boolean onay" },
    ],
  },
  {
    title: "Yapı & Düzen",
    items: [
      { kind: "heading", label: "Başlık", icon: TextH, hint: "Bölüm başlığı" },
      { kind: "divider", label: "Ayraç", icon: Minus, hint: "Görsel ayraç çizgisi" },
    ],
  },
];

const KIND_ICON: Record<FormFieldKind, Icon> = {
  text: TextT,
  number: Hash,
  email: Envelope,
  textarea: TextAlignLeft,
  select: CaretDown,
  checkbox: CheckSquare,
  radio: RadioButton,
  date: Calendar,
  file: UploadSimple,
  heading: TextH,
  divider: Minus,
};

const KIND_LABEL: Record<FormFieldKind, string> = {
  text: "Metin",
  number: "Sayı",
  email: "E-posta",
  textarea: "Uzun metin",
  select: "Açılır liste",
  checkbox: "Onay kutusu",
  radio: "Seçenek",
  date: "Tarih",
  file: "Dosya",
  heading: "Başlık",
  divider: "Ayraç",
};

const HAS_PLACEHOLDER = new Set<FormFieldKind>(["text", "number", "email", "textarea"]);
const HAS_OPTIONS = new Set<FormFieldKind>(["select", "radio"]);
const STRUCTURAL = new Set<FormFieldKind>(["heading", "divider"]);

/* ── Validasyon kural çıkarımı ──────────────────────────────────────
 * Alan tanımından, önizlemede simüle edilebilen kural listesi türetir.
 */
interface Rule {
  label: string;
  tone: "default" | "primary" | "amber";
}
function rulesFor(f: FormFieldDef): Rule[] {
  const rules: Rule[] = [];
  if (f.required) rules.push({ label: "Zorunlu", tone: "amber" });
  if (f.kind === "email") rules.push({ label: "E-posta formatı", tone: "primary" });
  if (f.kind === "number") rules.push({ label: "Sayısal değer", tone: "primary" });
  if (f.kind === "file") rules.push({ label: "Dosya türü kısıtı", tone: "default" });
  if (HAS_OPTIONS.has(f.kind))
    rules.push({ label: `${(f.options ?? []).length} seçenek`, tone: "default" });
  if (f.validation) rules.push({ label: f.validation, tone: "primary" });
  if (f.showWhen) rules.push({ label: `Koşullu: ${f.showWhen}`, tone: "default" });
  return rules;
}

/* ── Sahte form sağlık skoru ────────────────────────────────────────
 * Tamamlanmışlık/erişilebilirlik için basit bir kalite skoru.
 */
function healthScore(fields: FormFieldDef[]): number {
  if (fields.length === 0) return 0;
  let score = 0;
  let max = 0;
  for (const f of fields) {
    if (STRUCTURAL.has(f.kind)) continue;
    max += 3;
    if (f.label && f.label.trim().length > 1) score += 1;
    if (f.helpText) score += 1;
    if (HAS_PLACEHOLDER.has(f.kind) ? f.placeholder : true) score += 1;
  }
  return max === 0 ? 100 : Math.round((score / max) * 100);
}

export default function Forms() {
  const fields = useFormStore((s) => s.fields);
  const selectedId = useFormStore((s) => s.selectedId);
  const { add, update, remove, reorder, select, addMany } = useFormStore();
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [paletteQuery, setPaletteQuery] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [formName, setFormName] = useState("İletişim Formu");

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const drawerField = fields.find((f) => f.id === drawerId) ?? null;

  /* ── Türetilmiş metrikler (KPI şeridi) ── */
  const inputCount = fields.filter((f) => !STRUCTURAL.has(f.kind)).length;
  const requiredCount = fields.filter((f) => f.required).length;
  const ruleCount = useMemo(
    () => fields.reduce((n, f) => n + rulesFor(f).length, 0),
    [fields],
  );
  const health = healthScore(fields);

  const filteredGroups = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return PALETTE_GROUPS;
    return PALETTE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (it) => it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [paletteQuery]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from !== -1 && to !== -1) reorder(from, to);
  }

  const schema = {
    name: formName,
    fields: fields.map((f) => ({
      name: f.label,
      type: f.kind,
      required: f.required ?? false,
      ...(f.placeholder ? { placeholder: f.placeholder } : {}),
      ...(f.helpText ? { helpText: f.helpText } : {}),
      ...(f.validation ? { validation: f.validation } : {}),
      ...(f.showWhen ? { showWhen: f.showWhen } : {}),
      ...(f.options ? { options: f.options } : {}),
    })),
  };

  function loadTemplate(t: FormTemplate) {
    // Mevcut tüm alanları temizle, şablonu yükle.
    for (const f of [...fields]) remove(f.id);
    addMany(t.fields);
    setFormName(t.name);
    setTplOpen(false);
    toast.success(`"${t.name}" şablonu yüklendi`, {
      description: `${t.fields.length} alan eklendi`,
    });
  }

  function exportSchema() {
    toast.success("JSON şema panoya kopyalandı", {
      description: `${fields.length} alan · ${formName}`,
    });
  }

  function saveForm() {
    setSaveOpen(false);
    toast.success(`"${formName}" kaydedildi`, {
      description: `${inputCount} girdi · ${ruleCount} kural · sağlık %${health}`,
    });
  }

  /* ── DetailDrawer sekmeleri ── */
  const drawerTabs: DrawerTab[] | undefined = drawerField
    ? buildDrawerTabs(drawerField)
    : undefined;

  return (
    <>
      <PageHeader
        title="Form Builder"
        description="Sürükle-bırak form oluşturucu. Soldan alan ekle, ortada düzenle, sağda kuralla."
        actions={[
          { label: "Şablonlar", icon: FileDashed, variant: "outline", onClick: () => setTplOpen(true) },
          {
            label: "AI ile Form",
            icon: Sparkles,
            variant: "outline",
            onClick: () =>
              queuePrompt("Bir iletişim formu oluştur: ad, e-posta, konu, mesaj."),
          },
          { label: "Kaydet", icon: FloppyDisk, variant: "default", onClick: () => setSaveOpen(true) },
        ]}
      />

      <PageBody grid={false} className="flex h-full flex-col gap-4">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_300px]">
          {/* ── Palet (kategorili) ── */}
          <aside className="flex min-h-0 flex-col lg:border-r lg:pr-4">
            <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Alan Paleti
            </p>
            <Input
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              placeholder="Alan ara…"
              className="mb-3 h-8 text-xs"
            />
            <div className="mp-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {filteredGroups.length === 0 ? (
                <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                  Eşleşen alan yok.
                </p>
              ) : (
                filteredGroups.map((g) => (
                  <div key={g.title} className="space-y-1.5">
                    <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      {g.title}
                    </p>
                    <div className="space-y-1.5">
                      {g.items.map(({ kind, label, icon: Ic, hint }) => (
                        <button
                          key={kind}
                          onClick={() => {
                            add(kind);
                            toast.success(`"${label}" alanı eklendi`);
                          }}
                          title={hint}
                          className="group flex w-full items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent"
                        >
                          <Ic className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          <PlusCircle className="size-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-primary" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="mt-3 hidden items-center gap-1.5 px-1 text-[10px] text-muted-foreground/60 lg:flex">
              <Info className="size-3" /> Alana tıkla → sağda kuralla
            </p>
          </aside>

          {/* ── Tuval / Önizleme / JSON ── */}
          <Tabs defaultValue="canvas" className="flex min-h-0 min-w-0 flex-col">
            <div className="mb-3 flex items-center gap-2">
              <TabsList className="h-8">
                <TabsTrigger value="canvas" className="text-xs">Tuval</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Önizleme</TabsTrigger>
                <TabsTrigger value="json" className="text-xs">JSON Şema</TabsTrigger>
              </TabsList>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {fields.length} alan
              </span>
            </div>

            <TabsContent value="canvas" className="m-0 mp-scroll min-h-0 flex-1 overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 pb-4">
                    {fields.map((f) => (
                      <div key={f.id} className="group/wrap relative">
                        <CanvasField
                          field={f}
                          selected={f.id === selectedId}
                          onSelect={() => select(f.id)}
                          onDelete={() => {
                            remove(f.id);
                            toast.success("Alan silindi");
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerId(f.id);
                          }}
                          className="absolute bottom-2 right-2 z-10 rounded-md border bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/wrap:opacity-100"
                        >
                          Detay
                        </button>
                      </div>
                    ))}
                    {fields.length === 0 && (
                      <EmptyState
                        icon={Stack}
                        title="Form boş"
                        description="Soldaki paletten alan ekleyerek başlayın ya da hazır bir şablon yükleyin."
                        action={
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setTplOpen(true)}>
                              <FileDashed className="size-4" /> Şablon yükle
                            </Button>
                            <Button size="sm" onClick={() => add("text")}>
                              <PlusCircle className="size-4" /> Metin alanı ekle
                            </Button>
                          </div>
                        }
                      />
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="preview" className="m-0 mp-scroll min-h-0 flex-1 overflow-y-auto">
              <div className="mb-3 flex items-center gap-2">
                <div className="inline-flex rounded-lg border bg-card p-0.5">
                  <button
                    onClick={() => setDevice("desktop")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      device === "desktop" ? "bg-accent text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Monitor className="size-3.5" /> Masaüstü
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      device === "mobile" ? "bg-accent text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <DeviceMobile className="size-3.5" /> Mobil
                  </button>
                </div>
                <Badge variant="outline" className="ml-auto gap-1">
                  <ShieldCheck className="size-3" /> {ruleCount} kural aktif
                </Badge>
              </div>

              {fields.length === 0 ? (
                <EmptyState
                  icon={Monitor}
                  title="Önizlenecek alan yok"
                  description="Tuvale alan ekledikçe canlı önizleme burada görünür."
                />
              ) : (
                <div
                  className={cn(
                    "mx-auto space-y-4 rounded-xl border bg-card p-5 transition-all",
                    device === "mobile" ? "max-w-xs" : "max-w-md",
                  )}
                >
                  <h2 className="text-sm font-semibold">{formName}</h2>
                  {fields.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <FieldRenderer field={f} />
                      {!STRUCTURAL.has(f.kind) && rulesFor(f).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rulesFor(f).map((r, i) => (
                            <span
                              key={i}
                              className={cn(
                                "rounded-full px-1.5 py-px text-[9px] font-medium",
                                r.tone === "amber"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : r.tone === "primary"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {r.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    className="w-full"
                    onClick={() =>
                      requiredCount > 0
                        ? toast.warning(`${requiredCount} zorunlu alan doldurulmalı`)
                        : toast.success("Form doğrulandı")
                    }
                  >
                    Gönder
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="m-0 min-h-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={exportSchema}>
                  <CheckCircle className="size-3.5" /> Kopyala
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  Bu şema API'ye gönderilen üretim çıktısıdır.
                </span>
              </div>
              <pre className="mp-scroll max-h-[calc(100vh-22rem)] overflow-auto rounded-xl border bg-card p-4 font-mono text-xs">
                <code>{JSON.stringify(schema, null, 2)}</code>
              </pre>
            </TabsContent>
          </Tabs>

          {/* ── Alan Özellikleri (derinleştirilmiş) ── */}
          <aside className="mp-scroll min-h-0 overflow-y-auto lg:border-l lg:pl-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Alan Özellikleri
              </p>
              {selected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs"
                  onClick={() => {
                    remove(selected.id);
                    toast.success("Alan silindi");
                  }}
                >
                  <Eraser className="size-3" /> Sil
                </Button>
              )}
            </div>
            <FieldPropsPanel
              field={selected}
              onChange={(patch) => selected && update(selected.id, patch)}
              onDetail={() => selected && setDrawerId(selected.id)}
            />
          </aside>
        </div>
      </PageBody>

      {/* ── Alan Detay Drawer ── */}
      <DetailDrawer
        open={!!drawerField}
        onOpenChange={(v) => !v && setDrawerId(null)}
        title={drawerField?.label ?? "Alan"}
        subtitle={drawerField ? KIND_LABEL[drawerField.kind] : undefined}
        badge={
          drawerField ? (
            <Badge variant={drawerField.required ? "default" : "outline"}>
              {drawerField.required ? "Zorunlu" : "Opsiyonel"}
            </Badge>
          ) : undefined
        }
        tabs={drawerTabs}
      />

      {/* ── Kaydet diyaloğu ── */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Formu kaydet</DialogTitle>
            <DialogDescription>
              Form yapısı ve {ruleCount} validasyon kuralı kaydedilecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Form adı</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Alan" value={fields.length} />
              <Stat label="Kural" value={ruleCount} />
              <Stat label="Sağlık" value={`%${health}`} />
            </div>
            {health < 70 && (
              <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
                <WarningCircle className="mt-px size-3.5 shrink-0" />
                Form sağlığı düşük: alanlara yardım metni ve placeholder eklemeyi düşünün.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>İptal</Button>
            <Button onClick={saveForm} disabled={fields.length === 0}>
              <FloppyDisk className="size-4" /> Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Şablon galerisi ── */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Form şablonları</DialogTitle>
            <DialogDescription>
              Hazır bir şablon yükle — mevcut alanların yerini alır.
            </DialogDescription>
          </DialogHeader>
          <div className="mp-scroll max-h-[60vh] space-y-2 overflow-y-auto py-1">
            {FORM_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <t.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">{t.fields.length} alan</Badge>
                    <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Sağ panel: derinleştirilmiş alan özellik editörü ───────────────── */
function FieldPropsPanel({
  field,
  onChange,
  onDetail,
}: {
  field: FormFieldDef | null;
  onChange: (patch: Partial<FormFieldDef>) => void;
  onDetail: () => void;
}) {
  if (!field) {
    return (
      <EmptyState
        icon={PencilSimple}
        title="Alan seçili değil"
        description="Özelliklerini ve validasyon kurallarını düzenlemek için tuvalden bir alan seçin."
      />
    );
  }

  const Ic = KIND_ICON[field.kind];

  return (
    <Tabs defaultValue="general" className="flex flex-col">
      <div className="mb-3 flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2">
        <Ic className="size-4 text-primary" />
        <span className="text-sm font-medium">{KIND_LABEL[field.kind]}</span>
        <button
          onClick={onDetail}
          className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
        >
          Detay →
        </button>
      </div>

      <TabsList className="mb-3 grid h-8 grid-cols-2">
        <TabsTrigger value="general" className="text-xs">Genel</TabsTrigger>
        <TabsTrigger value="validation" className="text-xs">Validasyon</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="m-0 space-y-3">
        <Row label="Etiket">
          <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} className="h-8" />
        </Row>

        {HAS_PLACEHOLDER.has(field.kind) && (
          <Row label="Placeholder">
            <Input
              value={field.placeholder ?? ""}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              className="h-8"
            />
          </Row>
        )}

        {HAS_OPTIONS.has(field.kind) && (
          <Row label="Seçenekler (her satıra bir)">
            <Textarea
              value={(field.options ?? []).join("\n")}
              onChange={(e) =>
                onChange({ options: e.target.value.split("\n").filter(Boolean) })
              }
              className="min-h-20 text-sm"
            />
          </Row>
        )}

        {!STRUCTURAL.has(field.kind) && (
          <Row label="Yardım metni">
            <Input
              value={field.helpText ?? ""}
              onChange={(e) => onChange({ helpText: e.target.value })}
              className="h-8"
              placeholder="Kullanıcıya ipucu…"
            />
          </Row>
        )}
      </TabsContent>

      <TabsContent value="validation" className="m-0 space-y-3">
        {STRUCTURAL.has(field.kind) ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Yapısal alanlarda validasyon kuralı bulunmaz.
          </p>
        ) : (
          <>
            <label className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5">
                <Asterisk className="size-3.5 text-amber-400" /> Zorunlu alan
              </span>
              <Switch
                checked={field.required ?? false}
                onCheckedChange={(v) => onChange({ required: v })}
              />
            </label>

            <Row label="Validasyon kuralı">
              <Select
                value={field.validation ?? "none"}
                onValueChange={(v) => onChange({ validation: !v || v === "none" ? undefined : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Kural seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yok</SelectItem>
                  <SelectItem value="min:3">En az 3 karakter</SelectItem>
                  <SelectItem value="max:255">En fazla 255 karakter</SelectItem>
                  <SelectItem value="regex:^[A-Za-z ]+$">Yalnızca harf</SelectItem>
                  <SelectItem value="url">Geçerli URL</SelectItem>
                  <SelectItem value="phone:TR">Telefon (TR)</SelectItem>
                </SelectContent>
              </Select>
            </Row>

            <Row label="Koşullu görünürlük (alan adı)">
              <Input
                value={field.showWhen ?? ""}
                onChange={(e) => onChange({ showWhen: e.target.value })}
                placeholder="örn. abonelik"
                className="h-8"
              />
            </Row>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Aktif kurallar</Label>
              <div className="flex flex-wrap gap-1">
                {rulesFor(field).length === 0 ? (
                  <span className="text-xs text-muted-foreground">Kural yok</span>
                ) : (
                  rulesFor(field).map((r, i) => (
                    <Badge
                      key={i}
                      variant={r.tone === "amber" ? "destructive" : r.tone === "primary" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {r.label}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Drawer sekme üretimi ── */
function buildDrawerTabs(f: FormFieldDef): DrawerTab[] {
  const rules = rulesFor(f);
  const auditSeed = FIELD_AUDIT[f.kind] ?? FIELD_AUDIT.text;
  const events: AuditEvent[] = [
    {
      id: `${f.id}-now`,
      action: "alanı düzenliyor",
      actor: "Sen",
      at: "şimdi",
      icon: PencilSimple,
      tone: "primary",
    },
    ...auditSeed.map((e, i) => ({
      id: `${f.id}-a${i}`,
      action: e.action,
      actor: e.actor,
      at: e.at,
      icon: ClockCounterClockwise as Icon,
      tone: e.tone,
      detail: e.detail,
    })),
  ];

  const fieldJson = {
    id: f.id,
    kind: f.kind,
    label: f.label,
    required: f.required ?? false,
    ...(f.placeholder ? { placeholder: f.placeholder } : {}),
    ...(f.helpText ? { helpText: f.helpText } : {}),
    ...(f.validation ? { validation: f.validation } : {}),
    ...(f.showWhen ? { showWhen: f.showWhen } : {}),
    ...(f.options ? { options: f.options } : {}),
  };

  return [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-1">
          <DetailField label="ID" mono>{f.id}</DetailField>
          <DetailField label="Tip">{KIND_LABEL[f.kind]}</DetailField>
          <DetailField label="Etiket">{f.label}</DetailField>
          <DetailField label="Zorunlu">{f.required ? "Evet" : "Hayır"}</DetailField>
          {f.placeholder && <DetailField label="Placeholder">{f.placeholder}</DetailField>}
          {f.helpText && <DetailField label="Yardım">{f.helpText}</DetailField>}
          {f.validation && (
            <DetailField label="Kural" mono>{f.validation}</DetailField>
          )}
          {f.showWhen && <DetailField label="Koşul" mono>{f.showWhen}</DetailField>}
          {f.options && (
            <DetailField label="Seçenekler">{f.options.join(", ")}</DetailField>
          )}
          <div className="mt-3 border-t pt-3">
            <p className="mb-1.5 text-xs text-muted-foreground">Aktif kurallar</p>
            <div className="flex flex-wrap gap-1">
              {rules.length === 0 ? (
                <span className="text-xs text-muted-foreground">Kural yok</span>
              ) : (
                rules.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{r.label}</Badge>
                ))
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={events} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-auto rounded-lg border bg-card p-3 font-mono text-xs">
          <code>{JSON.stringify(fieldJson, null, 2)}</code>
        </pre>
      ),
    },
  ];
}
