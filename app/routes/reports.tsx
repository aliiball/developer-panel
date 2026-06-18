import { useMemo, useState } from "react";
import {
  Bar, BarChart, Line, LineChart, Pie, PieChart, Cell,
  Area, AreaChart,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  FloppyDisk as Save,
  ChartBar as BarChart3,
  ChartLine as LineIcon,
  ChartPie as PieIcon,
  ChartLineUp,
  Stack,
  FileText,
  Star,
  Trash,
  Copy,
  PencilSimple,
  Database,
  Sigma,
  ClockCounterClockwise,
  Plus,
  Lightning,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useSchemaStore } from "~/stores/schema-store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import {
  KpiCard, FilterBar, FilterChip, DetailDrawer, Field, AuditTimeline,
  EmptyState, type DrawerTab, type AuditEvent,
} from "~/components/enterprise";

export function meta() {
  return [{ title: "Reports — MetaPanel" }];
}

/* ── Tipler ─────────────────────────────────────────────────────── */
type Metric = "count" | "sum" | "avg" | "min" | "max";
type ChartKind = "bar" | "line" | "pie" | "area";
type Period = "7d" | "30d" | "90d" | "12m";

interface SavedReport {
  id: string;
  name: string;
  description: string;
  model: string;
  metric: Metric;
  groupBy: string;
  chart: ChartKind;
  period: Period;
  owner: string;
  starred: boolean;
  shared: boolean;
  runs: number;
  updatedAt: string;
  category: "Satış" | "Operasyon" | "Kullanıcı" | "Finans";
}

/* ── Sabitler ───────────────────────────────────────────────────── */
const METRICS: { key: Metric; label: string }[] = [
  { key: "count", label: "count — kayıt sayısı" },
  { key: "sum", label: "sum — toplam" },
  { key: "avg", label: "avg — ortalama" },
  { key: "min", label: "min — en düşük" },
  { key: "max", label: "max — en yüksek" },
];

const CHART_TYPES = [
  { key: "bar", icon: BarChart3, label: "Çubuk" },
  { key: "line", icon: LineIcon, label: "Çizgi" },
  { key: "area", icon: ChartLineUp, label: "Alan" },
  { key: "pie", icon: PieIcon, label: "Pasta" },
] as const;

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "Son 7 gün" },
  { key: "30d", label: "Son 30 gün" },
  { key: "90d", label: "Son 90 gün" },
  { key: "12m", label: "Son 12 ay" },
];

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const chartTip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

const CATEGORIES = ["Tümü", "Satış", "Operasyon", "Kullanıcı", "Finans"] as const;

