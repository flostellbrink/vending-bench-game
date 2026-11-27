import {
  entrySchema,
  moveSchema,
  personalBestSchema,
  replaySchema,
  type Entry,
  type PersonalBest,
  type Receipt,
  type Release,
  type Rival,
} from "games-common/benchmark";
import { assertValue, hasValue, type Optional } from "games-common/language";
import * as v from "valibot";

import { commandForMove } from "./commands.ts";
import { rankedModels } from "./model-rivals.ts";

export const legacySlot = "legacy";
/** Saves from before each model run had its own row use this parent for the top replayable run. */
const legacyReference = "reference-run";
const referencePrefix = "reference:";
/** The parent slot of a run that branches from a published model run. */
export function referenceSlotOf(rival: Pick<Rival, "id">) {
  return `${referencePrefix}${rival.id}`;
}
export function isReferenceSlot(slot: Optional<string>) {
  return slot === legacyReference || (slot?.startsWith(referencePrefix) ?? false);
}
/** The published model runs that the browser engine replays exactly, highest score first. */
export function referenceRuns(release: Release) {
  return rankedModels(release.rivals).filter((rival) => hasValue(rival.replay));
}
export function referenceFor(release: Release, slot: Optional<string>) {
  const runs = referenceRuns(release);
  return slot === legacyReference ? runs[0] : runs.find((rival) => referenceSlotOf(rival) === slot);
}
/** A save that continues a model run to its end, so that its result can be reviewed. */
export function isReferenceResult(parent: RunSlot["parent"], release: Release) {
  return isReferenceSlot(parent?.slot) && hasValue(parent) && parent.day > release.days;
}
export interface RunOrigin {
  /** The morning on which the run left the model run, or the day after the last day. */
  day: number;
  rival: Rival;
}
/**
 * The model run and morning that a run left, or nothing for a run that the player started.
 * A fork from before an ancestor left the model run has the model run as its parent, so the
 * first model run parent is the last morning with only that model's moves.
 */
