import type { Snapshot } from "games-common/benchmark";
import type { Optional } from "games-common/language";

import { useEffect, useRef, useState } from "react";

const opening = 9 * 60;
export const minutesPerDay = 24 * 60;

/** Animate only the interval between two observed simulator timestamps. */
export function useClock(state: Optional<Snapshot>): number {
  const target = state ? (state.day - 1) * minutesPerDay + state.minute : null;
  const shown = useRef<Optional<number>>(null);
  const [value, setValue] = useState(opening);

  useEffect(() => {
    const from = shown.current;
    if (
      target === null ||
      from == null ||
      from > target ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      shown.current = target;
      setValue(target ?? opening);
      return undefined;
    }
    const duration = Math.min(3200, 400 + 65 * Math.sqrt(target - from));
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      if (target === null || from == null) return;
      const progress = Math.min(1, (now - start) / duration);
      const minute = from + (target - from) * progress * progress * (3 - 2 * progress);
      shown.current = minute;
      setValue(minute);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}
