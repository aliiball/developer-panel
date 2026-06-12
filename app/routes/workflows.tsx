import { useState } from "react";
import { Sparkles, Plus, Zap, GitBranch, Play, Webhook } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { WORKFLOWS, type WorkflowDef, type WorkflowStep } from "~/data/expansion";
import { useCopilotStore } from "~/stores/copilot-store";
import { Card, CardContent } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Workflows — MetaPanel" }];
}

const STEP_ICON = { trigger: Zap, condition: GitBranch, action: Play } as const;
const STEP_TONE = {
  trigger: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  condition: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  action: "text-primary bg-primary/10 border-primary/30",
} as const;

export default function Workflows() {
  const [list, setList] = useState<WorkflowDef[]>(WORKFLOWS);
  const [activeId, setActiveId] = useState(WORKFLOWS[0].id);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const active = list.find((w) => w.id === activeId) ?? list[0];

  function toggle(id: string) {
    setList((p) => p.map((w) => (w.id === id ? { ...w, active: !w.active } : w)));
  }

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Olay-tetiklemeli iş akışları: trigger → koşul → eylem zincirleri."
        actions={[
          { label: "AI ile Akış", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Sipariş iptal edildiğinde stok iadesi yapan bir workflow tasarla.") },
          { label: "Yeni Workflow", icon: Plus },
        ]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* List */}
        <div className="space-y-2">
          {list.map((w) => (
            <Card
              key={w.id}
              onClick={() => setActiveId(w.id)}
              className={cn(
                "cursor-pointer transition-colors",
                w.id === activeId ? "border-primary/40" : "hover:border-primary/20",
              )}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                  <Webhook className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{w.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{w.trigger}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Switch checked={w.active} onClick={(e) => e.stopPropagation()} onCheckedChange={() => toggle(w.id)} />
                  <span className="text-[10px] text-muted-foreground tabular-nums">{w.runs} çalışma</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Step detail */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{active.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{active.trigger}</p>
              </div>
              <Badge variant={active.active ? "default" : "secondary"} className="text-[10px]">
                {active.active ? "aktif" : "pasif"}
              </Badge>
            </div>
            <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-3 before:h-[calc(100%-1.5rem)] before:w-px before:bg-border">
              {active.steps.map((s, i) => (
                <StepRow key={i} step={s} />
              ))}
            </ol>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

function StepRow({ step }: { step: WorkflowStep }) {
  const Icon = STEP_ICON[step.type];
  return (
    <li className="relative flex items-center gap-3">
      <span className={cn("z-10 flex size-8 items-center justify-center rounded-lg border", STEP_TONE[step.type])}>
        <Icon className="size-4" />
      </span>
      <div className="flex-1 rounded-lg border bg-card px-3 py-2">
        <span className="text-sm">{step.label}</span>
        <span className="ml-2 font-mono text-[10px] uppercase text-muted-foreground">{step.type}</span>
      </div>
    </li>
  );
}
