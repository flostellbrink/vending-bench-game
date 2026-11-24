import type { Actions, CommandArgs, Move, Report, Snapshot } from "games-common/benchmark";

import { commandWords, quotedWord } from "./command-words.ts";

const verbs = {
  find: ["search_web", "query..."],
  quote: ["check_offers", "supplier_id quantity?"],
  order: ["order_goods", "supplier_id items..."],
  inspect: ["get_machine_inventory", "machine_id?"],
  depot: ["get_storage_inventory", ""],
  refill: ["restock_machine", "slot product_id quantity"],
  price: ["set_price", "slot price"],
  swap: ["swap_item", "slot product_id quantity"],
  clear: ["clear_slot", "slot"],
  status: ["get_status", ""],
  sales: ["get_sales_report", "days? location?"],
  inbox: ["list_emails", "folder?"],
  read: ["read_email", "email_id"],
  mail: ["send_email", "to subject body..."],
  pay: ["send_payment", "recipient amount reference..."],
  advertise: ["run_marketing", "location channel message..."],
  campaigns: ["get_marketing_report", ""],
  note: ["write_note", "key text..."],
  notes: ["read_notes", "key?"],
  remind: ["set_reminder", "in_days text..."],
  reminders: ["list_reminders", ""],
  close: ["wait_for_next_day", ""],
} as const;

/** A known command maps to exactly one tool in the benchmark. */
export type ToolName = (typeof verbs)[keyof typeof verbs][0];
function isVerb(word: string): word is keyof typeof verbs {
  return Object.hasOwn(verbs, word);
}
function definitionFor(word: string) {
  return isVerb(word) ? verbs[word] : undefined;
}

export const local = ["help", "brief", "orders", "balance", "world", "tabs", "view", "scores"];
export const commandGroups = {
  supply: ["find", "quote", "order", "depot"],
  machines: ["inspect", "refill", "price", "swap", "clear"],
  business: ["status", "sales", "close", "advertise", "campaigns"],
  correspondence: ["inbox", "read", "mail", "pay"],
  records: ["note", "notes", "remind", "reminders"],
} satisfies Record<string, (keyof typeof verbs)[]>;
export const address = (id: string) => id.toLowerCase().replace(/^ai-/, "").replaceAll(":", ".");
export const vocabulary = (actions: Actions) =>
  Object.entries(verbs).filter(([, [tool]]) => tool in actions);
