import type { Actions, Entry, Move, ReportRow } from "games-common/benchmark";

import { assertValue, hasValue } from "games-common/language";
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
import { noteSnapshot } from "../src/game/note-snapshot.ts";
import { observedProducts } from "../src/game/observed-products.ts";
import { orderEntry } from "../src/game/order-entry.ts";
import { largestPaceLoss } from "../src/game/pace.ts";
import { enterReadout } from "../src/game/readout-path.ts";
import { shouldOpenReceipt } from "../src/game/receipt-routing.ts";
import { displayCell, knownOrders, observation, weatherObservations } from "../src/game/reports.ts";
import { readRun, saveRun } from "../src/game/runs.ts";
import { salesRange } from "../src/game/sales-range.ts";
import { projectPlan, remainingPlan, type PlannedCommand } from "../src/game/shift-plan.ts";
import { cabinetLayout } from "../src/scene/cabinet-layout.ts";

/** @risk impact=2 likelihood=2 */
await test("a day change opens a statement regardless of the action's normal destination", () => {
  for (const destination of ["console", "inline", "dialog"] as const) {
    assert.equal(shouldOpenReceipt({ day: 3, endDay: 4 }, destination), true);
    assert.equal(shouldOpenReceipt({ day: 3, endDay: 3 }, destination), destination === "dialog");
  }
});

/** @risk impact=2 likelihood=3 */
await test("receipt drill-down keeps its originating section and history list", () => {
  const mailReceipt = 12;
  const statementReceipt = 7;
  const section = ["mail"];
  const list = enterReadout(section, "past:mail");
  const receipt = enterReadout(list, mailReceipt);
  assert.deepEqual(receipt.slice(0, -1), list);
  assert.deepEqual(enterReadout(receipt, "past:mail"), list);
  assert.deepEqual(enterReadout(receipt, "sales"), ["sales"]);
  assert.deepEqual(enterReadout(section, "machine:A", true), ["mail", "machine:A"]);
  const searchResult = enterReadout(["suppliers"], 5);
  assert.deepEqual(enterReadout(searchResult, "supplier:A", true), ["suppliers", 5, "supplier:A"]);
  assert.deepEqual(enterReadout(searchResult, "supplier:A"), ["supplier:A"]);
  assert.deepEqual(enterReadout(enterReadout(["scores"], "day:3"), statementReceipt), [
    "scores",
    "day:3",
    statementReceipt,
  ]);
});

/** @risk impact=3 likelihood=2 */
await test("a local sales range uses only its observed dates, including days without sales", () => {
  const revenue = { day1: 9.95, day2: 0.1, day4: 0.2 };
  const rangeRevenue = 0.3;
  const rows: ReportRow[] = [
    ["1", "2024-01-01", "clear", "1", revenue.day1],
    ["2", "2024-01-02", "clear", "2", revenue.day2],
    ["3", "2024-01-03", "rain", "0", 0],
    ["4", "2024-01-04", "clear", "1", revenue.day4],
  ];
  assert.deepEqual(salesRange(rows, "2024-01-02", "2024-01-04"), {
    averageRevenue: rangeRevenue / 3,
    averageUnits: 1,
    revenue: rangeRevenue,
    rows: rows.slice(1),
    units: 3,
  });
  assert.equal(rows.length, 4);
});

const actions: Actions = {
  get_machine_inventory: [["machine_id", "str", false]],
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
  wait_for_next_day: [],
  write_note: [
    ["key", "str", true],
    ["text", "str", true],
  ],
};

