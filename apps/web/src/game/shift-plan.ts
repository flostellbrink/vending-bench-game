import type { Entry, Snapshot } from "games-common/benchmark";

import { timing } from "./commands.ts";

export interface PlannedCommand extends Entry {
  id: number;
  verb: string;
  dispatchedAt?: number;
}

type ShiftClock = Pick<
  Snapshot,
  "day" | "days" | "minute" | "opens" | "closes" | "costs" | "defaultCost"
>;

/** Forecast only the shared clock. Actions can still fail or terminate a run. */
export function projectPlan(steps: readonly PlannedCommand[], state: ShiftClock) {
  let day = state.day,
    minute = state.minute;
  return steps.map((step) => {
    if (day > state.days) return { step, span: null };
    const time = timing(step.verb, { ...state, minute });
    if (!time) throw Error("Unknown planned operation: " + step.verb);
    const fromDay = day;
    if (time.rolls) day++;
    minute = time.to;
    return { step, span: { ...time, day: fromDay, final: day > state.days } };
  });
}

export function remainingPlan(plan: readonly PlannedCommand[], journal: readonly Entry[]) {
  return plan.filter(
    (step) => step.dispatchedAt === undefined || journal[step.dispatchedAt]?.line !== step.line,
  );
}
