import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "~/lib/utils";

/* ── EmptyState ─────────────────────────────────────────────────────
 * Boş liste, filtre-sonucu-boş, ilk-kullanım ve hata sonrası için
 * tek tutarlı boş durum. action: birincil CTA (Button vb).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** "search" → filtre sonucu boş; "error" → kırmızı ton */
  variant?: "default" | "search" | "error";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/40 px-6 py-14 text-center",
        variant === "error" && "border-red-500/30 bg-red-500/5",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground",
            variant === "error" && "bg-red-500/10 text-red-400",
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ── Skeleton primitifleri ──────────────────────────────────────────
 * Yükleniyor durumları. Gerçek ürün hissi için her async yüzey
 * skeleton göstermeli (boş ekran/anlık zıplama yerine).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      aria-hidden
    />
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex gap-4 border-b px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3 flex-1", c === 0 && "max-w-[40%]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}
