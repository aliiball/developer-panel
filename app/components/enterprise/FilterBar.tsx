import type { ReactNode } from "react";
import {
  MagnifyingGlass,
  Columns,
  DownloadSimple,
  X,
  Check,
} from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

/* ── FilterBar ──────────────────────────────────────────────────────
 * Liste sayfalarının üst kontrol şeridi: arama + filtre çipleri +
 * sağda kolon/görünüm/export aksiyonları. Her liste sayfası bunu kullanır.
 */
export function FilterBar({
  search,
  onSearch,
  placeholder = "Ara…",
  children,
  onExport,
  columns,
  className,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  /** filtre çipleri / select'ler */
  children?: ReactNode;
  onExport?: () => void;
  /** kolon göster/gizle menüsü için { key,label,visible,toggle } */
  columns?: { key: string; label: string; visible: boolean; toggle: () => void }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearch && (
        <div className="relative min-w-52 flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-lg border bg-card pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Aramayı temizle"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {children && <div className="flex flex-wrap items-center gap-1.5">{children}</div>}

      <div className="ml-auto flex items-center gap-1.5">
        {columns && columns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="size-4" /> Kolonlar
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              {columns.map((c) => (
                <DropdownMenuItem
                  key={c.key}
                  onClick={(e) => {
                    e.preventDefault();
                    c.toggle();
                  }}
                  className="justify-between"
                >
                  {c.label}
                  {c.visible && <Check className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onExport && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onExport}>
            <DownloadSimple className="size-4" /> Export
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── FilterChip ─────────────────────────────────────────────────────
 * Toggle'lanabilir filtre çipi (durum, önem vb).
 */
export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded px-1 text-[10px] tabular-nums",
            active ? "bg-primary/15" : "bg-foreground/5",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ── BulkBar ────────────────────────────────────────────────────────
 * Satır seçimi olunca beliren toplu işlem şeridi.
 */
export function BulkBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <span className="font-medium tabular-nums text-primary">{count} seçili</span>
      <div className="flex flex-1 items-center gap-1.5">{children}</div>
      <button
        onClick={onClear}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" /> Temizle
      </button>
    </div>
  );
}
