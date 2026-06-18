import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Sparkle as Sparkles,
  PaperPlaneTilt as Send,
  Database,
  Stack as Boxes,
  DeviceMobile as Smartphone,
  Envelope as Mail,
  PencilSimpleLine as PenLine,
  Wrench,
  GitCommit as GitCommitHorizontal,
  CheckCircle as CheckCircle2,
  Bug,
  Users,
  Clock,
  ChartLineUp,
  Warning,
  Copy,
  LinkSimple,
  XCircle,
  ChatCircle,
  Robot,
  ArrowCounterClockwise,
  ListChecks,
  Lightning,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useIssueStore } from "~/stores/issue-store";
import { useSchemaStore } from "~/stores/schema-store";
import { useChangeSetStore } from "~/stores/change-set-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { SeverityBadge, IssueStatusBadge } from "~/components/delivery/badges";
import type { IssueSeverity, IssueStatus } from "~/data/delivery";
import { SEED_ERRORS, TEAM_MEMBERS_SHORT } from "~/data/delivery";
import {
  ISSUE_ENRICHMENT,
  defaultAudit,
  fallbackTelemetry,
} from "~/data/seed.issue-detail";
import {
  KpiCard,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
  type DrawerTab,
  EmptyState,
} from "~/components/enterprise";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Issue Detayı — MetaPanel" }];
}

const SOURCE_ICON = { "in-app": Smartphone, email: Mail, manual: PenLine } as const;
const SOURCE_LABEL = { "in-app": "Uygulama içi", email: "E-posta", manual: "Manuel" } as const;
const STATUS_OPTS: IssueStatus[] = ["triage", "in-progress", "resolved", "closed"];
const SEVERITY_OPTS: IssueSeverity[] = ["low", "medium", "high", "critical"];
const STATUS_TR: Record<IssueStatus, string> = {
  triage: "triyaj", "in-progress": "geliştiriliyor", resolved: "çözüldü", closed: "kapandı",
};
const SEVERITY_TR: Record<IssueSeverity, string> = {
  low: "düşük", medium: "orta", high: "yüksek", critical: "kritik",
};
const TONE_ICON: Record<NonNullable<AuditEvent["tone"]>, AuditEvent["icon"]> = {
  default: GitCommitHorizontal,
  primary: Sparkles,
  emerald: CheckCircle2,
  amber: Wrench,
  red: Warning,
};

