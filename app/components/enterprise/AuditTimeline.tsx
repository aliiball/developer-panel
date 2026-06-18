import type { Icon } from "@phosphor-icons/react";
import { Circle } from "@phosphor-icons/react";
import { cn } from "~/lib/utils";

export interface AuditEvent {
  id: string;
  /** ne yapıldı: "durumu 'resolved' yaptı" */
  action: string;
  /** kim: "Ada Yılmaz" / "AI Copilot" / "system" */
  actor?: string;
  /** ne zaman: "3 saat önce" */
  at: string;
  icon?: Icon;
  tone?: "default" | "primary" | "emerald" | "amber" | "red";
  /** opsiyonel detay/diff satırı */
  detail?: string;
}

const TONE: Record<NonNullable<AuditEvent["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  emerald: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/15 text-red-400",
};

/* ── AuditTimeline ──────────────────────────────────────────────────
 * Bir kaydın denetim/aktivite geçmişi. Enterprise'da "kim, ne zaman,
 * neyi değiştirdi" izlenebilirliği standarttır.
 */
export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Henüz aktivite yok.</p>;
  }
  return (
    <ol className="relative space-y-4">
      {events.map((e, i) => {
        const Icon = e.icon ?? Circle;
        return (
          <li key={e.id} className="relative flex gap-3">
            {i < events.length - 1 && (
              <span className="absolute left-[13px] top-7 h-[calc(100%-0.5rem)] w-px bg-border" />
            )}
            <span
              className={cn(
                "z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                TONE[e.tone ?? "default"],
              )}
            >
              <Icon className="size-3.5" weight="bold" />
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <p className="text-sm leading-snug">
                {e.actor && <span className="font-medium">{e.actor} </span>}
                <span className="text-muted-foreground">{e.action}</span>
              </p>
              {e.detail && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">
                  {e.detail}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">{e.at}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
