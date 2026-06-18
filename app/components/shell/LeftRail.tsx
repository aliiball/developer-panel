import { useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import {
  Hexagon,
  CaretRight,
  CaretLineLeft,
  CaretLineRight,
} from "@phosphor-icons/react";
import {
  PINNED_NAV,
  NAV_SECTIONS,
  itemsForSection,
  ALL_NAV,
  type NavItem,
  type NavSection,
} from "~/data/nav";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useUIStore } from "~/stores/ui-store";
import { cn } from "~/lib/utils";

/** Bir rotanın hangi NavItem'a denk geldiğini bulan ortak mantık. */
function isActive(to: string, pathname: string): boolean {
  return to === "/"
    ? pathname === "/"
    : pathname === to || pathname.startsWith(to + "/");
}

export function LeftRail() {
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const openSection = useUIStore((s) => s.openSection);
  const setOpenSection = useUIStore((s) => s.setOpenSection);

  // Aktif rota bir bölüme aitse, o bölümü otomatik aç (single-open).
  useEffect(() => {
    const active = ALL_NAV.find((n) => isActive(n.to, location.pathname));
    if (active && active.group !== "pinned") setOpenSection(active.group);
  }, [location.pathname, setOpenSection]);

  return (
    <nav
      className={cn(
        "z-30 flex h-full shrink-0 flex-col border-r bg-sidebar/80 py-3 backdrop-blur transition-[width] duration-200",
        collapsed ? "w-14 items-center" : "w-60",
      )}
    >
      {/* Marka + daralt/genişlet */}
      <div
        className={cn(
          "mb-2 flex items-center",
          collapsed ? "flex-col gap-2" : "gap-2 px-3",
        )}
      >
        <NavLink
          to="/"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
          aria-label="MetaPanel"
        >
          <Hexagon className="size-5" weight="bold" />
        </NavLink>
        {!collapsed && (
          <span className="flex-1 truncate text-sm font-semibold tracking-tight">
            MetaPanel
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <CaretLineRight className="size-4" />
          ) : (
            <CaretLineLeft className="size-4" />
          )}
        </button>
      </div>

      <div
        className={cn(
          "mp-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden",
          collapsed ? "items-center" : "px-2",
        )}
      >
        {/* Pinli öğeler */}
        {PINNED_NAV.map((item) =>
          collapsed ? (
            <RailIcon key={item.to} item={item} pathname={location.pathname} />
          ) : (
            <NavRow key={item.to} item={item} pathname={location.pathname} />
          ),
        )}

        <div className={cn("my-1.5 h-px bg-border", collapsed ? "w-6" : "mx-2")} />

        {/* Bölümler */}
        {NAV_SECTIONS.map((section) =>
          collapsed ? (
            <CollapsedSection
              key={section.id}
              section={section}
              pathname={location.pathname}
            />
          ) : (
            <AccordionSection
              key={section.id}
              section={section}
              pathname={location.pathname}
              open={openSection === section.id}
              onToggle={() =>
                setOpenSection(openSection === section.id ? null : section.id)
              }
            />
          ),
        )}
      </div>
    </nav>
  );
}

/* ── Genişletilmiş mod: accordion bölümü ──────────────────────────── */

function AccordionSection({
  section,
  pathname,
  open,
  onToggle,
}: {
  section: NavSection;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  const items = itemsForSection(section.id);
  const hasActive = items.some((i) => isActive(i.to, pathname));

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent",
          open || hasActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className="size-[18px]" weight={hasActive ? "fill" : "regular"} />
        <span className="flex-1 truncate text-left font-medium">
          {section.label}
        </span>
        {!open && hasActive && (
          <span className="size-1.5 rounded-full bg-primary" />
        )}
        <CaretRight
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 pb-1">
          {items.map((item) => (
            <NavRow key={item.to} item={item} pathname={pathname} nested />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Genişletilmiş mod: tek satır link ────────────────────────────── */

function NavRow({
  item,
  pathname,
  nested,
}: {
  item: NavItem;
  pathname: string;
  nested?: boolean;
}) {
  const Icon = item.icon;
  const active = isActive(item.to, pathname);

  return (
    <NavLink
      to={item.to}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg py-2 text-sm transition-colors",
        nested ? "pl-9 pr-2.5" : "px-2.5",
        active
          ? "bg-accent font-medium text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className="size-[18px] shrink-0" weight={active ? "fill" : "regular"} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.hotkey && (
        <kbd className="rounded bg-background/40 px-1 font-mono text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
          ⌘{item.hotkey}
        </kbd>
      )}
      {item.soon && (
        <span className="rounded bg-amber-400/20 px-1 text-[10px] text-amber-400">
          Yakında
        </span>
      )}
    </NavLink>
  );
}

/* ── Daraltılmış mod: ikon ray ────────────────────────────────────── */

function CollapsedSection({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
  const items = itemsForSection(section.id);
  return (
    <>
      <div className="my-1.5 h-px w-6 bg-border" />
      {items.map((item) => (
        <RailIcon key={item.to} item={item} pathname={pathname} />
      ))}
    </>
  );
}

function RailIcon({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(item.to, pathname);

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
        <Icon className="size-[18px]" weight={active ? "fill" : "regular"} />
        {item.soon && (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-400/80" />
        )}
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{item.label}</span>
        {item.hotkey && (
          <kbd className="rounded bg-background/40 px-1 font-mono text-[10px]">
            ⌘{item.hotkey}
          </kbd>
        )}
        {item.soon && (
          <span className="rounded bg-amber-400/20 px-1 text-[10px] text-amber-400">
            Yakında
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
