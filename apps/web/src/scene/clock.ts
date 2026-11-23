import { hoursPerDay } from "games-common/language";

/** Format minutes from midnight for the operator clock. */
export function clock(minutes: number): string {
  return [Math.floor(minutes / 60) % hoursPerDay, Math.floor(minutes) % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
