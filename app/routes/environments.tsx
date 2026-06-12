import { useState } from "react";
import { Sparkles, Plus, Eye, EyeOff, Lock, Server } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SEED_ENV_VARS, type EnvVar, type EnvName } from "~/data/delivery";
import { useCopilotStore } from "~/stores/copilot-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Environments — MetaPanel" }];
}

const ENVS: { key: EnvName; label: string }[] = [
  { key: "dev", label: "Development" },
  { key: "staging", label: "Staging" },
  { key: "prod", label: "Production" },
];

export default function Environments() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function toggleReveal(id: string) {
    setRevealed((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title="Environments & Secrets"
        description="Ortam değişkenleri ve gizli anahtarlar (dev / staging / prod)."
        actions={[
          { label: "AI Denetim", icon: Sparkles, onClick: () => queuePrompt("Eksik veya riskli ortam değişkenlerini ve sızabilecek gizli anahtarları bul.") },
          { label: "Değişken Ekle", icon: Plus, variant: "default", onClick: () => toast.success("Yeni değişken (mock)") },
        ]}
      />
      <PageBody>
        <Tabs defaultValue="prod">
          <TabsList className="h-9">
            {ENVS.map((e) => <TabsTrigger key={e.key} value={e.key}>{e.label}</TabsTrigger>)}
          </TabsList>
          {ENVS.map((e) => (
            <TabsContent key={e.key} value={e.key} className="mt-4">
              <EnvTable
                vars={SEED_ENV_VARS.filter((v) => v.env === e.key)}
                revealed={revealed}
                onToggle={toggleReveal}
              />
            </TabsContent>
          ))}
        </Tabs>
      </PageBody>
    </>
  );
}

function EnvTable({ vars, revealed, onToggle }: { vars: EnvVar[]; revealed: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Anahtar</th>
            <th className="px-4 py-2.5 font-medium">Değer</th>
            <th className="px-4 py-2.5 font-medium">Tip</th>
            <th className="px-4 py-2.5 font-medium text-right">Güncelleme</th>
          </tr>
        </thead>
        <tbody>
          {vars.map((v) => {
            const show = revealed.has(v.id) || !v.secret;
            return (
              <tr key={v.id} className="border-b last:border-0 hover:bg-accent/30">
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    {v.secret && <Lock className="size-3 text-amber-400" />}{v.key}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs text-muted-foreground">{show ? v.value : "•".repeat(16)}</code>
                    {v.secret && (
                      <button onClick={() => onToggle(v.id)} className="text-muted-foreground hover:text-foreground">
                        {revealed.has(v.id) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className={cn("text-[10px]", v.secret ? "text-amber-400" : "")}>{v.secret ? "secret" : "var"}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{v.updatedAt}</td>
              </tr>
            );
          })}
          {vars.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground"><Server className="mx-auto mb-1 size-5 opacity-50" />Bu ortamda değişken yok.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
