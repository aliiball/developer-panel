import { useLocation } from "react-router";
import { Search, Sparkles, Keyboard, Sun, Moon } from "lucide-react";
import { useUIStore } from "~/stores/ui-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { ALL_NAV } from "~/data/nav";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTheme } from "~/components/shell/ThemeProvider";

export function Topbar() {
  const setSpotlight = useUIStore((s) => s.setSpotlight);
  const setShortcuts = useUIStore((s) => s.setShortcuts);
  const toggleRail = useCopilotStore((s) => s.toggleRail);
  const railOpen = useCopilotStore((s) => s.railOpen);
  const { isDark, toggle } = useTheme();
  const location = useLocation();

  const current =
    ALL_NAV.find(
      (n) =>
        n.to !== "/" &&
        (location.pathname === n.to || location.pathname.startsWith(n.to + "/")),
    ) ?? ALL_NAV[0];

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/70 px-4 backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tracking-tight">MetaPanel</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{current.label}</span>
      </div>

      <button
        onClick={() => setSpotlight(true)}
        className="group ml-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span>Ara veya komut…</span>
        <kbd className="ml-auto rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        <IconButton label="Kısayollar (?)" onClick={() => setShortcuts(true)}>
          <Keyboard className="size-[18px]" />
        </IconButton>
        <IconButton label={isDark ? "Açık tema" : "Koyu tema"} onClick={toggle}>
          {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </IconButton>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={railOpen ? "default" : "outline"}
                size="sm"
                className="ml-1 h-9 gap-1.5"
                onClick={toggleRail}
              />
            }
          >
            <Sparkles className="size-4" />
            Copilot
          </TooltipTrigger>
          <TooltipContent side="bottom">Copilot panelini aç/kapat (⌘J)</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon" className="size-9" onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
