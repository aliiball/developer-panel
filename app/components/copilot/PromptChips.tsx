import {
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { PROMPT_CHIPS } from "~/data/prompts";

const CATEGORY_LABEL: Record<string, string> = {
  schema: "Şema",
  module: "Modül",
  theme: "Tema",
  api: "API",
  form: "Form",
};

export function PromptChips({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PROMPT_CHIPS.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c.prompt)}
          className="group flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{c.label}</p>
            <p className="truncate text-xs text-muted-foreground">{CATEGORY_LABEL[c.category]}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