/* ── Seed: kayıtlı rapor şablonları (gerçekçi yoğunluk) ─────────── */
const SAVED_SEED: SavedReport[] = [
  { id: "rep_01", name: "Aylık Sipariş Hacmi", description: "Durum bazında sipariş dağılımı ve trend", model: "Order", metric: "count", groupBy: "status", chart: "bar", period: "30d", owner: "Ada Yılmaz", starred: true, shared: true, runs: 342, updatedAt: "2 saat önce", category: "Satış" },
  { id: "rep_02", name: "Gelir Trendi (90g)", description: "Toplam gelir günlük çizgi grafiği", model: "Order", metric: "sum", groupBy: "createdAt", chart: "line", period: "90d", owner: "Ada Yılmaz", starred: true, shared: true, runs: 891, updatedAt: "dün", category: "Finans" },
  { id: "rep_03", name: "Kategori Dağılımı", description: "Ürün kategorilerine göre satış payı", model: "Product", metric: "sum", groupBy: "category", chart: "pie", period: "30d", owner: "Mert Kaya", starred: false, shared: false, runs: 57, updatedAt: "3 gün önce", category: "Satış" },
  { id: "rep_04", name: "Yeni Kullanıcılar", description: "Kayıt kanalına göre günlük yeni kullanıcı", model: "User", metric: "count", groupBy: "createdAt", chart: "area", period: "30d", owner: "Zeynep Demir", starred: true, shared: true, runs: 214, updatedAt: "1 gün önce", category: "Kullanıcı" },
  { id: "rep_05", name: "Ortalama Sepet Tutarı", description: "Bölgeye göre ortalama sipariş değeri", model: "Order", metric: "avg", groupBy: "region", chart: "bar", period: "90d", owner: "Mert Kaya", starred: false, shared: true, runs: 128, updatedAt: "5 gün önce", category: "Finans" },
  { id: "rep_06", name: "İade Oranı", description: "Aylık iade edilen sipariş yüzdesi", model: "Order", metric: "count", groupBy: "status", chart: "line", period: "12m", owner: "Ada Yılmaz", starred: false, shared: false, runs: 73, updatedAt: "1 hafta önce", category: "Operasyon" },
  { id: "rep_07", name: "Stok Devir Hızı", description: "Ürün bazında stok tüketim hızı", model: "Product", metric: "avg", groupBy: "category", chart: "bar", period: "30d", owner: "Caner Aksoy", starred: false, shared: true, runs: 41, updatedAt: "1 hafta önce", category: "Operasyon" },
  { id: "rep_08", name: "Aktif Kullanıcı Kohortu", description: "Plan tipine göre aktif kullanıcı sayısı", model: "User", metric: "count", groupBy: "plan", chart: "pie", period: "30d", owner: "Zeynep Demir", starred: true, shared: true, runs: 506, updatedAt: "4 saat önce", category: "Kullanıcı" },
  { id: "rep_09", name: "Kargo Süresi Dağılımı", description: "Teslimat süresine göre sipariş dağılımı", model: "Order", metric: "avg", groupBy: "region", chart: "area", period: "90d", owner: "Caner Aksoy", starred: false, shared: false, runs: 19, updatedAt: "2 hafta önce", category: "Operasyon" },
  { id: "rep_10", name: "En Çok Satan Ürünler", description: "Ürün başına toplam satış adedi (top 5)", model: "Product", metric: "sum", groupBy: "name", chart: "bar", period: "30d", owner: "Mert Kaya", starred: true, shared: true, runs: 677, updatedAt: "6 saat önce", category: "Satış" },
  { id: "rep_11", name: "Aylık Yinelenen Gelir", description: "Plan bazında MRR çizgisi", model: "User", metric: "sum", groupBy: "plan", chart: "line", period: "12m", owner: "Ada Yılmaz", starred: true, shared: true, runs: 1203, updatedAt: "1 saat önce", category: "Finans" },
  { id: "rep_12", name: "Churn Analizi", description: "Aylık iptal eden kullanıcı oranı", model: "User", metric: "count", groupBy: "status", chart: "area", period: "12m", owner: "Zeynep Demir", starred: false, shared: true, runs: 88, updatedAt: "3 gün önce", category: "Kullanıcı" },
];

/* deterministik ama metrik/dönem duyarlı seri üretimi */
function buildSeries(model: string, metric: Metric, groupBy: string, period: Period): { label: string; value: number; prev: number }[] {
  const seed = (model + metric + groupBy + period).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const buckets = period === "12m"
    ? ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem"]
    : period === "90d"
      ? ["W1", "W2", "W3", "W4", "W5", "W6"]
      : ["A", "B", "C", "D", "E"];
  const scale = metric === "sum" ? 1200 : metric === "avg" ? 85 : metric === "count" ? 90 : 60;
  return buckets.map((b, i) => {
    const base = ((seed * (i + 3)) % scale) + Math.round(scale * 0.12);
    const prev = Math.round(base * (0.7 + ((seed + i) % 40) / 100));
    return { label: `${groupBy}·${b}`, value: base, prev };
  });
}

function spark(model: string, metric: Metric): number[] {
  const seed = (model + metric).length;
  return Array.from({ length: 12 }, (_, i) => ((seed * (i + 2) * 7) % 60) + 18);
}

const AUDIT: AuditEvent[] = [
  { id: "a1", actor: "Ada Yılmaz", action: "raporu yeniden çalıştırdı", at: "2 saat önce", icon: Lightning, tone: "primary" },
  { id: "a2", actor: "Ada Yılmaz", action: "grafik tipini 'çizgi' → 'çubuk' yaptı", at: "1 gün önce", icon: PencilSimple, detail: "chart: line → bar" },
  { id: "a3", actor: "Mert Kaya", action: "raporu ekibe paylaştı", at: "3 gün önce", icon: Copy, tone: "emerald" },
  { id: "a4", actor: "system", action: "zamanlanmış çalıştırma tamamlandı", at: "1 hafta önce", icon: ClockCounterClockwise, detail: "cron: 0 8 * * 1" },
  { id: "a5", actor: "Ada Yılmaz", action: "raporu oluşturdu", at: "2 hafta önce", icon: Plus, tone: "primary" },
];

