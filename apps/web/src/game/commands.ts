import type {
  Actions,
  CommandArgs,
  Move,
  QuoteTerms,
  Report,
  Snapshot,
} from "games-common/benchmark";

import { commandArgsSchema } from "games-common/benchmark";
import {
  entries,
  fromEntries,
  hasValue,
  isRecord,
  keys,
  type Optional,
} from "games-common/language";
import * as v from "valibot";

export const local = ["help"];
/** The command groups in the order of the command index. */
export const commandGroups = [
  ["supply", ["search_web", "check_offers", "order_goods", "get_storage_inventory"]],
  [
    "machines",
    ["get_machine_inventory", "restock_machine", "set_price", "swap_item", "clear_slot"],
  ],
  [
    "business",
    [
      "get_status",
      "get_sales_report",
      "wait_for_next_day",
      "run_marketing",
      "get_marketing_report",
    ],
  ],
  ["correspondence", ["list_emails", "read_email", "send_email", "send_payment"]],
  ["records", ["write_note", "read_notes", "set_reminder", "list_reminders"]],
] as const;
export type ToolName = (typeof commandGroups)[number][1][number];
const namedTools = commandGroups.flatMap(([, tools]) => tools);
export const toolFor = (name: string) => namedTools.find((tool) => tool === name);
export const address = (id: string) => id.toLowerCase().replace(/^ai-/, "").replaceAll(":", ".");

export function syntax(tool: string, actions: Actions = {}) {
  if (tool === "help") {
    return "help [tool]";
  }
  const parameters = (actions[tool] ?? []).map(([key, type, required]) => {
    const field = `${JSON.stringify(key)}: ${type}`;
    return required ? field : `[${field}]`;
  });
  return parameters.length ? `${tool} {${parameters.join(", ")}}` : tool;
}

/** Name and value pairs in the order of a tool's published parameters; other names keep their order, last. */
export function inParameterOrder<T>(pairs: [string, T][], parameters: readonly string[] = []) {
  const rank = (name: string) => {
    const index = parameters.indexOf(name);
    return index === -1 ? parameters.length : index;
  };
  return pairs.toSorted(([a], [b]) => rank(a) - rank(b));
}

/** The command line of a move. With the tool's published parameters, its arguments follow their order. */
export function commandForMove([tool, args]: Move, parameters?: readonly string[]): string {
  return keys(args).length
    ? `${tool} ${JSON.stringify(fromEntries(inParameterOrder(entries(args), parameters)))}`
    : tool;
}

function commandArguments(line: string): CommandArgs {
  const json = line.trim().replace(/^\S+\s*/, "");
  return v.parse(commandArgsSchema, json ? JSON.parse(json) : {});
}

/** The arguments of a command line, or nothing when they are not valid JSON arguments. */
export function tryCommandArguments(line: string): Optional<CommandArgs> {
  try {
    return commandArguments(line);
  } catch {
    return undefined;
  }
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "str": {
      return typeof value === "string";
    }
    case "int": {
      return Number.isSafeInteger(value);
    }
    case "float": {
      return typeof value === "number" && Number.isFinite(value);
    }
    case "bool": {
      return typeof value === "boolean";
    }
    case "dict[str, int]": {
      return isRecord(value) && Object.values(value).every(Number.isSafeInteger);
    }
    default: {
      return true;
    }
  }
}

export function parse(line: string, actions: Actions): Move {
  const tool = line.trim().split(/\s+/, 1)[0] ?? "";
  if (!Object.hasOwn(actions, tool)) {
    throw new Error("help");
  }
  const parameters = actions[tool] ?? [];
  const usage = syntax(tool, actions);
  const args = tryCommandArguments(line);
  if (!hasValue(args)) {
    throw new Error(usage);
  }
  for (const name of keys(args)) {
    if (!parameters.some(([key]) => key === name)) {
      throw new Error(usage);
    }
  }
  for (const [name, type, required] of parameters) {
    if (!Object.hasOwn(args, name)) {
      if (required) {
        throw new Error(usage);
      }
      continue;
    }
    if (!matchesType(args[name], type)) {
      throw new Error(usage);
    }
  }
  return [tool, args];
}

type Geometry = Pick<Snapshot, "machines" | "slots">;

function valueChoices(name: Optional<string>, state: Geometry, reports: Report[]) {
  switch (name) {
    case "slot": {
      return state.slots;
    }
    case "machine_id": {
      return state.machines;
    }
    case "location": {
      return state.machines.map((id) => id.split(":")[0] ?? "");
    }
    case "supplier_id": {
      return reports.flatMap((report) => report.suppliers);
    }
    case "product_id": {
      return reports.flatMap((report) => report.products);
    }
    case "to": {
      return reports.flatMap((report) => report.directory.map((entry) => entry.email));
    }
    case "email_id": {
      return reports
        .filter((report) => report.tool === "list_emails")
        .flatMap((report) => report.rows.flatMap(([id]) => (typeof id === "string" ? [id] : [])));
    }
    default: {
      return undefined;
    }
  }
}

