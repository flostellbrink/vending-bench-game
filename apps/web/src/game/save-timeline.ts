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
interface TimelineRun {
  source: string;
  row: number;
  /** The box this run branches from; only New has none. */
  parent?: { source: string; day: number; row: number };
  nodes: TimelineNode[];
}
interface TimelineRow {
  /** The source of the run that opened the row. */
  key: string;
  /** The model run that the row shows; rows of the player's runs have no label. */
  label?: string;
}
export interface Timeline {
  rows: TimelineRow[];
  runs: TimelineRun[];
}
export const freshNode: TimelineNode = { cash: null, day: 1, source: "new" };

/** The source of a parent slot; old saves name the top model run with a shared marker. */
export function sourceOf(release: Release, slot: string) {
  const reference = isReferenceSlot(slot) ? referenceFor(release, slot) : undefined;
  return reference ? referenceSlotOf(reference) : slot;
}

interface Branch {
  source: string;
  label?: string;
  parent: { source: string; day: number };
  nodes: TimelineNode[];
}
/** A run on a row: from the day its line leaves the parent box to its last box. */
interface Span {
  source: string;
  start: number;
  end: number;
  trunk: string;
}
/** The line from a parent box down to the row of a branch. */
interface Drop {
  day: number;
  from: number;
  to: number;
  trunk: string;
}

/** Branches from the same box share the line that leaves it. */
function trunkOf(branch: Branch) {
  return `${branch.parent.source}:${branch.parent.day}`;
}
function spanOf(branch: Branch): Span {
  return {
    end: branch.nodes.at(-1)?.day ?? branch.parent.day,
    source: branch.source,
    start: branch.parent.day,
    trunk: trunkOf(branch),
  };
}

function modelBranch(release: Release, reference: Rival): Branch {
  const source = referenceSlotOf(reference);
  const closings = reference.values?.slice(1, release.days + 1) ?? [];
  const nodes: TimelineNode[] = closings
    .slice(0, release.days - 1)
    .map((cash, i) => ({ cash, day: i + 2, source }));
  const last = closings[release.days - 1];
  if (hasValue(last)) {
    nodes.push({ cash: last, day: release.days + 1, result: true, source });
  }
  return {
    label: reference.name,
    nodes,
    parent: { day: freshNode.day, source: freshNode.source },
    source,
  };
}

function playerBranch(release: Release, slot: RunSlot): Branch {
  const parent = slot.parent
    ? { day: slot.parent.day, source: sourceOf(release, slot.parent.slot) }
    : { day: freshNode.day, source: freshNode.source };
  const nodes: TimelineNode[] = slot.checkpoints
    .filter((point) => point.day > parent.day)
    .map((point) => ({ cash: point.cash, day: point.day, source: slot.id }));
  if (slot.finished) {
    nodes.push({ cash: slot.cash, day: release.days + 1, result: true, source: slot.id });
  }
  return { nodes, parent, source: slot.id };
}

/**
 * New is the root. Model runs branch from it in score order, each on its own labelled row; the
 * player's runs branch from the box they started at. A branch continues its parent's row when it
 * starts at the parent's last box, and otherwise takes the first row below its parent where its
 * span is free and no line crosses a box or another line. Later branches are placed first, so
 * they sit nearest their parent.
 */
export function saveTimeline(
  release: Release,
  { slots, references }: { slots: readonly RunSlot[]; references: readonly Rival[] },
): Timeline {
  const branches = [
    ...references.map((reference) => modelBranch(release, reference)),
    ...slots
      // A finished model run is the result box of its own row.
      .filter((slot) => !slot.damaged && !isReferenceResult(slot.parent, release))
      .map((slot) => playerBranch(release, slot))
      .filter((branch) => branch.nodes.length > 0),
  ];
  const children = new Map<string, Branch[]>();
  for (const branch of branches) {
    const siblings = children.get(branch.parent.source) ?? [];
    children.set(branch.parent.source, [...siblings, branch]);
  }
  const rows: (TimelineRow & { spans: Span[] })[] = [{ key: freshNode.source, spans: [] }];
  const drops: Drop[] = [];
  const runs: TimelineRun[] = [];
  const rowOf = new Map<string, number>();

  // A line at day crosses a span, unless the span starts there from the same box.
  const crosses = (span: Span, day: number, trunk: string) =>
    span.start <= day && day <= span.end && !(span.start === day && span.trunk === trunk);
  function fits(branch: Branch, row: number, parentRow: number) {
    const span = spanOf(branch);
    const free = (rows[row]?.spans ?? []).every(
      (other) =>
        other.end < span.start ||
        span.end < other.start ||
        (other.source === branch.parent.source && other.end === span.start),
    );
    const clearDrop = rows
      .slice(parentRow + 1, row)
      .every((between) => between.spans.every((other) => !crosses(other, span.start, span.trunk)));
    const uncrossed = drops.every(
      (drop) => !(drop.from < row && row < drop.to) || !crosses(span, drop.day, drop.trunk),
    );
    return free && clearDrop && uncrossed;
  }
  function occupy(branch: Branch, row: number) {
    const target = rows[row] ?? { key: branch.source, spans: [] };
    rows[row] = target;
    target.label ??= branch.label;
    target.spans.push(spanOf(branch));
    rowOf.set(branch.source, row);
  }
  function placeChildren(source: string) {
    (children.get(source) ?? []).toSorted((a, b) => b.parent.day - a.parent.day).forEach(place);
  }
  function place(branch: Branch) {
    const parentRow = rowOf.get(branch.parent.source);
    if (!hasValue(parentRow) || rowOf.has(branch.source)) {
      return;
    }
    let row = parentRow;
    while (row < rows.length && !fits(branch, row, parentRow)) {
      row++;
    }
    occupy(branch, row);
    if (row !== parentRow) {
      drops.push({ day: branch.parent.day, from: parentRow, to: row, trunk: trunkOf(branch) });
    }
    runs.push({
      nodes: branch.nodes,
      parent: { ...branch.parent, row: parentRow },
      row,
      source: branch.source,
    });
    placeChildren(branch.source);
  }

  rows[0]?.spans.push({
    end: freshNode.day,
    source: freshNode.source,
    start: freshNode.day,
    trunk: "",
  });
  rowOf.set(freshNode.source, 0);
  runs.push({ nodes: [freshNode], row: 0, source: freshNode.source });
  placeChildren(freshNode.source);
  // A run whose parent save is gone keeps its own row, without a line.
  for (const branch of branches) {
    if (!rowOf.has(branch.source)) {
      occupy(branch, rows.length);
      runs.push({ nodes: branch.nodes, row: rows.length - 1, source: branch.source });
      placeChildren(branch.source);
    }
  }
  return { rows: rows.map(({ key, label }) => ({ key, label })), runs };
}
