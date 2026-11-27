import type { Release } from "games-common/benchmark";

import { entries, type Optional } from "games-common/language";

import { inParameterOrder } from "./commands.ts";

export function toolDefaults(release: Release, tool: Optional<string>) {
  if (!tool) {
    return "";
  }
  return inParameterOrder(entries(release.toolDefaults[tool] ?? {}), release.toolParameters[tool])
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(", ");
}
