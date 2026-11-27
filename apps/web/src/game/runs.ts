import {
  entrySchema,
  moveSchema,
  personalBestSchema,
  replaySchema,
  type Entry,
  type PersonalBest,
  type Receipt,
  type Release,
} from "games-common/benchmark";
import * as v from "valibot";

import { commandForMove } from "./commands.ts";

export const legacySlot = "legacy";
export const referenceSlot = "reference-run";
export function referenceRun(release: Release) {
  return release.rivals.find((rival) => rival.replay);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSlotId(id: string): boolean {
  return id === legacySlot || uuid.test(id);
}

export function runKey(release: Release, slot = legacySlot) {
  if (!isSlotId(slot)) throw Error("Unsupported save slot");
  const base = "vending:" + release.revision + ":" + release.seed;
  return slot === legacySlot ? base : base + ":slot:" + slot;
}
export function recordKey(release: Release) {
  return runKey(release) + ":" + release.days + ":record";
}

const checkpointSchema = v.object({
  day: v.pipe(v.number(), v.integer(), v.minValue(1)),
  moveCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  cash: v.pipe(v.number(), v.finite()),
});
export type RunTimeline = v.InferOutput<typeof timelineSchema>;
const timelineSchema = v.object({
  ...checkpointSchema.entries,
  minute: v.optional(v.number()),
  checkpoints: v.pipe(v.array(checkpointSchema), v.minLength(1)),
});
const lineageSchema = v.object({
  createdAt: v.nullable(v.number()),
  updatedAt: v.optional(v.number()),
  parent: v.nullable(
    v.object({
      slot: v.union([v.literal(referenceSlot), v.pipe(v.string(), v.check(isSlotId))]),
      day: checkpointSchema.entries.day,
    }),
  ),
});
const metadataSchema = v.object({ ...lineageSchema.entries, timeline: timelineSchema });
const savedRunSchema = v.object({
  format: v.literal(1),
  moves: v.array(entrySchema),
  opponent: v.nullable(personalBestSchema),
  finished: v.optional(v.boolean(), false),
  metadata: v.optional(metadataSchema),
});
export interface SavedRun {
  moves: Entry[];
  opponent: PersonalBest | null;
  finished: boolean;
  timeline?: RunTimeline;
}

type StorageWriter = Pick<Storage, "getItem" | "setItem">;
type StorageReader = Pick<Storage, "getItem" | "length" | "key">;

export type RunSlot = v.InferOutput<typeof slotSchema>;
export interface ParentBalance {
  values: number[];
}
export function recordedClosings(slot: Pick<RunSlot, "checkpoints" | "finished" | "day" | "cash">) {
  const values = slot.checkpoints.map((morning) => morning.cash);
  const lastMorning = slot.checkpoints.at(-1);
  if (slot.finished && slot.cash !== null && lastMorning && slot.day === lastMorning.day + 1)
    values.push(slot.cash);
  return values;
}
const slotSchema = v.object({
  ...lineageSchema.entries,
  id: v.pipe(v.string(), v.check(isSlotId)),
  checkpoints: v.array(checkpointSchema),
  moves: checkpointSchema.entries.moveCount,
  finished: v.boolean(),
  day: checkpointSchema.entries.day,
  minute: v.optional(v.number()),
  cash: v.nullable(v.number()),
  damaged: v.boolean(),
});

export function runTimeline(
  release: Release,
  receipts: readonly (Pick<Receipt, "day" | "endDay" | "closingCash"> &
    Partial<Pick<Receipt, "endMinute">>)[],
  finished: boolean,
  previous?: RunTimeline,
): RunTimeline {
  const opening = { day: 1, moveCount: 0, cash: release.startingBalance };
  const timeline = previous
    ? { ...previous, checkpoints: [...previous.checkpoints] }
    : { ...opening, minute: release.network.opens, checkpoints: [opening] };
  for (const [index, receipt] of receipts.entries()) {
    timeline.moveCount++;
    timeline.day = receipt.endDay;
    timeline.minute = receipt.endMinute;
    timeline.cash = receipt.closingCash;
    if (receipt.endDay !== receipt.day && !(finished && index === receipts.length - 1)) {
      timeline.checkpoints.push({
        day: receipt.endDay,
        moveCount: timeline.moveCount,
        cash: timeline.cash,
      });
    }
  }
  return timeline;
}

export function readRecord(serialized: string | null): PersonalBest | null {
  return serialized === null ? null : v.parse(personalBestSchema, JSON.parse(serialized));
}

/** Old saves contain only moves, so their pre-run comparison cannot be reconstructed. */
export function readRun(serialized: string | null, record: PersonalBest | null): SavedRun {
  if (serialized === null) return { moves: [], opponent: record, finished: false };
  return decode(serialized);
}

function decode(raw: string): SavedRun & Pick<RunSlot, "createdAt" | "parent" | "updatedAt"> {
  const saved: unknown = JSON.parse(raw);
  if (Array.isArray(saved)) {
    const moves = saved.map((input: unknown): Entry => {
      if (!Array.isArray(input)) return v.parse(entrySchema, input);
      const move = v.parse(moveSchema, input);
      return { move, line: move[0] };
    });
    return { moves, opponent: null, finished: false, createdAt: null, parent: null };
  }
  const result = v.safeParse(savedRunSchema, saved);
  if (!result.success) throw Error("Unsupported save");
  const { moves, opponent, finished, metadata } = result.output;
  if (metadata) {
    const { timeline } = metadata;
    if (
      timeline.moveCount !== moves.length ||
      timeline.checkpoints.some(
        (point, index, points) =>
          point.day !== index + 1 ||
          point.day > timeline.day ||
          point.moveCount > timeline.moveCount ||
          (index === 0
            ? point.moveCount !== 0
            : point.moveCount <= (points[index - 1]?.moveCount ?? 0)),
      )
    ) {
      throw Error("Invalid save timeline");
    }
  }
  return {
    moves,
    opponent,
    finished,
    timeline: metadata?.timeline,
    createdAt: metadata?.createdAt ?? null,
    updatedAt: metadata?.updatedAt,
    parent: metadata?.parent ?? null,
  };
}

export function saveRun(
  storage: StorageWriter,
  key: string,
  expected: string | null,
  moves: Entry[],
  opponent: PersonalBest | null,
  finished = false,
  timeline?: RunTimeline,
) {
  if (storage.getItem(key) !== expected) throw Error("changed");
  const prior: unknown = expected === null ? null : JSON.parse(expected);
  const previous = v.safeParse(v.object({ metadata: metadataSchema }), prior);
  const metadata = previous.success ? previous.output.metadata : undefined;
  const nextTimeline = timeline ?? metadata?.timeline;
  if (nextTimeline && nextTimeline.moveCount !== moves.length) throw Error("Invalid save timeline");
  const next = JSON.stringify({
    format: 1,
    moves,
    opponent,
    finished,
    metadata: nextTimeline
      ? {
          createdAt: metadata?.createdAt ?? null,
          updatedAt:
            metadata?.timeline.moveCount === moves.length ? metadata.updatedAt : Date.now(),
          parent: metadata?.parent ?? null,
          timeline: nextTimeline,
        }
      : undefined,
  });
  storage.setItem(key, next);
  return next;
}

function newSlot(
  storage: StorageWriter,
  release: Release,
  moves: Entry[],
  timeline: RunTimeline,
  parent: RunSlot["parent"],
) {
  const id = crypto.randomUUID(),
    key = runKey(release, id);
  if (storage.getItem(key) !== null) throw Error("Save slot already exists");
  const opponent = readRecord(storage.getItem(recordKey(release)));
  const now = Date.now();
  storage.setItem(
    key,
    JSON.stringify({
      format: 1,
      moves,
      opponent,
      finished: false,
      metadata: { createdAt: now, updatedAt: now, parent, timeline },
    }),
  );
  return id;
}

export function createRun(storage: StorageWriter, release: Release): string {
  return newSlot(storage, release, [], runTimeline(release, [], false), null);
}

export async function forkReferenceRun(
  storage: StorageWriter,
  release: Release,
  day: number,
): Promise<string> {
  const path = referenceRun(release)?.replay;
  if (!path) throw Error("Missing reference replay");
  const response = await fetch("/" + path);
  if (!response.ok) throw Error("Reference replay unavailable");
  const replay = v.parse(replaySchema, await response.json());
  if (
    replay.revision !== release.revision ||
    replay.seed !== release.seed ||
    replay.checkpoints.some(
      (point, i, all) =>
        point.day !== i + 1 ||
        point.day > release.days ||
        !Number.isInteger(point.moveCount) ||
        point.moveCount > replay.moves.length ||
        (i === 0
          ? point.moveCount !== 0 || point.cash !== release.startingBalance
          : point.moveCount <= (all[i - 1]?.moveCount ?? 0)),
    )
  )
    throw Error("Incompatible reference replay");
  const point = replay.checkpoints.find((p) => p.day === day);
  if (!point) throw Error("Missing reference morning");
  const moves = replay.moves
    .slice(0, point.moveCount)
    .map((move) => ({ move, line: commandForMove(move) }));
  return newSlot(
    storage,
    release,
    moves,
    { ...point, minute: release.network.opens, checkpoints: replay.checkpoints.slice(0, day) },
    { slot: referenceSlot, day },
  );
}

export function forkRun(
  storage: StorageWriter,
  release: Release,
  parentSlot: string,
  day: number,
): string {
  const visited = new Set<string>();
  function load(id: string) {
    if (visited.has(id)) throw Error("Invalid save lineage");
    visited.add(id);
    const raw = storage.getItem(runKey(release, id));
    if (raw === null) throw Error("Missing parent run");
    return decode(raw);
  }
  let owner = parentSlot,
    parent = load(owner);
  while (parent.parent && parent.parent.slot !== referenceSlot && day <= parent.parent.day) {
    owner = parent.parent.slot;
    parent = load(owner);
  }
  const timeline = parent.timeline ?? runTimeline(release, [], false);
  const point = timeline.checkpoints.find((p) => p.day === day);
  if (!point || point.moveCount > parent.moves.length) throw Error("Missing day checkpoint");
  const checkpoints = timeline.checkpoints.filter((p) => p.day <= day);
  return newSlot(
    storage,
    release,
    parent.moves.slice(0, point.moveCount),
    { ...point, minute: release.network.opens, checkpoints },
    {
      slot:
        parent.parent?.slot === referenceSlot && day <= parent.parent.day ? referenceSlot : owner,
      day,
    },
  );
}

function summary(raw: string, release: Release, id: string): RunSlot {
  const opening = runTimeline(release, [], false);
  const empty = {
    id,
    createdAt: null,
    parent: null,
    day: 1,
    cash: null,
    moves: 0,
    finished: false,
    checkpoints: [],
  };
  try {
    const saved = decode(raw);
    const timeline = saved.timeline ?? opening;
    return {
      ...empty,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      parent: saved.parent,
      checkpoints: timeline.checkpoints,
      day: timeline.day,
      minute: saved.timeline
        ? timeline.minute
        : saved.moves.length
          ? undefined
          : release.network.opens,
      cash: saved.timeline || !saved.moves.length ? timeline.cash : null,
      moves: saved.moves.length,
      finished: saved.finished,
      damaged: false,
    };
  } catch {
    return { ...empty, damaged: true };
  }
}

export function listRuns(storage: StorageReader, release: Release): RunSlot[] {
  const base = runKey(release),
    prefix = base + ":slot:",
    slots: RunSlot[] = [];
  for (let n = 0; n < storage.length; n++) {
    const key = storage.key(n);
    if (key === null || (key !== base && !key.startsWith(prefix))) continue;
    const id = key === base ? legacySlot : key.slice(prefix.length);
    if (!isSlotId(id) || key !== runKey(release, id)) continue;
    const raw = storage.getItem(key);
    if (raw !== null) slots.push(summary(raw, release, id));
  }
  return slots.toSorted(
    (a, b) =>
      Number(b.id === legacySlot) - Number(a.id === legacySlot) ||
      (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity) ||
      a.id.localeCompare(b.id),
  );
}

export function slotSnapshot(storage: StorageReader, release: Release): string {
  return JSON.stringify(listRuns(storage, release));
}

export function readSlotSnapshot(snapshot: string): RunSlot[] {
  return v.parse(v.array(slotSchema), JSON.parse(snapshot));
}

export async function withRunLock<T>(key: string, operation: () => T): Promise<T> {
  if (navigator.locks) return navigator.locks.request(key, operation);
  return operation();
}
