import type { Snapshot } from "games-common/benchmark";

import { msg } from "@/dictionary";
import { timing } from "@/game/commands";
import { clock } from "@/scene/clock";

export function useTimeLabel() {
  const free = msg.operator.noCharge();
  const endRun = msg.operator.endRun();
  const next = msg.operator.next();
  return (verb: string, state: Snapshot | null) => {
    const span = timing(verb, state);
    if (!state || !span) return free;
    const end = span.rolls ? (state.day === state.days ? endRun : next) + " " : "";
    return span.minutes + " min · " + clock(span.from) + " → " + end + clock(span.to);
  };
}
