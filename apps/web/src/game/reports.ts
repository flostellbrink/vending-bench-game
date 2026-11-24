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
import * as v from "valibot";

import { operatorText } from "./commands.ts";

const quoteSchema = v.object({
  minimum_order: v.number(),
  quantity_per_product: v.number(),
  valid_through_day: v.number(),
  offers: v.record(v.string(), v.object({ unit_price: v.number(), discount: v.number() })),
});
const orderSchema = v.object({
  order_id: v.string(),
  amount: v.optional(v.number()),
  paid: v.number(),
  delivery_day: v.number(),
  lines: v.array(
    v.object({ product_id: v.string(), quantity: v.number(), unit_price: v.number() }),
  ),
});
const refusalSchema = v.object({ error: v.string() });
function capture(match: RegExpMatchArray, index: number): string {
  const value = match[index];
  if (value === undefined) throw Error("Incomplete simulator report");
  return value;
}

function monetaryValue(text: string): number | string {
  const amount = /^[^\d.,-]*(-?\d[\d,]*\.\d{2})$/.exec(text)?.[1];
  return amount === undefined ? text : Number(amount.replaceAll(",", ""));
}

export function displayCell(
  value: number | string,
  column: string | undefined,
  money: (n: number) => string,
) {
  return typeof value === "number" &&
    (column === "price" || column === "revenue" || column === "averageCost")
    ? money(value)
    : value;
}

