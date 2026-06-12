import { useEffect, useRef, useState } from "react";

// Reveals `text` character-by-character. Cancels cleanly on unmount / text
// change so streaming doesn't leak across route changes or React 19 StrictMode
// double-mounts. Respects prefers-reduced-motion (shows full text instantly).
export function useTypewriter(text: string, opts?: { speed?: number; enabled?: boolean }) {
  const speed = opts?.speed ?? 12;
  const enabled = opts?.enabled ?? true;
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !text) {
      setOut(text);
      setDone(true);
      return;
    }

    setOut("");
    setDone(false);
    let i = 0;
    raf.current = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        if (raf.current) clearInterval(raf.current);
        setDone(true);
      }
    }, speed);

    return () => {
      if (raf.current) clearInterval(raf.current);
    };
  }, [text, speed, enabled]);

  return { out: enabled ? out : text, done: enabled ? done : true };
}
