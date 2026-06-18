import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";

export interface DrawerTab {
  value: string;
  label: string;
  content: ReactNode;
}

/* ── DetailDrawer ───────────────────────────────────────────────────
 * Sağdan açılan, opsiyonel sekmeli detay paneli. Liste → satır →
 * derin detay akışının enterprise karşılığı (audit, ilişkili kayıtlar,
 * ham JSON gibi sekmelerle).
 */
export function DetailDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  tabs,
  footer,
  children,
  width = "sm:max-w-xl",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  tabs?: DrawerTab[];
  footer?: ReactNode;
  children?: ReactNode;
  width?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("flex w-full flex-col gap-0 p-0", width)}>
        <SheetHeader className="border-b p-4 pr-12">
          <div className="flex items-center gap-2">
            <SheetTitle className="truncate">{title}</SheetTitle>
            {badge}
          </div>
          {subtitle && <SheetDescription className="truncate">{subtitle}</SheetDescription>}
        </SheetHeader>

        {tabs && tabs.length > 0 ? (
          <Tabs defaultValue={tabs[0].value} className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="shrink-0 rounded-none border-b px-4">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((t) => (
              <TabsContent key={t.value} value={t.value} className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="p-4">{t.content}</div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">{children}</div>
          </ScrollArea>
        )}

        {footer && <SheetFooter className="border-t">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

/* ── Field ──────────────────────────────────────────────────────────
 * Detay panelinde tutarlı etiket/değer satırı.
 */
export function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-right text-sm", mono && "font-mono text-xs")}>{children}</span>
    </div>
  );
}
