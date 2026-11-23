import assert from "node:assert/strict";
import test from "node:test";
import { readRun, saveRun } from "../web/runs.js";
import { priceOrder, timing } from "../web/commands.js";
import { observation } from "../web/reports.js";

test("a replay retains its pre-run opponent even after setting a better record", () => {
  const entries = new Map();
  const storage = { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  const original = { score: 2400, values: [1500, 2400] };
  const move = { line: "close", move: ["wait_for_next_day", {}] };
  const written = saveRun(storage, "run", null, [move], original);
  assert.deepEqual(readRun(written, { score: 3000, values: [1500, 3000] }).opponent, original);
  assert.throws(() => saveRun(storage, "run", null, [], null), /changed/);
  assert.equal(storage.getItem("run"), written);
  assert.deepEqual(readRun(JSON.stringify([move.move]), original).moves[0].move, move.move);
});

test("an order estimate uses only a matching, unexpired observed quantity", () => {
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
  assert.equal(priceOrder("order supplier item 11", state, actions, reports).status, "needQuote");
  assert.equal(
    priceOrder("order supplier item 10", { ...state, day: 8 }, actions, reports).status,
    "expiredQuote",
  );
});

test("an observation carries overnight notices separately from a paid reply", () => {
  const data = {
    day: 4,
    minute: 990,
    endDay: 5,
    endMinute: 540,
    minutes: 45,
    body: "Loaded 4 x Test into slot TEST:SNACK:A1 (4/18).\nSlot TEST:SNACK:A1 has no price set.",
    notices: ["Delivery PO-1001 arrived in storage."],
  };
  const result = observation(
    { ...data, output: [data.body, ...data.notices].join("\n") },
    ["restock_machine", { slot: "TEST:SNACK:A1" }],
    8,
  );
  assert.equal(result.slots["TEST:SNACK:A1"].qty, 4);
  assert.match(result.display, /no price set/);
  assert.doesNotMatch(result.display, /Delivery/);
  assert.deepEqual(result.notices, data.notices);
  assert.deepEqual(
    timing("refill", { minute: 990, closes: 1020, opens: 540, costs: { restock_machine: 45 } }),
    { minutes: 45, rolls: true, from: 990, to: 540 },
  );
});
