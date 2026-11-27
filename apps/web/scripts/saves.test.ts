import { parseReleases, type Entry } from "games-common/benchmark";
import { first } from "games-common/language";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createRun,
  forkRun,
  legacySlot,
  listRuns,
  readRun,
  readSlotSnapshot,
  recordedClosings,
  recordKey,
  runKey,
  runTimeline,
  saveRun,
  slotSnapshot,
} from "../src/game/runs.ts";

const releases = JSON.parse(
  await readFile(new URL("../src/generated/releases.json", import.meta.url), "utf8"),
);
const release = first(parseReleases(releases));
class Memory {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
const close: Entry = { line: "close", move: ["wait_for_next_day", {}] };
const status: Entry = { line: "status", move: ["get_status", {}] };

/** @risk impact=3 likelihood=3 */
await test("morning checkpoints include the closing action, not later work", () => {
  const firstCash = release.startingBalance - 10;
  const endingCash = 20;
  const receipts = [
    { closingCash: release.startingBalance, day: 1, endDay: 1 },
    { closingCash: firstCash, day: 1, endDay: 2 },
    { closingCash: firstCash - 5, day: 2, endDay: 2 },
  ];
  const timeline = runTimeline(release, receipts, false);
  assert.deepEqual(timeline.checkpoints, [
    { cash: release.startingBalance, day: 1, moveCount: 0 },
    { cash: firstCash, day: 2, moveCount: 2 },
  ]);
  assert.deepEqual(
    runTimeline(
      release,
      receipts.slice(2),
      false,
      runTimeline(release, receipts.slice(0, 2), false),
    ),
    timeline,
  );
  const ended = runTimeline(
    release,
    [{ closingCash: endingCash, day: 2, endDay: 3 }],
    true,
    timeline,
  );
  assert.equal(ended.checkpoints.at(-1)?.day, 2);
  assert.deepEqual(recordedClosings({ ...timeline, finished: false }), [
    release.startingBalance,
    firstCash,
  ]);
  assert.deepEqual(recordedClosings({ ...ended, finished: true }), [
    release.startingBalance,
    firstCash,
    endingCash,
  ]);
});

/** @risk impact=5 likelihood=2 */
await test("new slots and nested forks leave earlier journals and their records unchanged", () => {
  const opening = 1500;
  const dayOneClose = 1488;
  const bestScore = 2100;
  const db = new Memory();
  const parent = createRun(db, release);
  const other = createRun(db, release);
  const key = runKey(release, parent);
  const otherRaw = db.getItem(runKey(release, other));
  const moves = [status, close, status];
  const timeline = runTimeline(
    release,
    [
      { closingCash: opening, day: 1, endDay: 1 },
      { closingCash: dayOneClose, day: 1, endDay: 2 },
      { closingCash: 1470, day: 2, endDay: 2 },
    ],
    false,
  );
  const parentRaw = saveRun(db, key, db.getItem(key), { moves, opponent: null, timeline });
  const record = { score: bestScore, values: [opening, bestScore] };
  db.setItem(recordKey(release), JSON.stringify(record));
  const child = forkRun(db, release, parent, 2);
  const childKey = runKey(release, child);
  const childRun = readRun(db.getItem(childKey), null);
  assert.deepEqual(childRun.moves, [status, close]);
  assert.deepEqual(childRun.opponent, record);
  assert.equal(childRun.timeline?.cash, dayOneClose);
  const dayThree = runTimeline(
    release,
    [{ closingCash: 1476, day: 2, endDay: 3 }],
    false,
    childRun.timeline,
  );
  const childRaw = saveRun(db, childKey, db.getItem(childKey), {
    moves: [...childRun.moves, close],
    opponent: record,
    timeline: dayThree,
  });
  const nested = forkRun(db, release, child, 3);
  const earlier = forkRun(db, release, nested, 1);
  const sibling = forkRun(db, release, nested, 2);
  const slots = readSlotSnapshot(slotSnapshot(db, release));
  assert.deepEqual(slots.find((s) => s.id === child)?.parent, { day: 2, slot: parent });
  assert.deepEqual(slots.find((s) => s.id === nested)?.parent, { day: 3, slot: child });
  assert.deepEqual(slots.find((s) => s.id === earlier)?.parent, { day: 1, slot: parent });
  assert.deepEqual(slots.find((s) => s.id === sibling)?.parent, { day: 2, slot: parent });
  assert.equal(db.getItem(key), parentRaw);
  assert.equal(db.getItem(childKey), childRaw);
  assert.equal(db.getItem(runKey(release, other)), otherRaw);
  assert.throws(() => forkRun(db, release, parent, 3), /checkpoint/);
  assert.throws(() => saveRun(db, key, null, { moves: [], opponent: null }), /changed/);
});

/** @risk impact=5 likelihood=2 */
await test("old saves remain visible and one broken slot cannot hide healthy runs", () => {
  const recordScore = 12;
  const db = new Memory();
  const base = runKey(release);
  db.setItem(base, JSON.stringify([close.move]));
  const healthy = createRun(db, release);
  const broken = createRun(db, release);
  db.setItem(runKey(release, broken), "{");
  db.setItem(recordKey(release), JSON.stringify({ score: recordScore, values: [recordScore] }));
  const listed = listRuns(db, release);
  assert.equal(listed.length, 3);
  assert.equal(listed[0]?.id, legacySlot);
  assert.equal(listed.find((s) => s.id === broken)?.damaged, true);
  assert.equal(listed.find((s) => s.id === healthy)?.damaged, false);
  const saved = readRun(db.getItem(base), null);
  assert.deepEqual(saved.moves[0]?.move, close.move);
  assert.throws(() => forkRun(db, release, legacySlot, 2), /checkpoint/);
  saveRun(db, base, db.getItem(base), {
    moves: saved.moves,
    opponent: null,
    timeline: runTimeline(release, [{ closingCash: 1488, day: 1, endDay: 2 }], false),
  });
  const branch = forkRun(db, release, legacySlot, 2);
  assert.deepEqual(readRun(db.getItem(runKey(release, branch)), null).moves, saved.moves);
});