export function runOrigin(
  release: Release,
  slots: readonly RunSlot[],
  id: string,
): Optional<RunOrigin> {
  const seen = new Set<string>();
  let slot = slots.find((s) => s.id === id);
  while (slot && !seen.has(slot.id)) {
    seen.add(slot.id);
    const { parent } = slot;
    if (parent && isReferenceSlot(parent.slot)) {
      const rival = referenceFor(release, parent.slot);
      return rival ? { day: parent.day, rival } : undefined;
    }
    slot = slots.find((s) => s.id === parent?.slot);
  }
  return undefined;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSlotId(id: string): boolean {
  return id === legacySlot || uuid.test(id);
}

export function runKey(release: Release, slot = legacySlot) {
  if (!isSlotId(slot)) {
    throw new Error("Unsupported save slot");
  }
  const base = `vending:${release.revision}:${release.seed}`;
  return slot === legacySlot ? base : `${base}:slot:${slot}`;
}
export function recordKey(release: Release) {
  return `${runKey(release)}:${release.days}:record`;
}

const checkpointSchema = v.object({
  cash: v.pipe(v.number(), v.finite()),
  day: v.pipe(v.number(), v.integer(), v.minValue(1)),
  moveCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
export type RunTimeline = v.InferOutput<typeof timelineSchema>;
const timelineSchema = v.object({
  ...checkpointSchema.entries,
  checkpoints: v.pipe(v.array(checkpointSchema), v.minLength(1)),
  minute: v.optional(v.number()),
});
const lineageSchema = v.object({
  createdAt: v.nullable(v.number()),
  parent: v.nullable(
    v.object({
      day: checkpointSchema.entries.day,
      slot: v.pipe(
        v.string(),
        v.check((slot) => isSlotId(slot) || isReferenceSlot(slot)),
      ),
    }),
  ),
  updatedAt: v.optional(v.number()),
});
const metadataSchema = v.object({ ...lineageSchema.entries, timeline: timelineSchema });
const savedRunSchema = v.object({
  finished: v.optional(v.boolean(), false),
  format: v.literal(1),
  metadata: v.optional(metadataSchema),
  moves: v.array(entrySchema),
  opponent: v.nullable(personalBestSchema),
});
export interface SavedRun {
  moves: Entry[];
  opponent: Optional<PersonalBest>;
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
  if (slot.finished && hasValue(slot.cash) && lastMorning && slot.day === lastMorning.day + 1) {
    values.push(slot.cash);
  }
  return values;
}
const slotSchema = v.object({
  ...lineageSchema.entries,
  cash: v.nullable(v.number()),
  checkpoints: v.array(checkpointSchema),
  damaged: v.boolean(),
  day: checkpointSchema.entries.day,
  finished: v.boolean(),
  id: v.pipe(v.string(), v.check(isSlotId)),
  minute: v.optional(v.number()),
  moves: checkpointSchema.entries.moveCount,
});

export function runTimeline(
  release: Release,
  receipts: readonly (Pick<Receipt, "day" | "endDay" | "closingCash"> &
    Partial<Pick<Receipt, "endMinute">>)[],
  finished: boolean,
  previous?: Optional<RunTimeline>,
): RunTimeline {
  const opening = { cash: release.startingBalance, day: 1, moveCount: 0 };
  const timeline = previous
    ? { ...previous, checkpoints: [...previous.checkpoints] }
    : { ...opening, checkpoints: [opening], minute: release.network.opens };
  for (const [index, receipt] of receipts.entries()) {
    timeline.moveCount++;
    timeline.day = receipt.endDay;
    timeline.minute = receipt.endMinute;
    timeline.cash = receipt.closingCash;
    if (receipt.endDay !== receipt.day && !(finished && index === receipts.length - 1)) {
      timeline.checkpoints.push({
        cash: timeline.cash,
        day: receipt.endDay,
        moveCount: timeline.moveCount,
      });
    }
  }
  return timeline;
}

export function readRecord(serialized: Optional<string>): Optional<PersonalBest> {
  return hasValue(serialized) ? v.parse(personalBestSchema, JSON.parse(serialized)) : null;
}

/** Old saves contain only moves, so their pre-run comparison cannot be reconstructed. */
export function readRun(
  serialized: Optional<string>,
  record: Optional<PersonalBest>,
): SavedRun & Pick<RunSlot, "parent"> {
  if (!hasValue(serialized)) {
    return { finished: false, moves: [], opponent: record, parent: null };
  }
  return decode(serialized);
}

function decode(raw: string): SavedRun & Pick<RunSlot, "createdAt" | "parent" | "updatedAt"> {
  const saved: unknown = JSON.parse(raw);
  if (Array.isArray(saved)) {
    const moves = saved.map((input: unknown): Entry => {
      if (!Array.isArray(input)) {
        return v.parse(entrySchema, input);
      }
      const move = v.parse(moveSchema, input);
      return { line: move[0], move };
    });
    return { createdAt: null, finished: false, moves, opponent: null, parent: null };
  }
  const result = v.safeParse(savedRunSchema, saved);
  if (!result.success) {
    throw new Error("Unsupported save");
  }
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
      throw new Error("Invalid save timeline");
    }
  }
  return {
    createdAt: metadata?.createdAt ?? null,
    finished,
    moves,
    opponent,
    parent: metadata?.parent ?? null,
    timeline: metadata?.timeline,
    updatedAt: metadata?.updatedAt,
  };
}

interface RunUpdate {
  moves: Entry[];
  opponent: Optional<PersonalBest>;
  finished?: boolean;
  timeline?: Optional<RunTimeline>;
}
export function saveRun(
  storage: StorageWriter,
  key: string,
  expected: Optional<string>,
  { moves, opponent, finished = false, timeline }: RunUpdate,
) {
  if (storage.getItem(key) !== (expected ?? null)) {
    throw new Error("changed");
  }
  const prior: unknown = hasValue(expected) ? JSON.parse(expected) : null;
  const previous = v.safeParse(v.object({ metadata: metadataSchema }), prior);
  const metadata = previous.success ? previous.output.metadata : undefined;
  const nextTimeline = timeline ?? metadata?.timeline;
  if (nextTimeline && nextTimeline.moveCount !== moves.length) {
    throw new Error("Invalid save timeline");
  }
  const next = JSON.stringify({
    finished,
    format: 1,
    metadata: nextTimeline
      ? {
          createdAt: metadata?.createdAt ?? null,
          parent: metadata?.parent ?? null,
          timeline: nextTimeline,
          updatedAt:
            metadata?.timeline.moveCount === moves.length ? metadata.updatedAt : Date.now(),
        }
      : undefined,
    moves,
    opponent: opponent ?? null,
  });
  storage.setItem(key, next);
  return next;
}

interface NewSlot {
  moves: Entry[];
  timeline: RunTimeline;
  parent: RunSlot["parent"];
  finished?: boolean;
}
function newSlot(
  storage: StorageWriter,
  release: Release,
  { moves, timeline, parent, finished = false }: NewSlot,
) {
  const id = crypto.randomUUID();
  const key = runKey(release, id);
  if (hasValue(storage.getItem(key))) {
    throw new Error("Save slot already exists");
  }
  const opponent = readRecord(storage.getItem(recordKey(release))) ?? null;
  const now = Date.now();
  storage.setItem(
    key,
    JSON.stringify({
      finished,
      format: 1,
      metadata: { createdAt: now, parent, timeline, updatedAt: now },
      moves,
      opponent,
    }),
  );
  return id;
}

export function createRun(storage: StorageWriter, release: Release): string {
  return newSlot(storage, release, {
    moves: [],
    parent: null,
    timeline: runTimeline(release, [], false),
  });
}

/** A new run from a model run's morning, or the whole model run when day follows the last day. */
export async function forkReferenceRun(
  storage: StorageWriter,
  release: Release,
  slot: string,
  day: number,
): Promise<string> {
  const reference = referenceFor(release, slot);
  if (!reference?.replay) {
    throw new Error("Missing reference replay");
  }
  const response = await fetch(`/${reference.replay}`);
  if (!response.ok) {
    throw new Error("Reference replay unavailable");
  }
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
  ) {
    throw new Error("Incompatible reference replay");
  }
  const finished = day === release.days + 1;
  const point = finished
    ? { cash: assertValue(reference.finalBalance), day, moveCount: replay.moves.length }
    : replay.checkpoints.find((p) => p.day === day);
  if (!point) {
    throw new Error("Missing reference morning");
  }
  const moves = replay.moves
    .slice(0, point.moveCount)
    .map((move) => ({ line: commandForMove(move, release.toolParameters[move[0]]), move }));
  const checkpoints = replay.checkpoints.slice(0, day);
  return newSlot(storage, release, {
    finished,
    moves,
    parent: { day, slot: referenceSlotOf(reference) },
    timeline: finished
      ? { ...point, checkpoints }
      : { ...point, checkpoints, minute: release.network.opens },
  });
}

