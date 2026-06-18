import { useState } from "react";
import {
  Sparkle as Sparkles,
  BookOpen,
  Hash,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { DOC_SECTIONS } from "~/data/expansion";
import { ENDPOINTS } from "~/data/endpoints";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Docs — MetaPanel" }];
}

const METHOD_TONE: Record<string, string> = {
  GET: "text-emerald-400", POST: "text-sky-400", PUT: "text-amber-400",
  PATCH: "text-amber-400", DELETE: "text-red-400",
};

export default function Docs() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [active, setActive] = useState("auth");

  // group endpoints by model for the reference section
  const byModel = ENDPOINTS.reduce<Record<string, typeof ENDPOINTS>>((acc, e) => {
    (acc[e.model] ??= []).push(e);
    return acc;
  }, {});

  const nav = [
    ...DOC_SECTIONS.map((s) => ({ id: s.id, title: s.title })),
    { id: "endpoints", title: "Endpoint Referansı" },
  ];

  return (
    <>
      <PageHeader
        title="Docs"
        description="Otomatik üretilen API dokümanları."
        actions={[{ label: "AI ile Doküman", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Product CRUD endpoint'leri için örneklerle dokümantasyon yaz.") }]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* TOC */}
        <aside className="mp-scroll space-y-0.5 overflow-y-auto lg:max-h-[calc(100vh-11rem)]">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setActive(n.id);
                document.getElementById(`doc-${n.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                active === n.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <Hash className="size-3.5" /> {n.title}
            </button>
          ))}
        </aside>

        {/* Content */}
        <article className="mp-scroll max-w-3xl space-y-8 overflow-y-auto pb-10 lg:max-h-[calc(100vh-11rem)]">
          {DOC_SECTIONS.map((s) => (
            <section key={s.id} id={`doc-${s.id}`} className="scroll-mt-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <BookOpen className="size-4 text-primary" /> {s.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}

          <section id="doc-endpoints" className="scroll-mt-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="size-4 text-primary" /> Endpoint Referansı
            </h2>
            <div className="mt-3 space-y-4">
              {Object.entries(byModel).map(([model, eps]) => (
                <div key={model} className="overflow-hidden rounded-xl border bg-card">
                  <div className="border-b bg-muted/30 px-4 py-2 text-sm font-medium">{model}</div>
                  <div className="divide-y">
                    {eps.map((e) => (
                      <div key={e.id} className="flex items-center gap-3 px-4 py-2">
                        <Badge variant="outline" className={cn("w-14 justify-center font-mono text-[10px]", METHOD_TONE[e.method])}>
                          {e.method}
                        </Badge>
                        <code className="font-mono text-xs">{e.path}</code>
                        <span className="ml-auto truncate text-xs text-muted-foreground">{e.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>
      </PageBody>
    </>
  );
}
