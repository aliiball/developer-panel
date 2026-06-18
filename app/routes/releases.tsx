import { useState } from "react";
import {
  RocketLaunch as Rocket,
  Sparkle as Sparkles,
  CaretDown as ChevronDown,
  ArrowUUpLeft as Undo2,
  GitCommit as GitCommitHorizontal,
  ArrowLineUp as ArrowUpToLine,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { StatusTimeline, type TimelineStep } from "~/components/delivery/StatusTimeline";
import { DeployStatusBadge } from "~/components/delivery/badges";
import { useReleaseStore } from "~/stores/release-store";
import { useIssueStore } from "~/stores/issue-store";
import { useChangeSetStore } from "~/stores/change-set-store";
import { useCopilotStore } from "~/stores/copilot-store";
import type { Deployment, EnvName, Environment } from "~/data/delivery";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Releases — MetaPanel" }];
}

const ENV_TONE: Record<EnvName, string> = {
  dev: "text-sky-400", staging: "text-amber-400", prod: "text-emerald-400",
};

export default function Releases() {
  const environments = useReleaseStore((s) => s.environments);
  const deployments = useReleaseStore((s) => s.deployments);
  const deploy = useReleaseStore((s) => s.deploy);
  const rollback = useReleaseStore((s) => s.rollback);
  const issues = useIssueStore((s) => s.issues);
  const changeSets = useChangeSetStore((s) => s.sets);
  const markReleased = useChangeSetStore((s) => s.markReleased);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [openRow, setOpenRow] = useState<string | null>(deployments[0]?.id ?? null);

  // Next-release changelog: prefer "ready" change sets (real dev work from the
  // issue fix flow); fall back to resolved/shipped issues with no change set.
  const readySets = changeSets.filter((c) => c.status === "ready");
  const setIssueIds = new Set(readySets.map((c) => c.issueId));
  const pending = [
    ...readySets.map((c) => ({ issueId: c.issueId, type: c.issueType, title: c.issueTitle })),
    ...issues
      .filter((i) => (i.status === "resolved" || i.stage === "shipped") && !setIssueIds.has(i.id))
      .map((i) => ({ issueId: i.id, type: i.type, title: i.title })),
  ].slice(0, 6);

  function runDeploy(env: EnvName) {
    deploy(env, pending);
    markReleased(readySets.map((c) => c.issueId));
    toast.success(`${env} ortamına deploy başlatıldı`, { description: `${pending.length} değişiklik` });
  }

  return (
    <>
      <PageHeader
        title="Releases"
        description="Ortamlara deploy, sürüm geçmişi ve geri alma."
        actions={[
          { label: "Sürüm Notları Üret", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Son prod deploy'una giren hata düzeltmeleri ve özelliklerden sürüm notları oluştur.") },
        ]}
      />
      <PageBody className="space-y-5">
        {/* Ready change sets from the issue fix flow */}
        {readySets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <span className="text-sm">
              <span className="font-medium">{readySets.length} change set yayına hazır</span>
              <span className="text-muted-foreground"> — sonraki deploy'un changelog'una girecek:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {readySets.map((c) => (
                <Badge key={c.id} variant="secondary" className="font-mono text-[10px]">{c.issueId}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Environment cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {environments.map((env) => (
            <EnvCard key={env.name} env={env} onDeploy={() => runDeploy(env.name)} />
          ))}
        </div>

        {/* Deploy history */}
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Deploy Geçmişi</h3>
          <div className="space-y-2">
            {deployments.map((d) => (
              <DeployRow
                key={d.id}
                d={d}
                open={openRow === d.id}
                onToggle={() => setOpenRow(openRow === d.id ? null : d.id)}
                onRollback={() => { rollback(d.id); toast.success("Geri alındı", { description: `${d.version} (${d.env})` }); }}
                envTone={ENV_TONE[d.env]}
              />
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function EnvCard({ env, onDeploy }: { env: Environment; onDeploy: () => void }) {
  const deploying = env.status === "deploying";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", env.status === "healthy" ? "bg-emerald-400" : env.status === "deploying" ? "bg-sky-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-sm font-medium">{env.label}</span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{env.url}</span>
        </div>
        <div className="mt-3 font-mono text-lg font-semibold">{env.currentVersion}</div>
        <div className="text-[11px] text-muted-foreground">son deploy: {env.lastDeploy}</div>
        <Button size="sm" className="mt-3 w-full gap-1.5" disabled={deploying} onClick={onDeploy}>
          {env.name === "prod" ? <ArrowUpToLine className="size-3.5" /> : <Rocket className="size-3.5" />}
          {deploying ? "Deploy ediliyor…" : env.name === "prod" ? "Prod'a Yükselt" : "Deploy"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DeployRow({
  d, open, onToggle, onRollback, envTone,
}: {
  d: Deployment; open: boolean; onToggle: () => void; onRollback: () => void; envTone: string;
}) {
  const steps: TimelineStep[] = d.steps.map((s) => ({
    label: s.name,
    status: s.status,
    meta: s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : undefined,
  }));
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30">
        <span className="font-mono text-sm font-medium">{d.version}</span>
        <Badge variant="outline" className={cn("text-[10px]", envTone)}>{d.env}</Badge>
        <DeployStatusBadge status={d.status} />
        <span className="font-mono text-[10px] text-muted-foreground">{d.commit}</span>
        <span className="ml-auto text-xs text-muted-foreground">{d.changelog.length} değişiklik · {d.time}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t bg-muted/20 p-4">
          <StatusTimeline steps={steps} />
          {d.changelog.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Changelog</p>
              <ul className="space-y-1">
                {d.changelog.map((c) => (
                  <li key={c.issueId} className="flex items-center gap-2 text-xs">
                    <GitCommitHorizontal className="size-3 text-muted-foreground" />
                    <Badge variant="secondary" className={cn("text-[9px]", c.type === "bug" ? "text-red-400" : "text-emerald-400")}>{c.type === "bug" ? "fix" : "feat"}</Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.issueId}</span>
                    <span>{c.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{d.triggeredBy} tarafından</span>
            {d.status === "success" && (
              <Button size="sm" variant="outline" className="ml-auto h-7 gap-1.5 text-xs" onClick={onRollback}>
                <Undo2 className="size-3.5" /> Geri Al
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