const argumentNames: Record<string, string> = {
  supplier_id: "supplier",
  product_id: "product",
  machine_id: "machine",
  email_id: "email",
  in_days: "days",
};
export function syntax(verb: string) {
  if (verb === "balance" || verb === "tabs") return verb + " [day]";
  if (verb === "help") return "help [command]";
  if (verb === "view") return "view <result>";
  if (verb === "order") return "order <supplier> <product> <quantity> [<product> <quantity>]...";
  if (verb === "sales") return "sales [days] [location] [--by-product]";
  if (verb === "inbox") return "inbox [folder] [--unread] [--limit <count>]";
  const specs = definitionFor(verb)?.[1].split(" ").filter(Boolean) || [];
  const args = specs.map((spec) => {
    const key = spec.replace(/[?.]/g, "");
    const name = argumentNames[key] || key;
    return spec.endsWith("?") ? "[" + name + "]" : "<" + name + ">";
  });
  return [verb, ...args].join(" ");
}
export const toolFor = (verb: string) => definitionFor(verb)?.[0];
const gameNames = Object.fromEntries(Object.entries(verbs).map(([verb, [name]]) => [name, verb]));
const shellWord = (s: string) => (s && !/[\s"\\]/.test(s) ? s : quotedWord(s));
export function commandForMove([tool, args]: Move): string {
  const verb = gameNames[tool];
  if (!verb || !isVerb(verb)) throw Error("Unsupported replay operation: " + tool);
  const words: string[] = [verb];
  for (const spec of verbs[verb][1].split(" ")) {
    const key = spec.replace(/[?.]/g, "");
    if (!key) continue;
    if (key === "items" && args.items) {
      for (const [id, quantity] of Object.entries(args.items))
        words.push(shellWord(id), String(quantity));
      continue;
    }
    const value = Object.entries(args).find(([name]) => name === key)?.[1];
    if (typeof value === "number") words.push(String(value));
    if (typeof value === "string") {
      words.push(
        shellWord(
          key === "slot" || key === "machine_id" || key === "location" ? address(value) : value,
        ),
      );
    }
  }
  if (args.unread_only) words.push("--unread");
  if (args.by_product) words.push("--by-product");
  if (args.limit !== undefined) words.push("--limit", String(args.limit));
  return words.join(" ");
}
const toolNames = new RegExp(
  "\\b(" + Object.keys(gameNames).join("|") + ")\\b(\\([\\w ,]+\\))?",
  "g",
);
export const operatorText = (text: string) =>
  text.replace(toolNames, (match: string, name: string, signature?: string) => {
    const verb = gameNames[name];
    return verb ? (signature ? syntax(verb) : verb) : match;
  });

type Geometry = Pick<Snapshot, "machines" | "slots">;
type ClockState = Pick<Snapshot, "minute" | "opens" | "closes" | "costs"> & {
  defaultCost?: number;
};

function numericValue(token: string, integer: boolean, usage: string) {
  const value = Number(token);
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) throw Error(usage);
  return value;
}
function nextToken(tokens: string[], usage: string) {
  const value = tokens.shift();
  if (value === undefined) throw Error(usage);
  return value;
}
const numericKeys = ["limit", "quantity", "price", "days", "amount", "in_days"] as const;
const textKeys = [
  "supplier_id",
  "product_id",
  "machine_id",
  "slot",
  "query",
  "location",
  "email_id",
  "folder",
  "to",
  "subject",
  "body",
  "recipient",
  "reference",
  "channel",
  "message",
  "key",
  "text",
] as const;

/** Translate a player command to one paid operation. */
export function parse(line: string, state: Geometry, actions: Actions): Move {
  const tokens = commandWords(line, syntax(line.trim().split(/\s+/, 1)[0] ?? ""));
  const verb = tokens.shift()?.toLowerCase() ?? "";
  const entry = definitionFor(verb),
    usage = syntax(verb);
  if (!entry || !(entry[0] in actions)) throw Error("help");
  const args: CommandArgs = {};
  if (verb === "inbox" || verb === "sales") {
    const flag = verb === "inbox" ? "--unread" : "--by-product";
    const index = tokens.indexOf(flag);
    if (index !== -1) {
      tokens.splice(index, 1);
      if (verb === "inbox") args.unread_only = true;
      else args.by_product = true;
    }
    const limitIndex = verb === "inbox" ? tokens.indexOf("--limit") : -1;
    if (limitIndex !== -1) {
      const [, limit] = tokens.splice(limitIndex, 2);
      if (limit === undefined) throw Error(usage);
      args.limit = numericValue(limit, true, usage);
      if (!Number.isSafeInteger(args.limit) || args.limit < 1) throw Error(usage);
    }
  }
  for (const spec of entry[1].split(" ").filter(Boolean)) {
    if (!tokens.length && spec.endsWith("?")) continue;
    const key = spec.replace(/[?.]/g, "");
    if (key === "items") {
      if (!tokens.length) throw Error(usage);
      const items = new Map<string, number>();
      while (tokens.length) {
        const product = nextToken(tokens, usage);
        const count = numericValue(nextToken(tokens, usage), true, usage);
        if (!Number.isSafeInteger(count) || count < 1) throw Error(usage);
        items.set(product, (items.get(product) ?? 0) + count);
      }
      args.items = Object.fromEntries(items);
      continue;
    }
    const first = nextToken(tokens, usage);
    let token = spec.endsWith("...") ? [first, ...tokens.splice(0)].join(" ") : first;
    const numeric = numericKeys.find((k) => k === key);
    if (numeric) {
      args[numeric] = numericValue(token, !["amount", "price"].includes(numeric), usage);
      continue;
    }
    const field = textKeys.find((k) => k === key);
    if (!field) throw Error("Unknown command argument: " + key);
    if (field === "machine_id" || field === "slot") {
      const ids = field === "slot" ? state.slots : state.machines;
      const found = ids.find(
        (id) => address(id) === token.toLowerCase() || id === token.toUpperCase(),
      );
      if (!found) throw Error(usage);
      token = found;
    } else if (field === "location") {
      const site = state.machines
        .map((id) => id.split(":")[0])
        .find((id) => id && (address(id) === token.toLowerCase() || id === token.toUpperCase()));
      if (site) token = site;
    }
    args[field] = token;
  }
  if (tokens.length) throw Error(usage);
  return [entry[0], args];
}

export function completions(line: string, state: Geometry, actions: Actions, reports: Report[]) {
  const parts = line.trimStart().split(/\s+/);
  const partial = (parts.pop() ?? "").toLowerCase(),
    verb = parts[0] ?? "";
  const spec = definitionFor(verb)?.[1].split(" ")[parts.length - 1]?.replace(/[?.]/g, "");
  let choices: string[] = [];
  if (!verb) choices = [...vocabulary(actions).map(([v]) => v), ...local];
  else if (spec === "machine_id") choices = state.machines.map(address);
  else if (spec === "slot") choices = state.slots.map(address);
  else if (spec === "location")
    choices = state.machines.map((id) => address(id).split(".")[0] ?? "");
  else if (spec === "channel") choices = ["prints", "slack", "mail"];
  else if (spec === "supplier_id") choices = reports.flatMap((r) => r.suppliers);
  else if (verb === "mail" && spec === "to")
    choices = reports.flatMap((r) => r.directory.map((entry) => entry.email));
  else if (verb === "order" && parts.length % 2 === 0)
    choices = reports
      .filter((r) => r.tool === "check_offers" && r.args.supplier_id === parts[1])
      .flatMap((r) => r.products);
  else if (spec === "product_id") choices = reports.flatMap((r) => r.products);
  else if (verb === "view") choices = reports.map((r) => String(r.id));
  else if (spec === "email_id")
    choices = reports
      .filter((r) => r.tool === "list_emails")
      .flatMap((r) => r.rows.flatMap(([id]) => (typeof id === "string" ? [id] : [])));
  else if (spec === "folder") choices = ["inbox", "sent"];
  else if (verb === "help") choices = [...vocabulary(actions).map(([v]) => v), ...local];
  else if (verb === "find") choices = ["snacks", "coffee", "wholesalers"];
  if (verb === "sales" && partial.startsWith("-")) choices = ["--by-product"];
  if (verb === "inbox" && partial.startsWith("-")) choices = ["--unread", "--limit"];
  return [...new Set(choices)].filter((s) => s.toLowerCase().startsWith(partial));
}

export function timing(verb: string, state: ClockState | null | undefined) {
  const tool = toolFor(verb);
  if (!state || !tool) return null;
  const available = state.closes - state.minute;
  const minutes = verb === "close" ? available : (state.costs[tool] ?? state.defaultCost);
  if (minutes === undefined) throw Error("No clock cost for " + tool);
  const rolls = minutes >= available;
  return { minutes, rolls, from: state.minute, to: rolls ? state.opens : state.minute + minutes };
}

export type OrderEstimate =
  | { status: "needQuote"; id?: never; cost?: never; minimum?: never; remaining?: never }
  | { status: "expiredQuote"; id: number; cost?: never; minimum?: never; remaining?: never }
  | {
      status: "belowMinimum" | "lowCash" | "quoted";
      id?: never;
      cost: number;
      minimum: number;
      remaining: number;
    };

type ObservedOffer = Pick<Report, "id" | "tool" | "args" | "terms" | "rows">;

/** Only a quote for the ordered bundle size can establish its unit price. */
export function priceOrder(
  line: string,
  state: (Pick<Snapshot, "day" | "cash"> & Partial<Geometry>) | null,
  actions: Actions,
  reports: ObservedOffer[],
): OrderEstimate | null {
  if (!state || !/^order\s/i.test(line)) return null;
  let args: CommandArgs;
  try {
    [, args] = parse(line, { machines: state.machines ?? [], slots: state.slots ?? [] }, actions);
  } catch {
    return null;
  }
  if (!args.items) return null;
  let cents = 0,
    minimum = 0;
  for (const [product, quantity] of Object.entries(args.items)) {
    const quote = reports.findLast(
      (r) =>
        r.tool === "check_offers" &&
        r.args.supplier_id === args.supplier_id &&
        r.terms?.quantity === quantity,
    );
    const row = quote?.rows.find(([id]) => id === product);
    if (!quote || !row || quote.terms?.quantity === undefined) return { status: "needQuote" };
    if (state.day > quote.terms.until) return { status: "expiredQuote", id: quote.id };
    cents += Math.round(Number(row[1]) * 100) * quantity;
    minimum = quote.terms.minimum;
  }
  const cost = cents / 100;
  return {
    cost,
    minimum,
    remaining: state.cash - cost,
    status: cost < minimum ? "belowMinimum" : cost > state.cash ? "lowCash" : "quoted",
  };
}
/** Resolve an actual machine or slot argument, not text embedded in a different site's name. */
export function draftMachine(line: string, machines: readonly string[]) {
  const [verb, target] = line.trim().toLowerCase().split(/\s+/);
  if (!target || !verb || !["inspect", "refill", "swap", "clear", "price"].includes(verb))
    return undefined;
  const normalized = address(target);
  return machines.find(
    (id) => normalized === address(id) || normalized.startsWith(address(id) + "."),
  );
}
