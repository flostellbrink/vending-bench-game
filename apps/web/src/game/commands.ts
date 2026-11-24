import type {
  Actions,
  CommandArgs,
  JSONValue,
  Move,
  Report,
  Snapshot,
} from "games-common/benchmark";

import { commandArgsSchema } from "games-common/benchmark";
import * as v from "valibot";

export const local = ["help"];
export const commandGroups = {
  supply: ["search_web", "check_offers", "order_goods", "get_storage_inventory"],
  machines: ["get_machine_inventory", "restock_machine", "set_price", "swap_item", "clear_slot"],
  business: [
    "get_status",
    "get_sales_report",
    "wait_for_next_day",
    "run_marketing",
    "get_marketing_report",
  ],
  correspondence: ["list_emails", "read_email", "send_email", "send_payment"],
  records: ["write_note", "read_notes", "set_reminder", "list_reminders"],
} as const;
export type ToolName = (typeof commandGroups)[keyof typeof commandGroups][number];
const namedTools = Object.values(commandGroups).flat();
export const toolFor = (name: string) => namedTools.find((tool) => tool === name);
export const address = (id: string) => id.toLowerCase().replace(/^ai-/, "").replaceAll(":", ".");

export function syntax(tool: string, actions: Actions = {}) {
  if (tool === "help") return "help [tool]";
  const parameters = (actions[tool] ?? []).map(([key, type, required]) => {
    const field = JSON.stringify(key) + ": " + type;
    return required ? field : "[" + field + "]";
  });
  return parameters.length ? tool + " {" + parameters.join(", ") + "}" : tool;
}

export function commandForMove([tool, args]: Move): string {
  return Object.keys(args).length ? tool + " " + JSON.stringify(args) : tool;
}

export function commandArguments(line: string): CommandArgs {
  const json = line.trim().replace(/^\S+\s*/, "");
  return v.parse(commandArgsSchema, json ? JSON.parse(json) : {});
}

function matchesType(value: JSONValue, type: string): boolean {
  switch (type) {
    case "str":
      return typeof value === "string";
    case "int":
      return Number.isSafeInteger(value);
    case "float":
      return typeof value === "number" && Number.isFinite(value);
    case "bool":
      return typeof value === "boolean";
    case "dict[str, int]":
      return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.values(value).every(Number.isSafeInteger)
      );
    default:
      return true;
  }
}

export function parse(line: string, actions: Actions): Move {
  const tool = line.trim().split(/\s+/, 1)[0] ?? "";
  if (!Object.hasOwn(actions, tool)) throw Error("help");
  const parameters = actions[tool] ?? [];
  const usage = syntax(tool, actions);
  let args: CommandArgs;
  try {
    args = commandArguments(line);
  } catch {
    throw Error(usage);
  }
  for (const name of Object.keys(args)) {
    if (!parameters.some(([key]) => key === name)) throw Error(usage);
  }
  for (const [name, type, required] of parameters) {
    if (!Object.hasOwn(args, name)) {
      if (required) throw Error(usage);
      continue;
    }
    const value = args[name];
    if (value === undefined || !matchesType(value, type)) throw Error(usage);
  }
  return [tool, args];
}

type Geometry = Pick<Snapshot, "machines" | "slots">;

export function completions(line: string, state: Geometry, actions: Actions, reports: Report[]) {
  const start = line.trimStart();
  const tool = start.split(/\s+/, 1)[0] ?? "";
  const catalog = [...Object.keys(actions), ...local];
  if (start === tool) return catalog.filter((name) => name.startsWith(tool));
  const rest = start.slice(tool.length).trimStart();
  if (tool === "help") return catalog.filter((name) => name.startsWith(rest));
  if (!Object.hasOwn(actions, tool)) return [];
  const parameters = actions[tool] ?? [];
  const key = /(?:^\s*\{|,)\s*"?([\w]*)$/.exec(rest);
  if (!rest || key) {
    const prefix = key?.[1] ?? "";
    return parameters
      .map(([name]) => name)
      .filter((name) => name.startsWith(prefix) && !rest.includes(JSON.stringify(name) + ":"))
      .map((name) => (!rest ? "{" : "") + JSON.stringify(name) + ": ");
  }
  const value = /"([\w]+)"\s*:\s*"([^"\\]*)$/.exec(rest);
  if (!value) return [];
  const name = value[1],
    prefix = value[2] ?? "";
  let choices: string[];
  switch (name) {
    case "slot":
      choices = state.slots;
      break;
    case "machine_id":
      choices = state.machines;
      break;
    case "location":
      choices = state.machines.map((id) => id.split(":")[0] ?? "");
      break;
    case "supplier_id":
      choices = reports.flatMap((report) => report.suppliers);
      break;
    case "product_id":
      choices = reports.flatMap((report) => report.products);
      break;
    case "to":
      choices = reports.flatMap((report) => report.directory.map((entry) => entry.email));
      break;
    case "email_id":
      choices = reports
        .filter((report) => report.tool === "list_emails")
        .flatMap((report) => report.rows.flatMap(([id]) => (typeof id === "string" ? [id] : [])));
      break;
    default:
      return [];
  }
  return [...new Set(choices)]
    .filter((choice) => choice.toLowerCase().startsWith(prefix.toLowerCase()))
    .map((choice) => JSON.stringify(choice));
}

export function insertCompletion(line: string, caret: number, value: string) {
  const prefix = line.slice(0, caret);
  const tail = line.slice(caret);
  if (!/^\s*(?!help\s)\S+\s/.test(prefix)) {
    const left = prefix.replace(/\S*$/, value + " ");
    return { line: left + tail.replace(/^\S*\s*/, ""), caret: left.length };
  }
  if (value.startsWith("{")) {
    const left = prefix + value;
    return { line: left + tail, caret: left.length };
  }
  const key = value.endsWith(": ");
  const left = key ? prefix.replace(/"?\w*$/, value) : prefix.replace(/"[^"\\]*$/, value);
  const right = key ? tail.replace(/^\w*"?\s*:?\s*/, "") : tail.replace(/^[^",}]*"?/, "");
  return { line: left + right, caret: left.length };
}

type ClockState = Pick<Snapshot, "minute" | "opens" | "closes" | "costs"> & {
  defaultCost?: number;
};
export function timing(tool: string, state: ClockState | null | undefined) {
  if (!state || !tool || tool === "help") return null;
  const available = state.closes - state.minute;
  const minutes =
    tool === "wait_for_next_day" ? available : (state.costs[tool] ?? state.defaultCost);
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
  state: Pick<Snapshot, "day" | "cash"> | null,
  reports: ObservedOffer[],
): OrderEstimate | null {
  if (!state || !/^order_goods\s/.test(line)) return null;
  let args: CommandArgs;
  try {
    args = commandArguments(line);
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
export function moveDestination([tool, args]: Move) {
  const machine = args.machine_id ?? args.slot?.split(":").slice(0, 2).join(":");
  if (machine) return "machine:" + machine;
  if (tool === "get_storage_inventory" || tool === "order_goods") return "site:depot";
  return undefined;
}
