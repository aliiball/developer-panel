import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  ArrowsClockwise as RefreshCw,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import type { AIPreview } from "~/lib/ai-mock";
import { applyPreview } from "~/lib/apply-preview";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PUT: "text-amber-400",
  PATCH: "text-amber-400",
  DELETE: "text-red-400",
};

export function DiffPreview({
  preview,
  onAlternative,
  compact,
}: {
  preview: AIPreview;
  onAlternative?: () => void;
  compact?: boolean;
}) {
  const [state, setState] = useState<"pending" | "applied" | "rejected">("pending");

  function handleApply() {
    const summary = applyPreview(preview);
    setState("applied");
    toast.success("Uygulandı", { description: summary });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card/60",
        state === "applied" && "border-primary/40",
        state === "rejected" && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-xs font-medium">{preview.title}</span>
        <Badge variant="outline" className="ml-auto font-mono text-[10px]">
          {preview.kind}
        </Badge>
      </div>

      <div className={cn("p-3", compact && "text-xs")}>
        <PreviewBody preview={preview} />
      </div>

      {state === "pending" ? (
        <div className="flex items-center gap-2 border-t bg-muted/20 px-3 py-2">
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleApply}>
            <Check className="size-3.5" /> Uygula
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setState("rejected")}
          >
            <X className="size-3.5" /> Reddet
          </Button>
          {onAlternative && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={onAlternative}
            >
              <RefreshCw className="size-3.5" /> Alternatif
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {state === "applied" ? (
            <>
              <Check className="size-3.5 text-primary" /> Uygulandı
            </>
          ) : (
            <>
              <X className="size-3.5" /> Reddedildi
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewBody({ preview }: { preview: AIPreview }) {
  switch (preview.kind) {
    case "models":
      return (
        <div className="space-y-3">
          {preview.models.map((m) => (
            <div key={m.name}>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{m.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{m.tableName}</span>
              </div>
              <FieldList
                fields={m.fields.map((f) => ({ name: f.name, type: f.type, flags: flagStr(f) }))}
              />
            </div>
          ))}
        </div>
      );
    case "fields":
      return (
        <FieldList
          fields={preview.fields.map((f) => ({ name: f.name, type: f.type, flags: flagStr(f) }))}
        />
      );
    case "palette":
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(preview.colors).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span
                  className="size-5 rounded-md border"
                  style={{ background: v as string }}
                />
                <span className="font-mono text-[10px] text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
          {preview.note && (
            <p className="text-[11px] text-muted-foreground">{preview.note}</p>
          )}
        </div>
      );
    case "endpoints":
      return (
        <div className="space-y-1 font-mono text-[11px]">
          {preview.endpoints.map((e) => (
            <div key={e.method + e.path} className="flex items-center gap-2">
              <span className={cn("w-12 font-semibold", METHOD_COLOR[e.method])}>{e.method}</span>
              <span className="text-foreground">{e.path}</span>
            </div>
          ))}
        </div>
      );
    case "form":
      return (
        <div className="space-y-1 text-xs">
          {preview.fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px]">{f.kind}</Badge>
              <span>{f.label}</span>
              {f.required && <span className="text-red-400">*</span>}
            </div>
          ))}
        </div>
      );
    case "permissions":
      return (
        <div className="flex flex-wrap gap-1">
          {preview.permissions.map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      );
    case "code":
      return (
        <pre className="mp-scroll max-h-56 overflow-auto rounded-md bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
          <code>{preview.code}</code>
        </pre>
      );
    case "triage":
      return (
        <div className="space-y-1 font-mono text-[11px]">
          {preview.items.map((it) => (
            <div key={it.issueId} className="flex items-center gap-2">
              <span className="text-foreground">{it.issueId}</span>
              <Badge variant="outline" className="text-[10px]">{it.severity}</Badge>
              {it.duplicateOf && <span className="text-muted-foreground">kopya → {it.duplicateOf}</span>}
            </div>
          ))}
        </div>
      );
    case "release-notes":
      return (
        <pre className="mp-scroll max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
          <code>{preview.markdown}</code>
        </pre>
      );
  }
}

function FieldList({
  fields,
}: {
  fields: { name: string; type: string; flags: string }[];
}) {
  return (
    <div className="space-y-0.5 font-mono text-[11px]">
      {fields.map((f) => (
        <div key={f.name} className="flex items-center gap-2">
          <span className="min-w-28 text-foreground">{f.name}</span>
          <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
          {f.flags && <span className="text-muted-foreground">{f.flags}</span>}
        </div>
      ))}
    </div>
  );
}

function flagStr(f: { required?: boolean; unique?: boolean; indexed?: boolean }): string {
  const parts: string[] = [];
  if (f.required) parts.push("required");
  if (f.unique) parts.push("unique");
  if (f.indexed) parts.push("indexed");
  return parts.join(" · ");
}
