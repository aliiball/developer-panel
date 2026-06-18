import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import {
  Sparkle as Sparkles,
  X,
  PaperPlaneTilt as Send,
  Lightbulb,
} from "@phosphor-icons/react";
import { useCopilotStore } from "~/stores/copilot-store";
import { useCopilotChat } from "~/hooks/use-copilot-chat";
import { ROUTE_HINTS } from "~/data/prompts";
import { StreamingText } from "~/components/copilot/StreamingText";
import { DiffPreview } from "~/components/copilot/DiffPreview";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function hintFor(pathname: string) {
  if (pathname.startsWith("/schema/")) return ROUTE_HINTS["/schema/"];
  if (pathname.startsWith("/issues/")) return ROUTE_HINTS["/issues/"];
  return ROUTE_HINTS[pathname] ?? ROUTE_HINTS["/"];
}

export function CopilotRail() {
  const open = useCopilotStore((s) => s.railOpen);
  const close = useCopilotStore((s) => s.closeRail);
  const consumeQueued = useCopilotStore((s) => s.consumeQueued);
  const queued = useCopilotStore((s) => s.queuedPrompt);
  const { send, messages } = useCopilotChat();
  const location = useLocation();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctx = hintFor(location.pathname);

  // Consume a prompt queued from Spotlight / quick replies.
  useEffect(() => {
    if (open && queued) {
      const q = consumeQueued();
      if (q) send(q);
    }
  }, [open, queued, consumeQueued, send]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!open) return null;

  function submit() {
    if (!input.trim()) return;
    send(input);
    setInput("");
  }

  return (
    <aside className="z-20 flex h-full w-[340px] shrink-0 flex-col border-l bg-sidebar/60 backdrop-blur">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="size-4 text-primary" />
        <span className="text-sm font-semibold">Copilot</span>
        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
          bağlam-duyarlı
        </span>
        <Button variant="ghost" size="icon" className="ml-auto size-7" onClick={close}>
          <X className="size-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="mp-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {/* Context hint */}
        <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Lightbulb className="size-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">{ctx.hint}</p>
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex flex-col gap-2",
              m.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <StreamingText text={m.text} speed={10} />
              ) : (
                m.text
              )}
            </div>
            {m.preview && (
              <div className="w-full">
                <DiffPreview preview={m.preview} compact />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick replies */}
      <div className="flex flex-wrap gap-1.5 border-t px-3 py-2">
        {ctx.quick.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Copilot'a sor…"
          className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary/40"
        />
        <Button size="icon" className="size-9 shrink-0" onClick={submit}>
          <Send className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
