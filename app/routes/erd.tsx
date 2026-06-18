import { useRef, useState } from "react";
import {
  Sparkle as Sparkles,
  ArrowsOutCardinal as Move,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useSchemaStore } from "~/stores/schema-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { toast } from "sonner";

interface Pos {
  x: number;
  y: number;
}

// Free-positioned ERD. Nodes draggable via pointer events; relation fields are
// drawn as edges between model boxes. Mock positions, visual only.
export default function ERD() {
  const models = useSchemaStore((s) => s.models).slice(0, 8);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [pos, setPos] = useState<Record<string, Pos>>(() =>
    Object.fromEntries(
      models.map((m, i) => [
        m.id,
        { x: 40 + (i % 4) * 230, y: 40 + Math.floor(i / 4) * 220 },
      ]),
    ),
  );
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const NODE_W = 180;
  const HEAD = 32;

  function onPointerDown(e: React.PointerEvent, id: string) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos[id];
    drag.current = { id, dx: e.clientX - p.x, dy: e.clientY - p.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { id, dx, dy } = drag.current;
    setPos((prev) => ({ ...prev, [id]: { x: e.clientX - dx, y: e.clientY - dy } }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  const edges = models.flatMap((m) =>
    m.fields
      .filter((f) => f.type === "relation" && f.relationModel)
      .map((f) => {
        const target = models.find((t) => t.name === f.relationModel);
        return target ? { from: m.id, to: target.id, label: f.name } : null;
      })
      .filter(Boolean) as { from: string; to: string; label: string }[],
  );

  function center(id: string) {
    const p = pos[id];
    const h = HEAD + 8 + (models.find((m) => m.id === id)?.fields.length ?? 0) * 18;
    return { x: p.x + NODE_W / 2, y: p.y + h / 2 };
  }

  return (
    <>
      <PageHeader
        title="ERD"
        description="Varlık-ilişki diyagramı. Node'ları sürükleyin; ilişkiler otomatik çizilir."
        actions={[
          { label: "AI: İlişki Öner", icon: Sparkles, variant: "default", onClick: () => { queuePrompt("Mevcut modeller arasında eksik ilişkileri ve foreign key'leri öner."); toast.info("Copilot ilişkileri analiz ediyor…"); } },
        ]}
      />
      <PageBody grid={false} className="p-0">
        <div
          ref={wrap}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="mp-grid relative h-[calc(100vh-9rem)] overflow-hidden"
        >
          <svg className="pointer-events-none absolute inset-0 size-full">
            {edges.map((e, i) => {
              const a = center(e.from);
              const b = center(e.to);
              const mx = (a.x + b.x) / 2;
              return (
                <g key={i}>
                  <path
                    d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
                    fill="none"
                    stroke="var(--primary)"
                    strokeOpacity={0.4}
                    strokeWidth={1.5}
                  />
                  <circle cx={b.x} cy={b.y} r={3} fill="var(--primary)" />
                </g>
              );
            })}
          </svg>

          {models.map((m) => (
            <div
              key={m.id}
              style={{ left: pos[m.id].x, top: pos[m.id].y, width: NODE_W }}
              className="absolute rounded-lg border bg-card shadow-sm"
            >
              <div
                onPointerDown={(e) => onPointerDown(e, m.id)}
                className="flex cursor-grab items-center gap-1.5 rounded-t-lg border-b bg-muted/50 px-2.5 py-1.5 active:cursor-grabbing"
              >
                <Move className="size-3 text-muted-foreground" />
                <span className="text-xs font-semibold">{m.name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{m.fields.length}</span>
              </div>
              <div className="space-y-0.5 p-2">
                {m.fields.slice(0, 6).map((f) => (
                  <div key={f.id} className="flex items-center justify-between font-mono text-[10px]">
                    <span className={f.type === "relation" ? "text-primary" : ""}>{f.name}</span>
                    <span className="text-muted-foreground">{f.type}</span>
                  </div>
                ))}
                {m.fields.length > 6 && (
                  <div className="font-mono text-[10px] text-muted-foreground">+{m.fields.length - 6} daha</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </>
  );
}
