import { useMemo, useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { githubDark } from "@uiw/codemirror-theme-github";
import {
  File,
  FileTs,
  FileSql,
  FileCode,
  Folder,
  FolderOpen,
  Sparkle as Sparkles,
  Copy,
  DownloadSimple,
  Archive,
  GitDiff,
  Code as CodeIcon,
  BracketsCurly,
  Database,
  X,
  MagnifyingGlass,
  Lightning,
  TextAa,
  TextColumns,
  ListNumbers,
  Eye,
  ClockCounterClockwise,
  CheckCircle,
  PencilSimple,
  type Icon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  KpiCard,
  EmptyState,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
  type DrawerTab,
} from "~/components/enterprise";
import { useSchemaStore } from "~/stores/schema-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { modelToTs, modelToSql, modelToJson } from "~/lib/codegen";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Code Editor — MetaPanel" }];
}

/* ── Tipler ──────────────────────────────────────────────────────────── */
type Lang = "ts" | "sql" | "json";

interface GenFile {
  path: string;
  group: "models" | "migrations" | "root";
  lang: Lang;
  code: string;
  /** üretim kaynağı (model adı) — diff/insight için */
  source: string;
  /** önceki üretimden değişti mi (diff hissi) */
  drift: boolean;
}

const LANG_META: Record<Lang, { label: string; icon: Icon; tone: string }> = {
  ts: { label: "TypeScript", icon: FileTs, tone: "text-sky-400" },
  sql: { label: "SQL", icon: FileSql, tone: "text-amber-400" },
  json: { label: "JSON", icon: BracketsCurly, tone: "text-emerald-400" },
};

