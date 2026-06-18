import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";
import { Lightbulb, Lightning, Sparkle, type Icon } from "@phosphor-icons/react";
import { PROACTIVE_INSIGHTS } from "~/data/prompts";
import { useCopilotStore } from "~/stores/copilot-store";

const KIND_ICON: Record<"insight" | "optimization" | "feature", Icon> = {
  insight: Lightbulb,
  optimization: Lightning,
  feature: Sparkle,
};

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
      const Icon = KIND_ICON[insight.kind];
      toast(
        <span className="flex items-center gap-1.5">
          <Icon className="size-4 text-primary" weight="regular" /> {insight.title}
        </span>,
        {
          description: insight.body,
          duration: 8000,
          action: {
            label: "Copilot'a sor",
            onClick: () => queuePrompt(insight.body),
          },
        },
      );
    }, 3500);

    return () => window.clearTimeout(t);
  }, [location.pathname, queuePrompt]);

  return null;
}
