import type { Entry, Move } from "games-common/benchmark";

import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import test from "node:test";

import { commandWords, quotedWord } from "../src/game/command-words.ts";
import {
  commandForMove,
  completions,
  moveDestination,
  parse,
  priceOrder,
  timing,
} from "../src/game/commands.ts";
import { largestPaceLoss } from "../src/game/pace.ts";
import { knownOrders, observation } from "../src/game/reports.ts";
import { readRun, saveRun } from "../src/game/runs.ts";
import { projectPlan, remainingPlan, type PlannedCommand } from "../src/game/shift-plan.ts";
import { cabinetLayout } from "../src/scene/cabinet-layout.ts";

await test("a site sales report can use the benchmark's default time window", () => {
  const state = { machines: ["AI-HOUSE:SNACK", "MAIN-LOUNGE:DRINKS"], slots: [] };
  const actions = { get_sales_report: [] };
  assert.deepEqual(completions("sales --by-product ho", state, actions, []), ["house"]);
  assert.deepEqual(parse("sales --by-product house", state, actions), [
    "get_sales_report",
    { by_product: true, location: "AI-HOUSE" },
  ]);
  assert.deepEqual(parse("sales 3 main-lounge", state, actions), [
    "get_sales_report",
    { days: 3, location: "MAIN-LOUNGE" },
  ]);
});

await test("inherited commands can be recalled and submitted with the same arguments", () => {
  const geometry = { machines: ["AI-HOUSE:SNACK"], slots: ["AI-HOUSE:SNACK:A1"] };
  const moves: Move[] = [
    ["list_emails", { folder: "inbox", unread_only: true, limit: 20 }],
    ["order_goods", { supplier_id: "supplier", items: { chocolate: 12, juice: 8 } }],
    ["restock_machine", { slot: geometry.slots[0], product_id: "chocolate", quantity: 12 }],
    [
      "send_email",
      { to: "vendor@example.test", subject: 'A "quote"', body: "First line\nNext line" },
    ],
    ["wait_for_next_day", {}],
  ];
  for (const move of moves) {
    assert.deepEqual(parse(commandForMove(move), geometry, { [move[0]]: [] }), move);
  }
});

await test("a cabinet draws only its declared cells on uneven shelves", () => {
  const slots = [
    "AI-HOUSE:SNACK:F10",
    "AI-HOUSE:SNACK:F2",
    "AI-HOUSE:SNACK:E2",
    "AI-HOUSE:SNACK:F10",
    "AI-HOUSE:DRINKS:A1",
    "AI-LOUNGE:SNACK:A3",
  ];
  assert.deepEqual(cabinetLayout(slots, "house.snack"), {
    columns: 2,
    rows: [
      {
        name: "F",
        cells: [
          { slot: "F10", column: 1 },
          { slot: "F2", column: 0 },
        ],
      },
      { name: "E", cells: [{ slot: "E2", column: 0 }] },
    ],
  });
  assert.deepEqual(cabinetLayout(slots, "main-lounge.drinks"), { columns: 0, rows: [] });
});

await test("a letter draft preserves quoted subjects, newlines and literal backslashes", () => {
  const subject = 'Re: the "small" pack',
    body = "Can you quote the 2-pack?\nReference: A\\B.";
  assert.deepEqual(
    commandWords("mail supplier@example.test " + quotedWord(subject) + " " + quotedWord(body)),
    ["mail", "supplier@example.test", subject, body],
  );
  assert.deepEqual(commandWords('note stock ""'), ["note", "stock", ""]);
  assert.throws(() => commandWords('mail supplier@example.test "unfinished'), /help/);
});

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
  const network = {
    machines: ["AI-LOUNGE:SNACK", "MAIN-LOUNGE:SNACK"],
    slots: ["MAIN-LOUNGE:SNACK:A1"],
  };
  const actions = { restock_machine: [], get_machine_inventory: [], write_note: [] };
  assert.equal(
    moveDestination(parse("refill main-lounge.snack.a1 stroopwafel-2pk 18", network, actions)),
    "machine:MAIN-LOUNGE:SNACK",
  );
  assert.equal(
    moveDestination(parse("inspect AI-LOUNGE:SNACK", network, actions)),
    "machine:AI-LOUNGE:SNACK",
  );
  assert.equal(
    moveDestination(parse("note reminder main-lounge.snack", network, actions)),
    undefined,
  );
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

await test("a depot receipt keeps each expiry with its product and leaves undated goods unmarked", () => {
  const body = [
    "fresh-juice  Fresh juice  large  10  €1.10",
    "    batch of 3 expires day 6",
    "    batch of 7 expires day 8",
    "water  Water  large  20  €0.45",
    "yogurt  Yogurt  small  4  €0.90",
    "    batch of 4 expires day 7",
  ].join("\n");
  const result = observation(
    {
      day: 4,
      endDay: 4,
      minute: 540,
      endMinute: 565,
      minutes: 25,
      openingCash: 300,
      closingCash: 300,
      body,
      output: body,
      notices: [],
    },
    ["get_storage_inventory", {}],
    1,
  );
  assert.deepEqual(result.batches, {
    "fresh-juice": [
      { quantity: 3, expiryDay: 6 },
      { quantity: 7, expiryDay: 8 },
    ],
    yogurt: [{ quantity: 4, expiryDay: 7 }],
  });
  assert.equal(result.rows.length, 3);
  assert.doesNotMatch(result.display, /batch of/);
});
await test("only delivery notices update an order, and a short shipment applies to one order", () => {
  const receipt = {
    day: 4,
    endDay: 4,
    minute: 540,
    endMinute: 565,
    minutes: 25,
    openingCash: 300,
    closingCash: 300,
    body: "",
    output: "",
    notices: [],
  };
  const order = (orderId: string, id: number) => ({
    ...observation(receipt, ["order_goods", { supplier_id: "supplier" }], id),
    terms: { order: orderId, paid: 20, eta: 4 },
  });
  const orders = [order("PO-1", 1), order("PO-2", 2)];
  const text = "Delivery PO-2 arrived in storage.";
  const note = observation({ ...receipt, body: text, output: text }, ["read_notes", {}], 3);
  assert.ok(knownOrders([...orders, note]).every((o) => o.arrival === null));
  const notices = [
    "Delivery PO-1 from Supplier arrived short.",
    "Delivery PO-1 arrived in storage.",
    text,
  ];
  const close = observation(
    { ...receipt, endDay: 5, notices, output: notices.join("\n") },
    ["wait_for_next_day", {}],
    4,
  );
  const delivered = knownOrders([...orders, close, note]);
  assert.deepEqual(
    delivered.map((o) => [o.order, o.arrival]),
    [
      ["PO-2", { id: 4, day: 4, short: false }],
      ["PO-1", { id: 4, day: 4, short: true }],
    ],
  );
});
