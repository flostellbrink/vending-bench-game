import type { Rival } from "games-common/benchmark";

export function rankedModels(rivals: readonly Rival[]) {
  return rivals.toSorted((a, b) => b.score - a.score);
}
