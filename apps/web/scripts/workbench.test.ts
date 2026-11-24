import type { Actions, Entry, Move } from "games-common/benchmark";

import { assertValue } from "games-common/language";
import assert from "node:assert/strict";
import test from "node:test";

import {
  commandForMove,
  completions,
  insertCompletion,
  moveDestination,
  parse,
  priceOrder,
  timing,
} from "../src/game/commands.ts";
import { observedProducts } from "../src/game/observed-products.ts";
import { orderEntry } from "../src/game/order-entry.ts";
import { largestPaceLoss } from "../src/game/pace.ts";
import { enterReadout } from "../src/game/readout-path.ts";
import { displayCell, knownOrders, observation, weatherObservations } from "../src/game/reports.ts";
import { readRun, saveRun } from "../src/game/runs.ts";
import { projectPlan, remainingPlan, type PlannedCommand } from "../src/game/shift-plan.ts";
import { cabinetLayout } from "../src/scene/cabinet-layout.ts";

await test("receipt drill-down keeps its originating section and history list", () => {
  const section = ["mail"];
  const list = enterReadout(section, "past:mail");
  const receipt = enterReadout(list, 12);
  assert.deepEqual(receipt.slice(0, -1), list);
  assert.deepEqual(enterReadout(receipt, "past:mail"), list);
  assert.deepEqual(enterReadout(receipt, "sales"), ["sales"]);
  assert.deepEqual(enterReadout(section, "machine:A", true), ["mail", "machine:A"]);
  assert.deepEqual(enterReadout(enterReadout(["scores"], "day:3"), 7), ["scores", "day:3", 7]);
});

const actions: Actions = {
  get_sales_report: [
    ["days", "int", false],
    ["location", "str", false],
    ["by_product", "bool", false],
  ],
  list_emails: [
    ["folder", "str", false],
    ["unread_only", "bool", false],
    ["limit", "int", false],
  ],
  order_goods: [
    ["supplier_id", "str", true],
    ["items", "dict[str, int]", true],
  ],
  restock_machine: [
    ["slot", "str", true],
    ["product_id", "str", true],
    ["quantity", "int", true],
  ],
  send_email: [
    ["to", "str", true],
    ["subject", "str", true],
    ["body", "str", true],
  ],
  get_machine_inventory: [["machine_id", "str", false]],
  write_note: [
    ["key", "str", true],
    ["text", "str", true],
  ],
  wait_for_next_day: [],
};

