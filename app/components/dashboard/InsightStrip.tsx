import {
  Sparkle as Sparkles,
  ArrowRight,
} from "@phosphor-icons/react";
import { useCopilotStore } from "~/stores/copilot-store";

const INSIGHTS = [
  "Order.placedAt sık filtreleniyor ama index'siz — eklemek 1 tık.",
  "5 yeni endpoint auto-generated. Dokümantasyon güncel mi?",
  "Accent rengi küçük metinde WCAG AA'yı geçemiyor.",
];

// AI suggestion strip across the top of the dashboard.
export function InsightStrip() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-primary">AI öneri</p>
        <p className="truncate text-sm text-muted-foreground">{INSIGHTS[0]}</p>
      </div>
      <button
        onClick={() => queuePrompt("Eksik index önerilerini göster ve nasıl ekleyeceğimi anlat.")}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        İncele <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
