import type { Rival } from "games-common/benchmark";

export function rankedModels(rivals: readonly Rival[]) {
  return rivals.filter((rival) => rival.kind === "model").toSorted((a, b) => b.score - a.score);
}