export function forkRun(
  storage: StorageWriter,
  release: Release,
  parentSlot: string,
  day: number,
): string {
  const visited = new Set<string>();
  function load(id: string) {
    if (visited.has(id)) {
      throw new Error("Invalid save lineage");
    }
    visited.add(id);
    const raw = storage.getItem(runKey(release, id));
    if (!hasValue(raw)) {
      throw new Error("Missing parent run");
    }
    return decode(raw);
  }
  let owner = parentSlot;
  let parent = load(owner);
  while (parent.parent && !isReferenceSlot(parent.parent.slot) && day <= parent.parent.day) {
    owner = parent.parent.slot;
    parent = load(owner);
  }
  const timeline = parent.timeline ?? runTimeline(release, [], false);
  const point = timeline.checkpoints.find((p) => p.day === day);
  if (!point || point.moveCount > parent.moves.length) {
    throw new Error("Missing day checkpoint");
  }
  const checkpoints = timeline.checkpoints.filter((p) => p.day <= day);
  return newSlot(storage, release, {
    moves: parent.moves.slice(0, point.moveCount),
    parent:
      parent.parent && isReferenceSlot(parent.parent.slot) && day <= parent.parent.day
        ? { day, slot: parent.parent.slot }
        : { day, slot: owner },
    timeline: { ...point, checkpoints, minute: release.network.opens },
  });
}

/**
 * A saved run that already starts where a branch from source at day would start, so that
 * opening the branch again reuses it. A day after the last day asks for the finished run.
 */
export function existingBranch(
  runs: readonly RunSlot[],
  release: Release,
  { source, day, preferred }: { source: string; day: number; preferred?: string },
) {
  const fromSource = (slot: Optional<string>) =>
    slot === source ||
    (isReferenceSlot(slot) &&
      isReferenceSlot(source) &&
      referenceFor(release, slot) === referenceFor(release, source));
  const startsThere = (run: RunSlot) =>
    day > release.days
      ? run.finished
      : !run.finished &&
        run.day === day &&
        run.checkpoints.some((point) => point.day === day && point.moveCount === run.moves);
  const [existing] = runs
    .filter(
      (run) =>
        !run.damaged &&
        startsThere(run) &&
        (run.id === source || (fromSource(run.parent?.slot) && run.parent?.day === day)),
    )
    .toSorted(
      (a, b) =>
        Number(b.id === preferred) - Number(a.id === preferred) ||
        (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0),
    );
  return existing;
}

function summary(raw: string, release: Release, id: string): RunSlot {
  const opening = runTimeline(release, [], false);
  const empty = {
    cash: null,
    checkpoints: [],
    createdAt: null,
    day: 1,
    finished: false,
    id,
    moves: 0,
    parent: null,
  };
  try {
    const saved = decode(raw);
    const timeline = saved.timeline ?? opening;
    const minuteWithoutTimeline = saved.moves.length ? undefined : release.network.opens;
    return {
      ...empty,
      cash: saved.timeline || !saved.moves.length ? timeline.cash : null,
      checkpoints: timeline.checkpoints,
      createdAt: saved.createdAt,
      damaged: false,
      day: timeline.day,
      finished: saved.finished,
      minute: saved.timeline ? timeline.minute : minuteWithoutTimeline,
      moves: saved.moves.length,
      parent: saved.parent,
      updatedAt: saved.updatedAt,
    };
  } catch {
    return { ...empty, damaged: true };
  }
}

export function listRuns(storage: StorageReader, release: Release): RunSlot[] {
  const base = runKey(release);
  const prefix = `${base}:slot:`;
  const slots: RunSlot[] = [];
  for (let n = 0; n < storage.length; n++) {
    const key = storage.key(n);
    if (!hasValue(key) || (key !== base && !key.startsWith(prefix))) {
      continue;
    }
    const id = key === base ? legacySlot : key.slice(prefix.length);
    if (!isSlotId(id) || key !== runKey(release, id)) {
      continue;
    }
    const raw = storage.getItem(key);
    if (hasValue(raw)) {
      slots.push(summary(raw, release, id));
    }
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
  if (navigator.locks) {
    return navigator.locks.request(key, operation);
  }
  return operation();
}