/** @risk impact=3 likelihood=3 */
await test("a notes read is a snapshot and header-like note text is not a separate note", () => {
  const text = "First line\n\n[not a key] (day 9)\nLast line   \n";
  const write = {
    args: { key: "shift", text },
    body: "Saved note 'shift'.",
    day: 1,
    id: 1,
    tool: "write_note",
  };
  const obsolete = {
    ...write,
    args: { key: "gone", text: "old" },
    body: "Saved note 'gone'.",
    id: 2,
  };
  const deleted = {
    ...obsolete,
    args: { key: "gone", text: "" },
    body: "Deleted note 'gone'.",
    id: 3,
  };
  const read = {
    args: {},
    body: `Your notes:\n\n[shift] (day 1)\n${text}\n`,
    day: 1,
    id: 4,
    tool: "read_notes",
  };
  const edited = { ...write, args: { key: "shift", text: "updated" }, id: 5 };
  const keyed = { ...read, args: { key: "shift" }, body: "[shift] (day 1)\nupdated", id: 6 };
  assert.equal(noteSnapshot([write, keyed]), null);
  assert.deepEqual(noteSnapshot([write, obsolete, deleted, read, edited, keyed]), {
    entries: [{ day: 1, key: "shift", text }],
    read,
  });
  assert.equal(noteSnapshot([obsolete, deleted, read])?.entries, null);
});

/** @risk impact=3 likelihood=2 */
await test("a site sales report can use the benchmark's default time window", () => {
  const state = { machines: ["AI-HOUSE:SNACK", "MAIN-LOUNGE:DRINKS"], slots: [] };
  const prefix = 'get_sales_report {"location":"AI-H';
  assert.deepEqual(completions(prefix, state, actions, []), ['"AI-HOUSE"']);
  const completed = insertCompletion(`${prefix}"}`, prefix.length, '"AI-HOUSE"');
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

/** @risk impact=4 likelihood=2 */
await test("inherited commands can be recalled and submitted with the same arguments", () => {
  const geometry = { machines: ["AI-HOUSE:SNACK"], slots: ["AI-HOUSE:SNACK:A1"] };
  const moves: Move[] = [
    ["list_emails", { folder: "inbox", limit: 20, unread_only: true }],
    ["order_goods", { items: { chocolate: 12, juice: 8 }, supplier_id: "supplier" }],
    ["restock_machine", { product_id: "chocolate", quantity: 12, slot: geometry.slots[0] }],
    [
      "send_email",
      { body: "First line\nNext line", subject: 'A "quote"', to: "vendor@example.test" },
    ],
    ["wait_for_next_day", {}],
  ];
  for (const move of moves) {
    assert.deepEqual(parse(commandForMove(move), actions), move);
  }
});

/** @risk impact=2 likelihood=2 */
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
        cells: [
          { column: 1, slot: "F10" },
          { column: 0, slot: "F2" },
        ],
        name: "F",
      },
      { cells: [{ column: 0, slot: "E2" }], name: "E" },
    ],
  });
  assert.deepEqual(cabinetLayout(slots, "main-lounge.drinks"), { columns: 0, rows: [] });
});

/** @risk impact=4 likelihood=3 */
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
    timing("count_visits", { closes: 1020, costs: {}, defaultCost: 5, minute: 600, opens: 540 })
      ?.minutes,
    5,
  );
});

/** @risk impact=2 likelihood=3 */
await test("a command line lists its arguments in the order of the published parameters", () => {
  const restock = ["slot", "product_id", "quantity"];
  assert.equal(
    commandForMove(
      parse(
        'restock_machine {"quantity":5,"product_id":"water","slot":"AI-LOUNGE:SNACK:A1"}',
        actions,
      ),
      restock,
    ),
    'restock_machine {"slot":"AI-LOUNGE:SNACK:A1","product_id":"water","quantity":5}',
  );
  assert.equal(
    commandForMove(["restock_machine", { extra: true, quantity: 5, slot: "A1" }], restock),
    'restock_machine {"slot":"A1","quantity":5,"extra":true}',
  );
});

