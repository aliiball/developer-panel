import { useEffect, useRef, useState } from "react";
import {
  TerminalWindow as TerminalIcon,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { Button } from "~/components/ui/button";

export function meta() {
  return [{ title: "Terminal — MetaPanel" }];
}

interface Line {
  cmd: string;
  out: string[];
}

// Canned command responses (mock). No real shell.
function run(cmd: string): string[] {
  const c = cmd.trim().toLowerCase();
  if (!c) return [];
  if (c === "help")
    return [
      "Komutlar:",
      "  help              bu yardım",
      "  models            kayıtlı modelleri listele",
      "  migrate           bekleyen migration'ları uygula",
      "  modules           modül durumları",
      "  whoami            aktif kullanıcı",
      "  clear             ekranı temizle",
    ];
  if (c === "models") return ["Customer  Product  Order  Category  BlogPost  Invoice", "12 model · 47 endpoint"];
  if (c === "migrate") return ["→ 004_add_reviews uygulanıyor…", "✓ tamamlandı (128ms)"];
  if (c === "modules") return ["E-Commerce  ✓", "Blog        ✓", "CRM         ✓", "Inventory   ✗ (pasif)", "Payments    ✓"];
  if (c === "whoami") return ["turksab.yonetim@gmail.com (admin)"];
  if (c.startsWith("echo ")) return [cmd.slice(5)];
  return [`komut bulunamadı: ${cmd.split(" ")[0]} — 'help' yazın`];
}

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>([
    { cmd: "", out: ["MetaPanel Shell v1.0 (mock) — 'help' yazarak başlayın."] },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  function submit() {
    const cmd = input;
    if (cmd.trim().toLowerCase() === "clear") {
      setLines([]);
      setInput("");
      return;
    }
    setLines((p) => [...p, { cmd, out: run(cmd) }]);
    if (cmd.trim()) setHistory((h) => [cmd, ...h]);
    setInput("");
    setHIdx(-1);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      const ni = Math.min(hIdx + 1, history.length - 1);
      if (history[ni] !== undefined) { setHIdx(ni); setInput(history[ni]); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const ni = Math.max(hIdx - 1, -1);
      setHIdx(ni);
      setInput(ni === -1 ? "" : history[ni]);
    }
  }

  return (
    <>
      <PageHeader
        title="Terminal"
        description="Gömülü komut terminali (mock). 'help' ile komutları görün."
        actions={[{ label: "Temizle", icon: Trash2, onClick: () => setLines([]) }]}
      />
      <PageBody grid={false}>
        <div
          className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-xl border bg-[#0b0b0e]"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
            <TerminalIcon className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">metapanel — zsh</span>
            <div className="ml-auto flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500/70" />
              <span className="size-2.5 rounded-full bg-amber-500/70" />
              <span className="size-2.5 rounded-full bg-emerald-500/70" />
            </div>
          </div>
          <div ref={scrollRef} className="mp-scroll flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed">
            {lines.map((l, i) => (
              <div key={i}>
                {l.cmd !== "" && (
                  <div className="flex gap-2">
                    <span className="text-emerald-400">❯</span>
                    <span className="text-foreground">{l.cmd}</span>
                  </div>
                )}
                {l.out.map((o, j) => (
                  <div key={j} className="whitespace-pre text-muted-foreground">{o}</div>
                ))}
              </div>
            ))}
            <div className="flex gap-2">
              <span className="text-emerald-400">❯</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                autoFocus
                spellCheck={false}
                className="flex-1 bg-transparent text-foreground caret-primary outline-none"
              />
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
