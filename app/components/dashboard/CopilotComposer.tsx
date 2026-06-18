import { useState } from "react";
import { Sparkle, PaperPlaneTilt, Cpu } from "@phosphor-icons/react";
import { useCopilotStore } from "~/stores/copilot-store";
import { Button } from "~/components/ui/button";

/* ── CopilotComposer ────────────────────────────────────────────────
 * AI hub'ının orta sütunu: doğal dilde bir istek yazılır; gönderince
 * global Copilot paneli (sağdan açılan rail) o prompt'la açılır ve yanıt
 * üretir. Hızlı öneriler artık hub'ın yan kolonlarında.
 */
export function CopilotComposer() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [input, setInput] = useState("");

  function submit(text?: string) {
    const t = (text ?? input).trim();
    if (!t) return;
    queuePrompt(t);
    setInput("");
  }

  return (
    <section className="w-full rounded-2xl border bg-card p-5 ring-1 ring-foreground/[0.06]">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Sparkle className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">AI Copilot</p>
          <p className="text-xs text-muted-foreground">
            Doğal dilden şema, modül, form veya endpoint üret — önce önizlenir, siz uygulayana kadar bir şey değişmez.
          </p>
        </div>
        <span className="ml-auto hidden shrink-0 items-center gap-1 text-[11px] text-muted-foreground sm:flex">
          <Cpu className="size-3" /> metapanel-llm
        </span>
      </div>

      <div className="mt-4 rounded-2xl border bg-gradient-to-b from-background/80 to-background/40 p-3 shadow-sm ring-1 ring-foreground/[0.04] transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="Ne oluşturmak istersiniz? Örn. “Blog için Post, Author ve Comment üret”"
          aria-label="Copilot'a ne oluşturmak istediğinizi yazın"
          className="mp-scroll max-h-44 w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-muted-foreground">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Enter</kbd> gönder
            {" · "}
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Shift</kbd>+
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Enter</kbd> satır
          </span>
          <Button size="sm" className="gap-1.5" onClick={() => submit()} disabled={!input.trim()}>
            Üret <PaperPlaneTilt className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
