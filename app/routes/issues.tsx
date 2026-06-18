import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Sparkle as Sparkles,
  DeviceMobile as Smartphone,
  Envelope as Mail,
  PencilSimpleLine as PenLine,
  Bug,
  Warning,
  Clock,
  CheckCircle,
  Timer,
  UserCircle,
  ArrowRight,
  ChatCircle,
  Lightning,
  ArrowsClockwise,
  GitBranch,
  Database,
  Hash,
  TrendUp,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "~/components/ui/table";
import { useIssueStore } from "~/stores/issue-store";
import { useCopilotStore } from "~/stores/copilot-store";
import type { Issue, IssueSeverity, IssueStatus, IssueSource } from "~/data/delivery";
import { TEAM_MEMBERS_SHORT } from "~/data/delivery";
import { SeverityBadge, IssueStatusBadge } from "~/components/delivery/badges";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import {
  EmptyState, TableSkeleton, KpiSkeleton, KpiCard,
  FilterBar, FilterChip, BulkBar,
  DetailDrawer, Field, AuditTimeline,
  type DrawerTab, type AuditEvent,
} from "~/components/enterprise";

export function meta() {
  return [{ title: "Issues — MetaPanel" }];
}

const SOURCE_ICON: Record<IssueSource, typeof Bug> = {
  "in-app": Smartphone, email: Mail, manual: PenLine,
};
const SOURCE_LABEL: Record<IssueSource, string> = {
  "in-app": "uygulama içi", email: "e-posta", manual: "manuel",
};

// ── Yaş / SLA modeli ────────────────────────────────────────────────
// createdAt serbest metin ("12 dk önce", "2 sa önce", "3 gün önce").
// Triyaj/analitik için yaklaşık dakikaya çeviriyoruz.
function ageMinutes(createdAt: string): number {
  const m = createdAt.match(/(\d+)\s*(dk|sa|saat|gün|hafta)/);
  if (createdAt.includes("az önce")) return 0;
  if (!m) return 0;
  const n = Number(m[1]);
  switch (m[2]) {
    case "dk": return n;
    case "sa":
    case "saat": return n * 60;
    case "gün": return n * 60 * 24;
    case "hafta": return n * 60 * 24 * 7;
    default: return n;
  }
}

// Önem derecesine göre SLA hedefi (dakika) — yanıt/çözüm penceresi.
const SLA_TARGET: Record<IssueSeverity, number> = {
  critical: 60 * 4,        // 4 saat
  high: 60 * 24,           // 1 gün
  medium: 60 * 24 * 3,     // 3 gün
  low: 60 * 24 * 7,        // 1 hafta
};

type SlaState = "ok" | "warn" | "breach" | "done";
function slaState(issue: Issue): SlaState {
  if (issue.status === "resolved" || issue.status === "closed") return "done";
  const age = ageMinutes(issue.createdAt);
  const target = SLA_TARGET[issue.severity];
  if (age >= target) return "breach";
  if (age >= target * 0.75) return "warn";
  return "ok";
}

function fmtAge(min: number): string {
  if (min <= 0) return "az önce";
  if (min < 60) return `${min} dk`;
  if (min < 60 * 24) return `${Math.round(min / 60)} sa`;
  if (min < 60 * 24 * 7) return `${Math.round(min / (60 * 24))} gün`;
  return `${Math.round(min / (60 * 24 * 7))} hf`;
}

function SlaBadge({ state }: { state: SlaState }) {
  const map: Record<SlaState, { label: string; cls: string; Icon: typeof Bug }> = {
    ok: { label: "SLA içinde", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", Icon: CheckCircle },
    warn: { label: "SLA riski", cls: "text-amber-400 bg-amber-400/10 border-amber-400/30", Icon: Clock },
    breach: { label: "SLA aşıldı", cls: "text-red-400 bg-red-400/10 border-red-400/30", Icon: Warning },
    done: { label: "kapandı", cls: "text-muted-foreground bg-muted border-border", Icon: CheckCircle },
  };
  const { label, cls, Icon } = map[state];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>
      <Icon className="size-3" weight="bold" /> {label}
    </span>
  );
}

