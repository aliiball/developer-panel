import { ChevronUp } from "lucide-react";
import { cn } from "~/lib/utils";

// Upvote control for Roadmap cards.
export function VotePill({
  votes,
  onVote,
  voted,
}: {
  votes: number;
  onVote?: () => void;
  voted?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onVote?.();
      }}
      className={cn(
        "flex flex-col items-center rounded-md border px-2 py-1 transition-colors",
        voted ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <ChevronUp className="size-3.5" />
      <span className="text-xs font-semibold tabular-nums">{votes}</span>
    </button>
  );
}
