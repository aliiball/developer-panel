import { NavLink, useLocation } from "react-router";
import { Hexagon } from "lucide-react";
import {
  CORE_NAV,
  EXPANSION_NAV,
  DELIVERY_NAV,
  PLATFORM_NAV,
  type NavItem,
} from "~/data/nav";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

export function LeftRail() {
  return (
    <nav className="z-30 flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r bg-sidebar/80 py-3 backdrop-blur">
      <NavLink
        to="/"
        className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
        aria-label="MetaPanel"
      >
        <Hexagon className="size-5" strokeWidth={2.4} />
      </NavLink>

      <div className="mp-scroll flex flex-1 flex-col items-center gap-1 overflow-y-auto">
        {CORE_NAV.map((item) => (
          <RailLink key={item.to} item={item} />
        ))}

        <div className="my-1 h-px w-6 bg-border" />

        {DELIVERY_NAV.map((item) => (
          <RailLink key={item.to} item={item} />
        ))}

        <div className="my-1 h-px w-6 bg-border" />

        {PLATFORM_NAV.map((item) => (
          <RailLink key={item.to} item={item} />
        ))}

        <div className="my-1 h-px w-6 bg-border" />

        {EXPANSION_NAV.map((item) => (
          <RailLink key={item.to} item={item} />
        ))}
      </div>
    </nav>
  );
}

function RailLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const location = useLocation();
  // schema/:modelId should keep /schema active, etc.
  const active =
    item.to === "/"
      ? location.pathname === "/"
      : location.pathname === item.to ||
        location.pathname.startsWith(item.to + "/");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <NavLink
            to={item.to}
            className={cn(
              "group relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors",
              "hover:bg-accent hover:text-foreground",
              active && "bg-accent text-primary",
            )}
          />
        }
      >
        {active && (
          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
        {item.soon && (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-400/80" />
        )}
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{item.label}</span>
        {item.hotkey && (
          <kbd className="rounded bg-background/40 px-1 font-mono text-[10px]">⌘{item.hotkey}</kbd>
        )}
        {item.soon && (
          <span className="rounded bg-amber-400/20 px-1 text-[10px] text-amber-400">Yakında</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
