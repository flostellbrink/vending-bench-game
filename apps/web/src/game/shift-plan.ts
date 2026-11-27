import type { Entry, Snapshot } from "games-common/benchmark";

import { hasValue } from "games-common/language";

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
  let { day } = state;
  let { minute } = state;
  return steps.map((step) => {
    if (day > state.days) {
      return { span: null, step };
    }
    const time = timing(step.verb, { ...state, minute });
    if (!time) {
      throw new Error(`Unknown planned operation: ${step.verb}`);
    }
    const fromDay = day;
    if (time.rolls) {
      day++;
    }
    minute = time.to;
    return { span: { ...time, day: fromDay, final: day > state.days }, step };
  });
}

export function remainingPlan(plan: readonly PlannedCommand[], journal: readonly Entry[]) {
  return plan.filter(
    (step) => !hasValue(step.dispatchedAt) || journal[step.dispatchedAt]?.line !== step.line,
  );
}