export function completions(line: string, state: Geometry, actions: Actions, reports: Report[]) {
  const start = line.trimStart();
  const tool = start.split(/\s+/, 1)[0] ?? "";
  const catalog = [...keys(actions), ...local];
  if (start === tool) {
    return catalog.filter((name) => name.startsWith(tool));
  }
  const rest = start.slice(tool.length).trimStart();
  if (tool === "help") {
    return catalog.filter((name) => name.startsWith(rest));
  }
  if (!Object.hasOwn(actions, tool)) {
    return [];
  }
  const parameters = actions[tool] ?? [];
  const key = /(?:^\s*\{|,)\s*"?(?<key>[\w]*)$/.exec(rest);
  if (!rest || key) {
    const prefix = key?.groups?.key ?? "";
    return parameters
      .map(([name]) => name)
      .filter((name) => name.startsWith(prefix) && !rest.includes(`${JSON.stringify(name)}:`))
      .map((name) => `${rest ? "" : "{"}${JSON.stringify(name)}: `);
  }
  const value = /"(?<name>[\w]+)"\s*:\s*"(?<prefix>[^"\\]*)$/.exec(rest);
  if (!value) {
    return [];
  }
  const { name, prefix = "" } = value.groups ?? {};
  const choices = valueChoices(name, state, reports);
  if (!choices) {
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
    const left = prefix.replace(/\S*$/, `${value} `);
    return { caret: left.length, line: left + tail.replace(/^\S*\s*/, "") };
  }
  if (value.startsWith("{")) {
    const left = prefix + value;
    return { caret: left.length, line: left + tail };
  }
  const key = value.endsWith(": ");
  const left = key ? prefix.replace(/"?\w*$/, value) : prefix.replace(/"[^"\\]*$/, value);
  const right = key ? tail.replace(/^\w*"?\s*:?\s*/, "") : tail.replace(/^[^",}]*"?/, "");
  return { caret: left.length, line: left + right };
}

type ClockState = Pick<Snapshot, "minute" | "opens" | "closes" | "costs"> & {
  defaultCost?: number;
};
export function timing(tool: string, state: Optional<ClockState>) {
  if (!state || !tool || tool === "help") {
    return null;
  }
  const available = state.closes - state.minute;
  const minutes =
    tool === "wait_for_next_day" ? available : (state.costs[tool] ?? state.defaultCost);
  if (!hasValue(minutes)) {
    throw new Error(`No clock cost for ${tool}`);
  }
  const rolls = minutes >= available;
  return { from: state.minute, minutes, rolls, to: rolls ? state.opens : state.minute + minutes };
}

type PricedStatus = "belowMinimum" | "lowCash" | "quoted";
export type OrderEstimate =
  | { status: "needQuote"; id?: never; cost?: never; minimum?: never; remaining?: never }
  | { status: "expiredQuote"; id: number; cost?: never; minimum?: never; remaining?: never }
  | { status: PricedStatus; id?: never; cost: number; minimum: number; remaining: number };

type ObservedOffer = Pick<Report, "id" | "tool" | "args" | "terms" | "rows">;

function isQuote(terms: Report["terms"]): terms is QuoteTerms {
  return hasValue(terms?.quantity);
}

function pricedStatus(cost: number, minimum: number, cash: number): PricedStatus {
  if (cost < minimum) {
    return "belowMinimum";
  }
  if (cost > cash) {
    return "lowCash";
  }
  return "quoted";
}

/** Only a quote for the ordered bundle size can establish its unit price. */
export function priceOrder(
  line: string,
  state: Optional<Pick<Snapshot, "day" | "cash">>,
  reports: ObservedOffer[],
): Optional<OrderEstimate> {
  if (!state || !/^order_goods\s/.test(line)) {
    return null;
  }
  const args = tryCommandArguments(line);
  if (!args?.items) {
    return null;
  }
  let cents = 0;
  let minimum = 0;
  for (const [product, quantity] of entries(args.items)) {
    const quote = reports.findLast(
      (r) =>
        r.tool === "check_offers" &&
        r.args.supplier_id === args.supplier_id &&
        r.terms?.quantity === quantity,
    );
    const row = quote?.rows.find(([id]) => id === product);
    const terms = quote?.terms;
    if (!quote || !row || !isQuote(terms)) {
      return { status: "needQuote" };
    }
    if (state.day > terms.until) {
      return { id: quote.id, status: "expiredQuote" };
    }
    cents += Math.round(Number(row[1]) * 100) * quantity;
    ({ minimum } = terms);
  }
  const cost = cents / 100;
  return {
    cost,
    minimum,
    remaining: state.cash - cost,
    status: pricedStatus(cost, minimum, state.cash),
  };
}
export function moveDestination([tool, args]: Move) {
  const machine = args.machine_id ?? args.slot?.split(":").slice(0, 2).join(":");
  if (machine) {
    return `machine:${machine}`;
  }
  if (tool === "get_storage_inventory" || tool === "order_goods") {
    return "site:depot";
  }
  return undefined;
}