export function observation(
  receipt: Receipt,
  move: Move,
  id: number,
  commandLine = move[0],
): Report {
  const { output } = receipt;
  const suppliers = [...output.matchAll(/Supplier ID: ([\w-]+)/g)].map((m) => capture(m, 1));
  const products: string[] = [];
  let columns: string[] = [];
  const rows: ReportRow[] = [];
  const batches = new Map<string, NonNullable<Report["batches"]>[string]>();
  let terms: QuoteTerms | OrderTerms | null = null;
  const slots: Record<string, SlotObservation> = {};
  let channels: Campaigns | null = null,
    mail: Mail | null = null;
  const directory: DirectoryEntry[] = [];
  const body = (
    receipt.body ?? output.replace(/\n*\[Day \d+\/\d+ — [^\n]+\](?:\n[\s\S]*)?$/, "")
  ).trimEnd();
  const rendered = new Set<string>();
  const lines = body.split("\n");
  function omit(pattern: RegExp) {
    for (const line of lines) if (pattern.test(line)) rendered.add(line);
  }
  if (move[0] === "get_machine_inventory") {
    columns = ["slot", "size", "product", "quantity", "capacity", "price"];
    for (const line of lines) {
      const m = /^(\S+:\w\d+)\s+(\w+)\s+(.+?)\s{2,}(\d+)\s+(\d+)\s+(.+)$/.exec(line);
      if (m) {
        rows.push([...m.slice(1, 6), monetaryValue(capture(m, 6))]);
        rendered.add(line);
        slots[capture(m, 1)] = {
          item: capture(m, 3),
          qty: Number(capture(m, 4)),
          capacity: Number(capture(m, 5)),
        };
      }
    }
    omit(/^slot\s+takes\s+product|^Prosus Vending Bench —/);
  } else if (move[0] === "get_storage_inventory") {
    columns = ["product_id", "product", "size", "quantity", "averageCost"];
    let product: string | undefined;
    for (const line of lines) {
      const m = /^(\S+)\s{2,}(.+?)\s{2,}(\S+)\s+(\d+)\s+(\S*[\d.,]+)\s*$/.exec(line);
      if (m) {
        rows.push([...m.slice(1, 5), monetaryValue(capture(m, 5))]);
        product = capture(m, 1);
        products.push(product);
        rendered.add(line);
      } else {
        const batch = /^\s+batch of (\d+) expires day (\d+)\s*$/.exec(line);
        if (product && batch) {
          const lots = batches.get(product) ?? [];
          lots.push({ quantity: Number(capture(batch, 1)), expiryDay: Number(capture(batch, 2)) });
          batches.set(product, lots);
          rendered.add(line);
        } else product = undefined;
      }
    }
    omit(/^product_id\s+name\s+size/);
  } else if (move[0] === "list_emails") {
    columns = ["email_id", "day", "sender", "subject"];
    for (const m of output.matchAll(/^[ *] (\S+)  day\s+(\d+)  (.{28}) (.+)$/gm)) {
      rows.push([capture(m, 1), capture(m, 2), capture(m, 3).trim(), capture(m, 4)]);
      rendered.add(capture(m, 0));
    }
    omit(/^Use read_email|^(inbox|sent) \(\d+ shown,/);
  } else if (move[0] === "read_email") {
    const headers = /^From:\s+(.+)\nTo:\s+(.+)\nDay:\s+(\d+)\nSubject: (.+)\n\n/.exec(body);
    if (headers) {
      mail = {
        from: capture(headers, 1),
        to: capture(headers, 2),
        day: capture(headers, 3),
        subject: capture(headers, 4),
        body: operatorText(body.slice(capture(headers, 0).length)),
      };
    }
  } else if (move[0] === "check_offers") {
    const json = output.split("\n")[0] ?? "";
    if (json.startsWith("{") && !v.is(refusalSchema, JSON.parse(json))) {
      const quote = v.parse(quoteSchema, JSON.parse(json));
      rendered.add(json);
      terms = {
        minimum: quote.minimum_order,
        quantity: quote.quantity_per_product,
        until: quote.valid_through_day,
      };
      columns = ["product_id", "price", "discount"];
      for (const [product, offer] of Object.entries(quote.offers || {})) {
        products.push(product);
        rows.push([product, offer.unit_price, Math.round(100 * offer.discount) + "%"]);
      }
    }
  } else if (suppliers.length) {
    for (const block of body.split(/\n\s*\n/)) {
      const m =
        /^([^\n]+)\n\s+Supplier ID: (\S+)\n([\s\S]+?)\n\s+Contact: (\S+)\n\s+Minimum order: ([^\n]+)$/.exec(
          block,
        );
      if (!m) continue;
      directory.push({
        name: capture(m, 1),
        id: capture(m, 2),
        description: capture(m, 3).trim(),
        email: capture(m, 4),
        minimum: capture(m, 5),
      });
      block.split("\n").forEach((l) => rendered.add(l));
    }
    omit(/^Results for ".+":$/);
  } else if (["order_goods", "send_email"].includes(move[0]) && output.startsWith("{")) {
    const result = v.safeParse(orderSchema, JSON.parse(lines[0] ?? "null"));
    if (result.success) {
      const order = result.output;
      rendered.add(lines[0] ?? "");
      columns = ["product_id", "quantity", "price"];
      for (const item of order.lines) rows.push([item.product_id, item.quantity, item.unit_price]);
      terms = { order: order.order_id, paid: order.paid, eta: order.delivery_day };
    }
  } else if (move[0] === "get_sales_report") {
    columns = move[1].by_product
      ? ["product", "units", "revenue"]
      : ["day", "date", "weather", "units", "revenue"];
    const pattern = move[1].by_product
      ? /^(.+?)\s{2,}(\d+)\s+(€[\d.,]+)\s*$/
      : /^\s*(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\w+)\s+(\d+)\s+(€[\d.,]+)\s*$/;
    for (const line of lines) {
      const m = pattern.exec(line);
      if (m) {
        rows.push([...m.slice(1, -1), monetaryValue(capture(m, m.length - 1))]);
        rendered.add(line);
      }
    }
    omit(/^\s*day\s+date\s+weather|^\s*product\s+units\s+revenue/);
  } else if (move[0] === "get_marketing_report" && lines[0]?.startsWith("{")) {
    const result = v.safeParse(campaignsSchema, JSON.parse(lines[0]));
    if (result.success) {
      channels = result.output;
      rendered.add(lines[0] ?? "");
    }
  }
  const loaded =
    (move[0] === "restock_machine" || move[0] === "swap_item") &&
    /^Loaded \d+ x (.+?) into slot (\S+) \((\d+)\/(\d+)\)/m.exec(body);
  if (loaded)
    slots[capture(loaded, 2)] = {
      item: capture(loaded, 1),
      qty: Number(capture(loaded, 3)),
      capacity: Number(capture(loaded, 4)),
    };
  if (move[0] === "clear_slot" && move[1].slot && /was already empty\.|to storage\./.test(body)) {
    slots[move[1].slot] = { item: null, qty: 0, capacity: null };
  }
  let display = operatorText(
    lines
      .filter((l) => !rendered.has(l))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
  if (output.startsWith("{")) {
    const refusal = v.safeParse(refusalSchema, JSON.parse(lines[0] ?? "null"));
    if (refusal.success)
      display = operatorText([refusal.output.error, ...lines.slice(1)].join("\n").trim());
  }
  return {
    ...receipt,
    id,
    line: commandLine,
    columns,
    rows,
    batches: batches.size ? Object.fromEntries(batches) : undefined,
    products,
    suppliers,
    slots,
    terms,
    display,
    channels,
    mail,
    directory,
    tool: move[0],
    args: move[1],
  };
}

export function knownOrders(reports: Report[]): KnownOrder[] {
  const orders = new Map<string, KnownOrder>();
  for (const report of reports) {
    const terms = report.terms;
    if (terms?.order) {
      orders.set(terms.order, {
        ...terms,
        id: report.id,
        supplier: report.args.supplier_id ?? report.args.to ?? "",
        arrival: null,
      });
    }
    for (const notice of report.notices) {
      const match = /^Delivery (\S+) arrived in storage\.$/.exec(notice);
      if (!match) continue;
      const order = orders.get(capture(match, 1));
      if (order && !order.arrival) {
        order.arrival = {
          id: report.id,
          day: report.day,
          short: report.notices.some(
            (n) =>
              n.startsWith("Delivery " + order.order + " from ") && n.endsWith(" arrived short."),
          ),
        };
      }
    }
  }
  return [...orders.values()].toReversed();
}
