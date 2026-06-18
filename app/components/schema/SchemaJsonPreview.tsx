import { useState } from "react";
import {
  Copy,
  Check,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { SchemaModel } from "~/stores/schema-store";
import { modelToJson, modelToTs, modelToSql } from "~/lib/codegen";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";

export function SchemaJsonPreview({ model }: { model: SchemaModel }) {
  const [copied, setCopied] = useState(false);
  const variants = {
    json: modelToJson(model),
    typescript: modelToTs(model),
    sql: modelToSql(model),
  };
  const [tab, setTab] = useState<keyof typeof variants>("json");

  function copy() {
    navigator.clipboard?.writeText(variants[tab]);
    setCopied(true);
    toast.success("Panoya kopyalandı");
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      <Tabs value={tab} onValueChange={(v) => setTab(v as keyof typeof variants)}>
        <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
            <TabsTrigger value="typescript" className="text-xs">TypeScript</TabsTrigger>
            <TabsTrigger value="sql" className="text-xs">SQL</TabsTrigger>
          </TabsList>
          <button
            onClick={copy}
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Kopyala
          </button>
        </div>
        {(Object.keys(variants) as (keyof typeof variants)[]).map((k) => (
          <TabsContent key={k} value={k} className="m-0">
            <pre className="mp-scroll max-h-[calc(100vh-22rem)] overflow-auto p-4 font-mono text-xs leading-relaxed">
              <code>{variants[k]}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
