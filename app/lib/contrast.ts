// WCAG relative-luminance contrast utilities.
// Input is normalized to 6-digit hex first so #fff shorthand doesn't break.

export function normHex(h: string): string {
  let c = h.trim().replace("#", "");
  if (c.length === 3) {
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  }
  return c.slice(0, 6).padEnd(6, "0");
}

function luminance(hex: string): number {
  const c = normHex(hex);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(h1: string, h2: string): number {
  const L1 = luminance(h1);
  const L2 = luminance(h2);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

export function wcagLevel(r: number): WcagLevel {
  if (r >= 7) return "AAA";
  if (r >= 4.5) return "AA";
  if (r >= 3) return "AA Large";
  return "Fail";
}

// Pick black or white text for a given background by best contrast.
export function bestTextOn(bg: string): "#000000" | "#ffffff" {
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#000000")
    ? "#ffffff"
    : "#000000";
}

// Nudge a hex color darker/lighter until it reaches the target ratio against bg.
export function suggestAccessible(
  color: string,
  bg: string,
  target = 4.5,
): string {
  let c = normHex(color);
  const towardDark = luminance(bg) > 0.4;
  for (let step = 0; step < 24; step++) {
    if (contrastRatio(`#${c}`, bg) >= target) break;
    const rgb = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
    const adjusted = rgb.map((v) => {
      const next = towardDark ? v - 10 : v + 10;
      return Math.max(0, Math.min(255, next));
    });
    c = adjusted.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  return `#${c}`;
}
