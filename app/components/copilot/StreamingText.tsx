import { useTypewriter } from "~/hooks/use-typewriter";
import { cn } from "~/lib/utils";

// Renders markdown-lite (**bold**) text with a typewriter reveal + blinking
// caret while streaming.
export function StreamingText({
  text,
  className,
  speed,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const { out, done } = useTypewriter(text, { speed });
  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {renderBold(out)}
      {!done && (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-[1px] bg-primary align-baseline" />
      )}
    </span>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
