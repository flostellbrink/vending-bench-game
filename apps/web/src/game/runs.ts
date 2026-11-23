import {
  entrySchema,
  moveSchema,
  personalBestSchema,
  type Entry,
  type PersonalBest,
  type Release,
} from "games-common/benchmark";
import * as v from "valibot";

export function runKey(release: Release) {
  return "vending:" + release.revision + ":" + release.seed;
}
export function recordKey(release: Release) {
  return runKey(release) + ":" + release.days + ":record";
}

const savedRunSchema = v.object({
  format: v.literal(1),
  moves: v.array(entrySchema),
  opponent: v.nullable(personalBestSchema),
  finished: v.optional(v.boolean(), false),
});
export interface SavedRun {
  moves: Entry[];
  opponent: PersonalBest | null;
  finished: boolean;
}

export function readRecord(serialized: string | null): PersonalBest | null {
  return serialized === null ? null : v.parse(personalBestSchema, JSON.parse(serialized));
}

/** Old saves contain only moves, so their pre-run comparison cannot be reconstructed. */
export function readRun(serialized: string | null, record: PersonalBest | null): SavedRun {
  if (serialized === null) return { moves: [], opponent: record, finished: false };
  const saved: unknown = JSON.parse(serialized);
  if (Array.isArray(saved)) {
    const moves = saved.map((input: unknown): Entry => {
      if (!Array.isArray(input)) return v.parse(entrySchema, input);
      const move = v.parse(moveSchema, input);
      return { move, line: move[0] };
    });
    return { moves, opponent: null, finished: false };
  }
  const result = v.safeParse(savedRunSchema, saved);
  if (!result.success) throw Error("Unsupported save");
  return result.output;
}

export function saveRun(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
  expected: string | null,
  moves: Entry[],
  opponent: PersonalBest | null,
  finished = false,
) {
  if (storage.getItem(key) !== expected) throw Error("changed");
  const next = JSON.stringify({ format: 1, moves, opponent, finished });
  storage.setItem(key, next);
  return next;
}

export async function withRunLock<T>(key: string, operation: () => T): Promise<T> {
  if (navigator.locks) return navigator.locks.request(key, operation);
  return operation();
}
