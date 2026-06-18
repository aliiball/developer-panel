import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  Plus,
  Envelope,
  PaperPlaneTilt,
  FloppyDisk,
  ArrowCounterClockwise,
  Eye,
  Code as CodeIcon,
  DeviceMobile,
  Desktop,
  BracketsCurly,
  ChartLineUp,
  CursorClick,
  EnvelopeOpen,
  Warning,
  PencilSimple,
  ClockCounterClockwise,
  Info,
  CheckCircle,
  Archive,
  type Icon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  EmptyState,
  KpiCard,
  KpiSkeleton,
  FilterBar,
  FilterChip,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import {
  RICH_TEMPLATES,
  CATEGORIES,
  STATUS_META,
  type RichTemplate,
  type TemplateStatus,
} from "~/data/seed.email-templates";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Email Templates — MetaPanel" }];
}

type ViewMode = "preview" | "html";
type Device = "desktop" | "mobile";

export default function EmailTemplates() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const [templates, setTemplates] = useState<RichTemplate[]>(RICH_TEMPLATES);
  const [activeId, setActiveId] = useState(RICH_TEMPLATES[0].id);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | null>(null);
  const [view, setView] = useState<ViewMode>("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");

  // Editör çalışma kopyası (kaydedilmemiş değişiklikler)
  const active = templates.find((t) => t.id === activeId) ?? templates[0];
  const [draftSubject, setDraftSubject] = useState(active.subject);
  const [draftBody, setDraftBody] = useState(active.body);
  const [editingId, setEditingId] = useState(active.id);

  // Aktif şablon değişince editör kopyasını senkronla
  if (editingId !== active.id) {
    setEditingId(active.id);
    setDraftSubject(active.subject);
    setDraftBody(active.body);
  }

  const dirty = draftSubject !== active.subject || draftBody !== active.body;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (catFilter && t.category !== catFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [templates, query, catFilter, statusFilter]);

  // ── KPI agregasyonları ────────────────────────────────────────────
  const kpis = useMemo(() => {
    const published = templates.filter((t) => t.status === "published");
    const totalSent = templates.reduce((a, t) => a + t.sent30d, 0);
    const weighted = (key: "openRate" | "clickRate" | "bounceRate") => {
      const denom = published.reduce((a, t) => a + t.sent30d, 0) || 1;
      const num = published.reduce((a, t) => a + t[key] * t.sent30d, 0);
      return num / denom;
    };
    return {
      total: templates.length,
      published: published.length,
      totalSent,
      openRate: weighted("openRate"),
      clickRate: weighted("clickRate"),
      bounceRate: weighted("bounceRate"),
    };
  }, [templates]);

  function applyDraft(updater: (t: RichTemplate) => RichTemplate) {
    setTemplates((prev) => prev.map((t) => (t.id === active.id ? updater(t) : t)));
  }

  function handleSave() {
    if (!dirty) {
      toast.info("Kaydedilecek değişiklik yok.");
      return;
    }
    applyDraft((t) => ({
      ...t,
      subject: draftSubject,
      body: draftBody,
      updated: "az önce",
      updatedBy: "Sen",
      versions: [
        { id: `nv-${Date.now()}`, version: `v${t.versions.length + 1}`, at: "az önce", actor: "Sen", note: "Editörden kaydedildi" },
        ...t.versions,
      ],
    }));
    toast.success("Şablon kaydedildi", { description: `${active.name} · yeni sürüm oluşturuldu` });
  }

  function handleRevert() {
    setDraftSubject(active.subject);
    setDraftBody(active.body);
    toast("Değişiklikler geri alındı");
  }

  function handleSendTest() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testTo.trim())) {
      toast.error("Geçerli bir e-posta adresi gir.");
      return;
    }
    setTestOpen(false);
    toast.success("Test e-postası gönderildi", {
      description: `${active.name} → ${testTo} (örnek değerlerle render edildi)`,
    });
    setTestTo("");
  }

  function handleExport() {
    toast.success("Şablonlar dışa aktarıldı", { description: `${filtered.length} şablon · JSON` });
  }

  function handleDuplicate() {
    const copy: RichTemplate = {
      ...active,
      id: `${active.id}-copy-${Date.now()}`,
      name: `${active.name} (kopya)`,
      status: "draft",
      updated: "az önce",
      updatedBy: "Sen",
      versions: [{ id: "c1", version: "v1 (taslak)", at: "az önce", actor: "Sen", note: "Kopyalandı" }],
    };
    setTemplates((prev) => [copy, ...prev]);
    setActiveId(copy.id);
    toast.success("Şablon kopyalandı", { description: copy.name });
  }

  const activeFilters = (catFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (query ? 1 : 0);

  return (
    <>
      <PageHeader
        title="Email Templates"
        description="E-posta şablonları — editör, canlı önizleme, değişkenler, test gönderimi ve sürüm geçmişi."
        actions={[
          {
            label: "AI ile Şablon",
            icon: Sparkles,
            variant: "default",
            onClick: () => queuePrompt("Sipariş kargoya verildi bildirimi için e-posta şablonu yaz."),
          },
          { label: "Yeni Şablon", icon: Plus, onClick: () => toast("Yeni şablon sihirbazı yakında.") },
        ]}
      />
      <PageBody grid={false} className="flex h-full flex-col gap-4">
        {/* KPI şeridi */}
        {templates.length === 0 ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="30g Gönderim"
              value={fmtCompact(kpis.totalSent)}
              delta={8.4}
              trend={[28, 31, 30, 34, 38, 36, 41, 44, 43, 47, 51, 54]}
              icon={ChartLineUp}
              hint="son 30 gün"
            />
            <KpiCard
              label="Açılma Oranı"
              value={`${kpis.openRate.toFixed(1)}%`}
              delta={2.1}
              trend={[55, 57, 56, 59, 61, 60, 63, 62, 64, 63, 65, 66]}
              icon={EnvelopeOpen}
              hint="yayında, ağırlıklı"
            />
            <KpiCard
              label="Tıklama Oranı"
              value={`${kpis.clickRate.toFixed(1)}%`}
              delta={-0.6}
              trend={[34, 36, 35, 38, 37, 39, 38, 40, 39, 41, 40, 42]}
              icon={CursorClick}
            />
            <KpiCard
              label="Bounce Oranı"
              value={`${kpis.bounceRate.toFixed(2)}%`}
              delta={-0.1}
              invert
              trend={[8, 7, 9, 6, 7, 5, 6, 5, 4, 5, 4, 4]}
              icon={Warning}
              hint="düşük iyi"
            />
          </div>
        )}

        {/* FilterBar */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Şablon adı, konu veya kategori ara…"
          onExport={handleExport}
        >
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={catFilter === c}
              onClick={() => setCatFilter((p) => (p === c ? null : c))}
              count={templates.filter((t) => t.category === c).length}
            >
              {c}
            </FilterChip>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {(["published", "draft", "archived"] as TemplateStatus[]).map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter((p) => (p === s ? null : s))}
              count={templates.filter((t) => t.status === s).length}
            >
              {STATUS_META[s].label}
            </FilterChip>
          ))}
        </FilterBar>

        {/* İçerik: liste + editör/önizleme */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* Şablon listesi */}
          <aside className="min-h-0 space-y-1.5 overflow-y-auto pr-0.5">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Envelope}
                variant={activeFilters > 0 ? "search" : "default"}
                title={activeFilters > 0 ? "Eşleşen şablon yok" : "Henüz şablon yok"}
                description={
                  activeFilters > 0
                    ? "Arama veya filtreleri temizleyip tekrar dene."
                    : "İlk e-posta şablonunu oluştur."
                }
                action={
                  activeFilters > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        setCatFilter(null);
                        setStatusFilter(null);
                      }}
                    >
                      Filtreleri temizle
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => toast("Yeni şablon sihirbazı yakında.")}>
                      <Plus className="size-4" /> Yeni Şablon
                    </Button>
                  )
                }
              />
            ) : (
              filtered.map((t) => {
                const sm = STATUS_META[t.status];
                const isActive = t.id === activeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                      isActive ? "border-primary/40 bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground">
                      <Envelope className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        {isActive && dirty && (
                          <span className="size-1.5 shrink-0 rounded-full bg-amber-400" title="Kaydedilmemiş" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge variant={sm.variant} className="px-1.5 py-0 text-[10px]">
                          {sm.label}
                        </Badge>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {t.category} · {t.updated}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </aside>

          {/* Editör + önizleme */}
          <Editor
            template={active}
            draftSubject={draftSubject}
            draftBody={draftBody}
            onSubject={setDraftSubject}
            onBody={setDraftBody}
            dirty={dirty}
            view={view}
            onView={setView}
            device={device}
            onDevice={setDevice}
            onSave={handleSave}
            onRevert={handleRevert}
            onTest={() => setTestOpen(true)}
            onDetails={() => setDrawerOpen(true)}
            onDuplicate={handleDuplicate}
          />
        </div>
      </PageBody>

      {/* Detay drawer (Genel / Sürümler / Aktivite / JSON) */}
      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={active.name}
        subtitle={active.subject}
        badge={
          <Badge variant={STATUS_META[active.status].variant}>{STATUS_META[active.status].label}</Badge>
        }
        tabs={buildTabs(active)}
        footer={
          <div className="flex w-full items-center justify-between gap-2 p-3">
            <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
              Kapat
            </Button>
            <Button size="sm" onClick={() => { setDrawerOpen(false); setTestOpen(true); }}>
              <PaperPlaneTilt className="size-4" /> Test Gönder
            </Button>
          </div>
        }
      />

      {/* Test gönder dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test e-postası gönder</DialogTitle>
            <DialogDescription>
              “{active.name}” şablonu örnek değerlerle render edilip belirtilen adrese gönderilir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="test-to">Alıcı e-posta</Label>
              <Input
                id="test-to"
                type="email"
                placeholder="ornek@firma.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendTest()}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Konu:</span>{" "}
              {renderVars(draftSubject, active.sampleData).map((p, i) => (
                <span key={i}>{typeof p === "string" ? p : p.text}</span>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={handleSendTest}>
              <PaperPlaneTilt className="size-4" /> Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Editör + canlı önizleme + değişken paneli ───────────────────── */
function Editor({
  template,
  draftSubject,
  draftBody,
  onSubject,
  onBody,
  dirty,
  view,
  onView,
  device,
  onDevice,
  onSave,
  onRevert,
  onTest,
  onDetails,
  onDuplicate,
}: {
  template: RichTemplate;
  draftSubject: string;
  draftBody: string;
  onSubject: (v: string) => void;
  onBody: (v: string) => void;
  dirty: boolean;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  device: Device;
  onDevice: (d: Device) => void;
  onSave: () => void;
  onRevert: () => void;
  onTest: () => void;
  onDetails: () => void;
  onDuplicate: () => void;
}) {
  function insertVar(name: string) {
    onBody(`${draftBody}{{${name}}}`);
    toast(`{{${name}}} eklendi`);
  }

  const usedVars = new Set(
    [...draftSubject.matchAll(/\{\{(\w+)\}\}/g), ...draftBody.matchAll(/\{\{(\w+)\}\}/g)].map(
      (m) => m[1],
    ),
  );

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
      {/* Sol: editör + değişken paneli */}
      <div className="flex min-h-0 flex-col gap-3">
        {/* Editör araç çubuğu */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="default" size="sm" onClick={onSave} disabled={!dirty}>
            <FloppyDisk className="size-4" /> Kaydet
          </Button>
          <Button variant="outline" size="sm" onClick={onRevert} disabled={!dirty}>
            <ArrowCounterClockwise className="size-4" /> Geri Al
          </Button>
          <Button variant="outline" size="sm" onClick={onTest}>
            <PaperPlaneTilt className="size-4" /> Test Gönder
          </Button>
          <span className="mx-0.5 h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            Kopyala
          </Button>
          <Button variant="ghost" size="sm" onClick={onDetails}>
            <Info className="size-4" /> Detay
          </Button>
          {dirty && (
            <span className="ml-auto text-xs text-amber-400">● Kaydedilmemiş değişiklik</span>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-xs text-muted-foreground">
            Konu satırı
          </Label>
          <Input
            id="subject"
            value={draftSubject}
            onChange={(e) => onSubject(e.target.value)}
            className="font-medium"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
          <Label htmlFor="body" className="text-xs text-muted-foreground">
            Gövde ({"{{değişken}}"} ve [metin](url) desteklenir)
          </Label>
          <Textarea
            id="body"
            value={draftBody}
            onChange={(e) => onBody(e.target.value)}
            className="min-h-52 flex-1 resize-none font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Değişken paneli */}
        <div className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BracketsCurly className="size-3.5" /> Değişkenler
            <span className="ml-auto text-[11px] font-normal">
              tıkla → gövdeye ekle
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {template.variables.map((v) => {
              const used = usedVars.has(v);
              return (
                <button
                  key={v}
                  onClick={() => insertVar(v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                    used
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                  title={`Örnek: ${template.sampleData[v] ?? "—"}`}
                >
                  <Plus className="size-3" />
                  {`{{${v}}}`}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kullanılan {usedVars.size}/{template.variables.length} değişken.
            {template.variables.some((v) => !usedVars.has(v)) && " Bazı tanımlı değişkenler henüz kullanılmıyor."}
          </p>
        </div>
      </div>

      {/* Sağ: canlı önizleme */}
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <SegBtn active={view === "preview"} icon={Eye} onClick={() => onView("preview")}>
            Önizleme
          </SegBtn>
          <SegBtn active={view === "html"} icon={CodeIcon} onClick={() => onView("html")}>
            HTML
          </SegBtn>
          <div className="ml-auto flex items-center gap-1.5">
            <SegBtn active={device === "desktop"} icon={Desktop} onClick={() => onDevice("desktop")}>
              Masaüstü
            </SegBtn>
            <SegBtn active={device === "mobile"} icon={DeviceMobile} onClick={() => onDevice("mobile")}>
              Mobil
            </SegBtn>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-muted/20 p-3">
          {view === "preview" ? (
            <LivePreview
              subject={draftSubject}
              body={draftBody}
              template={template}
              device={device}
            />
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-card p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {toHtml(draftSubject, draftBody, template)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function SegBtn({
  active,
  icon: I,
  onClick,
  children,
}: {
  active: boolean;
  icon: Icon;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <I className="size-3.5" />
      {children}
    </button>
  );
}

/* ── Canlı önizleme (örnek verilerle render) ─────────────────────── */
function LivePreview({
  subject,
  body,
  template,
  device,
}: {
  subject: string;
  body: string;
  template: RichTemplate;
  device: Device;
}) {
  return (
    <div className={cn("mx-auto transition-all", device === "mobile" ? "max-w-[360px]" : "max-w-lg")}>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="space-y-0.5 border-b bg-muted/30 px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            {template.fromName} &lt;{template.fromEmail}&gt;
          </p>
          <p className="text-sm font-medium">
            {renderVars(subject, template.sampleData).map((p, i) =>
              typeof p === "string" ? <span key={i}>{p}</span> : <VarChip key={i} text={p.text} />,
            )}
          </p>
          <p className="truncate text-[11px] text-muted-foreground/80">{template.preheader}</p>
        </div>
        <div className="p-6">
          <div className="rounded-lg border bg-background p-5">
            {body.split("\n").map((line, i) =>
              line.trim() === "" ? (
                <div key={i} className="h-3" />
              ) : (
                <p key={i} className="text-sm leading-relaxed">
                  {renderRich(line, template.sampleData)}
                </p>
              ),
            )}
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            MetaPanel · {template.category} · {template.locale}
          </p>
        </div>
      </div>
    </div>
  );
}

function VarChip({ text }: { text: string }) {
  return (
    <span className="rounded bg-emerald-500/15 px-1 font-mono text-xs text-emerald-400">{text}</span>
  );
}

/* ── DetailDrawer sekmeleri ──────────────────────────────────────── */
function buildTabs(t: RichTemplate): DrawerTab[] {
  const sm = STATUS_META[t.status];
  return [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="divide-y">
          <Field label="Şablon">{t.name}</Field>
          <Field label="Durum">
            <Badge variant={sm.variant}>{sm.label}</Badge>
          </Field>
          <Field label="Kategori">{t.category}</Field>
          <Field label="Konu" mono>
            {t.subject}
          </Field>
          <Field label="Ön başlık">{t.preheader}</Field>
          <Field label="Gönderen" mono>
            {t.fromName} &lt;{t.fromEmail}&gt;
          </Field>
          <Field label="Dil" mono>
            {t.locale}
          </Field>
          <Field label="30g Gönderim">{fmtCompact(t.sent30d)}</Field>
          <Field label="Açılma">%{t.openRate.toFixed(1)}</Field>
          <Field label="Tıklama">%{t.clickRate.toFixed(1)}</Field>
          <Field label="Bounce">%{t.bounceRate.toFixed(2)}</Field>
          <Field label="Değişken sayısı">{t.variables.length}</Field>
          <Field label="Son güncelleme">
            {t.updated} · {t.updatedBy}
          </Field>
        </div>
      ),
    },
    {
      value: "versions",
      label: "Sürümler",
      content: (
        <div className="space-y-2">
          {t.versions.map((v, i) => (
            <div
              key={v.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-2.5"
            >
              <Badge variant={i === 0 ? "default" : "outline"} className="mt-0.5 font-mono">
                {v.version}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{v.note}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {v.actor} · {v.at}
                </p>
              </div>
              {i !== 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => toast(`${v.version} sürümüne geri dönülüyor…`)}
                >
                  Geri yükle
                </Button>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={buildAudit(t)} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-card p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(
            {
              id: t.id,
              name: t.name,
              status: t.status,
              category: t.category,
              subject: t.subject,
              preheader: t.preheader,
              from: `${t.fromName} <${t.fromEmail}>`,
              locale: t.locale,
              variables: t.variables,
              metrics: {
                sent30d: t.sent30d,
                openRate: t.openRate,
                clickRate: t.clickRate,
                bounceRate: t.bounceRate,
              },
            },
            null,
            2,
          )}
        </pre>
      ),
    },
  ];
}

function buildAudit(t: RichTemplate): AuditEvent[] {
  const iconFor: Record<TemplateStatus, Icon> = {
    published: CheckCircle,
    draft: PencilSimple,
    archived: Archive,
  };
  const head: AuditEvent = {
    id: "live",
    action: `şablonu ${STATUS_META[t.status].label.toLowerCase()} durumunda`,
    actor: t.updatedBy,
    at: t.updated,
    icon: iconFor[t.status],
    tone: t.status === "published" ? "emerald" : t.status === "archived" ? "default" : "amber",
  };
  const rest: AuditEvent[] = t.versions.map((v) => ({
    id: v.id,
    action: v.note,
    actor: v.actor,
    at: v.at,
    icon: ClockCounterClockwise,
    tone: "primary",
    detail: `sürüm ${v.version}`,
  }));
  return [head, ...rest];
}

/* ── Render yardımcıları ─────────────────────────────────────────── */
type Token = string | { text: string };

function renderVars(text: string, sample: Record<string, string>): Token[] {
  const out: Token[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ text: sample[m[1]] ?? `{{${m[1]}}}` });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderRich(line: string, sample: Record<string, string>) {
  const parts = line.split(/(\{\{\w+\}\}|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    const varM = p.match(/^\{\{(\w+)\}\}$/);
    if (varM) return <VarChip key={i} text={sample[varM[1]] ?? p} />;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const url = link[2].replace(/\{\{(\w+)\}\}/g, (_, k) => sample[k] ?? `{{${k}}}`);
      return (
        <a key={i} href={url} className="text-primary underline" onClick={(e) => e.preventDefault()}>
          {link[1]}
        </a>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function toHtml(subject: string, body: string, t: RichTemplate): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bodyHtml = body
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "  <br/>";
      const html = esc(line)
        .replace(/\{\{(\w+)\}\}/g, '<span class="var">{{$1}}</span>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      return `  <p>${html}</p>`;
    })
    .join("\n");
  return `<!-- ${t.name} · ${t.locale} -->
<title>${esc(subject)}</title>
<meta name="preheader" content="${esc(t.preheader)}">
<body>
${bodyHtml}
  <footer>MetaPanel · ${t.category}</footer>
</body>`;
}

function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}
