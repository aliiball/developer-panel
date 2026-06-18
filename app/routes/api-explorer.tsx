import { useState } from "react";
import {
  Play,
  Sparkle as Sparkles,
  Lock,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { ENDPOINTS, type Endpoint } from "~/data/endpoints";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "API Explorer — MetaPanel" }];
}

const METHOD_TONE: Record<string, string> = {
  GET: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  POST: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  PUT: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  PATCH: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  DELETE: "text-red-400 border-red-500/30 bg-red-500/10",
};

function sampleResponse(e: Endpoint): string {
  if (e.method === "DELETE") return JSON.stringify({ success: true }, null, 2);
  const body = { id: 1, model: e.model, createdAt: "2026-06-12T09:00:00Z" };
  const payload = e.path.includes(":id") || e.method === "POST" ? body : { data: [body], total: 1, page: 1 };
  return JSON.stringify(payload, null, 2);
}

export default function ApiExplorer() {
  const [selected, setSelected] = useState<Endpoint>(ENDPOINTS[0]);
  const [response, setResponse] = useState<string | null>(null);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  function test() {
    setResponse(sampleResponse(selected));
    toast.success("200 OK", { description: `${selected.method} ${selected.path} (mock)` });
  }

  return (
    <>
      <PageHeader
        title="API Explorer"
        description="Auto-generated CRUD endpoint'leri. Mock request/response."
        actions={[
          { label: "AI Docs", icon: Sparkles, variant: "default", onClick: () => queuePrompt(`${selected.method} ${selected.path} endpoint'ini dokümante et.`) },
        ]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* Endpoint list */}
        <div className="mp-scroll space-y-1 overflow-y-auto lg:max-h-[calc(100vh-11rem)]">
          {ENDPOINTS.map((e) => (
            <button
              key={e.id}
              onClick={() => { setSelected(e); setResponse(null); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                selected.id === e.id ? "border-primary/40 bg-accent" : "hover:bg-accent/50",
              )}
            >
              <Badge variant="outline" className={cn("w-14 justify-center font-mono text-[10px]", METHOD_TONE[e.method])}>
                {e.method}
              </Badge>
              <span className="truncate font-mono text-xs">{e.path}</span>
              {e.auth && <Lock className="ml-auto size-3 shrink-0 text-muted-foreground" />}
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("font-mono", METHOD_TONE[selected.method])}>
                {selected.method}
              </Badge>
              <span className="font-mono text-sm">{selected.path}</span>
              {selected.auto && <Badge variant="secondary" className="ml-auto text-[10px]">auto-generated</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" className="h-8 gap-1.5" onClick={test}>
                <Play className="size-3.5" /> Test Et
              </Button>
              {selected.auth && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" /> Bearer token gerekli
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CodeBlock
              title="Request"
              code={`${selected.method} ${selected.path}\nAuthorization: Bearer <token>\nContent-Type: application/json${
                selected.method === "POST" || selected.method === "PATCH"
                  ? `\n\n{\n  "${selected.model.toLowerCase()}": { }\n}`
                  : ""
              }`}
            />
            <CodeBlock
              title="Response"
              tone={response ? "ok" : undefined}
              code={response ?? "// 'Test Et'e bas → örnek yanıt"}
            />
          </div>
        </div>
      </PageBody>
    </>
  );
}

function CodeBlock({ title, code, tone }: { title: string; code: string; tone?: "ok" }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
        <span className="text-xs font-medium">{title}</span>
        {tone === "ok" && <Badge variant="outline" className="text-emerald-400 text-[10px]">200 OK</Badge>}
      </div>
      <pre className="mp-scroll max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
