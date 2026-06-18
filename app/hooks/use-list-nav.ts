import { useCallback, useEffect, useRef, useState } from "react";

/* ── useListNav ─────────────────────────────────────────────────────
 * Liste/tablo için klavye gezinmesi: j/↓ aşağı, k/↑ yukarı, Enter seçer,
 * Esc temizler. Container'a `tabIndex={0}` + dönen `onKeyDown` bağlanır;
 * her satır `active === index` ise vurgulanır. Aktif satır görünüme kaydırılır.
 *
 *   const { active, setActive, onKeyDown, containerRef } = useListNav(rows.length, (i) => open(rows[i]));
 *   <div ref={containerRef} tabIndex={0} onKeyDown={onKeyDown}> … satırlar … </div>
 */
export function useListNav(count: number, onEnter?: (index: number) => void) {
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Liste küçülürse aktif index'i sınırlar içinde tut.
  useEffect(() => {
    if (active > count - 1) setActive(count - 1);
  }, [count, active]);

  // Aktif satırı görünür alana kaydır.
  useEffect(() => {
    if (active < 0 || !containerRef.current) return;
    const row = containerRef.current.querySelector<HTMLElement>(
      `[data-nav-index="${active}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(count - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i <= 0 ? 0 : i - 1));
      } else if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        onEnter?.(active);
      } else if (e.key === "Escape") {
        setActive(-1);
      }
    },
    [count, active, onEnter],
  );

  return { active, setActive, onKeyDown, containerRef };
}
