import type { Snapshot } from "games-common/benchmark";

import { hasValue, hoursPerDay, type Optional } from "games-common/language";
import { useEffect, useRef, useState } from "react";

const openingHour = 9;
const opening = openingHour * 60;
export const minutesPerDay = hoursPerDay * 60;
/** Animation lengths in milliseconds. */
const motion = { actionBase: 500, actionMax: 3200, actionPerRootMinute: 180, night: 2000 };

/** Animate only the interval between two observed simulator timestamps. */
export function useClock(state: Optional<Snapshot>, visitEnd?: number): number {
  const target = state ? (state.day - 1) * minutesPerDay + state.minute : null;
  const shown = useRef<Optional<number>>(null);
  const [value, setValue] = useState(opening);

  useEffect(() => {
    const from = shown.current;
    if (
      !hasValue(target) ||
      !hasValue(from) ||
      from > target ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      shown.current = target;
      setValue(target ?? opening);
      return undefined;
    }
    if (from === target) {
      return undefined;
    }
    const actionEnd =
      hasValue(visitEnd) && from < visitEnd && visitEnd < target ? visitEnd : target;
    const actionDuration = Math.min(
      motion.actionMax,
      motion.actionBase + motion.actionPerRootMinute * Math.sqrt(actionEnd - from),
    );
    const nightDuration = actionEnd < target ? motion.night : 0;
    const start = performance.now();
    let frame = 0;
    function tick(now: number) {
      if (!hasValue(target) || !hasValue(from)) {
        return;
      }
      const elapsed = now - start;
      const night = nightDuration > 0 && elapsed >= actionDuration;
      const progress = Math.min(
        1,
        night ? (elapsed - actionDuration) / nightDuration : elapsed / actionDuration,
      );
      const begin = night ? actionEnd : from;
      const finish = night ? target : actionEnd;
      const minute = begin + (finish - begin) * progress * progress * (3 - 2 * progress);
      shown.current = minute;
      setValue(minute);
      if (elapsed < actionDuration + nightDuration) {
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, visitEnd]);
  return value;
}
