import { useState } from "react";
import {
  Robot as BotMessageSquare,
  Sparkle as Sparkles,
  FileCode as FileCode2,
  Palette,
  Plug,
  Textbox as FormInput,
  Database,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useCopilotStore, type AgentRun } from "~/stores/copilot-store";
import { StatusBadge } from "~/components/delivery/badges";
import { ALL_NAV } from "~/data/nav";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "AI Agent Runs — MetaPanel" }];
}

const KIND_ICON: Record<string, typeof FileCode2> = {
  models: Database, fields: Database, palette: Palette, endpoints: Plug,
  form: FormInput, code: FileCode2, "release-notes": FileCode2, triage: Sparkles,
  permissions: Sparkles,
};

function surfaceLabel(path: string): string {
  if (path.startsWith("/schema/")) return "Schema (model)";
  return ALL_NAV.find((n) => n.to === path)?.label ?? path;
}

export default function AgentRuns() {
  const runs = useCopilotStore((s) => s.runs);
  const openRail = useCopilotStore((s) => s.openRail);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [selected, setSelected] = useState<AgentRun | null>(runs[0] ?? null);

  const total = runs.length;
  const applied = runs.filter((r) => r.outcome === "preview").length;

  return (
    <>
      <PageHeader
        title="AI Agent Runs"
        description="Copilot'un her üretiminin geçmişi: prompt, üretilen yüzey, sonuç ve süre."
        actions={[
          { label: "Özetle", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Son AI üretimlerini özetle ve en çok hangi yüzeyde kullanıldığını söyle.") },
        ]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Mini label="Toplam çalışma" value={total} />
            <Mini label="Önizleme üretti" value={applied} />
            <Mini label="Metin yanıt" value={total - applied} />
          </div>
          <div className="mp-scroll space-y-1.5 overflow-y-auto lg:max-h-[calc(100vh-15rem)]">
            {runs.map((r) => {
              const Icon = r.previewKind ? KIND_ICON[r.previewKind] ?? BotMessageSquare : MessageSquare;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    selected?.id === r.id ? "border-primary/40 bg-accent" : "hover:bg-accent/40",
                  )}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.prompt}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{surfaceLabel(r.surface)}</span>
                      <span>·</span>
                      <span>{r.at}</span>
                    </div>
                  </div>
                  <StatusBadge label={r.outcome === "preview" ? (r.previewKind ?? "preview") : "metin"} tone={r.outcome === "preview" ? "violet" : "muted"} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="rounded-xl border bg-card p-4">
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BotMessageSquare className="size-4 text-primary" />
                <span>{surfaceLabel(selected.surface)} · {selected.at} · {Math.round(selected.durationMs)}ms</span>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Prompt</p>
                <p className="mt-1 rounded-lg bg-muted/40 p-3 text-sm">{selected.prompt}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sonuç</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge label={selected.outcome === "preview" ? (selected.previewKind ?? "preview") : "metin yanıt"} tone={selected.outcome === "preview" ? "violet" : "muted"} />
                  {selected.outcome === "preview" && <span className="text-xs text-muted-foreground">uygulanabilir önizleme üretildi</span>}
                </div>
              </div>
              <button onClick={openRail} className="text-xs text-primary hover:underline">Copilot panelini aç →</button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz çalışma yok. Copilot'u kullanınca burada görünür.</p>
          )}
        </div>
      </PageBody>
    </>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
