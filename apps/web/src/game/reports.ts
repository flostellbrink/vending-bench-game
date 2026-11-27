import {
  campaignsSchema,
  type Campaigns,
  type DirectoryEntry,
  type KnownOrder,
  type Mail,
  type Move,
  type OrderTerms,
  type QuoteTerms,
  type Receipt,
  type Report,
  type ReportRow,
  type SlotObservation,
} from "games-common/benchmark";
import { entries, fromEntries, hasValue, type Optional } from "games-common/language";
import * as v from "valibot";

const quoteSchema = v.object({
  minimum_order: v.number(),
  offers: v.record(v.string(), v.object({ discount: v.number(), unit_price: v.number() })),
  quantity_per_product: v.number(),
  valid_through_day: v.number(),
});
const orderSchema = v.object({
  amount: v.optional(v.number()),
  delivery_day: v.number(),
  lines: v.array(
    v.object({ product_id: v.string(), quantity: v.number(), unit_price: v.number() }),
  ),
  order_id: v.string(),
  paid: v.number(),
});
const refusalSchema = v.object({ error: v.string() });
function capture(match: RegExpMatchArray, name: string): string {
  const value = match.groups?.[name];
  if (!hasValue(value)) {
    throw new Error("Incomplete simulator report");
  }
  return value;
}

function monetaryValue(text: string): number | string {
  const amount = /^[^\d.,-]*(?<amount>-?\d[\d,]*\.\d{2})$/.exec(text)?.groups?.amount;
  return hasValue(amount) ? Number(amount.replaceAll(",", "")) : text;
}

/** A table row from a match whose group names are the column names. */
function tableRow(match: RegExpMatchArray, columns: string[], moneyColumn: string): ReportRow {
  return columns.map((column) =>
    column === moneyColumn ? monetaryValue(capture(match, column)) : capture(match, column),
  );
}

export function displayCell(
  value: number | string,
  column: Optional<string>,
  money: (n: number) => string,
) {
  return typeof value === "number" &&
    (column === "price" || column === "revenue" || column === "averageCost")
    ? money(value)
    : value;
}

interface Reading {
  move: Move;
  output: string;
  body: string;
  lines: string[];
  rendered: Set<string>;
  suppliers: string[];
  products: string[];
  columns: string[];
  rows: ReportRow[];
  batches: Map<string, NonNullable<Report["batches"]>[string]>;
  terms: Optional<QuoteTerms | OrderTerms>;
  slots: Record<string, SlotObservation>;
  channels: Optional<Campaigns>;
  mail: Optional<Mail>;
  directory: DirectoryEntry[];
}

function omit(reading: Reading, pattern: RegExp) {
  for (const line of reading.lines) {
    if (pattern.test(line)) {
      reading.rendered.add(line);
    }
  }
}

function readMachineInventory(reading: Reading) {
  reading.columns = ["slot", "size", "product", "quantity", "capacity", "price"];
  for (const line of reading.lines) {
    const m =
      /^(?<slot>\S+:\w\d+)\s+(?<size>\w+)\s+(?<product>.+?)\s{2,}(?<quantity>\d+)\s+(?<capacity>\d+)\s+(?<price>.+)$/.exec(
        line,
      );
    if (m) {
      reading.rows.push(tableRow(m, reading.columns, "price"));
      reading.rendered.add(line);
      reading.slots[capture(m, "slot")] = {
        capacity: Number(capture(m, "capacity")),
        item: capture(m, "product"),
        qty: Number(capture(m, "quantity")),
      };
    }
  }
  omit(reading, /^slot\s+takes\s+product|^Prosus Vending Bench —/);
}

function readStorageInventory(reading: Reading) {
  reading.columns = ["product_id", "product", "size", "quantity", "averageCost"];
  let product: Optional<string> = undefined;
  for (const line of reading.lines) {
    const m =
      /^(?<product_id>\S+)\s{2,}(?<product>.+?)\s{2,}(?<size>\S+)\s+(?<quantity>\d+)\s+(?<averageCost>\S*[\d.,]+)\s*$/.exec(
        line,
      );
    const batch = /^\s+batch of (?<quantity>\d+) expires day (?<day>\d+)\s*$/.exec(line);
    if (m) {
      reading.rows.push(tableRow(m, reading.columns, "averageCost"));
      product = capture(m, "product_id");
      reading.products.push(product);
      reading.rendered.add(line);
    } else if (product && batch) {
      const lots = reading.batches.get(product) ?? [];
      lots.push({
        expiryDay: Number(capture(batch, "day")),
        quantity: Number(capture(batch, "quantity")),
      });
      reading.batches.set(product, lots);
      reading.rendered.add(line);
    } else {
      product = undefined;
    }
  }
  omit(reading, /^product_id\s+name\s+size/);
}