/* ── Yardımcılar ─────────────────────────────────────────────────────── */
function countLines(code: string): number {
  return code.split("\n").length;
}
function countTokens(code: string): number {
  // kaba bir tahmin: kelime + sembol bloğu
  return (code.match(/[\w$]+|[^\s\w]/g) ?? []).length;
}
function langExtensions(lang: Lang) {
  if (lang === "json") return [json()];
  // SQL için ayrı dil paketi kurulu değil; JS highlighting yeterli okunabilirlik verir.
  return [javascript({ typescript: true })];
}
function relTime(min: number): string {
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

/* ── Ana sayfa ───────────────────────────────────────────────────────── */
export default function Code() {
  const models = useSchemaStore((s) => s.models);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // dosya üretim seçenekleri
  const [target, setTarget] = useState<"all" | Lang>("all");
  const [active, setActive] = useState(0);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [treeFilter, setTreeFilter] = useState("");
  const [wrap, setWrap] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  // simüle edilmiş üretim "drift" durumu (diff hissi için)
  const driftRef = useRef<Set<string>>(new Set());

  // ── Üretilen dosyalar ──────────────────────────────────────────────
  const files = useMemo<GenFile[]>(() => {
    const out: GenFile[] = [];
    for (const m of models) {
      out.push({
        path: `models/${m.name}.ts`,
        group: "models",
        lang: "ts",
        code: modelToTs(m),
        source: m.name,
        drift: driftRef.current.has(`models/${m.name}.ts`),
      });
    }
    for (const m of models) {
      out.push({
        path: `migrations/create_${m.tableName}.sql`,
        group: "migrations",
        lang: "sql",
        code: modelToSql(m),
        source: m.name,
        drift: driftRef.current.has(`migrations/create_${m.tableName}.sql`),
      });
    }
    if (models[0]) {
      out.push({
        path: "schema.json",
        group: "root",
        lang: "json",
        code: modelToJson(models[0]),
        source: models[0].name,
        drift: false,
      });
    }
    return out;
  }, [models]);

  // hedef filtresi (dil seçici)
  const visibleFiles = useMemo(
    () => (target === "all" ? files : files.filter((f) => f.lang === target)),
    [files, target],
  );

  // ağaç araması
  const treeFiles = useMemo(() => {
    const q = treeFilter.trim().toLowerCase();
    if (!q) return visibleFiles;
    return visibleFiles.filter((f) => f.path.toLowerCase().includes(q));
  }, [visibleFiles, treeFilter]);

  // aktif index sınırlama
  useEffect(() => {
    if (active >= visibleFiles.length) setActive(0);
  }, [visibleFiles.length, active]);

  const file = visibleFiles[active] ?? visibleFiles[0];

  // sekme yönetimi: aktif dosya her zaman açık sekmelerde
  useEffect(() => {
    if (!file) return;
    setOpenTabs((prev) => (prev.includes(file.path) ? prev : [...prev, file.path].slice(-8)));
  }, [file?.path]);

  const openFiles = useMemo(
    () => openTabs.map((p) => files.find((f) => f.path === p)).filter(Boolean) as GenFile[],
    [openTabs, files],
  );

  // ── KPI metrikleri ──────────────────────────────────────────────────
  const totalLines = files.reduce((a, f) => a + countLines(f.code), 0);
  const totalTokens = files.reduce((a, f) => a + countTokens(f.code), 0);
  const driftCount = files.filter((f) => f.drift).length;

  const kpiTrendLines = useMemo(
    () => files.slice(0, 10).map((f) => countLines(f.code)),
    [files],
  );
  const kpiTrendFiles = [4, 6, 6, 8, 9, 11, files.length || 11];

  // ── Aksiyonlar ──────────────────────────────────────────────────────
  function selectFile(path: string) {
    const idx = visibleFiles.findIndex((f) => f.path === path);
    if (idx >= 0) setActive(idx);
  }
  function closeTab(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      // kapatılan aktif sekmeyse komşuya geç
      if (file?.path === path && next.length) selectFile(next[next.length - 1]);
      return next;
    });
  }
  function copyCode() {
    if (!file) return;
    navigator.clipboard?.writeText(file.code).then(
      () => toast.success(`${file.path} panoya kopyalandı`, { description: `${countLines(file.code)} satır` }),
      () => toast.error("Kopyalama başarısız"),
    );
  }
  function downloadFile() {
    if (!file) return;
    try {
      const blob = new Blob([file.code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.path.split("/").pop() ?? "file.txt";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dosya indirildi", { description: a.download });
    } catch {
      toast.error("İndirme başarısız");
    }
  }
  function downloadBundle() {
    // tüm dosyaları tek bir .txt manifesti olarak indir (zip yerine basit paket)
    const manifest = visibleFiles
      .map((f) => `/* ── ${f.path} ─────────────────────────────── */\n${f.code}`)
      .join("\n\n\n");
    try {
      const blob = new Blob([manifest], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `metapanel-codegen-${visibleFiles.length}-files.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Paket indirildi", { description: `${visibleFiles.length} dosya` });
    } catch {
      toast.error("Paket oluşturulamadı");
    }
  }
  function regenerate() {
    if (!file) return;
    driftRef.current.add(file.path);
    toast.success("Yeniden üretim tetiklendi", {
      description: `${file.path} şemadan yeniden derlendi`,
    });
  }
  function aiEdit() {
    if (!file) return;
    queuePrompt(`${file.path} dosyasını açıkla ve iyileştirme öner.`);
    toast.info("AI Copilot'a iletildi", { description: file.path });
  }

  // ── Audit (üretim geçmişi) ──────────────────────────────────────────
  const auditEvents = useMemo<AuditEvent[]>(() => {
    if (!file) return [];
    const ev: AuditEvent[] = [
      {
        id: "a1",
        action: `${file.path} üretildi`,
        actor: "codegen",
        at: relTime(3),
        icon: Lightning,
        tone: "primary",
        detail: `${LANG_META[file.lang].label} · ${countLines(file.code)} satır`,
      },
      {
        id: "a2",
        action: `${file.source} modeli şemadan derlendi`,
        actor: "schema-store",
        at: relTime(12),
        icon: Database,
        tone: "default",
      },
      {
        id: "a3",
        action: "format & lint geçti",
        actor: "system",
        at: relTime(12),
        icon: CheckCircle,
        tone: "emerald",
      },
    ];
    if (file.drift) {
      ev.unshift({
        id: "a0",
        action: "yeniden üretim ile drift kapatıldı",
        actor: "you",
        at: relTime(0),
        icon: GitDiff,
        tone: "amber",
        detail: "şema değişikliği uygulandı",
      });
    }
    return ev;
  }, [file]);

  // klavye: Cmd/Ctrl+S → indir, Cmd/Ctrl+C kopya değil (seçim çakışmasın)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        downloadFile();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const langStat = useMemo(() => {
    const by: Record<Lang, number> = { ts: 0, sql: 0, json: 0 };
    for (const f of files) by[f.lang] += 1;
    return by;
  }, [files]);

  // ── Boş durum: hiç model yok ───────────────────────────────────────
  if (models.length === 0) {
    return (
      <>
        <PageHeader
          title="Code Editor"
          description="Şemadan üretilen kod. CodeMirror 6 ile salt-görüntüleme prototipi."
        />
        <PageBody>
          <EmptyState
            icon={CodeIcon}
            title="Üretilecek kod yok"
            description="Önce Schema Designer'da en az bir model tanımlayın; TypeScript arabirimleri, SQL migration'ları ve JSON şeması otomatik üretilecektir."
            action={
              <Button size="sm" onClick={() => queuePrompt("Yeni bir veri modeli tasarlamama yardım et.")}>
                <Sparkles className="size-4" /> AI ile model öner
              </Button>
            }
          />
        </PageBody>
      </>
    );
  }

  const grouped = {
    models: treeFiles.filter((f) => f.group === "models"),
    migrations: treeFiles.filter((f) => f.group === "migrations"),
    root: treeFiles.filter((f) => f.group === "root"),
  };

  return (
    <>
      <PageHeader
        title="Code Editor"
        description="Şemadan üretilen kod — TypeScript, SQL migration ve JSON. CodeMirror 6 (salt-görüntüleme)."
        actions={[
          { label: "Kopyala", icon: Copy, variant: "outline", onClick: copyCode },
          { label: "İndir", icon: DownloadSimple, variant: "outline", onClick: downloadFile },
          { label: "Paketi indir", icon: Archive, variant: "outline", onClick: downloadBundle },
          { label: "AI ile Düzenle", icon: Sparkles, variant: "default", onClick: aiEdit },
        ]}
      />
      <PageBody grid={false} className="flex flex-col gap-4">
        {/* KPI şeridi */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Üretilen dosya"
            value={files.length}
            delta={12}
            trend={kpiTrendFiles}
            icon={FileCode}
            hint="bu oturum"
          />
          <KpiCard
            label="Toplam satır"
            value={totalLines.toLocaleString("tr-TR")}
            delta={8}
            trend={kpiTrendLines}
            icon={ListNumbers}
            hint="codegen çıktısı"
          />
          <KpiCard
            label="Tahmini token"
            value={totalTokens.toLocaleString("tr-TR")}
            delta={6}
            trend={kpiTrendLines.map((v) => v * 7)}
            icon={TextAa}
            hint="AI bağlam maliyeti"
          />
          <KpiCard
            label="Şema drift"
            value={driftCount}
            delta={driftCount > 0 ? 100 : 0}
            invert
            icon={GitDiff}
            hint="yeniden üretim gerek"
          />
        </div>

        {/* Kontrol şeridi: dil seçici + dosya arama + görünüm anahtarları */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Dil</span>
            <Select value={target} onValueChange={(v) => { setTarget(v as typeof target); setActive(0); }}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü ({files.length})</SelectItem>
                <SelectItem value="ts">TypeScript ({langStat.ts})</SelectItem>
                <SelectItem value="sql">SQL ({langStat.sql})</SelectItem>
                <SelectItem value="json">JSON ({langStat.json})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative min-w-44 flex-1 sm:max-w-xs">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={treeFilter}
              onChange={(e) => setTreeFilter(e.target.value)}
              placeholder="Dosya ara…"
              className="h-8 w-full rounded-lg border bg-card pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
            {treeFilter && (
              <button
                onClick={() => setTreeFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant={lineNumbers ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setLineNumbers((v) => !v)}
              aria-pressed={lineNumbers}
            >
              <ListNumbers className="size-4" /> Satır no
            </Button>
            <Button
              variant={wrap ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setWrap((v) => !v)}
              aria-pressed={wrap}
            >
              <TextColumns className="size-4" /> Sar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)} disabled={!file}>
              <Eye className="size-4" /> Detay
            </Button>
          </div>
        </div>

        {/* Editör düzeni: ağaç + ana panel */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden rounded-xl border lg:grid-cols-[248px_1fr]">
          {/* Dosya ağacı */}
          <aside className="mp-scroll overflow-y-auto border-b bg-card/40 lg:max-h-[calc(100vh-19rem)] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Gezgin
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground/70">
                {treeFiles.length}/{visibleFiles.length}
              </span>
            </div>

            {treeFiles.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={MagnifyingGlass}
                  variant="search"
                  title="Eşleşen dosya yok"
                  description={`"${treeFilter}" için sonuç bulunamadı.`}
                  action={
                    <Button size="sm" variant="outline" onClick={() => setTreeFilter("")}>
                      Aramayı temizle
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="py-1">
                {grouped.models.length > 0 && (
                  <TreeGroup
                    label="models"
                    count={grouped.models.length}
                    open={!collapsed.models}
                    onToggle={() => setCollapsed((c) => ({ ...c, models: !c.models }))}
                  >
                    {grouped.models.map((f) => (
                      <FileRow
                        key={f.path}
                        file={f}
                        active={file?.path === f.path}
                        onClick={() => selectFile(f.path)}
                      />
                    ))}
                  </TreeGroup>
                )}
                {grouped.migrations.length > 0 && (
                  <TreeGroup
                    label="migrations"
                    count={grouped.migrations.length}
                    open={!collapsed.migrations}
                    onToggle={() => setCollapsed((c) => ({ ...c, migrations: !c.migrations }))}
                  >
                    {grouped.migrations.map((f) => (
                      <FileRow
                        key={f.path}
                        file={f}
                        active={file?.path === f.path}
                        onClick={() => selectFile(f.path)}
                      />
                    ))}
                  </TreeGroup>
                )}
                {grouped.root.map((f) => (
                  <div key={f.path} className="px-2">
                    <FileRow
                      file={f}
                      active={file?.path === f.path}
                      onClick={() => selectFile(f.path)}
                      rootLevel
                    />
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Ana editör paneli */}
          <div className="flex min-w-0 flex-col">
            {/* Sekme şeridi */}
            {openFiles.length > 0 && (
              <div className="mp-scroll flex items-stretch overflow-x-auto border-b bg-muted/20">
                {openFiles.map((f) => {
                  const LangIcon = LANG_META[f.lang].icon;
                  const isActive = file?.path === f.path;
                  return (
                    <button
                      key={f.path}
                      onClick={() => selectFile(f.path)}
                      className={cn(
                        "group/tab flex shrink-0 items-center gap-1.5 border-r px-3 py-2 text-xs transition-colors",
                        isActive
                          ? "bg-background text-foreground"
                          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                      )}
                    >
                      <LangIcon className={cn("size-3.5", LANG_META[f.lang].tone)} />
                      <span className="max-w-40 truncate font-mono">{f.path.split("/").pop()}</span>
                      {f.drift && <span className="size-1.5 rounded-full bg-amber-400" title="şema drift" />}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => closeTab(f.path, e)}
                        className="ml-0.5 rounded p-0.5 opacity-0 hover:bg-accent group-hover/tab:opacity-100"
                        aria-label="Sekmeyi kapat"
                      >
                        <X className="size-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Dosya başlığı / breadcrumb + dil rozeti */}
            {file && (
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
                <File className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-xs">
                  {file.path.includes("/") ? (
                    <>
                      <span className="text-muted-foreground">{file.path.split("/")[0]}/</span>
                      {file.path.split("/")[1]}
                    </>
                  ) : (
                    file.path
                  )}
                </span>
                <Badge variant="outline" className={cn("gap-1", LANG_META[file.lang].tone)}>
                  {LANG_META[file.lang].label}
                </Badge>
                {file.drift && (
                  <Badge variant="outline" className="gap-1 text-amber-400">
                    <GitDiff className="size-3" /> drift
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
                  <span>{countLines(file.code)} satır</span>
                  <span>~{countTokens(file.code)} token</span>
                  {file.drift ? (
                    <Button variant="ghost" size="xs" className="gap-1 text-amber-400" onClick={regenerate}>
                      <Lightning className="size-3" /> Yeniden üret
                    </Button>
                  ) : (
                    <Button variant="ghost" size="xs" className="gap-1" onClick={regenerate}>
                      <ClockCounterClockwise className="size-3" /> Yeniden üret
                    </Button>
                  )}
                  <Button variant="ghost" size="xs" className="gap-1" onClick={copyCode}>
                    <Copy className="size-3" /> Kopyala
                  </Button>
                </div>
              </div>
            )}

            {/* CodeMirror */}
            <div className="mp-scroll min-h-0 flex-1 overflow-auto">
              {file ? (
                <CodeMirror
                  value={file.code}
                  theme={githubDark}
                  extensions={langExtensions(file.lang)}
                  editable={false}
                  basicSetup={{
                    lineNumbers,
                    foldGutter: false,
                    highlightActiveLine: false,
                  }}
                  style={{ fontSize: 13 }}
                  className={cn(wrap && "[&_.cm-content]:!whitespace-pre-wrap")}
                />
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={File}
                    title="Dosya seçili değil"
                    description="Soldaki gezginden bir dosya seçin."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBody>

      {/* Detay paneli — sekmeli: Genel / Aktivite / JSON */}
      {file && (
        <DetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={file.path.split("/").pop() ?? file.path}
          subtitle={file.path}
          badge={
            <Badge variant="outline" className={cn("gap-1", LANG_META[file.lang].tone)}>
              {LANG_META[file.lang].label}
            </Badge>
          }
          footer={
            <div className="flex w-full items-center gap-2 p-3">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={copyCode}>
                <Copy className="size-4" /> Kopyala
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={downloadFile}>
                <DownloadSimple className="size-4" /> İndir
              </Button>
              <Button size="sm" className="flex-1 gap-1.5" onClick={aiEdit}>
                <Sparkles className="size-4" /> AI
              </Button>
            </div>
          }
          tabs={[
            {
              value: "overview",
              label: "Genel",
              content: (
                <div className="space-y-4">
                  <div className="divide-y rounded-lg border bg-card/40 px-3">
                    <Field label="Dosya yolu" mono>{file.path}</Field>
                    <Field label="Dil">{LANG_META[file.lang].label}</Field>
                    <Field label="Kaynak model" mono>{file.source}</Field>
                    <Field label="Satır">{countLines(file.code)}</Field>
                    <Field label="Tahmini token">~{countTokens(file.code)}</Field>
                    <Field label="Durum">
                      {file.drift ? (
                        <span className="text-amber-400">şema drift — yeniden üretim gerek</span>
                      ) : (
                        <span className="text-emerald-400">güncel</span>
                      )}
                    </Field>
                    <Field label="Son üretim">{relTime(file.drift ? 0 : 3)}</Field>
                  </div>
                  <div className="rounded-lg border border-dashed bg-card/30 p-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                      <PencilSimple className="size-3.5" /> Klavye
                    </p>
                    <p><kbd className="rounded border bg-muted px-1">⌘/Ctrl</kbd> + <kbd className="rounded border bg-muted px-1">S</kbd> — aktif dosyayı indir</p>
                    <p className="mt-1">Dosya bu şemadan otomatik üretilir; düzenlemek için Schema Designer'ı kullanın.</p>
                  </div>
                </div>
              ),
            },
            {
              value: "activity",
              label: "Aktivite",
              content: <AuditTimeline events={auditEvents} />,
            },
            {
              value: "raw",
              label: file.lang === "json" ? "JSON" : "Kaynak",
              content: (
                <pre className="mp-scroll max-h-[60vh] overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
                  {file.code}
                </pre>
              ),
            },
          ] satisfies DrawerTab[]}
        />
      )}
    </>
  );
}

/* ── Ağaç grubu ──────────────────────────────────────────────────────── */
function TreeGroup({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-0.5">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        {open ? <FolderOpen className="size-3.5" /> : <Folder className="size-3.5" />}
        {label}
        <span className="ml-auto rounded bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground/80">
          {count}
        </span>
      </button>
      {open && <div className="ml-2 border-l border-border/60 pl-1">{children}</div>}
    </div>
  );
}

/* ── Dosya satırı ────────────────────────────────────────────────────── */
function FileRow({
  file,
  active,
  onClick,
  rootLevel,
}: {
  file: GenFile;
  active: boolean;
  onClick: () => void;
  rootLevel?: boolean;
}) {
  const LangIcon = LANG_META[file.lang].icon;
  const name = file.path.includes("/") ? file.path.split("/")[1] : file.path;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-md py-1.5 pl-2 pr-2 text-left font-mono text-xs transition-colors",
        rootLevel && "mt-0.5",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
      )}
      title={file.path}
    >
      <LangIcon className={cn("size-3.5 shrink-0", LANG_META[file.lang].tone)} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {file.drift && <span className="size-1.5 shrink-0 rounded-full bg-amber-400" title="şema drift" />}
    </button>
  );
}
