import type { Entry } from "games-common/benchmark";

import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import test from "node:test";

import { priceOrder, timing } from "../src/game/commands.ts";
import { observation } from "../src/game/reports.ts";
import { readRun, saveRun } from "../src/game/runs.ts";

await test("a replay retains its pre-run opponent even after setting a better record", () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => entries.set(k, v),
  };
  const original = { score: 2400, values: [1500, 2400] };
  const move: Entry = { line: "close", move: ["wait_for_next_day", {}] };
  const written = saveRun(storage, "run", null, [move], original);
  assert.deepEqual(readRun(written, { score: 3000, values: [1500, 3000] }).opponent, original);
  assert.throws(() => saveRun(storage, "run", null, [], null), /changed/);
  assert.equal(storage.getItem("run"), written);
  assert.deepEqual(
    assertValue(readRun(JSON.stringify([move.move]), original).moves[0]).move,
    move.move,
  );
});

await test("an order estimate uses only a matching, unexpired observed quantity", () => {
  const reports = [
    {
      id: 1,
      tool: "check_offers",
      args: { supplier_id: "supplier" },
      terms: { until: 7, minimum: 25, quantity: 10 },
      rows: [["item", 1.5, "0%"]],
    },
  ];
  const actions = { order_goods: [] },
    state = { day: 2, cash: 35 };
  assert.deepEqual(priceOrder("order supplier item 10", state, actions, reports), {
    cost: 15,
    minimum: 25,
    remaining: 20,
    status: "belowMinimum",
  });
  assert.equal(
    assertValue(priceOrder("order supplier item 11", state, actions, reports)).status,
    "needQuote",
  );
  assert.equal(
    assertValue(priceOrder("order supplier item 10", { ...state, day: 8 }, actions, reports))
      .status,
    "expiredQuote",
  );
});

await test("an observation carries overnight notices separately from a paid reply", () => {
  const data = {
    day: 4,
    minute: 990,
    endDay: 5,
    endMinute: 540,
    minutes: 45,
    openingCash: 300,
    closingCash: 288,
    body: "Loaded 4 x Test into slot TEST:SNACK:A1 (4/18).\nSlot TEST:SNACK:A1 has no price set.",
    notices: ["Delivery PO-1001 arrived in storage."],
  };
  const result = observation(
    { ...data, output: [data.body, ...data.notices].join("\n") },
    ["restock_machine", { slot: "TEST:SNACK:A1" }],
    8,
  );
  assert.equal(assertValue(result.slots["TEST:SNACK:A1"]).qty, 4);
  assert.match(result.display, /no price set/);
  assert.doesNotMatch(result.display, /Delivery/);
  assert.deepEqual(result.notices, data.notices);
  assert.deepEqual(
    timing("refill", { minute: 990, closes: 1020, opens: 540, costs: { restock_machine: 45 } }),
    { minutes: 45, rolls: true, from: 990, to: 540 },
  );
});
