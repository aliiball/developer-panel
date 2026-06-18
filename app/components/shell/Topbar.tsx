import { useLocation, useNavigate } from "react-router";
import {
  MagnifyingGlass as Search,
  Sparkle as Sparkles,
  Keyboard,
  Sun,
  Moon,
  Bell,
  List,
} from "@phosphor-icons/react";
import { useUIStore } from "~/stores/ui-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { useNotificationStore } from "~/stores/notification-store";
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
  const toggleNav = useUIStore((s) => s.toggleNav);
  const toggleRail = useCopilotStore((s) => s.toggleRail);
  const railOpen = useCopilotStore((s) => s.railOpen);
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);

  const current =
    ALL_NAV.find(
      (n) =>
        n.to !== "/" &&
        (location.pathname === n.to || location.pathname.startsWith(n.to + "/")),
    ) ?? ALL_NAV[0];

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/70 px-3 backdrop-blur sm:gap-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="size-9 md:hidden"
        aria-label="Menüyü aç"
        onClick={toggleNav}
      >
        <List className="size-[18px]" />
      </Button>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden font-semibold tracking-tight sm:inline">MetaPanel</span>
        <span className="hidden text-muted-foreground sm:inline">/</span>
        <span className="truncate font-medium sm:font-normal sm:text-muted-foreground">{current.label}</span>
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
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="relative size-9" onClick={() => navigate("/notifications")} />}
          >
            <Bell className="size-[18px]" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                {unread}
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">Bildirimler</TooltipContent>
        </Tooltip>
        <span className="hidden md:inline-flex">
          <IconButton label="Kısayollar (?)" onClick={() => setShortcuts(true)}>
            <Keyboard className="size-[18px]" />
          </IconButton>
        </span>
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
            <span className="hidden sm:inline">Copilot</span>
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
