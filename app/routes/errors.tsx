import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, OctagonAlert, Users, GitBranch, Bug } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SEED_ERRORS, type ErrorGroup } from "~/data/delivery";
import { StatusBadge } from "~/components/delivery/badges";
import { useIssueStore } from "~/stores/issue-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Error Tracking — MetaPanel" }];
}

const STATUS_TONE = { unresolved: "red", resolved: "emerald", ignored: "muted" } as const;
const ENV_TONE: Record<string, string> = { dev: "text-sky-400", staging: "text-amber-400", prod: "text-emerald-400" };

export default function Errors() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ErrorGroup[]>(SEED_ERRORS);
  const [selected, setSelected] = useState<ErrorGroup>(SEED_ERRORS[0]);
  const submitReport = useIssueStore((s) => s.submitReport);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  function createIssue(e: ErrorGroup) {
    if (e.linkedIssue) {
      navigate(`/issues/${e.linkedIssue}`);
      return;
    }
    const id = submitReport({
      title: e.title,
      description: `${e.culprit} — ${e.count} kez, ${e.users} kullanıcı etkilendi (${e.env}).`,
      severity: e.users > 100 ? "critical" : "high",
      source: "manual",
      reporter: "error-tracker",
      aiSuggested: { severity: e.users > 100 ? "critical" : "high" },
    });
    setErrors((prev) => prev.map((x) => (x.id === e.id ? { ...x, linkedIssue: id } : x)));
    setSelected((s) => ({ ...s, linkedIssue: id }));
    toast.success("Issue oluşturuldu", { description: `${id} ← ${e.title}` });
  }

  return (
    <>
      <PageHeader
        title="Error Tracking"
        description="Gruplanmış exception'lar — occurrence, etkilenen kullanıcı, stack trace."
        actions={[
          { label: "AI: Kök Neden", icon: Sparkles, variant: "default", onClick: () => queuePrompt(`Bu hatayı analiz et ve kök neden öner: ${selected.title} (${selected.culprit}).`) },
        ]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* List */}
        <div className="mp-scroll space-y-1.5 overflow-y-auto lg:max-h-[calc(100vh-11rem)]">
          {errors.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className={cn(
                "flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
                selected.id === e.id ? "border-primary/40 bg-accent" : "hover:bg-accent/40",
              )}
            >
              <div className="flex items-center gap-2">
                <OctagonAlert className="size-4 shrink-0 text-red-400" />
                <span className="truncate text-sm font-medium">{e.title}</span>
                <StatusBadge label={e.status} tone={STATUS_TONE[e.status]} className="ml-auto" />
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span className="truncate">{e.culprit}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="tabular-nums">{e.count.toLocaleString("tr")} olay</span>
                <span className="inline-flex items-center gap-1"><Users className="size-3" />{e.users}</span>
                <span className={ENV_TONE[e.env]}>{e.env}</span>
                <span className="ml-auto">{e.lastSeen}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-2">
              <OctagonAlert className="mt-0.5 size-5 shrink-0 text-red-400" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{selected.title}</h3>
                <p className="font-mono text-xs text-muted-foreground">{selected.culprit}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Metric label="Olay" value={selected.count.toLocaleString("tr")} />
              <Metric label="Kullanıcı" value={String(selected.users)} />
              <Metric label="Ortam" value={selected.env} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>ilk: {selected.firstSeen}</span><span>·</span><span>son: {selected.lastSeen}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
              <GitBranch className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Stack Trace</span>
            </div>
            <pre className="mp-scroll max-h-48 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <code>{selected.trace}</code>
            </pre>
          </div>

          <Button className="w-full gap-1.5" variant={selected.linkedIssue ? "outline" : "default"} onClick={() => createIssue(selected)}>
            <Bug className="size-4" />
            {selected.linkedIssue ? `Bağlı issue: ${selected.linkedIssue}` : "Issue Oluştur"}
          </Button>
        </div>
      </PageBody>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