export default function IssueDetail() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const issue = useIssueStore((s) => s.issues.find((i) => i.id === issueId));
  const { setStatus, setSeverity, assign, addComment, applyAiTriage } = useIssueStore();
  const models = useSchemaStore((s) => s.models);
  const startFix = useChangeSetStore((s) => s.startFix);
  const changeSet = useChangeSetStore((s) => s.sets.find((c) => c.issueId === issueId));
  const activeIssueId = useChangeSetStore((s) => s.activeIssueId);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const [comment, setComment] = useState("");
  const [drawerTab, setDrawerTab] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  // ── İlişkili kayıtlar (issue varlığından bağımsız hesaplanır) ──────
  const linkedErrors = useMemo(
    () => (issue ? SEED_ERRORS.filter((e) => e.linkedIssue === issue.id) : []),
    [issue],
  );

  if (!issue) {
    return (
      <PageBody className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={Bug}
          variant="error"
          title="Issue bulunamadı"
          description={`"${issueId}" kaydına ulaşılamadı. Silinmiş veya hatalı bir bağlantı olabilir.`}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/issues")}>
              <ArrowLeft className="size-4" /> Issues'a dön
            </Button>
          }
        />
      </PageBody>
    );
  }

  const SourceIcon = SOURCE_ICON[issue.source];
  const linkedModel = models.find((m) => m.name === issue.linkedModel);
  const canStart = issue.status === "triage" || issue.status === "in-progress";
  const isActive = activeIssueId === issue.id;

  const enrich = ISSUE_ENRICHMENT[issue.id];
  const telemetry = enrich?.telemetry ?? fallbackTelemetry({ votes: issue.votes, status: issue.status });
  const slaBreached = telemetry.ageHours > telemetry.slaTargetHours && issue.status !== "resolved" && issue.status !== "closed";
  const slaPct = Math.min(100, Math.round((telemetry.ageHours / telemetry.slaTargetHours) * 100));

  // ── Audit akışı (seed + canlı yorumlardan türetilir) ───────────────
  const auditSeed =
    enrich?.audit ??
    defaultAudit({
      reporter: issue.reporter,
      source: SOURCE_LABEL[issue.source],
      createdAt: issue.createdAt,
      assignee: issue.assignee,
      status: issue.status,
      severity: issue.severity,
    });
  const auditEvents: AuditEvent[] = [
    ...issue.comments
      .filter((c) => c.authorKind !== "customer")
      .map((c) => ({
        id: `cm_${c.id}`,
        action: c.authorKind === "ai" ? "AI notu ekledi" : "yorum ekledi",
        actor: c.author,
        at: c.time,
        tone: (c.authorKind === "ai" ? "primary" : "default") as AuditEvent["tone"],
        detail: c.body,
      })),
    ...auditSeed.map((a) => ({
      ...a,
      icon: TONE_ICON[a.tone ?? "default"],
    })),
  ];

  // Route the developer to the right place to actually do the work.
  function startDev() {
    startFix({ id: issue!.id, title: issue!.title, type: issue!.type });
    setStatus(issue!.id, "in-progress");
    toast.success(`${issue!.id} geliştirmeye alındı`);
    if (linkedModel) navigate(`/schema/${linkedModel.id}`);
    else if (issue!.linkedModule) navigate("/modules");
    else {
      queuePrompt(`${issue!.id}: "${issue!.title}" hatasının kök nedenini ve çözümünü öner.`);
      navigate("/ai-copilot");
    }
  }

  function changeStatus(v: IssueStatus) {
    if (v === "closed" && issue!.status !== "closed") {
      setConfirmClose(true);
      return;
    }
    setStatus(issue!.id, v);
    toast.success(`Durum '${STATUS_TR[v]}' olarak güncellendi`);
  }

  function exportJson() {
    const payload = JSON.stringify({ issue, telemetry, changeSet, linkedErrors }, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(payload).catch(() => {});
    }
    toast.success("Issue JSON panoya kopyalandı");
  }

  function postComment(body: string) {
    if (!body.trim()) return;
    addComment(issue!.id, { author: "you", authorKind: "developer", body: body.trim(), time: "az önce" });
    setComment("");
    toast.success("Yorum eklendi");
  }

  // ── DetailDrawer sekmeleri (Genel / Aktivite / JSON) ───────────────
  const drawerTabs: DrawerTab[] = [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="divide-y">
          <Field label="ID" mono>{issue.id}</Field>
          <Field label="Tür">{issue.type === "bug" ? "Hata" : "Özellik"}</Field>
          <Field label="Başlık">{issue.title}</Field>
          <Field label="Durum"><IssueStatusBadge status={issue.status} /></Field>
          <Field label="Önem"><SeverityBadge severity={issue.severity} /></Field>
          <Field label="Kaynak">{SOURCE_LABEL[issue.source]}</Field>
          <Field label="Raporlayan" mono>{issue.reporter}</Field>
          <Field label="Atanan" mono>{issue.assignee ?? "—"}</Field>
          <Field label="Oluşturulma">{issue.createdAt}</Field>
          <Field label="Etkilenen kullanıcı">{telemetry.affectedUsers.toLocaleString("tr-TR")}</Field>
          <Field label="24s olay">{telemetry.occurrences24h.toLocaleString("tr-TR")}</Field>
          <Field label="Ortam" mono>{telemetry.env}</Field>
          <Field label="Oy">{issue.votes}</Field>
          {issue.linkedModel && <Field label="Bağlı model" mono>{issue.linkedModel}</Field>}
          {issue.linkedModule && <Field label="Bağlı modül" mono>{issue.linkedModule}</Field>}
        </div>
      ),
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={auditEvents} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify({ issue, telemetry, changeSet: changeSet ?? null }, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={`${issue.id} · ${issue.title}`}
        description={`${SOURCE_LABEL[issue.source]} · ${issue.reporter} · ${issue.createdAt}`}
        actions={[
          ...(canStart && !isActive
            ? [{ label: changeSet ? "Geliştirmeye Devam Et" : "Geliştirmeye Başla", icon: Wrench, variant: "default" as const, onClick: startDev }]
            : []),
          { label: "Aktivite", icon: ListChecks, onClick: () => setDrawerTab("activity") },
        ]}
      >
        <Button variant="ghost" size="sm" nativeButton={false} className="h-8 gap-1.5" render={<Link to="/issues" />}>
          <ArrowLeft className="size-4" /> Issues
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        {/* ── KPI şeridi — issue'nun "neden önemli" özeti ───────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Etkilenen kullanıcı"
            value={telemetry.affectedUsers.toLocaleString("tr-TR")}
            icon={Users}
            hint={telemetry.env}
            trend={telemetry.trend}
            invert
            delta={telemetry.affectedUsers > 50 ? 12 : -8}
          />
          <KpiCard
            label="24s olay"
            value={telemetry.occurrences24h.toLocaleString("tr-TR")}
            icon={ChartLineUp}
            trend={telemetry.trend}
            invert
            delta={issue.status === "closed" ? -100 : 34}
          />
          <KpiCard
            label="SLA durumu"
            value={slaBreached ? "Aşıldı" : `${slaPct}%`}
            icon={Clock}
            hint={`hedef ${telemetry.slaTargetHours}s`}
            invert
            delta={slaBreached ? 100 : slaPct - 50}
          />
          <KpiCard
            label="AI güven"
            value={enrich?.aiConfidence != null ? `${enrich.aiConfidence}%` : "—"}
            icon={Robot}
            hint={issue.aiSuggested ? "triyaj hazır" : "öneri yok"}
            delta={enrich?.aiConfidence != null ? enrich.aiConfidence - 70 : undefined}
          />
        </div>

        {slaBreached && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
            <Warning className="size-4 shrink-0" weight="fill" />
            <span>
              SLA ihlali: kayıt {Math.round(telemetry.ageHours)} saattir açık, hedef {telemetry.slaTargetHours} saat.
              Önceliklendirme gerekiyor.
            </span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* ── Sol: açıklama + AI triyaj + ilişkili + thread ─────────── */}
          <div className="space-y-4">
            {/* Açıklama */}
            <section className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Bug className="size-3.5" /> Açıklama
              </h3>
              <p className="text-sm leading-relaxed">{issue.description || "Açıklama yok."}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <SeverityBadge severity={issue.severity} />
                <IssueStatusBadge status={issue.status} />
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <SourceIcon className="size-3" /> {SOURCE_LABEL[issue.source]}
                </Badge>
                {issue.type === "feature" && issue.stage && (
                  <Badge variant="secondary" className="text-[10px]">{issue.stage}</Badge>
                )}
              </div>
            </section>

            {/* AI triyaj paneli — gerekçe + adımlar + uygula */}
            {(issue.aiSuggested || enrich?.aiRationale) && (
              <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Sparkles className="size-4" weight="fill" /> AI Triyaj
                  {enrich?.aiConfidence != null && (
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] tabular-nums">
                      güven %{enrich.aiConfidence}
                    </span>
                  )}
                </div>

                {enrich?.aiRationale && (
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{enrich.aiRationale}</p>
                )}

                <div className="grid gap-2 sm:grid-cols-3">
                  {issue.aiSuggested?.severity && (
                    <div className="rounded-lg border bg-card/60 p-2 text-xs">
                      <span className="text-muted-foreground">Önerilen önem</span>
                      <div className="mt-1"><SeverityBadge severity={issue.aiSuggested.severity} /></div>
                    </div>
                  )}
                  {issue.aiSuggested?.assignee && (
                    <div className="rounded-lg border bg-card/60 p-2 text-xs">
                      <span className="text-muted-foreground">Önerilen atama</span>
                      <div className="mt-1 font-medium">{issue.aiSuggested.assignee}</div>
                    </div>
                  )}
                  {issue.aiSuggested?.duplicateOf && (
                    <Link
                      to={`/issues/${issue.aiSuggested.duplicateOf}`}
                      className="flex flex-col rounded-lg border bg-card/60 p-2 text-xs transition-colors hover:border-primary/40"
                    >
                      <span className="text-muted-foreground">Olası kopya</span>
                      <span className="mt-1 inline-flex items-center gap-1 font-medium text-primary">
                        <Copy className="size-3" /> {issue.aiSuggested.duplicateOf}
                      </span>
                    </Link>
                  )}
                </div>

                {enrich?.aiSteps && enrich.aiSteps.length > 0 && (
                  <ol className="mt-3 space-y-1.5">
                    {enrich.aiSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary tabular-nums">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {issue.aiSuggested && (
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => { applyAiTriage(issue.id); toast.success("AI triyaj uygulandı"); }}
                    >
                      <Sparkles className="size-3.5" /> Öneriyi Uygula
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => {
                      queuePrompt(`${issue.id}: "${issue.title}" için kök neden analizi ve düzeltme planı üret.`);
                      navigate("/ai-copilot");
                    }}
                  >
                    <Lightning className="size-3.5" /> Copilot'a sor
                  </Button>
                </div>
              </section>
            )}

            {/* İlişkili kayıtlar */}
            {(linkedErrors.length > 0 || issue.linkedModel || issue.linkedModule) && (
              <section className="rounded-xl border bg-card p-4">
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <LinkSimple className="size-3.5" /> İlişkili kayıtlar
                </h3>
                <div className="space-y-2">
                  {linkedErrors.map((e) => (
                    <Link
                      key={e.id}
                      to="/errors"
                      className="flex items-center gap-2 rounded-lg border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-400">
                        <Warning className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{e.culprit}</p>
                      </div>
                      <span className="shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                        {e.count.toLocaleString("tr-TR")} olay
                        <br />
                        {e.users} kullanıcı
                      </span>
                    </Link>
                  ))}
                  {issue.linkedModel && (
                    <Link
                      to={linkedModel ? `/schema/${linkedModel.id}` : "/schema"}
                      className="flex items-center gap-2 rounded-lg border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-400">
                        <Database className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{issue.linkedModel}</p>
                        <p className="text-[11px] text-muted-foreground">Bağlı veri modeli · Schema</p>
                      </div>
                    </Link>
                  )}
                  {issue.linkedModule && (
                    <Link
                      to="/modules"
                      className="flex items-center gap-2 rounded-lg border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-400">
                        <Boxes className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{issue.linkedModule}</p>
                        <p className="text-[11px] text-muted-foreground">Bağlı modül</p>
                      </div>
                    </Link>
                  )}
                </div>
              </section>
            )}

            {/* Yorum / aktivite thread */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <ChatCircle className="size-3.5" /> Yorumlar
                <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{issue.comments.length}</span>
              </h3>
              <div className="space-y-2">
                {issue.comments.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-lg border p-3",
                      c.authorKind === "customer" && "border-sky-500/20 bg-sky-500/5",
                      c.authorKind === "ai" && "border-primary/20 bg-primary/5",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="font-medium">{c.author}</span>
                      {c.authorKind === "customer" && <Badge variant="secondary" className="text-[9px]">müşteri</Badge>}
                      {c.authorKind === "ai" && <Badge variant="secondary" className="text-[9px] text-primary">AI</Badge>}
                      <span className="ml-auto text-muted-foreground">{c.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.body}</p>
                  </div>
                ))}
                {issue.comments.length === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Henüz yorum yok. İlk notu sen ekle.
                  </p>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && comment.trim()) postComment(comment);
                  }}
                  placeholder="Yorum ekle… (Enter ile gönder)"
                  aria-label="Yorum"
                  className="h-9 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary/40"
                />
                <Button size="icon" className="size-9" aria-label="Yorumu gönder" onClick={() => postComment(comment)}>
                  <Send className="size-4" />
                </Button>
              </div>
            </section>
          </div>

          {/* ── Sağ: özellikler + durum aksiyonları + change set ─────── */}
          <aside className="space-y-3">
            <div className="rounded-xl border bg-card p-3">
              <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Özellikler</h3>
              <div className="space-y-3">
                <Prop label="Durum">
                  <Select value={issue.status} onValueChange={(v) => v && changeStatus(v as IssueStatus)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{STATUS_TR[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Prop>
                <Prop label="Önem">
                  <Select value={issue.severity} onValueChange={(v) => { if (v) { setSeverity(issue.id, v as IssueSeverity); toast.success(`Önem '${SEVERITY_TR[v as IssueSeverity]}' yapıldı`); } }}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTS.map((s) => <SelectItem key={s} value={s}>{SEVERITY_TR[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Prop>
                <Prop label="Atanan">
                  <Select value={issue.assignee ?? "none"} onValueChange={(v) => { assign(issue.id, v === "none" ? null : v); toast.success(v === "none" ? "Atama kaldırıldı" : `${v} kişisine atandı`); }}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— atanmamış —</SelectItem>
                      {TEAM_MEMBERS_SHORT.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Prop>
              </div>

              <Separator className="my-3" />
              <dl className="space-y-1.5 text-xs">
                <MetaRow label="Kaynak"><span className="inline-flex items-center gap-1"><SourceIcon className="size-3" /> {SOURCE_LABEL[issue.source]}</span></MetaRow>
                <MetaRow label="Raporlayan"><span className="font-mono">{issue.reporter}</span></MetaRow>
                <MetaRow label="Açıldı">{issue.createdAt}</MetaRow>
                <MetaRow label="İlk görülme">{telemetry.firstSeen}</MetaRow>
                <MetaRow label="Oy">{issue.votes}</MetaRow>
              </dl>
            </div>

            {/* Hızlı durum aksiyonları */}
            <div className="rounded-xl border bg-card p-3">
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Hızlı işlem</h3>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm" variant="outline" className="h-8 gap-1 text-xs"
                  disabled={issue.status === "resolved"}
                  onClick={() => { setStatus(issue.id, "resolved"); toast.success("Çözüldü olarak işaretlendi"); }}
                >
                  <CheckCircle2 className="size-3.5 text-emerald-400" /> Çözüldü
                </Button>
                <Button
                  size="sm" variant="outline" className="h-8 gap-1 text-xs"
                  disabled={issue.status === "triage"}
                  onClick={() => { setStatus(issue.id, "triage"); toast("Triyaja geri alındı"); }}
                >
                  <ArrowCounterClockwise className="size-3.5" /> Triyaja al
                </Button>
                <Button
                  size="sm" variant="outline" className="col-span-2 h-8 gap-1 text-xs text-red-400 hover:text-red-400"
                  disabled={issue.status === "closed"}
                  onClick={() => setConfirmClose(true)}
                >
                  <XCircle className="size-3.5" /> Kaydı kapat
                </Button>
              </div>
            </div>

            {/* Change set — triyajdan sevkiyata köprü */}
            {changeSet && (
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                  <Wrench className="size-3.5 text-amber-400" /> Geliştirme
                  {changeSet.status === "ready" && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">
                      <CheckCircle2 className="size-2.5" /> yayına hazır
                    </span>
                  )}
                  {changeSet.status === "released" && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">yayınlandı</span>
                  )}
                  {isActive && (
                    <span className="ml-auto rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">düzeltiliyor…</span>
                  )}
                </div>
                {changeSet.changes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {changeSet.changes.map((c) => (
                      <li key={c.id} className="flex items-start gap-1.5 text-xs">
                        <GitCommitHorizontal className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                        <span><span className="text-muted-foreground">{c.surface}:</span> {c.summary}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Henüz değişiklik kaydedilmedi. {isActive ? "Üstteki çubuktan kaydet." : "\"Geliştirmeye Devam Et\" ile sürdür."}
                  </p>
                )}
                {changeSet.status === "ready" && (
                  <Link to="/releases" className="mt-2 inline-block text-[11px] text-primary hover:underline">
                    Releases'te yayınla →
                  </Link>
                )}
              </div>
            )}

            {/* Aktivite kısayolu + export */}
            <div className="rounded-xl border bg-card p-3">
              <button
                onClick={() => setDrawerTab("activity")}
                className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ListChecks className="size-3.5" /> Tam aktivite & denetim geçmişi
                <span className="ml-auto rounded-full bg-muted px-1.5 tabular-nums">{auditEvents.length}</span>
              </button>
              <button
                onClick={exportJson}
                className="mt-2 flex w-full items-center gap-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Copy className="size-3.5" /> JSON olarak kopyala
              </button>
            </div>
          </aside>
        </div>
      </PageBody>

      {/* ── Sekmeli DetailDrawer (Genel / Aktivite / JSON) ─────────── */}
      <DetailDrawer
        open={drawerTab !== null}
        onOpenChange={(v) => setDrawerTab(v ? (drawerTab ?? "general") : null)}
        title={issue.id}
        subtitle={issue.title}
        badge={<IssueStatusBadge status={issue.status} />}
        tabs={drawerTabs}
      />

      {/* ── Yıkıcı işlem onayı ────────────────────────────────────── */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaydı kapat</DialogTitle>
            <DialogDescription>
              {issue.id} kaydı kapatılacak. Kapatılan kayıtlar varsayılan listede gizlenir; gerekirse tekrar açabilirsin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmClose(false)}>Vazgeç</Button>
            <Button
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                setStatus(issue.id, "closed");
                setConfirmClose(false);
                toast.success(`${issue.id} kapatıldı`, {
                  action: { label: "Geri al", onClick: () => setStatus(issue.id, "triage") },
                });
              }}
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
