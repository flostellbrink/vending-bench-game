import type { Release, Rival } from "games-common/benchmark";

import { hasValue, type Optional } from "games-common/language";

import {
  isReferenceResult,
  isReferenceSlot,
  referenceFor,
  referenceSlotOf,
  type RunSlot,
} from "./runs.ts";

export interface TimelineNode {
  source: string;
  day: number;
  cash: Optional<number>;
  result?: boolean;
}
export interface TimelineLane {
  label: string;
  source: string;
  parent?: { slot: string; day: number };
  nodes: TimelineNode[];
}
export const freshNode: TimelineNode = { cash: null, day: 1, source: "new" };

/** The row source of a parent slot; old saves name the top model run with a shared marker. */
export function sourceOf(release: Release, slot: string) {
  const reference = isReferenceSlot(slot) ? referenceFor(release, slot) : undefined;
  return reference ? referenceSlotOf(reference) : slot;
}

function referenceLane(release: Release, reference: Rival): TimelineLane {
  const source = referenceSlotOf(reference);
  const closings = reference.values?.slice(1, release.days + 1) ?? [];
  const nodes: TimelineNode[] = closings
    .slice(0, release.days - 1)
    .map((cash, i) => ({ cash, day: i + 2, source }));
  const last = closings[release.days - 1];
  if (hasValue(last)) {
    nodes.push({ cash: last, day: release.days + 1, result: true, source });
  }
  return { label: reference.name, nodes, source };
}

/**
 * One row per model run, each followed by the runs that branch from it and their own branches.
 * Later branches sit closer to their parent row, so each branch line drops at an earlier day
 * than any box in the rows it passes. New starts the first row, and fresh runs branch from it.
 */
export function timelineLanes(
  release: Release,
  {
    slots,
    references,
    labels,
  }: {
    slots: readonly RunSlot[];
    references: readonly Rival[];
    labels: { player: string; newRun: string };
  },
): TimelineLane[] {
  const finishedColumn = release.days + 1;
  // A finished model run is the result box of its own row.
  const shown = slots.filter((s) => !s.damaged && !isReferenceResult(s.parent, release));
  const parentOf = (s: RunSlot) =>
    s.parent
      ? { day: s.parent.day, slot: sourceOf(release, s.parent.slot) }
      : { day: 1, slot: freshNode.source };
  const children = new Map<string, RunSlot[]>();
  for (const s of shown) {
    const parent = parentOf(s).slot;
    children.set(parent, [...(children.get(parent) ?? []), s]);
  }
  const lanes: TimelineLane[] = [];
  const seen = new Set<string>();
  function place(s: RunSlot) {
    if (seen.has(s.id)) {
      return;
    }
    seen.add(s.id);
    const parent = parentOf(s);
    const nodes: TimelineNode[] = s.checkpoints
      .filter((p) => p.day > parent.day)
      .map((p) => ({ cash: p.cash, day: p.day, source: s.id }));
    if (s.finished) {
      nodes.push({ cash: s.cash, day: finishedColumn, result: true, source: s.id });
    }
    if (nodes.length) {
      lanes.push({ label: labels.player, nodes, parent, source: s.id });
    }
    branches([s.id]);
  }
  function branches(sources: string[]) {
    sources
      .flatMap((source) => children.get(source) ?? [])
      .toSorted((a, b) => parentOf(b).day - parentOf(a).day)
      .forEach(place);
  }
  const [first, ...rest] = references.map((reference) => referenceLane(release, reference));
  if (first) {
    lanes.push({ ...first, nodes: [freshNode, ...first.nodes] });
    branches([first.source, freshNode.source]);
  } else {
    lanes.push({ label: labels.newRun, nodes: [freshNode], source: freshNode.source });
    branches([freshNode.source]);
  }
  for (const lane of rest) {
    lanes.push(lane);
    branches([lane.source]);
  }
  // Runs whose parent is gone keep a row of their own.
  shown.forEach(place);
  return lanes;
}
