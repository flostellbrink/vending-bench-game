import type { Release } from "games-common/benchmark";

export function toolDefaults(release: Release, tool: string | undefined) {
  if (!tool) return "";
  return Object.entries(release.toolDefaults[tool] ?? {})
    .map(([key, value]) => key + "=" + JSON.stringify(value))
    .join(", ");
}
