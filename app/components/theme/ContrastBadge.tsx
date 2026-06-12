import { contrastRatio, wcagLevel } from "~/lib/contrast";
import { cn } from "~/lib/utils";

const TONE: Record<string, string> = {
  AAA: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  AA: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "AA Large": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Fail: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function ContrastBadge({
  fg,
  bg,
  label,
}: {
  fg: string;
  bg: string;
  label?: string;
}) {
  const ratio = contrastRatio(fg, bg);
  const level = wcagLevel(ratio);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px]",
        TONE[level],
      )}
      title={`Kontrast oranı ${ratio.toFixed(2)}:1`}
    >
      {label && <span className="opacity-70">{label}</span>}
      <span className="font-semibold">{level}</span>
      <span className="opacity-70">{ratio.toFixed(1)}</span>
    </span>
  );
}