/** @risk impact=4 likelihood=2 */
await test("pace review uses daily change, not widest absolute gap or unrecorded rival days", () => {
  const player = { day1: 90, day2: 95, day3: 101, day4: 200 };
  const rival = { day1: 105, day2: 111, day3: 120 };
  const gain = { player: 120, rival: 110 };
  assert.deepEqual(
    largestPaceLoss(
      [100, player.day1, player.day2, player.day3, player.day4],
      [100, rival.day1, rival.day2, rival.day3],
    ),
    { day: 1, difference: -15, player: -10, rival: 5 },
  );
  assert.equal(largestPaceLoss([100, gain.player], [100]), undefined);
  assert.equal(largestPaceLoss([100, gain.player], [100, gain.rival]), undefined);
});

/** @risk impact=2 likelihood=2 */
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

/** @risk impact=4 likelihood=2 */
await test("a replay retains its pre-run opponent even after setting a better record", () => {
  const opening = 1500;
  const previousBest = 2400;
  const newBest = 3000;
  const entries = new Map<string, string>();
  const storage = {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => entries.set(k, v),
  };
  const original = { score: previousBest, values: [opening, previousBest] };
  const move: Entry = { line: "close", move: ["wait_for_next_day", {}] };
  const written = saveRun(storage, "run", null, { moves: [move], opponent: original });
  assert.deepEqual(
    readRun(written, { score: newBest, values: [opening, newBest] }).opponent,
    original,
  );
  assert.throws(() => saveRun(storage, "run", null, { moves: [], opponent: null }), /changed/);
  assert.equal(storage.getItem("run"), written);
  assert.deepEqual(
    assertValue(readRun(JSON.stringify([move.move]), original).moves[0]).move,
    move.move,
  );
});

/** @risk impact=3 likelihood=3 */
await test("a 16:00 inspection pushes pricing into tomorrow without executing the plan", () => {
  const inspectionMinute = 960;
  const state = {
    closes: 1020,
    costs: { get_machine_inventory: 25, restock_machine: 45, set_price: 5 },
    day: 6,
    days: 30,
    defaultCost: 5,
    minute: inspectionMinute,
    opens: 540,
  };
  const inspect: PlannedCommand = {
    id: 1,
    line: "inspect",
    move: ["get_machine_inventory", {}],
    verb: "get_machine_inventory",
  };
  const refill: PlannedCommand = {
    id: 2,
    line: "refill lounge.snack.a1 wafer 18",
    move: ["restock_machine", { product_id: "wafer", quantity: 18, slot: "AI-LOUNGE:SNACK:A1" }],
    verb: "restock_machine",
  };
  const price: PlannedCommand = {
    id: 3,
    line: "price lounge.snack.a1 1.50",
    move: ["set_price", { price: 1.5, slot: "AI-LOUNGE:SNACK:A1" }],
    verb: "set_price",
  };
  const pricedAt = inspectionMinute + state.costs.restock_machine + state.costs.set_price;
  const direct = projectPlan([refill, price], state);
  const checked = projectPlan([inspect, refill, price], state);
  assert.equal(direct.at(-1)?.span?.to, pricedAt);
  assert.equal(checked[1]?.span?.rolls, true);
  assert.equal(checked[2]?.span?.day, state.day + 1);
  assert.equal(checked[2]?.span?.from, state.opens);
  assert.equal(projectPlan([inspect, refill, price], { ...state, day: 30 }).at(-1)?.span, null);
  assert.equal(state.minute, inspectionMinute);
  const pending = { ...inspect, dispatchedAt: 0 };
  assert.deepEqual(remainingPlan([pending, refill], []), [pending, refill]);
  assert.deepEqual(remainingPlan([pending, refill], [inspect]), [refill]);
});

/** @risk impact=3 likelihood=2 */
await test("an order estimate uses only a matching, unexpired observed quantity", () => {
  const supplier = "supplier";
  const unitPrice = 1.5;
  const quotedQuantity = 10;
  const reports = [
    {
      args: { supplier_id: supplier },
      id: 1,
      rows: [["item", unitPrice, "0%"]],
      terms: { minimum: 25, quantity: quotedQuantity, until: 7 },
      tool: "check_offers",
    },
  ];
  const state = { cash: 35, day: 2 };
  const order = (quantity: number) =>
    commandForMove(["order_goods", { items: { item: quantity }, supplier_id: supplier }]);
  assert.deepEqual(priceOrder(order(quotedQuantity), state, reports), {
    cost: 15,
    minimum: 25,
    remaining: 20,
    status: "belowMinimum",
  });
  assert.equal(
    assertValue(priceOrder(order(quotedQuantity + 1), state, reports)).status,
    "needQuote",
  );
  assert.equal(
    assertValue(priceOrder(order(quotedQuantity), { ...state, day: 8 }, reports)).status,
    "expiredQuote",
  );
});

