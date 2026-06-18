import { useState } from "react";
import {
  Sparkle as Sparkles,
  GitMerge,
  CaretDown as ChevronDown,
  Play,
  ArrowUUpLeft as Undo2,
  CheckCircle as CheckCircle2,
  Clock,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SEED_MIGRATIONS, type Migration, type MigrationStatus } from "~/data/platform";
import { StatusBadge, type Tone } from "~/components/delivery/badges";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Migrations — MetaPanel" }];
}

const STATUS_TONE: Record<MigrationStatus, Tone> = { applied: "emerald", pending: "amber", rolled_back: "muted" };
const STATUS_LABEL: Record<MigrationStatus, string> = { applied: "uygulandı", pending: "bekliyor", rolled_back: "geri alındı" };

export default function Migrations() {
  const [migrations, setMigrations] = useState<Migration[]>(SEED_MIGRATIONS);
  const [open, setOpen] = useState<string | null>(SEED_MIGRATIONS.find((m) => m.status === "pending")?.id ?? null);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const pending = migrations.filter((m) => m.status === "pending").length;

  function apply(id: string) {
    setMigrations((p) => p.map((m) => (m.id === id ? { ...m, status: "applied", appliedAt: "az önce" } : m)));
    toast.success("Migration uygulandı", { description: id });
  }
  function rollback(id: string) {
    setMigrations((p) => p.map((m) => (m.id === id ? { ...m, status: "rolled_back" } : m)));
    toast.success("Migration geri alındı", { description: id });
  }

  return (
    <>
      <PageHeader
        title="Migrations"
        description="Şema migration'ları: uygula, geri al, geçmiş ve SQL önizleme."
        actions={[
          { label: "AI Risk Analizi", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Bekleyen migration'ların riskini değerlendir ve geri alınabilirliğini kontrol et.") },
        ]}
      />
      <PageBody className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1"><Clock className="size-3" />{pending} bekleyen</Badge>
          <Badge variant="secondary" className="gap-1"><CheckCircle2 className="size-3" />{migrations.filter((m) => m.status === "applied").length} uygulandı</Badge>
        </div>
        {migrations.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl border bg-card">
            <button onClick={() => setOpen(open === m.id ? null : m.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30">
              <GitMerge className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-medium">{m.id}</code>
                  <StatusBadge label={STATUS_LABEL[m.status]} tone={STATUS_TONE[m.status]} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{m.name}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{m.author} · {m.appliedAt ?? "—"}</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open === m.id && "rotate-180")} />
            </button>
            {open === m.id && (
              <div className="space-y-3 border-t bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">tablolar:</span>
                  {m.affectedTables.map((t) => <Badge key={t} variant="outline" className="font-mono text-[10px]">{t}</Badge>)}
                  {!m.reversible && <Badge variant="outline" className="text-[10px] text-amber-400">geri alınamaz</Badge>}
                </div>
                <pre className="mp-scroll max-h-56 overflow-auto rounded-lg bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
                  <code>{m.sql}</code>
                </pre>
                <div className="flex items-center gap-2">
                  {m.status === "pending" && (
                    <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => apply(m.id)}>
                      <Play className="size-3.5" /> Uygula
                    </Button>
                  )}
                  {m.status === "applied" && m.reversible && (
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => rollback(m.id)}>
                      <Undo2 className="size-3.5" /> Geri Al
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </PageBody>
    </>
  );
}
