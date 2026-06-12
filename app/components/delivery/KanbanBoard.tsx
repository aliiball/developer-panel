import type { ReactNode } from "react";

export interface KanbanColumn<T> {
  key: string;
  title: string;
  items: T[];
  accent?: string;
}

// Generic column board with render-prop cards. Roadmap uses it; reusable.
export function KanbanBoard<T>({
  columns,
  renderCard,
  getKey,
}: {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  getKey: (item: T) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => (
        <div key={col.key} className="flex flex-col rounded-xl border bg-card/40">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className="size-2 rounded-full" style={{ background: col.accent ?? "var(--muted-foreground)" }} />
            <span className="text-xs font-medium">{col.title}</span>
            <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground tabular-nums">
              {col.items.length}
            </span>
          </div>
          <div className="mp-scroll flex max-h-[calc(100vh-15rem)] flex-col gap-2 overflow-y-auto p-2">
            {col.items.map((item) => (
              <div key={getKey(item)}>{renderCard(item)}</div>
            ))}
            {col.items.length === 0 && (
              <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">Boş</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
