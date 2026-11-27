import type { Rival } from "games-common/benchmark";

import * as v from "valibot";

export async function loadRival(rival: Rival, signal: AbortSignal): Promise<Rival> {
  if (rival.values || !rival.balances) {
    return rival;
  }
  const response = await fetch(`/${rival.balances}`, { signal });
  if (!response.ok) {
    throw new Error("Reference data unavailable");
  }
  return { ...rival, values: v.parse(v.array(v.number()), await response.json()) };
}
