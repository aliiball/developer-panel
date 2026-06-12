import { useMemo } from "react";
import type { ModuleDef } from "~/stores/module-store";

// Lightweight SVG dependency graph. Nodes are laid out on a circle and edges
// drawn straight between them — no auto-layout, intentionally simple.
export function DependencyGraph({ modules }: { modules: ModuleDef[] }) {
  const { nodes, edges } = useMemo(() => {
    const W = 520;
    const H = 320;
    const cx = W / 2;
    const cy = H / 2;
    const r = 120;
    const idx = new Map(modules.map((m, i) => [m.id, i]));
    const nodes = modules.map((m, i) => {
      const angle = (i / modules.length) * Math.PI * 2 - Math.PI / 2;
      return {
        ...m,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    const edges = modules.flatMap((m) =>
      m.dependencies
        .filter((d) => idx.has(d))
        .map((d) => ({ from: idx.get(m.id)!, to: idx.get(d)! })),
    );
    return { nodes, edges, W, H };
  }, [modules]);

  return (
    <svg viewBox="0 0 520 320" className="w-full">
      {edges.map((e, i) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--border)"
            strokeWidth={1.5}
            markerEnd="url(#arrow)"
          />
        );
      })}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--muted-foreground)" opacity="0.5" />
        </marker>
      </defs>
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={26}
            fill={n.active ? "var(--primary)" : "var(--muted)"}
            opacity={n.active ? 0.9 : 1}
            stroke="var(--border)"
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            className="fill-current text-[9px] font-medium"
            fill={n.active ? "white" : "var(--muted-foreground)"}
          >
            {n.name.length > 8 ? n.name.slice(0, 7) + "…" : n.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
