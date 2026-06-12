import { useState } from "react";
import { Link } from "react-router";
import { Sparkles, Plus, Flag as FlagIcon, Lightbulb } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SEED_FLAGS, type FeatureFlag } from "~/data/delivery";
import { useCopilotStore } from "~/stores/copilot-store";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Feature Flags — MetaPanel" }];
}

const ENV_TONE: Record<string, string> = { dev: "text-sky-400", staging: "text-amber-400", prod: "text-emerald-400" };

export default function Flags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(SEED_FLAGS);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  function toggle(id: string) {
    setFlags((p) => p.map((f) => (f.id === id ? { ...f, enabled: !f.enabled, rolloutPct: !f.enabled ? f.rolloutPct || 100 : f.rolloutPct } : f)));
  }
  function setRollout(id: string, pct: number) {
    setFlags((p) => p.map((f) => (f.id === id ? { ...f, rolloutPct: pct } : f)));
  }

  return (
    <>
      <PageHeader
        title="Feature Flags"
        description="Özellik bayrakları: on/off, kademeli rollout ve ortam kapsamı. 'Deploy edildi' ile 'kullanıcıya açık'ı ayırır."
        actions={[
          { label: "AI Kontrol", icon: Sparkles, onClick: () => queuePrompt("Riskli feature flag'leri %100'e almadan önce kontrol et ve kullanılmayanları öner.") },
          { label: "Yeni Flag", icon: Plus, variant: "default", onClick: () => toast.success("Yeni flag (mock)") },
        ]}
      />
      <PageBody className="space-y-3">
        {flags.map((f) => (
          <Card key={f.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className={cn("mt-0.5 flex size-8 items-center justify-center rounded-lg", f.enabled ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground")}>
                  <FlagIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-medium">{f.key}</code>
                    {f.envs.map((e) => <Badge key={e} variant="outline" className={cn("text-[9px]", ENV_TONE[e])}>{e}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                  {f.linkedFeature && (
                    <Link to="/roadmap" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                      <Lightbulb className="size-3" /> {f.linkedFeature}
                    </Link>
                  )}
                </div>
                <Switch checked={f.enabled} onCheckedChange={() => toggle(f.id)} />
              </div>

              <div className={cn("mt-3 flex items-center gap-3 transition-opacity", !f.enabled && "opacity-40 pointer-events-none")}>
                <span className="text-[11px] text-muted-foreground">Rollout</span>
                <input
                  type="range" min={0} max={100} step={5} value={f.rolloutPct}
                  onChange={(e) => setRollout(f.id, Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-accent accent-[var(--primary)]"
                />
                <span className="w-10 text-right font-mono text-xs tabular-nums">{f.rolloutPct}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </PageBody>
    </>
  );
}
