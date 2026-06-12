import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Trash2 } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { PromptChips } from "~/components/copilot/PromptChips";
import { StreamingText } from "~/components/copilot/StreamingText";
import { DiffPreview } from "~/components/copilot/DiffPreview";
import { useCopilotChat } from "~/hooks/use-copilot-chat";
import { useCopilotStore } from "~/stores/copilot-store";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "AI Copilot — MetaPanel" }];
}

export default function AICopilot() {
  const { send, alternative, messages } = useCopilotChat();
  const clear = useCopilotStore((s) => s.clear);
  const consumeQueued = useCopilotStore((s) => s.consumeQueued);
  const queued = useCopilotStore((s) => s.queuedPrompt);
  const [input, setInput] = useState("");
  const lastUserPrompt = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pick up a prompt routed here from Spotlight ("AI: …").
  useEffect(() => {
    if (queued) {
      const q = consumeQueued();
      if (q) {
        lastUserPrompt.current = q;
        send(q);
      }
    }
  }, [queued, consumeQueued, send]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function submit(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text) return;
    lastUserPrompt.current = text;
    send(text);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <>
      <PageHeader
        title="AI Copilot"
        description="Doğal dilden şema, modül, form ve endpoint üret. Panelin kalbi."
      >
        {!empty && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={clear}>
            <Trash2 className="size-4" /> Temizle
          </Button>
        )}
      </PageHeader>

      <PageBody grid={empty} className="flex h-full flex-col">
        {empty ? (
          <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-6 py-10">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Sparkles className="size-7" />
              </div>
              <h2 className="text-xl font-semibold">Ne oluşturmak istersiniz?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aşağıdaki örneklerden birini seçin ya da kendi isteğinizi yazın.
              </p>
            </div>
            <PromptChips onPick={(p) => submit(p)} />
          </div>
        ) : (
          <div ref={scrollRef} className="mp-scroll mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto pb-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.role === "assistant" ? <StreamingText text={m.text} /> : m.text}
                </div>
                {m.preview && (
                  <div className="w-full max-w-[85%]">
                    <DiffPreview
                      preview={m.preview}
                      onAlternative={() => alternative(lastUserPrompt.current)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="mx-auto mt-auto flex w-full max-w-2xl items-center gap-2 pt-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Bir şema, modül veya form tarif edin…"
            className="h-11 flex-1 rounded-xl border bg-card px-4 text-sm outline-none focus:border-primary/40"
          />
          <Button size="icon" className="size-11 shrink-0 rounded-xl" onClick={() => submit()}>
            <Send className="size-4" />
          </Button>
        </div>
      </PageBody>
    </>
  );
}