/** @risk impact=4 likelihood=2 */
await test("the order editor submits independent item quantities without requiring a quote", () => {
  const lines = [
    { key: "one", manual: false, product: "catalog item", quantity: "37" },
    { key: "two", manual: true, product: "new-id", quantity: "12" },
    { key: "three", manual: true, product: "", quantity: "" },
  ];
  const command = assertValue(orderEntry("supplier", lines).command);
  assert.deepEqual(parse(command, actions), [
    "order_goods",
    { items: { "catalog item": 37, "new-id": 12 }, supplier_id: "supplier" },
  ]);
  assert.equal(
    orderEntry("supplier", [
      ...lines,
      { key: "four", manual: true, product: "new-id", quantity: "4" },
    ]).error,
    "duplicate",
  );
  assert.equal(
    orderEntry("supplier", [{ key: "five", manual: true, product: "new-id", quantity: "1.5" }])
      .error,
    "incomplete",
  );
  assert.equal(
    orderEntry("supplier", [{ key: "six", manual: true, product: "", quantity: "10" }]).error,
    "incomplete",
  );
});

/** @risk impact=3 likelihood=2 */
await test("product suggestions use returned IDs and dated stock, not unconfirmed command arguments", () => {
  const orderedNuts = 40;
  const base = {
    args: {},
    columns: ["product_id", "price"],
    day: 1,
    id: 1,
    minute: 540,
    rows: [["cola", 1]],
    slots: {},
    tool: "check_offers",
  };
  const found = observedProducts([
    base,
    {
      ...base,
      args: { items: { unconfirmed: 17 } },
      columns: ["product_id", "quantity", "price"],
      id: 2,
      rows: [["nuts", orderedNuts, 2]],
      tool: "order_goods",
    },
    {
      ...base,
      columns: ["product_id", "product", "size", "quantity"],
      day: 2,
      id: 3,
      minute: 590,
      rows: [["cola", "Cola Bottle", "large", "14"]],
      tool: "get_storage_inventory",
    },
    {
      ...base,
      args: { product_id: "invented", slot: "machine:A1" },
      columns: [],
      id: 4,
      rows: [],
      tool: "restock_machine",
    },
  ]);
  assert.deepEqual(found, [
    {
      depot: { day: 2, minute: 590, quantity: 14, receipt: 3 },
      id: "cola",
      name: "Cola Bottle",
      size: "large",
    },
    { id: "nuts" },
  ]);
});

/** @risk impact=3 likelihood=3 */
await test("an observation carries overnight notices separately from a paid reply", () => {
  const restockReceipt = 8;
  const notesReceipt = 9;
  const data = {
    body: "Loaded 4 x Test into slot TEST:SNACK:A1 (4/18).\nSlot TEST:SNACK:A1 has no price set.",
    closingCash: 288,
    day: 4,
    endDay: 5,
    endMinute: 540,
    minute: 990,
    minutes: 45,
    notices: ["Delivery PO-1001 arrived in storage."],
    openingCash: 300,
  };
  const result = observation(
    { ...data, output: [data.body, ...data.notices].join("\n") },
    ["restock_machine", { slot: "TEST:SNACK:A1" }],
    restockReceipt,
  );
  assert.equal(assertValue(result.slots["TEST:SNACK:A1"]).qty, 4);
  assert.match(result.display, /no price set/);
  assert.doesNotMatch(result.display, /Delivery/);
  assert.deepEqual(result.notices, data.notices);
  const copied = observation(
    { ...data, output: data.body },
    ["read_notes", { key: "service-log" }],
    notesReceipt,
  );
  assert.deepEqual(copied.slots, {});
  const rejected = observation(
    {
      ...data,
      body: "No units in storage.",
      notices: [data.body],
      output: `No units in storage.\n${data.body}`,
    },
    ["restock_machine", { slot: "TEST:SNACK:A1" }],
    10,
  );
  assert.deepEqual(rejected.slots, {});
  assert.deepEqual(
    timing("restock_machine", {
      closes: 1020,
      costs: { restock_machine: 45 },
      minute: 990,
      opens: 540,
    }),
    { from: 990, minutes: 45, rolls: true, to: 540 },
  );
});

