import { Sparkle, BookOpen, type Icon } from "@phosphor-icons/react";
import { useCopilotStore } from "~/stores/copilot-store";
import { CopilotComposer } from "./CopilotComposer";
import { CAPABILITIES, PROMPTS, type CopilotSuggestion } from "~/data/copilot-suggest";

/* ── CopilotHub ─────────────────────────────────────────────────────
 * Dashboard'un AI alanı: ortada composer, iki yanda yetenek kartları ve
 * örnek istemler. Her kart/buton global Copilot rail'ini bağlama uygun
 * bir istemle açar (tıklayınca anlamlı yanıt üretir).
 */
export function CopilotHub() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      {/* Sol — Yetenekler */}
      <aside className="order-2 space-y-2 lg:order-1 lg:col-span-3">
        <ColLabel icon={Sparkle} title="Yetenekler" />
        <div className="grid grid-cols-2 gap-2">
          {CAPABILITIES.map((c) => (
            <SuggestCard key={c.label} item={c} onClick={() => queuePrompt(c.prompt)} />
          ))}
        </div>
      </aside>

      {/* Orta — Composer (kolon yüksekliği içinde dikey ortalı) */}
      <div className="order-1 flex flex-col justify-center lg:order-2 lg:col-span-6">
        <CopilotComposer />
      </div>

      {/* Sağ — Örnek istemler */}
      <aside className="order-3 space-y-2 lg:col-span-3">
        <ColLabel icon={BookOpen} title="Örnek istemler" />
        <div className="grid grid-cols-2 gap-2">
          {PROMPTS.map((p) => (
            <SuggestCard key={p.label} item={p} onClick={() => queuePrompt(p.prompt)} />
          ))}
        </div>
      </aside>
    </section>
  );
}

function ColLabel({ icon: Icon, title }: { icon: Icon; title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-0.5">
      <Icon className="size-3.5 text-muted-foreground" />
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

function SuggestCard({
  item,
  onClick,
}: {
  item: CopilotSuggestion;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-2.5 rounded-xl border bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
        <item.icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{item.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{item.hint}</p>
      </div>
    </button>
  );
}
