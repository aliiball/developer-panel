import {
  type Icon as LucideIcon,
} from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface PageAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
}

// Page title + description + inline Action Bar (the spec's per-page quick
// actions). Sticky under the topbar.
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: PageAction[];
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b bg-background/50 px-6 py-4 md:flex-row md:items-center md:gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.05rem] font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        {children}
        {actions?.map((a) => (
          <Button
            key={a.label}
            variant={a.variant ?? "outline"}
            size="sm"
            className={cn("h-8 gap-1.5", a.variant === "default" && "bg-primary")}
            onClick={a.onClick}
          >
            {a.icon && <a.icon className="size-4" />}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Scrollable page body wrapper with the signature grid backdrop.
export function PageBody({
  children,
  className,
  grid = true,
}: {
  children: React.ReactNode;
  className?: string;
  grid?: boolean;
}) {
  return (
    <div className={cn("mp-scroll relative flex-1 overflow-y-auto", grid && "mp-grid")}>
      <div className={cn("relative p-6", className)}>{children}</div>
    </div>
  );
}
