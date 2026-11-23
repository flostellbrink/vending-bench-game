import { operatorText } from "./commands.js";

export function observation(receipt, move, id) {
  const { output } = receipt;
  const suppliers = [...output.matchAll(/Supplier ID: ([\w-]+)/g)].map((m) => m[1]);
  const products = [];
  let columns = [],
    rows = [],
    terms = null;
  const slots = {};
  let channels = null,
    mail = null,
    directory = [];
  const body = (
    receipt.body ?? output.replace(/\n*\[Day \d+\/\d+ — [^\n]+\](?:\n[\s\S]*)?$/, "")
  ).trimEnd();
  const rendered = new Set();
  const lines = body.split("\n");
  function omit(pattern) {
    for (const line of lines) if (pattern.test(line)) rendered.add(line);
  }
  if (move[0] === "get_machine_inventory") {
    columns = ["slot", "size", "product", "quantity", "capacity", "price"];
    for (const line of output.split("\n")) {
      const m = /^(\S+:\w\d+)\s+(\w+)\s+(.+?)\s{2,}(\d+)\s+(\d+)\s+(.+)$/.exec(line);
      if (m) {
        rows.push(m.slice(1));
        rendered.add(line);
        slots[m[1]] = { item: m[3], qty: Number(m[4]), capacity: Number(m[5]) };
      }
    }
    omit(/^slot\s+takes\s+product|^Prosus Vending Bench —/);
  } else if (move[0] === "get_storage_inventory") {
    columns = ["product_id", "product", "size", "quantity", "price"];
    for (const line of output.split("\n")) {
      const m = /^(\S+)\s{2,}(.+?)\s{2,}(small|large)\s+(\d+)\s+(€[\d.,]+)/.exec(line);
      if (m) {
        rows.push(m.slice(1));
        products.push(m[1]);
        rendered.add(line);
      }
    }
    omit(/^product_id\s+name\s+size/);
  } else if (move[0] === "list_emails") {
    columns = ["email_id", "day", "sender", "subject"];
    for (const m of output.matchAll(/^[ *] (\S+)  day\s+(\d+)  (.{28}) (.+)$/gm)) {
      rows.push([m[1], m[2], m[3].trim(), m[4]]);
      rendered.add(m[0]);
    }
    omit(/^Use read_email|^(inbox|sent) \(\d+ shown,/);
  } else if (move[0] === "read_email") {
    const headers = /^From:\s+(.+)\nTo:\s+(.+)\nDay:\s+(\d+)\nSubject: (.+)\n\n/.exec(body);
    if (headers) {
      mail = {
        from: headers[1],
        to: headers[2],
        day: headers[3],
        subject: headers[4],
        body: operatorText(body.slice(headers[0].length)),
      };
    }
  } else if (move[0] === "check_offers") {
    const json = output.split("\n")[0];
    if (json.startsWith("{")) {
      const quote = JSON.parse(json);
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
        name: m[1],
        id: m[2],
        description: m[3].trim(),
        email: m[4],
        minimum: m[5],
      });
      block.split("\n").forEach((l) => rendered.add(l));
    }
    omit(/^Results for ".+":$/);
  } else if (["order_goods", "send_email"].includes(move[0]) && output.startsWith("{")) {
    const order = JSON.parse(output.split("\n")[0]);
    if (order.lines) {
      rendered.add(lines[0]);
      columns = ["product_id", "quantity", "price"];
      rows = order.lines.map((l) => [l.product_id, l.quantity, l.unit_price]);
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
        rows.push(m.slice(1));
        rendered.add(line);
      }
    }
    omit(/^\s*day\s+date\s+weather|^\s*product\s+units\s+revenue/);
  } else if (move[0] === "get_marketing_report" && lines[0].startsWith("{")) {
    const data = JSON.parse(lines[0]);
    if (data.rules) {
      channels = data;
      rendered.add(lines[0]);
    }
  }
  const loaded = /Loaded \d+ x (.+?) into slot (\S+) \((\d+)\/(\d+)\)/.exec(output);
  if (loaded)
    slots[loaded[2]] = { item: loaded[1], qty: Number(loaded[3]), capacity: Number(loaded[4]) };
  if (move[0] === "clear_slot" && /was already empty\.|to storage\./.test(output)) {
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
    const data = JSON.parse(output.split("\n")[0]);
    if (data.error) display = operatorText([data.error, ...lines.slice(1)].join("\n").trim());
  }
  return {
    ...receipt,
    id,
    columns,
    rows,
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

export function knownOrders(reports) {
  const orders = new Map();
  for (const report of reports) {
    const terms = report.terms;
    if (terms?.order) {
      orders.set(terms.order, {
        ...terms,
        id: report.id,
        supplier: report.args.supplier_id ?? report.args.to,
        arrival: null,
      });
    }
    for (const match of report.output.matchAll(/Delivery (PO-[\w-]+) arrived in storage\./g)) {
      const order = orders.get(match[1]);
      if (order)
        order.arrival = {
          id: report.id,
          day: report.day,
          short:
            report.output.includes(match[1] + " from ") && report.output.includes("arrived short."),
        };
    }
  }
  return [...orders.values()].reverse();
}
