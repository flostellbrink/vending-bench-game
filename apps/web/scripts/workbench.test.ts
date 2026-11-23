import type { Entry } from "games-common/benchmark";

import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import test from "node:test";

import { draftMachine, priceOrder, timing } from "../src/game/commands.ts";
import { largestPaceLoss } from "../src/game/pace.ts";
import { observation } from "../src/game/reports.ts";
import { readRun, saveRun } from "../src/game/runs.ts";
import { projectPlan, remainingPlan, type PlannedCommand } from "../src/game/shift-plan.ts";

await test("pace review uses daily change, not widest absolute gap or unrecorded rival days", () => {
  assert.deepEqual(largestPaceLoss([100, 90, 95, 101, 200], [100, 105, 111, 120]), {
    day: 1,
    player: -10,
    rival: 5,
    difference: -15,
  });
  assert.equal(largestPaceLoss([100, 120], [100]), undefined);
  assert.equal(largestPaceLoss([100, 120], [100, 110]), undefined);
});

await test("a Main Lounge slot does not select the similarly named AI Lounge cabinet", () => {
  const network = ["AI-LOUNGE:SNACK", "MAIN-LOUNGE:SNACK"];
  assert.equal(draftMachine("refill main-lounge.snack.a1 stroopwafel-2pk 18", network), network[1]);
  assert.equal(draftMachine("inspect AI-LOUNGE:SNACK", network), network[0]);
  assert.equal(draftMachine("note reminder main-lounge.snack", network), undefined);
});

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

await test("a 16:00 inspection pushes pricing into tomorrow without executing the plan", () => {
  const state = {
    day: 6,
    days: 30,
    minute: 960,
    opens: 540,
    closes: 1020,
    defaultCost: 5,
    costs: { get_machine_inventory: 25, restock_machine: 45, set_price: 5 },
  };
  const inspect: PlannedCommand = {
    id: 1,
    line: "inspect",
    verb: "inspect",
    move: ["get_machine_inventory", {}],
  };
  const refill: PlannedCommand = {
    id: 2,
    line: "refill lounge.snack.a1 wafer 18",
    verb: "refill",
    move: ["restock_machine", { slot: "AI-LOUNGE:SNACK:A1", product_id: "wafer", quantity: 18 }],
  };
  const price: PlannedCommand = {
    id: 3,
    line: "price lounge.snack.a1 1.50",
    verb: "price",
    move: ["set_price", { slot: "AI-LOUNGE:SNACK:A1", price: 1.5 }],
  };
  const direct = projectPlan([refill, price], state);
  const checked = projectPlan([inspect, refill, price], state);
  assert.equal(direct.at(-1)?.span?.to, 1010);
  assert.equal(checked[1]?.span?.rolls, true);
  assert.equal(checked[2]?.span?.day, 7);
  assert.equal(checked[2]?.span?.from, 540);
  assert.equal(projectPlan([inspect, refill, price], { ...state, day: 30 }).at(-1)?.span, null);
  assert.equal(state.minute, 960);
  const pending = { ...inspect, dispatchedAt: 0 };
  assert.deepEqual(remainingPlan([pending, refill], []), [pending, refill]);
  assert.deepEqual(remainingPlan([pending, refill], [inspect]), [refill]);
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