await test("a site sales report can use the benchmark's default time window", () => {
  const state = { machines: ["AI-HOUSE:SNACK", "MAIN-LOUNGE:DRINKS"], slots: [] };
  const prefix = 'get_sales_report {"location":"AI-H';
  assert.deepEqual(completions(prefix, state, actions, []), ['"AI-HOUSE"']);
  const completed = insertCompletion(prefix + '"}', prefix.length, '"AI-HOUSE"');
  assert.equal(completed.line, 'get_sales_report {"location":"AI-HOUSE"}');
  assert.deepEqual(parse('get_sales_report {"by_product":true,"location":"AI-HOUSE"}', actions), [
    "get_sales_report",
    { by_product: true, location: "AI-HOUSE" },
  ]);
  assert.deepEqual(parse('get_sales_report {"days":3,"location":"MAIN-LOUNGE"}', actions), [
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
    assert.deepEqual(parse(commandForMove(move), actions), move);
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

await test("console calls accept only published tool names and parameter names", () => {
  assert.throws(() => parse("inbox", actions));
  assert.throws(() => parse("tabs", actions));
  assert.throws(() => parse('list_emails {"unread":true}', actions));
  assert.throws(() => parse('list_emails {"limit":2.5}', actions));
  assert.throws(() => parse('send_email {"to":"mail@example.test"}', actions));
  assert.deepEqual(parse("get_machine_inventory {}", actions), ["get_machine_inventory", {}]);
  const updated: Actions = { count_visits: [["visits", "int", true]] };
  assert.deepEqual(parse('count_visits {"visits":3}', updated), ["count_visits", { visits: 3 }]);
  assert.throws(() => parse('count_visits {"visits":"3"}', updated));
  assert.throws(() => parse('count_visits {"visits":3,"other":true}', updated));
  assert.equal(
    timing("count_visits", { opens: 540, closes: 1020, minute: 600, defaultCost: 5, costs: {} })
      ?.minutes,
    5,
  );
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
  assert.equal(
    moveDestination(
      parse(
        'restock_machine {"slot":"MAIN-LOUNGE:SNACK:A1","product_id":"stroopwafel-2pk","quantity":18}',
        actions,
      ),
    ),
    "machine:MAIN-LOUNGE:SNACK",
  );
  assert.equal(
    moveDestination(parse('get_machine_inventory {"machine_id":"AI-LOUNGE:SNACK"}', actions)),
    "machine:AI-LOUNGE:SNACK",
  );
  assert.equal(
    moveDestination(parse('write_note {"key":"reminder","text":"MAIN-LOUNGE:SNACK"}', actions)),
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
    verb: "get_machine_inventory",
    move: ["get_machine_inventory", {}],
  };
  const refill: PlannedCommand = {
    id: 2,
    line: "refill lounge.snack.a1 wafer 18",
    verb: "restock_machine",
    move: ["restock_machine", { slot: "AI-LOUNGE:SNACK:A1", product_id: "wafer", quantity: 18 }],
  };
  const price: PlannedCommand = {
    id: 3,
    line: "price lounge.snack.a1 1.50",
    verb: "set_price",
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
  const supplier = "supplier";
  const reports = [
    {
      id: 1,
      tool: "check_offers",
      args: { supplier_id: supplier },
      terms: { until: 7, minimum: 25, quantity: 10 },
      rows: [["item", 1.5, "0%"]],
    },
  ];
  const state = { day: 2, cash: 35 };
  const order = (quantity: number) =>
    commandForMove(["order_goods", { supplier_id: supplier, items: { item: quantity } }]);
  assert.deepEqual(priceOrder(order(10), state, reports), {
    cost: 15,
    minimum: 25,
    remaining: 20,
    status: "belowMinimum",
  });
  assert.equal(assertValue(priceOrder(order(11), state, reports)).status, "needQuote");
  assert.equal(
    assertValue(priceOrder(order(10), { ...state, day: 8 }, reports)).status,
    "expiredQuote",
  );
});

await test("the order editor submits independent item quantities without requiring a quote", () => {
  const lines = [
    { key: "one", product: "catalog item", quantity: "37", manual: false },
    { key: "two", product: "new-id", quantity: "12", manual: true },
    { key: "three", product: "", quantity: "", manual: true },
  ];
  const command = assertValue(orderEntry("supplier", lines).command);
  assert.deepEqual(parse(command, actions), [
    "order_goods",
    { supplier_id: "supplier", items: { "catalog item": 37, "new-id": 12 } },
  ]);
  assert.equal(
    orderEntry("supplier", [
      ...lines,
      { key: "four", product: "new-id", quantity: "4", manual: true },
    ]).error,
    "duplicate",
  );
  assert.equal(
    orderEntry("supplier", [{ key: "five", product: "new-id", quantity: "1.5", manual: true }])
      .error,
    "incomplete",
  );
  assert.equal(
    orderEntry("supplier", [{ key: "six", product: "", quantity: "10", manual: true }]).error,
    "incomplete",
  );
});

await test("product suggestions use returned IDs and dated stock, not unconfirmed command arguments", () => {
  const base = {
    id: 1,
    day: 1,
    minute: 540,
    tool: "check_offers",
    columns: ["product_id", "price"],
    rows: [["cola", 1]],
    slots: {},
    args: {},
  };
  const found = observedProducts([
    base,
    {
      ...base,
      id: 2,
      tool: "order_goods",
      columns: ["product_id", "quantity", "price"],
      rows: [["nuts", 40, 2]],
      args: { items: { unconfirmed: 17 } },
    },
    {
      ...base,
      id: 3,
      day: 2,
      minute: 590,
      tool: "get_storage_inventory",
      columns: ["product_id", "product", "size", "quantity"],
      rows: [["cola", "Cola Bottle", "large", "14"]],
    },
    {
      ...base,
      id: 4,
      tool: "restock_machine",
      columns: [],
      rows: [],
      args: { product_id: "invented", slot: "machine:A1" },
    },
  ]);
  assert.deepEqual(found, [
    {
      id: "cola",
      name: "Cola Bottle",
      size: "large",
      depot: { quantity: 14, day: 2, minute: 590, receipt: 3 },
    },
    { id: "nuts" },
  ]);
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
  const copied = observation(
    { ...data, output: data.body },
    ["read_notes", { key: "service-log" }],
    9,
  );
  assert.deepEqual(copied.slots, {});
  const rejected = observation(
    {
      ...data,
      body: "No units in storage.",
      output: "No units in storage.\n" + data.body,
      notices: [data.body],
    },
    ["restock_machine", { slot: "TEST:SNACK:A1" }],
    10,
  );
  assert.deepEqual(rejected.slots, {});
  assert.deepEqual(
    timing("restock_machine", {
      minute: 990,
      closes: 1020,
      opens: 540,
      costs: { restock_machine: 45 },
    }),
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
await test("a sales receipt keeps original evidence and exposes sortable amounts in the selected locale", () => {
  const body = ["   1 2026-01-05  clear  30  €1,100.00", "   2 2026-01-06  clear  12  €95.00"].join(
    "\n",
  );
  const report = observation(
    {
      day: 3,
      endDay: 3,
      minute: 540,
      endMinute: 565,
      minutes: 25,
      openingCash: 1500,
      closingCash: 1500,
      body,
      output: body,
      notices: [],
    },
    ["get_sales_report", {}],
    1,
  );
  assert.equal(report.output, body);
  assert.deepEqual(
    report.rows.map((row) => row[4]),
    [1100, 95],
  );
  for (const locale of ["en", "de", "es"]) {
    const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
    assert.equal(
      displayCell(assertValue(report.rows[0]?.[4]), "revenue", (v) => currency.format(v)),
      currency.format(1100),
    );
  }
});
await test("weather and search suggestions do not reveal unobserved benchmark information", () => {
  const receipt = {
    day: 1,
    minute: 565,
    endDay: 1,
    endMinute: 570,
    minutes: 5,
    openingCash: 1500,
    closingCash: 1500,
    output: "Weather today: rainy",
    body: "Weather today: rainy",
    notices: [],
  };
  const note = observation(receipt, ["read_notes", {}], 1);
  const status = observation(receipt, ["get_status", {}], 2);
  const closing = observation(
    {
      ...receipt,
      endDay: 2,
      endMinute: 540,
      notices: [
        "--- Day 2, Tuesday 06 January 2026. Weather: clear. Balance €1,488.00. 1 unread email(s).",
      ],
    },
    ["wait_for_next_day", {}],
    3,
  );
  assert.equal(weatherObservations([note]).size, 0);
  assert.deepEqual(
    [...weatherObservations([note, status, closing])],
    [
      [1, { minute: 565, weather: "rainy" }],
      [2, { minute: 540, weather: "clear" }],
    ],
  );
  assert.deepEqual(
    completions(
      'search_web {"query":"',
      { machines: [], slots: [] },
      { search_web: [["query", "str", true]] },
      [],
    ),
    [],
  );
});
