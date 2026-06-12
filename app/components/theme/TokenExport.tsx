import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { BrandColors } from "~/stores/theme-store";
import { brandToCssVars, brandToTailwind, brandToTokensJson } from "~/lib/codegen";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";

export function TokenExport({ brand }: { brand: BrandColors }) {
  const variants = {
    css: brandToCssVars(brand),
    tailwind: brandToTailwind(brand),
    json: brandToTokensJson(brand),
  };
  const [tab, setTab] = useState<keyof typeof variants>("css");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(variants[tab]);
    setCopied(true);
    toast.success("Token'lar kopyalandı");
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Tabs value={tab} onValueChange={(v) => setTab(v as keyof typeof variants)}>
        <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="css" className="text-xs">CSS vars</TabsTrigger>
            <TabsTrigger value="tailwind" className="text-xs">Tailwind</TabsTrigger>
            <TabsTrigger value="json" className="text-xs">Tokens JSON</TabsTrigger>
          </TabsList>
          <button
            onClick={copy}
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Kopyala
          </button>
        </div>
        {(Object.keys(variants) as (keyof typeof variants)[]).map((k) => (
          <TabsContent key={k} value={k} className="m-0">
            <pre className="mp-scroll max-h-64 overflow-auto p-4 font-mono text-xs leading-relaxed">
              <code>{variants[k]}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