export default function Reports() {
  const models = useSchemaStore((s) => s.models);

  // builder state
  const [model, setModel] = useState("Order");
  const [metric, setMetric] = useState<Metric>("count");
  const [groupBy, setGroupBy] = useState("status");
  const [chart, setChart] = useState<ChartKind>("bar");
  const [period, setPeriod] = useState<Period>("30d");

  // library state
  const [reports, setReports] = useState<SavedReport[]>(SAVED_SEED);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Tümü");
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [detail, setDetail] = useState<SavedReport | null>(null);

  const fields = models.find((m) => m.name === model)?.fields.map((f) => f.name) ?? ["status"];

  const data = useMemo(() => buildSeries(model, metric, groupBy, period), [model, metric, groupBy, period]);

  // KPI hesapları — seçili rapor önizlemesinden türetilmiş insight
  const kpi = useMemo(() => {
    const total = data.reduce((a, d) => a + d.value, 0);
    const prevTotal = data.reduce((a, d) => a + d.prev, 0);
    const delta = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : 0;
    const peak = data.reduce((m, d) => (d.value > m.value ? d : m), data[0]);
    const avg = Math.round(total / data.length);
    return { total, delta, peak, avg, trend: spark(model, metric) };
  }, [data, model, metric]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (category !== "Tümü" && r.category !== category) return false;
      if (onlyStarred && !r.starred) return false;
      if (q && !(`${r.name} ${r.description} ${r.model} ${r.owner}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [reports, search, category, onlyStarred]);

  const catCount = (c: (typeof CATEGORIES)[number]) =>
    c === "Tümü" ? reports.length : reports.filter((r) => r.category === c).length;

  /* ── eylemler ──────────────────────────────────────────────────── */
  const saveReport = () => {
    const id = `rep_${Date.now().toString(36)}`;
    const r: SavedReport = {
      id, name: `${metric}(${model}) · ${groupBy}`,
      description: `${period} dönem · ${chart} grafiği`,
      model, metric, groupBy, chart, period,
      owner: "Ada Yılmaz", starred: false, shared: false, runs: 0,
      updatedAt: "az önce", category: "Operasyon",
    };
    setReports((p) => [r, ...p]);
    toast.success("Rapor kaydedildi", { description: `${r.name} kütüphaneye eklendi` });
  };

  const loadReport = (r: SavedReport) => {
    setModel(r.model); setMetric(r.metric); setGroupBy(r.groupBy);
    setChart(r.chart); setPeriod(r.period); setDetail(null);
    toast.info("Rapor yüklendi", { description: r.name });
  };

  const toggleStar = (id: string) =>
    setReports((p) => p.map((r) => (r.id === id ? { ...r, starred: !r.starred } : r)));

  const duplicate = (r: SavedReport) => {
    setReports((p) => [{ ...r, id: `rep_${Date.now().toString(36)}`, name: `${r.name} (kopya)`, runs: 0, starred: false, updatedAt: "az önce" }, ...p]);
    toast.success("Rapor çoğaltıldı", { description: r.name });
  };

  const remove = (r: SavedReport) => {
    setReports((p) => p.filter((x) => x.id !== r.id));
    setDetail(null);
    toast("Rapor silindi", {
      description: r.name,
      action: { label: "Geri al", onClick: () => setReports((p) => [r, ...p]) },
    });
  };

  const exportData = () => {
    toast.success("Veri dışa aktarıldı", { description: `${filtered.length} rapor · CSV` });
  };

  const detailTabs: DrawerTab[] = detail
    ? [
        {
          value: "genel", label: "Genel",
          content: (
            <div className="px-4">
              <Field label="Rapor adı">{detail.name}</Field>
              <Field label="Açıklama">{detail.description}</Field>
              <Field label="Kategori">{detail.category}</Field>
              <Field label="Model" mono>{detail.model}</Field>
              <Field label="Sorgu" mono>{detail.metric}(*) · {detail.groupBy}</Field>
              <Field label="Grafik" mono>{detail.chart}</Field>
              <Field label="Dönem">{PERIODS.find((p) => p.key === detail.period)?.label}</Field>
              <Field label="Sahip">{detail.owner}</Field>
              <Field label="Paylaşım">{detail.shared ? "Ekip ile paylaşıldı" : "Özel"}</Field>
              <Field label="Çalıştırma" mono>{detail.runs.toLocaleString("tr")}</Field>
              <Field label="Güncellendi">{detail.updatedAt}</Field>
            </div>
          ),
        },
        { value: "aktivite", label: "Aktivite", content: <div className="px-4 pt-2"><AuditTimeline events={AUDIT} /></div> },
        {
          value: "json", label: "JSON",
          content: (
            <pre className="mx-4 overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
              {JSON.stringify(detail, null, 2)}
            </pre>
          ),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Rapor oluşturucu — model, metrik, gruplama ve dönem seç; grafiği gör, kaydet ve paylaş."
        actions={[
          { label: "Yeni Rapor", icon: Plus, variant: "outline", onClick: () => { setModel("Order"); setMetric("count"); setGroupBy("status"); setChart("bar"); setPeriod("30d"); toast.info("Boş yapılandırma yüklendi"); } },
          { label: "Raporu Kaydet", icon: Save, variant: "default", onClick: saveReport },
        ]}
      />
      <PageBody className="space-y-4">
        {/* KPI şeridi — önizleme bazlı insight */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Toplam değer" value={kpi.total.toLocaleString("tr")} delta={kpi.delta} trend={kpi.trend} icon={Sigma} hint={`${metric}(${model}) · ${PERIODS.find((p) => p.key === period)?.label}`} />
          <KpiCard label="En yüksek bölme" value={kpi.peak?.value.toLocaleString("tr") ?? "—"} icon={ChartLineUp} hint={kpi.peak?.label} />
          <KpiCard label="Ortalama / bölme" value={kpi.avg.toLocaleString("tr")} icon={BarChart3} hint={`${data.length} bölme`} />
          <KpiCard label="Kayıtlı rapor" value={reports.length} delta={8.3} trend={spark("library", "count")} icon={FileText} hint={`${reports.filter((r) => r.starred).length} favori`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Builder */}
          <Card className="h-fit">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Yapılandırma</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <FormField label="Model" icon={Database}>
                <Select value={model} onValueChange={(v) => v && setModel(v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{models.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Metrik" icon={Sigma}>
                <Select value={metric} onValueChange={(v) => v && setMetric(v as Metric)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{METRICS.map((m) => <SelectItem key={m.key} value={m.key} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Grupla" icon={Stack}>
                <Select value={groupBy} onValueChange={(v) => v && setGroupBy(v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{fields.map((f) => <SelectItem key={f} value={f} className="font-mono text-xs">{f}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Dönem" icon={ClockCounterClockwise}>
                <Select value={period} onValueChange={(v) => v && setPeriod(v as Period)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIODS.map((p) => <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Grafik tipi">
                <div className="grid grid-cols-4 gap-1.5">
                  {CHART_TYPES.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setChart(c.key)}
                      aria-pressed={chart === c.key}
                      title={c.label}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] transition-colors",
                        chart === c.key ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <c.icon className="size-4" /> {c.label}
                    </button>
                  ))}
                </div>
              </FormField>
              <div className="rounded-lg bg-muted/40 p-2.5 font-mono text-[11px] text-muted-foreground">
                SELECT {metric}(*) FROM {model.toLowerCase()}s GROUP BY {groupBy};
              </div>
              <Button size="sm" className="w-full gap-1.5" onClick={saveReport}>
                <Save className="size-4" /> Bu yapılandırmayı kaydet
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm">
                {metric}({model}) — {groupBy} bazında
                <span className="ml-2 text-xs font-normal text-muted-foreground">{PERIODS.find((p) => p.key === period)?.label}</span>
              </CardTitle>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Lightning className="size-3" /> canlı önizleme
              </Badge>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chart === "bar" ? (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={36} />
                    <Tooltip {...chartTip} cursor={{ fill: "var(--accent)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="prev" name="önceki dönem" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} opacity={0.35} />
                    <Bar dataKey="value" name="bu dönem" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chart === "line" ? (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={36} />
                    <Tooltip {...chartTip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="prev" name="önceki dönem" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="value" name="bu dönem" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                ) : chart === "area" ? (
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="repArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={36} />
                    <Tooltip {...chartTip} />
                    <Area type="monotone" dataKey="value" name="bu dönem" stroke="var(--primary)" strokeWidth={2} fill="url(#repArea)" />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Tooltip {...chartTip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Kayıtlı rapor kütüphanesi */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Kayıtlı raporlar</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} / {reports.length}</span>
          </div>

          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Rapor, model veya sahip ara…"
            onExport={exportData}
          >
            {CATEGORIES.map((c) => (
              <FilterChip key={c} active={category === c} onClick={() => setCategory(c)} count={catCount(c)}>
                {c}
              </FilterChip>
            ))}
            <FilterChip active={onlyStarred} onClick={() => setOnlyStarred((v) => !v)}>
              Favoriler
            </FilterChip>
          </FilterBar>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              variant={search || category !== "Tümü" || onlyStarred ? "search" : "default"}
              title={search || category !== "Tümü" || onlyStarred ? "Eşleşen rapor yok" : "Henüz kayıtlı rapor yok"}
              description={search || category !== "Tümü" || onlyStarred
                ? "Filtreleri temizleyip tekrar deneyin."
                : "Yukarıdaki oluşturucuyla bir yapılandırma kurup 'Raporu Kaydet' deyin."}
              action={
                (search || category !== "Tümü" || onlyStarred)
                  ? <Button size="sm" variant="outline" onClick={() => { setSearch(""); setCategory("Tümü"); setOnlyStarred(false); }}>Filtreleri temizle</Button>
                  : <Button size="sm" onClick={saveReport}><Plus className="size-4" /> İlk raporu oluştur</Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => {
                const ChartGlyph = CHART_TYPES.find((c) => c.key === r.chart)?.icon ?? BarChart3;
                return (
                  <Card
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="cursor-pointer transition-colors hover:border-primary/40"
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ChartGlyph className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{r.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{r.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(r.id); }}
                          className={cn("shrink-0 transition-colors", r.starred ? "text-amber-400" : "text-muted-foreground hover:text-foreground")}
                          aria-label={r.starred ? "Favoriden çıkar" : "Favoriye ekle"}
                        >
                          <Star className="size-4" weight={r.starred ? "fill" : "regular"} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">{r.metric}({r.model})</Badge>
                        {r.shared && <Badge variant="outline" className="text-[10px]">paylaşılı</Badge>}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="tabular-nums">{r.runs.toLocaleString("tr")} çalıştırma</span>
                        <span>{r.owner} · {r.updatedAt}</span>
                      </div>
                      <div className="flex gap-1.5 border-t pt-2">
                        <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); loadReport(r); }}>
                          <Lightning className="size-3.5" /> Yükle
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={(e) => { e.stopPropagation(); duplicate(r); }} aria-label="Çoğalt">
                          <Copy className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-red-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); remove(r); }} aria-label="Sil">
                          <Trash className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageBody>

      {/* Detay çekmecesi */}
      <DetailDrawer
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        title={detail?.name ?? ""}
        subtitle={detail ? `${detail.metric}(${detail.model}) · ${detail.groupBy}` : undefined}
        badge={detail && <Badge variant="secondary" className="text-[10px]">{detail.category}</Badge>}
        tabs={detailTabs}
        footer={detail && (
          <div className="flex w-full gap-2">
            <Button size="sm" className="flex-1 gap-1.5" onClick={() => loadReport(detail)}>
              <Lightning className="size-4" /> Oluşturucuya yükle
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => duplicate(detail)}>
              <Copy className="size-4" /> Çoğalt
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-red-400" onClick={() => remove(detail)}>
              <Trash className="size-4" /> Sil
            </Button>
          </div>
        )}
      />
    </>
  );
}

/* Builder formu için etiket-üstü alan (DetailDrawer'ın Field'ı detay
   satırı içindir; bu form düzeni için ayrı tutuldu). */
function FormField({ label, icon: Icon, children }: { label: string; icon?: typeof Database; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />} {label}
      </Label>
      {children}
    </div>
  );
}
