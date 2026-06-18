import { useState } from "react";
import {
  Sparkle,
  PaperPlaneTilt,
  Lightning,
  Cpu,
} from "@phosphor-icons/react";
import { useCopilotStore } from "~/stores/copilot-store";
import { Button } from "~/components/ui/button";

/* ── CopilotComposer ────────────────────────────────────────────────
 * Dashboard'un üst kısmındaki gömülü AI alanı. Doğal dilde bir istek
 * yazılır; gönderince global Copilot paneli (sağdan açılan rail) o
 * prompt'la açılır ve yanıt üretir. Ayrı bir sayfa/görünüm değil —
 * panelin AI'ı her zaman elinin altında.
 */
const QUICK: { label: string; prompt: string }[] = [
  { label: "E-ticaret şeması", prompt: "E-ticaret şeması üret: Product, Order, OrderItem ve Category." },
  { label: "İletişim formu", prompt: "Bir iletişim formu oluştur: ad, e-posta, konu, mesaj." },
  { label: "Blog modelleri", prompt: "Blog için Post, Author ve Comment modellerini ilişkileriyle üret." },
  { label: "Eksik index'ler", prompt: "Eksik index önerilerini göster ve nasıl ekleyeceğimi anlat." },
];

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
    <section className="rounded-2xl border bg-card p-4 ring-1 ring-foreground/[0.06]">
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

      <div className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ne oluşturmak istersiniz? Örn. “Blog için Post, Author ve Comment üret”"
          aria-label="Copilot'a ne oluşturmak istediğinizi yazın"
          className="h-10 flex-1 rounded-xl border bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
        />
        <Button className="h-10 gap-1.5" onClick={() => submit()} disabled={!input.trim()}>
          Üret <PaperPlaneTilt className="size-4" />
        </Button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={() => submit(q.prompt)}
            className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Lightning className="size-3" /> {q.label}
          </button>
        ))}
      </div>
    </section>
  );
}
