import type { Snapshot } from "games-common/benchmark";
import type { Optional } from "games-common/language";

import { msg } from "@/dictionary/index.ts";
import { timing } from "@/game/commands.ts";
import { clock } from "@/scene/clock.ts";

export function useTimeLabel() {
  const free = msg.operator.noCharge();
  const endRun = msg.operator.endRun();
  const next = msg.operator.next();
  return (verb: string, state: Optional<Snapshot>) => {
    const span = timing(verb, state);
    if (!state || !span) {
      return free;
    }
    const end = span.rolls ? `${state.day === state.days ? endRun : next} ` : "";
    return `${span.minutes} min · ${clock(span.from)} → ${end}${clock(span.to)}`;
  };
}