const STATUS_OPTS: { v: IssueStatus; label: string }[] = [
  { v: "triage", label: "Triyaj" },
  { v: "in-progress", label: "Geliştiriliyor" },
  { v: "resolved", label: "Çözüldü" },
  { v: "closed", label: "Kapandı" },
];
const SEVERITY_OPTS: IssueSeverity[] = ["low", "medium", "high", "critical"];
const SOURCE_OPTS: IssueSource[] = ["in-app", "email", "manual"];

// Kolon görünürlüğü için anahtarlar
type ColKey = "severity" | "status" | "sla" | "source" | "reporter" | "assignee" | "age";

export default function Issues() {
  const navigate = useNavigate();
  const issues = useIssueStore((s) => s.issues);
  const setStatus = useIssueStore((s) => s.setStatus);
  const setSeverity = useIssueStore((s) => s.setSeverity);
  const assign = useIssueStore((s) => s.assign);
  const applyAiTriage = useIssueStore((s) => s.applyAiTriage);
  const submitReport = useIssueStore((s) => s.submitReport);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // Yalnızca hata raporları (feature'lar Roadmap görünümünde)
  const bugs = useMemo(() => issues.filter((i) => i.type === "bug"), [issues]);

  // ── UI durumu ─────────────────────────────────────────────────────
  const [loading] = useState(false); // store senkron; gerçek üründe async olurdu
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium" as IssueSeverity, reporter: "" });
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<IssueStatus | null>(null);
  const [sevF, setSevF] = useState<IssueSeverity | null>(null);
  const [sourceF, setSourceF] = useState<IssueSource | null>(null);
  const [slaOnly, setSlaOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set());

  // ── KPI hesapları ─────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const active = bugs.filter((b) => b.status === "triage" || b.status === "in-progress");
    const critical = bugs.filter((b) => b.severity === "critical" && b.status !== "closed" && b.status !== "resolved");
    const triage = bugs.filter((b) => b.status === "triage");
    const resolved = bugs.filter((b) => b.status === "resolved" || b.status === "closed");
    const breached = bugs.filter((b) => slaState(b) === "breach");
    const openAges = active.map((b) => ageMinutes(b.createdAt));
    const avgAge = openAges.length ? openAges.reduce((a, b) => a + b, 0) / openAges.length : 0;
    const total = bugs.length || 1;
    const resolveRate = Math.round((resolved.length / total) * 100);
    return {
      active: active.length, critical: critical.length, triage: triage.length,
      resolved: resolved.length, breached: breached.length, avgAge, resolveRate,
    };
  }, [bugs]);

  // ── Filtreleme ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bugs.filter((b) => {
      if (statusF && b.status !== statusF) return false;
      if (sevF && b.severity !== sevF) return false;
      if (sourceF && b.source !== sourceF) return false;
      if (slaOnly && !(slaState(b) === "breach" || slaState(b) === "warn")) return false;
      if (q) {
        const hay = `${b.id} ${b.title} ${b.reporter} ${b.assignee ?? ""} ${b.linkedModel ?? ""} ${b.linkedModule ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bugs, search, statusF, sevF, sourceF, slaOnly]);

  const anyFilter = Boolean(search || statusF || sevF || sourceF || slaOnly);
  const detail = detailId ? bugs.find((b) => b.id === detailId) ?? null : null;

  // ── Seçim ─────────────────────────────────────────────────────────
  const visibleIds = filtered.map((b) => b.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(visibleIds);
    });
  }
  const selectedList = bugs.filter((b) => selected.has(b.id));

  // ── Toplu işlemler ────────────────────────────────────────────────
  function bulkStatus(status: IssueStatus) {
    selectedList.forEach((b) => setStatus(b.id, status));
    toast.success(`${selectedList.length} kayıt → ${STATUS_OPTS.find((s) => s.v === status)?.label}`, {
      description: selectedList.map((b) => b.id).join(", "),
    });
    setSelected(new Set());
  }
  function bulkAssign(who: string) {
    selectedList.forEach((b) => assign(b.id, who));
    toast.success(`${selectedList.length} kayıt → ${who} atandı`);
    setSelected(new Set());
  }
  function bulkTriage() {
    let n = 0;
    selectedList.forEach((b) => { if (b.aiSuggested) { applyAiTriage(b.id); n++; } });
    toast.success(n ? `${n} kayıt AI önerisiyle triyaj edildi` : "Seçili kayıtlarda AI önerisi yok");
    setSelected(new Set());
  }

  // ── Tekil işlemler (drawer) ───────────────────────────────────────
  function rowStatus(id: string, status: IssueStatus) {
    setStatus(id, status);
    toast.success(`Durum güncellendi → ${STATUS_OPTS.find((s) => s.v === status)?.label}`, { description: id });
  }
  function rowSeverity(id: string, sev: IssueSeverity) {
    setSeverity(id, sev);
    toast.success(`Önem güncellendi → ${sev}`, { description: id });
  }
  function rowAssign(id: string, who: string) {
    assign(id, who === "—" ? null : who);
    toast.success(who === "—" ? "Atama kaldırıldı" : `${who} atandı`, { description: id });
  }
  function rowAi(issue: Issue) {
    if (!issue.aiSuggested) { toast.message("Bu kayıt için AI önerisi yok"); return; }
    applyAiTriage(issue.id);
    toast.success("AI önerisi uygulandı", { description: issue.id });
  }

  function exportData() {
    const rows = filtered.map((b) => ({
      id: b.id, title: b.title, severity: b.severity, status: b.status,
      source: b.source, reporter: b.reporter, assignee: b.assignee,
      age: fmtAge(ageMinutes(b.createdAt)), sla: slaState(b),
    }));
    const json = JSON.stringify(rows, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).catch(() => {});
    }
    toast.success(`${rows.length} kayıt JSON olarak kopyalandı`, { description: "Pano: issues-export.json" });
  }

  function submit() {
    if (!form.title.trim()) return;
    const id = submitReport({
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
      reporter: form.reporter.trim() || "müşteri@app.com",
      source: "in-app",
      aiSuggested: { severity: form.severity },
    });
    toast.success("Yeni müşteri raporu alındı — AI triyaj ediyor…", { description: id });
    setForm({ title: "", description: "", severity: "medium", reporter: "" });
    setOpen(false);
  }

  const colDefs: { key: ColKey; label: string }[] = [
    { key: "severity", label: "Önem" },
    { key: "status", label: "Durum" },
    { key: "sla", label: "SLA" },
    { key: "source", label: "Kaynak" },
    { key: "reporter", label: "Raporlayan" },
    { key: "assignee", label: "Atanan" },
    { key: "age", label: "Yaş" },
  ];
  const show = (k: ColKey) => !hidden.has(k);
  function toggleCol(k: ColKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title="Issues"
        description="Hata raporlarını al, SLA penceresinde triyaj et ve çözüme ulaştır."
        actions={[
          { label: "Müşteri Raporu Simüle Et", icon: Smartphone, variant: "default", onClick: () => setOpen(true) },
          { label: "AI Triyaj", icon: Sparkles, onClick: () => queuePrompt("Açık hata raporlarını önem derecesine göre triyaj et ve olası kopyaları grupla.") },
        ]}
      />
      <PageBody className="space-y-4">
        {/* ── KPI şeridi ── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Açık kayıt" value={kpi.active} icon={Bug} delta={-12}
              trend={[9, 11, 10, 13, 12, 10, kpi.active]} hint="triyaj + geliştiriliyor"
            />
            <KpiCard
              label="Kritik (açık)" value={kpi.critical} icon={Warning} delta={kpi.critical > 0 ? 8 : 0}
              invert trend={[0, 1, 1, 2, 1, 1, kpi.critical]} hint="acil müdahale"
            />
            <KpiCard
              label="SLA aşımı" value={kpi.breached} icon={Timer} delta={kpi.breached > 0 ? 25 : -40}
              invert trend={[2, 2, 3, 2, 1, 1, kpi.breached]} hint="hedef dışı"
            />
            <KpiCard
              label="Çözüm oranı" value={`${kpi.resolveRate}%`} icon={TrendUp} delta={6}
              trend={[40, 44, 47, 50, 52, 55, kpi.resolveRate]} hint={`${kpi.resolved} kapandı`}
            />
          </div>
        )}

        {/* ── FilterBar ── */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="ID, başlık, raporlayan, model ara…"
          onExport={exportData}
          columns={colDefs.map((c) => ({ key: c.key, label: c.label, visible: show(c.key), toggle: () => toggleCol(c.key) }))}
        >
          {STATUS_OPTS.map((s) => (
            <FilterChip key={s.v} active={statusF === s.v} onClick={() => setStatusF(statusF === s.v ? null : s.v)}
              count={bugs.filter((b) => b.status === s.v).length}>
              {s.label}
            </FilterChip>
          ))}
          {SEVERITY_OPTS.map((s) => (
            <FilterChip key={s} active={sevF === s} onClick={() => setSevF(sevF === s ? null : s)}
              count={bugs.filter((b) => b.severity === s).length}>
              {s}
            </FilterChip>
          ))}
          {SOURCE_OPTS.map((s) => (
            <FilterChip key={s} active={sourceF === s} onClick={() => setSourceF(sourceF === s ? null : s)}>
              {SOURCE_LABEL[s]}
            </FilterChip>
          ))}
          <FilterChip active={slaOnly} onClick={() => setSlaOnly(!slaOnly)} count={kpi.breached}>
            SLA riski
          </FilterChip>
        </FilterBar>

        {/* ── BulkBar ── */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Select onValueChange={(v) => v && bulkStatus(v as IssueStatus)}>
            <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Durum ata…" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => v && bulkAssign(v as string)}>
            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Birine ata…" /></SelectTrigger>
            <SelectContent>
              {TEAM_MEMBERS_SHORT.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={bulkTriage}>
            <Sparkles className="size-3.5" /> AI Triyaj Uygula
          </Button>
        </BulkBar>

        {/* ── İçerik ── */}
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : filtered.length === 0 ? (
          anyFilter ? (
            <EmptyState
              variant="search"
              icon={Bug}
              title="Eşleşen hata yok"
              description="Filtreleri gevşetmeyi veya aramayı temizlemeyi deneyin."
              action={
                <Button variant="outline" size="sm" onClick={() => {
                  setSearch(""); setStatusF(null); setSevF(null); setSourceF(null); setSlaOnly(false);
                }}>Filtreleri sıfırla</Button>
              }
            />
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="Açık hata yok"
              description="Tüm raporlar çözülmüş görünüyor. Yeni bir müşteri raporu simüle edebilirsiniz."
              action={<Button size="sm" onClick={() => setOpen(true)}>Müşteri Raporu Simüle Et</Button>}
            />
          )
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 w-9">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tümünü seç" />
                  </TableHead>
                  <TableHead className="h-10 text-xs">Kayıt</TableHead>
                  {show("severity") && <TableHead className="h-10 text-xs">Önem</TableHead>}
                  {show("status") && <TableHead className="h-10 text-xs">Durum</TableHead>}
                  {show("sla") && <TableHead className="h-10 text-xs">SLA</TableHead>}
                  {show("source") && <TableHead className="h-10 text-xs">Kaynak</TableHead>}
                  {show("reporter") && <TableHead className="h-10 text-xs">Raporlayan</TableHead>}
                  {show("assignee") && <TableHead className="h-10 text-xs">Atanan</TableHead>}
                  {show("age") && <TableHead className="h-10 text-xs">Yaş</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const Src = SOURCE_ICON[b.source];
                  const isSel = selected.has(b.id);
                  return (
                    <TableRow
                      key={b.id}
                      className={cn("cursor-pointer", isSel && "bg-primary/5")}
                      onClick={() => setDetailId(b.id)}
                    >
                      <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSel} onCheckedChange={() => toggleRow(b.id)} aria-label={`${b.id} seç`} />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">{b.id}</span>
                            {b.aiSuggested?.duplicateOf && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-violet-400/10 px-1 text-[10px] text-violet-400">
                                <ArrowsClockwise className="size-2.5" /> kopya?
                              </span>
                            )}
                          </span>
                          <span className="text-sm font-medium leading-tight">{b.title}</span>
                        </div>
                      </TableCell>
                      {show("severity") && <TableCell className="py-2.5"><SeverityBadge severity={b.severity} /></TableCell>}
                      {show("status") && <TableCell className="py-2.5"><IssueStatusBadge status={b.status} /></TableCell>}
                      {show("sla") && <TableCell className="py-2.5"><SlaBadge state={slaState(b)} /></TableCell>}
                      {show("source") && (
                        <TableCell className="py-2.5">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Src className="size-3.5" />{SOURCE_LABEL[b.source]}
                          </span>
                        </TableCell>
                      )}
                      {show("reporter") && <TableCell className="py-2.5 text-xs text-muted-foreground">{b.reporter}</TableCell>}
                      {show("assignee") && (
                        <TableCell className="py-2.5 text-xs">
                          {b.assignee ? (
                            <span className="inline-flex items-center gap-1"><UserCircle className="size-3.5 text-muted-foreground" />{b.assignee}</span>
                          ) : <span className="text-muted-foreground">atanmadı</span>}
                        </TableCell>
                      )}
                      {show("age") && (
                        <TableCell className="py-2.5 text-xs tabular-nums text-muted-foreground">
                          {fmtAge(ageMinutes(b.createdAt))}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} / {bugs.length} kayıt
            {anyFilter && " (filtreli)"} · ortalama açık yaş {fmtAge(Math.round(kpi.avgAge))}
          </p>
        )}
      </PageBody>

      {/* ── DetailDrawer ── */}
      <IssueDrawer
        issue={detail}
        onClose={() => setDetailId(null)}
        onStatus={rowStatus}
        onSeverity={rowSeverity}
        onAssign={rowAssign}
        onAi={rowAi}
        onGoToDetail={(id) => navigate(`/issues/${id}`)}
      />

      {/* ── Müşteri raporu diyaloğu ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="size-4 text-primary" /> Müşteri Hata Raporu</DialogTitle>
          </DialogHeader>
          <p className="-mt-1 text-xs text-muted-foreground">Uygulama içi widget'tan gelen bir raporu simüle eder.</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Başlık</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Kısa özet" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ne oldu?" className="min-h-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Önem</Label>
                <Select value={form.severity} onValueChange={(v) => v && setForm({ ...form, severity: v as IssueSeverity })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>E-posta</Label>
                <Input value={form.reporter} onChange={(e) => setForm({ ...form, reporter: e.target.value })} placeholder="musteri@app.com" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={submit}>Raporu Gönder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── DetailDrawer içeriği ──────────────────────────────────────────────
function IssueDrawer({
  issue, onClose, onStatus, onSeverity, onAssign, onAi, onGoToDetail,
}: {
  issue: Issue | null;
  onClose: () => void;
  onStatus: (id: string, s: IssueStatus) => void;
  onSeverity: (id: string, s: IssueSeverity) => void;
  onAssign: (id: string, who: string) => void;
  onAi: (i: Issue) => void;
  onGoToDetail: (id: string) => void;
}) {
  if (!issue) {
    return <DetailDrawer open={false} onOpenChange={() => onClose()} title="" />;
  }
  const sla = slaState(issue);
  const age = ageMinutes(issue.createdAt);
  const Src = SOURCE_ICON[issue.source];

  // Audit timeline — yorumlar + sentetik durum olayları
  const events: AuditEvent[] = [];
  if (issue.aiSuggested) {
    events.push({
      id: "ai", actor: "AI Triyaj", action: `önem '${issue.aiSuggested.severity ?? issue.severity}' önerdi`,
      at: issue.createdAt, icon: Sparkles, tone: "primary",
      detail: issue.aiSuggested.duplicateOf ? `olası kopya: ${issue.aiSuggested.duplicateOf}` : undefined,
    });
  }
  issue.comments.forEach((c) => {
    events.push({
      id: c.id, actor: c.author,
      action: c.authorKind === "customer" ? "rapor ekledi" : c.authorKind === "ai" ? "not düştü" : "yorum yaptı",
      at: c.time, icon: c.authorKind === "ai" ? Lightning : ChatCircle,
      tone: c.authorKind === "ai" ? "primary" : "default",
      detail: c.body,
    });
  });
  if (issue.assignee) {
    events.push({ id: "asg", actor: issue.assignee, action: "kayda atandı", at: issue.createdAt, icon: UserCircle, tone: "default" });
  }
  events.push({
    id: "created", actor: issue.reporter, action: `kaydı oluşturdu (${SOURCE_LABEL[issue.source]})`,
    at: issue.createdAt, icon: Bug, tone: issue.severity === "critical" ? "red" : "default",
  });

  const genel = (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-foreground">{issue.description || "Açıklama girilmemiş."}</p>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">SLA penceresi</span>
          <SlaBadge state={sla} />
        </div>
        <SlaMeter age={age} target={SLA_TARGET[issue.severity]} state={sla} />
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>yaş {fmtAge(age)}</span>
          <span>hedef {fmtAge(SLA_TARGET[issue.severity])}</span>
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        <Field label="ID" mono>{issue.id}</Field>
        <Field label="Önem">
          <Select value={issue.severity} onValueChange={(v) => v && onSeverity(issue.id, v as IssueSeverity)}>
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITY_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Durum">
          <Select value={issue.status} onValueChange={(v) => v && onStatus(issue.id, v as IssueStatus)}>
            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Atanan">
          <Select value={issue.assignee ?? "—"} onValueChange={(v) => v && onAssign(issue.id, v as string)}>
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="—">atanmadı</SelectItem>
              {TEAM_MEMBERS_SHORT.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Kaynak"><span className="inline-flex items-center gap-1"><Src className="size-3.5" />{SOURCE_LABEL[issue.source]}</span></Field>
        <Field label="Raporlayan" mono>{issue.reporter}</Field>
        {issue.linkedModel && <Field label="Model"><span className="inline-flex items-center gap-1"><Database className="size-3.5 text-muted-foreground" />{issue.linkedModel}</span></Field>}
        {issue.linkedModule && <Field label="Modül"><span className="inline-flex items-center gap-1"><GitBranch className="size-3.5 text-muted-foreground" />{issue.linkedModule}</span></Field>}
        <Field label="Oluşturma">{issue.createdAt}</Field>
      </div>

      {issue.aiSuggested && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> AI önerisi
          </div>
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {issue.aiSuggested.severity && <p>Önem: <span className="text-foreground">{issue.aiSuggested.severity}</span></p>}
            {issue.aiSuggested.assignee && <p>Atama: <span className="text-foreground">{issue.aiSuggested.assignee}</span></p>}
            {issue.aiSuggested.duplicateOf && <p>Olası kopya: <span className="text-foreground">{issue.aiSuggested.duplicateOf}</span></p>}
          </div>
          <Button size="sm" className="mt-2 gap-1.5" onClick={() => onAi(issue)}>
            <Sparkles className="size-3.5" /> Öneriyi uygula
          </Button>
        </div>
      )}
    </div>
  );

  const tabs: DrawerTab[] = [
    { value: "genel", label: "Genel", content: genel },
    { value: "aktivite", label: "Aktivite", content: <AuditTimeline events={events} /> },
    {
      value: "json", label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(issue, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open={Boolean(issue)}
      onOpenChange={(v) => !v && onClose()}
      title={<span className="flex items-center gap-2"><Hash className="size-4 text-muted-foreground" />{issue.title}</span>}
      subtitle={`${issue.id} · ${issue.reporter}`}
      badge={<SeverityBadge severity={issue.severity} />}
      tabs={tabs}
      footer={
        <div className="flex w-full items-center justify-between p-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onGoToDetail(issue.id)}>
            Tam detay <ArrowRight className="size-3.5" />
          </Button>
          {issue.status !== "resolved" && issue.status !== "closed" && (
            <Button size="sm" className="gap-1.5" onClick={() => onStatus(issue.id, "resolved")}>
              <CheckCircle className="size-3.5" /> Çözüldü işaretle
            </Button>
          )}
        </div>
      }
    />
  );
}

// SLA ilerleme çubuğu
function SlaMeter({ age, target, state }: { age: number; target: number; state: SlaState }) {
  const pct = Math.min(100, Math.round((age / target) * 100));
  const color = state === "breach" ? "bg-red-400" : state === "warn" ? "bg-amber-400" : state === "done" ? "bg-muted-foreground/40" : "bg-emerald-400";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
