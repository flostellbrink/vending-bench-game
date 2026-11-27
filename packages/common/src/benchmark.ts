import * as v from "valibot";

import { type Optional } from "./language.ts";

export type JSONValue = Optional<string | number | boolean | JSONObject | JSONValue[]>;
export interface JSONObject {
  [key: string]: JSONValue;
}
const jsonValueSchema: v.GenericSchema<JSONValue> = v.lazy(() =>
  v.union([
    v.string(),
    v.number(),
    v.boolean(),
    v.null(),
    v.array(jsonValueSchema),
    v.record(v.string(), jsonValueSchema),
  ]),
);
const jsonObjectSchema = v.record(v.string(), jsonValueSchema);

export type Rival = v.InferOutput<typeof rivalSchema>;
export const rivalSchema = v.object({
  balances: v.optional(v.string()),
  endDay: v.optional(v.nullable(v.number())),
  finalBalance: v.optional(v.number()),
  /** The published trial folder, which names the run across catalog builds. */
  id: v.string(),
  name: v.string(),
  replay: v.optional(v.string()),
  score: v.number(),
  source: v.string(),
  values: v.optional(v.array(v.number())),
});
export type Release = v.InferOutput<typeof releaseSchema>;
export const releaseSchema = v.object({
  adapter: v.string(),
  brief: v.string(),
  currency: v.string(),
  days: v.number(),
  engineArchive: v.string(),
  id: v.string(),
  network: v.object({
    closes: v.number(),
    fee: v.number(),
    machines: v.number(),
    opens: v.number(),
    refill: v.number(),
    sites: v.number(),
    slots: v.array(v.string()),
  }),
  reportLimits: v.object({
    mailCount: v.pipe(v.number(), v.integer(), v.minValue(1)),
    salesDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  revision: v.string(),
  rivals: v.array(rivalSchema),
  seed: v.number(),
  startingBalance: v.number(),
  toolDefaults: v.objectWithRest(
    {
      check_offers: v.objectWithRest(
        { quantity: v.pipe(v.number(), v.integer(), v.minValue(1)) },
        jsonValueSchema,
      ),
      get_sales_report: v.objectWithRest(
        {
          by_product: v.boolean(),
          days: v.pipe(v.number(), v.integer(), v.minValue(1)),
          location: v.string(),
        },
        jsonValueSchema,
      ),
      list_emails: v.objectWithRest(
        {
          folder: v.string(),
          limit: v.pipe(v.number(), v.integer(), v.minValue(1)),
          unread_only: v.boolean(),
        },
        jsonValueSchema,
      ),
    },
    v.record(v.string(), jsonValueSchema),
  ),
  /** The parameter names of each tool, in the order of its published signature. */
  toolParameters: v.record(v.string(), v.array(v.string())),
  tools: v.record(v.string(), v.string()),
  version: v.string(),
});
export function parseReleases(input: unknown): Release[] {
  return v.parse(v.pipe(v.array(releaseSchema), v.minLength(1)), input);
}

const finalScoreSchema = v.object({
  completed: v.boolean(),
  fees_paid: v.number(),
  final_balance: v.number(),
  gross_revenue: v.number(),
  reward: v.number(),
  units_sold: v.number(),
});
const siteSchema = v.object({ id: v.string(), name: v.string() });
export const progressSchema = v.object({
  cash: v.number(),
  day: v.number(),
  minute: v.number(),
  over: v.boolean(),
});
export type Snapshot = v.InferOutput<typeof snapshotSchema>;
export const snapshotSchema = v.object({
  ...progressSchema.entries,
  closes: v.number(),
  costs: v.record(v.string(), v.number()),
  days: v.number(),
  defaultCost: v.number(),
  failed: v.boolean(),
  fee: v.number(),
  final: v.nullable(finalScoreSchema),
  machines: v.array(v.string()),
  opens: v.number(),
  sites: v.array(siteSchema),
  slots: v.array(v.string()),
  startDate: v.string(),
});

export type CommandArgs = v.InferOutput<typeof commandArgsSchema>;
const optionalText = v.optional(v.string());
const optionalNumber = v.optional(v.number());
export const commandArgsSchema = v.objectWithRest(
  {
    amount: optionalNumber,
    body: optionalText,
    by_product: v.optional(v.boolean()),
    channel: optionalText,
    days: optionalNumber,
    email_id: optionalText,
    folder: optionalText,
    in_days: optionalNumber,
    items: v.optional(v.record(v.string(), v.number())),
    key: optionalText,
    limit: optionalNumber,
    location: optionalText,
    machine_id: optionalText,
    message: optionalText,
    price: optionalNumber,
    product_id: optionalText,
    quantity: optionalNumber,
    query: optionalText,
    recipient: optionalText,
    reference: optionalText,
    slot: optionalText,
    subject: optionalText,
    supplier_id: optionalText,
    text: optionalText,
    to: optionalText,
    unread_only: v.optional(v.boolean()),
  },
  v.optional(jsonValueSchema),
);
export type Move = v.InferOutput<typeof moveSchema>;
export const moveSchema = v.tuple([v.string(), commandArgsSchema]);
export const replaySchema = v.object({
  checkpoints: v.array(v.object({ cash: v.number(), day: v.number(), moveCount: v.number() })),
  moves: v.array(moveSchema),
  revision: v.string(),
  seed: v.number(),
});
export type Entry = v.InferOutput<typeof entrySchema>;
export const entrySchema = v.object({ line: v.string(), move: moveSchema });
export type PersonalBest = v.InferOutput<typeof personalBestSchema>;
export const personalBestSchema = v.object({ score: v.number(), values: v.array(v.number()) });

export type Actions = v.InferOutput<typeof actionsSchema>;
export const actionsSchema = v.record(
  v.string(),
  v.array(v.tuple([v.string(), v.string(), v.boolean()])),
);
export const adapterReceiptSchema = v.object({
  body: v.string(),
  demand: v.optional(v.nullable(jsonObjectSchema)),
  notices: v.array(v.string()),
});
export type Receipt = v.InferOutput<typeof receiptSchema>;
const receiptSchema = v.object({
  ...adapterReceiptSchema.entries,
  closingCash: v.number(),
  day: v.number(),
  endDay: v.number(),
  endMinute: v.number(),
  minute: v.number(),
  minutes: v.number(),
  openingCash: v.number(),
  output: v.string(),
});
export type WorkerRequest = v.InferOutput<typeof workerRequestSchema>;
export const workerRequestSchema = v.object({
  moves: v.array(moveSchema),
  release: v.optional(releaseSchema),
});
export type WorkerReply = v.InferOutput<typeof workerReplySchema>;
const workerReplySchema = v.union([
  v.object({ boot: v.picklist(["runtime", "mount"]) }),
  v.object({ error: v.string() }),
  v.object({
    actions: actionsSchema,
    history: v.array(v.number()),
    receipts: v.array(receiptSchema),
    state: snapshotSchema,
  }),
]);
export function parseWorkerReply(input: unknown): WorkerReply {
  return v.parse(workerReplySchema, input);
}

export interface QuoteTerms {
  minimum: number;
  quantity: number;
  until: number;
  order?: never;
  paid?: never;
  eta?: never;
}
export interface OrderTerms {
  order: string;
  paid: number;
  eta: number;
  minimum?: never;
  quantity?: never;
  until?: never;
}
export interface SlotObservation {
  item: Optional<string>;
  qty: number;
  capacity: Optional<number>;
}
export interface Mail {
  from: string;
  to: string;
  day: string;
  subject: string;
  body: string;
}
export interface DirectoryEntry {
  name: string;
  id: string;
  description: string;
  email: string;
  minimum: string;
}
export type Campaigns = v.InferOutput<typeof campaignsSchema>;
export const campaignsSchema = v.object({
  recent: v.array(
    v.object({ channel: v.string(), day: v.number(), location: v.string(), message: v.string() }),
  ),
  rules: jsonObjectSchema,
  traffic: jsonObjectSchema,
});
export type ReportRow = (string | number)[];
export interface Report extends Receipt {
  batches?: Record<string, { quantity: number; expiryDay: number }[]>;
  id: number;
  line: string;
  tool: string;
  args: CommandArgs;
  columns: string[];
  rows: ReportRow[];
  products: string[];
  suppliers: string[];
  slots: Record<string, SlotObservation>;
  terms: Optional<OrderTerms | QuoteTerms>;
  display: string;
  channels: Optional<Campaigns>;
  mail: Optional<Mail>;
  directory: DirectoryEntry[];
}
export interface KnownOrder extends OrderTerms {
  id: number;
  supplier: string;
  arrival: Optional<{ id: number; day: number; short: boolean }>;
}
