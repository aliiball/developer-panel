import { useState } from "react";
import { Sparkles, Plus, Mail } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { EMAIL_TEMPLATES, type EmailTemplate } from "~/data/expansion";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Email Templates — MetaPanel" }];
}

export default function EmailTemplates() {
  const [activeId, setActiveId] = useState(EMAIL_TEMPLATES[0].id);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const active = EMAIL_TEMPLATES.find((t) => t.id === activeId) ?? EMAIL_TEMPLATES[0];

  return (
    <>
      <PageHeader
        title="Email Templates"
        description="E-posta şablonları — değişkenler ve canlı önizleme."
        actions={[
          { label: "AI ile Şablon", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Sipariş kargoya verildi bildirimi için e-posta şablonu yaz.") },
          { label: "Yeni Şablon", icon: Plus },
        ]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* List */}
        <aside className="space-y-1.5">
          {EMAIL_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                t.id === activeId ? "border-primary/40 bg-accent" : "hover:bg-accent/50",
              )}
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground">
                <Mail className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">{t.category} · {t.updated}</p>
              </div>
            </button>
          ))}
        </aside>

        {/* Preview */}
        <TemplatePreview template={active} />
      </PageBody>
    </>
  );
}

function TemplatePreview({ template }: { template: EmailTemplate }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Değişkenler:</span>
        {template.variables.map((v) => (
          <Badge key={v} variant="secondary" className="font-mono text-[10px]">{`{{${v}}}`}</Badge>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/30 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">Konu</p>
          <p className="text-sm font-medium">{template.subject}</p>
        </div>
        {/* Rendered email body */}
        <div className="mx-auto max-w-lg p-6">
          <div className="rounded-lg border bg-background p-5">
            {template.body.split("\n").map((line, i) =>
              line.trim() === "" ? (
                <div key={i} className="h-3" />
              ) : (
                <p key={i} className="text-sm leading-relaxed">{highlightVars(line)}</p>
              ),
            )}
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            MetaPanel · {template.category}
          </p>
        </div>
      </div>
    </div>
  );
}

function highlightVars(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\}|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("{{")) return <span key={i} className="rounded bg-primary/15 px-1 font-mono text-xs text-primary">{p}</span>;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <span key={i} className="text-primary underline">{link[1]}</span>;
    return <span key={i}>{p}</span>;
  });
}