function readEmailList(reading: Reading) {
  reading.columns = ["email_id", "day", "sender", "subject"];
  for (const m of reading.output.matchAll(
    /^[ *] (?<id>\S+) {2}day\s+(?<day>\d+) {2}(?<sender>.{28}) (?<subject>.+)$/gm,
  )) {
    reading.rows.push([
      capture(m, "id"),
      capture(m, "day"),
      capture(m, "sender").trim(),
      capture(m, "subject"),
    ]);
    reading.rendered.add(m[0]);
  }
  omit(reading, /^Use read_email|^(?:inbox|sent) \(\d+ shown,/);
}

function readEmail(reading: Reading) {
  const { body } = reading;
  const headers =
    /^From:\s+(?<from>.+)\nTo:\s+(?<to>.+)\nDay:\s+(?<day>\d+)\nSubject: (?<subject>.+)\n\n/.exec(
      body,
    );
  if (headers) {
    reading.mail = {
      body: body.slice(headers[0].length),
      day: capture(headers, "day"),
      from: capture(headers, "from"),
      subject: capture(headers, "subject"),
      to: capture(headers, "to"),
    };
  }
}

function readOffers(reading: Reading) {
  const json = reading.output.split("\n")[0] ?? "";
  if (!json.startsWith("{") || v.is(refusalSchema, JSON.parse(json))) {
    return;
  }
  const quote = v.parse(quoteSchema, JSON.parse(json));
  reading.rendered.add(json);
  reading.terms = {
    minimum: quote.minimum_order,
    quantity: quote.quantity_per_product,
    until: quote.valid_through_day,
  };
  reading.columns = ["product_id", "price", "discount"];
  for (const [product, offer] of entries(quote.offers)) {
    reading.products.push(product);
    reading.rows.push([product, offer.unit_price, `${Math.round(100 * offer.discount)}%`]);
  }
}

function readDirectory(reading: Reading) {
  for (const block of reading.body.split(/\n\s*\n/)) {
    const m =
      /^(?<name>[^\n]+)\n\s+Supplier ID: (?<id>\S+)\n(?<description>[\s\S]+?)\n\s+Contact: (?<email>\S+)\n\s+Minimum order: (?<minimum>[^\n]+)$/.exec(
        block,
      );
    if (!m) {
      continue;
    }
    reading.directory.push({
      description: capture(m, "description").trim(),
      email: capture(m, "email"),
      id: capture(m, "id"),
      minimum: capture(m, "minimum"),
      name: capture(m, "name"),
    });
    for (const line of block.split("\n")) {
      reading.rendered.add(line);
    }
  }
  omit(reading, /^Results for ".+":$/);
}

function readOrder(reading: Reading) {
  const result = v.safeParse(orderSchema, JSON.parse(reading.lines[0] ?? "null"));
  if (!result.success) {
    return;
  }
  const order = result.output;
  reading.rendered.add(reading.lines[0] ?? "");
  reading.columns = ["product_id", "quantity", "price"];
  for (const item of order.lines) {
    reading.rows.push([item.product_id, item.quantity, item.unit_price]);
  }
  reading.terms = { eta: order.delivery_day, order: order.order_id, paid: order.paid };
}

function readSales(reading: Reading) {
  const byProduct = reading.move[1].by_product;
  reading.columns = byProduct
    ? ["product", "units", "revenue"]
    : ["day", "date", "weather", "units", "revenue"];
  const pattern = byProduct
    ? /^(?<product>.+?)\s{2,}(?<units>\d+)\s+(?<revenue>€[\d.,]+)\s*$/
    : /^\s*(?<day>\d+)\s+(?<date>\d{4}-\d{2}-\d{2})\s+(?<weather>\w+)\s+(?<units>\d+)\s+(?<revenue>€[\d.,]+)\s*$/;
  for (const line of reading.lines) {
    const m = pattern.exec(line);
    if (m) {
      reading.rows.push(tableRow(m, reading.columns, "revenue"));
      reading.rendered.add(line);
    }
  }
  omit(reading, /^\s*day\s+date\s+weather|^\s*product\s+units\s+revenue/);
}

function readMarketing(reading: Reading) {
  const [first] = reading.lines;
  if (!first?.startsWith("{")) {
    return;
  }
  const result = v.safeParse(campaignsSchema, JSON.parse(first));
  if (result.success) {
    reading.channels = result.output;
    reading.rendered.add(first);
  }
}

function readReport(reading: Reading) {
  const [tool] = reading.move;
  if (tool === "get_machine_inventory") {
    readMachineInventory(reading);
  } else if (tool === "get_storage_inventory") {
    readStorageInventory(reading);
  } else if (tool === "list_emails") {
    readEmailList(reading);
  } else if (tool === "read_email") {
    readEmail(reading);
  } else if (tool === "check_offers") {
    readOffers(reading);
  } else if (reading.suppliers.length) {
    readDirectory(reading);
  } else if (["order_goods", "send_email"].includes(tool) && reading.output.startsWith("{")) {
    readOrder(reading);
  } else if (tool === "get_sales_report") {
    readSales(reading);
  } else if (tool === "get_marketing_report") {
    readMarketing(reading);
  }
}

function readSlotChange(reading: Reading) {
  const [tool, args] = reading.move;
  if (tool === "restock_machine" || tool === "swap_item") {
    const loaded =
      /^Loaded \d+ x (?<item>.+?) into slot (?<slot>\S+) \((?<qty>\d+)\/(?<capacity>\d+)\)/m.exec(
        reading.body,
      );
    if (loaded) {
      reading.slots[capture(loaded, "slot")] = {
        capacity: Number(capture(loaded, "capacity")),
        item: capture(loaded, "item"),
        qty: Number(capture(loaded, "qty")),
      };
    }
  }
  if (tool === "clear_slot" && args.slot && /was already empty\.|to storage\./.test(reading.body)) {
    reading.slots[args.slot] = { capacity: null, item: null, qty: 0 };
  }
}

function remainingText({ lines, rendered, output }: Reading) {
  if (output.startsWith("{")) {
    const refusal = v.safeParse(refusalSchema, JSON.parse(lines[0] ?? "null"));
    if (refusal.success) {
      return [refusal.output.error, ...lines.slice(1)].join("\n").trim();
    }
  }
  return lines
    .filter((l) => !rendered.has(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function observation(
  receipt: Receipt,
  move: Move,
  id: number,
  commandLine = move[0],
): Report {
  const { output } = receipt;
  const body = (
    receipt.body ?? output.replace(/\n*\[Day \d+\/\d+ — [^\n]+\](?:\n[\s\S]*)?$/, "")
  ).trimEnd();
  const reading: Reading = {
    batches: new Map(),
    body,
    channels: null,
    columns: [],
    directory: [],
    lines: body.split("\n"),
    mail: null,
    move,
    output,
    products: [],
    rendered: new Set(),
    rows: [],
    slots: {},
    suppliers: [...output.matchAll(/Supplier ID: (?<id>[\w-]+)/g)].map((m) => capture(m, "id")),
    terms: null,
  };
  readReport(reading);
  readSlotChange(reading);
  const { batches, channels, columns, directory, mail, products, rows, slots, suppliers, terms } =
    reading;
  return {
    ...receipt,
    args: move[1],
    batches: batches.size ? fromEntries(batches) : undefined,
    channels,
    columns,
    directory,
    display: remainingText(reading),
    id,
    line: commandLine,
    mail,
    products,
    rows,
    slots,
    suppliers,
    terms,
    tool: move[0],
  };
}

export function knownOrders(reports: Report[]): KnownOrder[] {
  const orders = new Map<string, KnownOrder>();
  for (const report of reports) {
    const { terms } = report;
    if (terms?.order) {
      orders.set(terms.order, {
        ...terms,
        arrival: null,
        id: report.id,
        supplier: report.args.supplier_id ?? report.args.to ?? "",
      });
    }
    for (const notice of report.notices) {
      const match = /^Delivery (?<order>\S+) arrived in storage\.$/.exec(notice);
      if (!match) {
        continue;
      }
      const order = orders.get(capture(match, "order"));
      if (order && !order.arrival) {
        order.arrival = {
          day: report.day,
          id: report.id,
          short: report.notices.some(
            (n) => n.startsWith(`Delivery ${order.order} from `) && n.endsWith(" arrived short."),
          ),
        };
      }
    }
  }
  return [...orders.values()].toReversed();
}

export function weatherObservations(reports: readonly Report[]) {
  const days = new Map<number, { minute: number; weather: string }>();
  for (const r of reports) {
    if (r.tool === "get_status" && !days.has(r.day)) {
      const weather = /^Weather today: (?<weather>[^\n]+)$/m.exec(r.body ?? r.output)?.groups
        ?.weather;
      if (weather) {
        days.set(r.day, { minute: r.minute, weather });
      }
    }
    if (r.endDay === r.day) {
      continue;
    }
    for (const notice of r.notices) {
      const groups = /^--- Day (?<day>\d+), [^\n]+?\. Weather: (?<weather>[^.]+)\./.exec(
        notice,
      )?.groups;
      if (groups?.weather && Number(groups.day) === r.endDay) {
        days.set(r.endDay, { minute: r.endMinute, weather: groups.weather });
      }
    }
  }
  return days;
}
