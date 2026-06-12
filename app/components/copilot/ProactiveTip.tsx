import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";
import { PROACTIVE_INSIGHTS } from "~/data/prompts";
import { useCopilotStore } from "~/stores/copilot-store";

const KIND_EMOJI = { insight: "💡", optimization: "⚡", feature: "✨" } as const;

// Surfaces a route-relevant AI insight as a toast a few seconds after landing
// on a page — but only once per route per session. Respects reduced-motion by
// still showing (toasts are not motion), and never double-fires.
export function ProactiveTip() {
  const location = useLocation();
  const shown = useRef<Set<string>>(new Set());
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  useEffect(() => {
    const insight = PROACTIVE_INSIGHTS.find((i) => i.route === location.pathname);
    if (!insight || shown.current.has(location.pathname)) return;

    const t = window.setTimeout(() => {
      shown.current.add(location.pathname);
      toast(`${KIND_EMOJI[insight.kind]} ${insight.title}`, {
        description: insight.body,
        duration: 8000,
        action: {
          label: "Copilot'a sor",
          onClick: () => queuePrompt(insight.body),
        },
      });
    }, 3500);

    return () => window.clearTimeout(t);
  }, [location.pathname, queuePrompt]);

  return null;
}
