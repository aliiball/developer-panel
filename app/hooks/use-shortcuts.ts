import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useUIStore } from "~/stores/ui-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { HOTKEY_NAV } from "~/data/nav";

// Registers the global keyboard signature: ⌘K spotlight, ⌘J copilot,
// ? shortcut sheet, ⌘1-9 quick page switch, Esc to close overlays.
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function isTyping(el: EventTarget | null): boolean {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        node.isContentEditable ||
        node.closest?.("[cmdk-root]") != null
      );
    }

    function onKey(e: KeyboardEvent) {
      const ui = useUIStore.getState();
      const copilot = useCopilotStore.getState();
      const mod = e.metaKey || e.ctrlKey;

      // ⌘K — spotlight
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setSpotlight(!ui.spotlightOpen);
        return;
      }
      // ⌘J — copilot rail
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        copilot.toggleRail();
        return;
      }
      // ⌘1-9 — quick page switch (not while spotlight handles its own nav)
      if (mod && /^[1-9]$/.test(e.key)) {
        const item = HOTKEY_NAV.find((n) => n.hotkey === Number(e.key));
        if (item) {
          e.preventDefault();
          navigate(item.to);
        }
        return;
      }
      // ? — shortcut sheet (only when not typing)
      if (e.key === "?" && !isTyping(e.target)) {
        e.preventDefault();
        ui.setShortcuts(true);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
