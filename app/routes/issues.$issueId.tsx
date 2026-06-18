import { useState } from "react";
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
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useIssueStore } from "~/stores/issue-store";
import { useSchemaStore } from "~/stores/schema-store";
import { useChangeSetStore } from "~/stores/change-set-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { SeverityBadge, IssueStatusBadge } from "~/components/delivery/badges";
import type { IssueSeverity, IssueStatus } from "~/data/delivery";
import { TEAM_MEMBERS_SHORT } from "~/data/delivery";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

const SOURCE_ICON = { "in-app": Smartphone, email: Mail, manual: PenLine } as const;

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

  if (!issue) {
    return (
      <PageBody className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Issue bulunamadı.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/issues")}>Issues'a dön</Button>
        </div>
      </PageBody>
    );
  }

  const SourceIcon = SOURCE_ICON[issue.source];
  const linkedModel = models.find((m) => m.name === issue.linkedModel);
  const canStart = issue.status === "triage" || issue.status === "in-progress";
  const isActive = activeIssueId === issue.id;

  // Route the developer to the right place to actually do the work.
  function startDev() {
    startFix({ id: issue!.id, title: issue!.title, type: issue!.type });
    setStatus(issue!.id, "in-progress");
    if (linkedModel) navigate(`/schema/${linkedModel.id}`);
    else if (issue!.linkedModule) navigate("/modules");
    else {
      // logic/code-level fix → hand off to the AI copilot for a root-cause + fix
      queuePrompt(`${issue!.id}: "${issue!.title}" hatasının kök nedenini ve çözümünü öner.`);
      navigate("/ai-copilot");
    }
  }

  return (
    <>
      <PageHeader
        title={`${issue.id} · ${issue.title}`}
        description={`${issue.source} · ${issue.reporter} · ${issue.createdAt}`}
        actions={canStart && !isActive ? [{ label: changeSet ? "Geliştirmeye Devam Et" : "Geliştirmeye Başla", icon: Wrench, variant: "default", onClick: startDev }] : []}
      >
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" render={<Link to="/issues" />}>
          <ArrowLeft className="size-4" /> Issues
        </Button>
      </PageHeader>
      <PageBody className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Left: description + thread */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm leading-relaxed">{issue.description || "Açıklama yok."}</p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Yorumlar</h3>
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
              {issue.comments.length === 0 && <p className="text-xs text-muted-foreground">Henüz yorum yok.</p>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && comment.trim()) {
                    addComment(issue.id, { author: "you", authorKind: "developer", body: comment.trim(), time: "az önce" });
                    setComment("");
                  }
                }}
                placeholder="Yorum ekle…"
                className="h-9 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary/40"
              />
              <Button size="icon" className="size-9" onClick={() => {
                if (!comment.trim()) return;
                addComment(issue.id, { author: "you", authorKind: "developer", body: comment.trim(), time: "az önce" });
                setComment("");
              }}>
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: properties + AI */}
        <aside className="space-y-3">
          <Prop label="Durum">
            <Select value={issue.status} onValueChange={(v) => v && setStatus(issue.id, v as IssueStatus)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["triage", "in-progress", "resolved", "closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Prop>
          <Prop label="Önem">
            <Select value={issue.severity} onValueChange={(v) => v && setSeverity(issue.id, v as IssueSeverity)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Prop>
          <Prop label="Atanan">
            <Select value={issue.assignee ?? "none"} onValueChange={(v) => assign(issue.id, v === "none" ? null : v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— atanmamış —</SelectItem>
                {TEAM_MEMBERS_SHORT.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Prop>

          <div className="rounded-xl border bg-card p-3 text-xs">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground"><SourceIcon className="size-3.5" /> {issue.source} · {issue.reporter}</div>
            <div className="flex flex-wrap gap-1.5">
              <SeverityBadge severity={issue.severity} />
              <IssueStatusBadge status={issue.status} />
            </div>
            {(issue.linkedModel || issue.linkedModule) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {issue.linkedModel && (
                  <Link to={linkedModel ? `/schema/${linkedModel.id}` : "/schema"} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] hover:text-primary">
                    <Database className="size-3" /> {issue.linkedModel}
                  </Link>
                )}
                {issue.linkedModule && (
                  <Link to="/modules" className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] hover:text-primary">
                    <Boxes className="size-3" /> {issue.linkedModule}
                  </Link>
                )}
              </div>
            )}
          </div>

          {issue.aiSuggested && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" /> AI Triyaj
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {issue.aiSuggested.severity && <li>Önerilen önem: <span className="text-foreground">{issue.aiSuggested.severity}</span></li>}
                {issue.aiSuggested.assignee && <li>Önerilen atama: <span className="text-foreground">{issue.aiSuggested.assignee}</span></li>}
                {issue.aiSuggested.duplicateOf && (
                  <li>Olası kopya: <Link to={`/issues/${issue.aiSuggested.duplicateOf}`} className="text-primary">{issue.aiSuggested.duplicateOf}</Link></li>
                )}
              </ul>
              <Button size="sm" className="mt-2 h-7 w-full gap-1.5 text-xs" onClick={() => { applyAiTriage(issue.id); toast.success("AI triyaj uygulandı"); }}>
                <Sparkles className="size-3.5" /> Öneriyi Uygula
              </Button>
            </div>
          )}

          {/* Change set — the bridge from triage to shipping */}
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
        </aside>
      </PageBody>
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