/** @risk impact=3 likelihood=2 */
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
      body,
      closingCash: 300,
      day: 4,
      endDay: 4,
      endMinute: 565,
      minute: 540,
      minutes: 25,
      notices: [],
      openingCash: 300,
      output: body,
    },
    ["get_storage_inventory", {}],
    1,
  );
  assert.deepEqual(result.batches, {
    "fresh-juice": [
      { expiryDay: 6, quantity: 3 },
      { expiryDay: 8, quantity: 7 },
    ],
    yogurt: [{ expiryDay: 7, quantity: 4 }],
  });
  assert.equal(result.rows.length, 3);
  assert.doesNotMatch(result.display, /batch of/);
});
/** @risk impact=3 likelihood=2 */
await test("only delivery notices update an order, and a short shipment applies to one order", () => {
  const receipt = {
    body: "",
    closingCash: 300,
    day: 4,
    endDay: 4,
    endMinute: 565,
    minute: 540,
    minutes: 25,
    notices: [],
    openingCash: 300,
    output: "",
  };
  const order = (orderId: string, id: number) => ({
    ...observation(receipt, ["order_goods", { supplier_id: "supplier" }], id),
    terms: { eta: 4, order: orderId, paid: 20 },
  });
  const orders = [order("PO-1", 1), order("PO-2", 2)];
  const text = "Delivery PO-2 arrived in storage.";
  const note = observation({ ...receipt, body: text, output: text }, ["read_notes", {}], 3);
  assert.ok(knownOrders([...orders, note]).every((o) => !hasValue(o.arrival)));
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
      ["PO-2", { day: 4, id: 4, short: false }],
      ["PO-1", { day: 4, id: 4, short: true }],
    ],
  );
});
/** @risk impact=2 likelihood=2 */
await test("a sales receipt keeps original evidence and exposes sortable amounts in the selected locale", () => {
  const revenue = { day1: 1100, day2: 95 };
  const body = ["   1 2026-01-05  clear  30  €1,100.00", "   2 2026-01-06  clear  12  €95.00"].join(
    "\n",
  );
  const report = observation(
    {
      body,
      closingCash: 1500,
      day: 3,
      endDay: 3,
      endMinute: 565,
      minute: 540,
      minutes: 25,
      notices: [],
      openingCash: 1500,
      output: body,
    },
    ["get_sales_report", {}],
    1,
  );
  assert.equal(report.output, body);
  assert.deepEqual(
    report.rows.map((row) => row[4]),
    [revenue.day1, revenue.day2],
  );
  for (const locale of ["en", "de", "es"]) {
    const currency = new Intl.NumberFormat(locale, { currency: "EUR", style: "currency" });
    assert.equal(
      displayCell(assertValue(report.rows[0]?.[4]), "revenue", (v) => currency.format(v)),
      currency.format(revenue.day1),
    );
  }
});
/** @risk impact=5 likelihood=2 */
await test("weather and search suggestions do not reveal unobserved benchmark information", () => {
  const receipt = {
    body: "Weather today: rainy",
    closingCash: 1500,
    day: 1,
    endDay: 1,
    endMinute: 570,
    minute: 565,
    minutes: 5,
    notices: [],
    openingCash: 1500,
    output: "Weather today: rainy",
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
