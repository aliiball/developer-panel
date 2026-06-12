import { useState } from "react";
import { Search, Pause, Play } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { LOGS, type LogLevel } from "~/data/expansion";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Logs — MetaPanel" }];
}

const LEVELS: { key: LogLevel | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "info", label: "Info" },
  { key: "warn", label: "Warn" },
  { key: "error", label: "Error" },
  { key: "debug", label: "Debug" },
];

const LEVEL_TONE: Record<LogLevel, string> = {
  info: "text-sky-400 bg-sky-400/10",
  warn: "text-amber-400 bg-amber-400/10",
  error: "text-red-400 bg-red-400/10",
  debug: "text-muted-foreground bg-muted",
};

export default function Logs() {
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [q, setQ] = useState("");
  const [live, setLive] = useState(true);

  const lines = LOGS.filter(
    (l) =>
      (level === "all" || l.level === level) &&
      (l.message.toLowerCase().includes(q.toLowerCase()) || l.source.includes(q.toLowerCase())),
  );

  return (
    <>
      <PageHeader
        title="Logs"
        description="Sistem ve denetim logları — seviye filtresi ve arama."
        actions={[{ label: live ? "Canlı" : "Duraklatıldı", icon: live ? Pause : Play, variant: live ? "default" : "outline", onClick: () => setLive((v) => !v) }]}
      />
      <PageBody grid={false} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Log ara…"
              className="h-9 w-full rounded-lg border bg-card pl-8 pr-3 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLevel(l.key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  level === l.key ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mp-scroll max-h-[calc(100vh-15rem)] overflow-y-auto rounded-xl border bg-[#0b0b0e] p-2 font-mono text-xs">
          {live && (
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> canlı akış
            </div>
          )}
          {lines.map((l) => (
            <div key={l.id} className="flex items-start gap-2 rounded px-2 py-1 hover:bg-white/5">
              <span className="shrink-0 text-muted-foreground">{l.time}</span>
              <span className={cn("shrink-0 rounded px-1.5 text-[10px] uppercase", LEVEL_TONE[l.level])}>{l.level}</span>
              <span className="shrink-0 text-primary/70">[{l.source}]</span>
              <span className="text-foreground/90">{l.message}</span>
            </div>
          ))}
          {lines.length === 0 && <p className="px-2 py-6 text-center text-muted-foreground">Eşleşen log yok.</p>}
        </div>
      </PageBody>
    </>
  );
}
