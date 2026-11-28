import type { Release } from "games-common/benchmark";

import { entries } from "games-common/language";

import { msg } from "@/dictionary/index.ts";

const tools = new Map<string, () => string>(entries(msg.benchmark.tools));

/** The published tool description, translated when the dictionary has it. */
export function toolDescription(release: Release, tool: string) {
  return tools.get(tool)?.() ?? release.tools[tool];
}
