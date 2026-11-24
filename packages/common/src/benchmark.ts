import * as v from "valibot";

export type JSONValue = string | number | boolean | null | JSONObject | JSONValue[];
export interface JSONObject {
  [key: string]: JSONValue;
}
export const jsonValueSchema: v.GenericSchema<JSONValue> = v.lazy(() =>
  v.union([
    v.string(),
    v.number(),
    v.boolean(),
    v.null(),
    v.array(jsonValueSchema),
    v.record(v.string(), jsonValueSchema),
  ]),
);
export const jsonObjectSchema = v.record(v.string(), jsonValueSchema);

export type Rival = v.InferOutput<typeof rivalSchema>;
export const rivalSchema = v.object({
  kind: v.picklist(["model", "script"]),
  name: v.optional(v.string()),
  score: v.number(),
  endDay: v.optional(v.nullable(v.number())),
  finalBalance: v.optional(v.number()),
  source: v.string(),
  balances: v.optional(v.string()),
  values: v.optional(v.array(v.number())),
});
export type Release = v.InferOutput<typeof releaseSchema>;
export const releaseSchema = v.object({
  id: v.string(),
  version: v.string(),
  revision: v.string(),
  seed: v.number(),
  days: v.number(),
  startingBalance: v.number(),
  currency: v.string(),
  brief: v.string(),
  network: v.object({
    slots: v.array(v.string()),
    sites: v.number(),
    machines: v.number(),
    fee: v.number(),
    opens: v.number(),
    closes: v.number(),
    refill: v.number(),
  }),
  tools: v.record(v.string(), v.string()),
  engineArchive: v.string(),
  scriptedReplay: v.string(),
  adapter: v.string(),
  rivals: v.array(rivalSchema),
});
export function parseReleases(input: unknown): Release[] {
  return v.parse(v.pipe(v.array(releaseSchema), v.minLength(1)), input);
}

export type FinalScore = v.InferOutput<typeof finalScoreSchema>;
export const finalScoreSchema = v.object({
  reward: v.number(),
  gross_revenue: v.number(),
  fees_paid: v.number(),
  units_sold: v.number(),
  final_balance: v.number(),
  completed: v.boolean(),
});
export type Site = v.InferOutput<typeof siteSchema>;
export const siteSchema = v.object({ id: v.string(), name: v.string() });
export type Progress = v.InferOutput<typeof progressSchema>;
export const progressSchema = v.object({
  day: v.number(),
  minute: v.number(),
  cash: v.number(),
  over: v.boolean(),
});
export type Snapshot = v.InferOutput<typeof snapshotSchema>;
export const snapshotSchema = v.object({
  ...progressSchema.entries,
  failed: v.boolean(),
  startDate: v.string(),
  slots: v.array(v.string()),
  sites: v.array(siteSchema),
  machines: v.array(v.string()),
  weather: v.string(),
  costs: v.record(v.string(), v.number()),
  defaultCost: v.number(),
  opens: v.number(),
  closes: v.number(),
  fee: v.number(),
  days: v.number(),
  final: v.nullable(finalScoreSchema),
});

export type CommandArgs = v.InferOutput<typeof commandArgsSchema>;
const optionalText = v.optional(v.string());
const optionalNumber = v.optional(v.number());
export const commandArgsSchema = v.object({
  supplier_id: optionalText,
  product_id: optionalText,
  machine_id: optionalText,
  slot: optionalText,
  items: v.optional(v.record(v.string(), v.number())),
  query: optionalText,
  quantity: optionalNumber,
  price: optionalNumber,
  days: optionalNumber,
  location: optionalText,
  email_id: optionalText,
  folder: optionalText,
  to: optionalText,
  subject: optionalText,
  body: optionalText,
  recipient: optionalText,
  amount: optionalNumber,
  reference: optionalText,
  channel: optionalText,
  message: optionalText,
  key: optionalText,
  text: optionalText,
  in_days: optionalNumber,
  unread_only: v.optional(v.boolean()),
  by_product: v.optional(v.boolean()),
  limit: optionalNumber,
});
export type Move = v.InferOutput<typeof moveSchema>;
export const moveSchema = v.tuple([v.string(), commandArgsSchema]);
export type ScriptedReplay = v.InferOutput<typeof scriptedReplaySchema>;
export const scriptedReplaySchema = v.object({
  revision: v.string(),
  seed: v.number(),
  moves: v.array(moveSchema),
  checkpoints: v.array(v.object({ day: v.number(), moveCount: v.number(), cash: v.number() })),
});
export type Entry = v.InferOutput<typeof entrySchema>;
export const entrySchema = v.object({ move: moveSchema, line: v.string() });
export type PersonalBest = v.InferOutput<typeof personalBestSchema>;
export const personalBestSchema = v.object({ score: v.number(), values: v.array(v.number()) });

export type Actions = v.InferOutput<typeof actionsSchema>;
export const actionsSchema = v.record(
  v.string(),
  v.array(v.tuple([v.string(), v.string(), v.boolean()])),
);
export type AdapterReceipt = v.InferOutput<typeof adapterReceiptSchema>;
export const adapterReceiptSchema = v.object({
  body: v.string(),
  notices: v.array(v.string()),
  demand: v.optional(v.nullable(jsonObjectSchema)),
});
export type Receipt = v.InferOutput<typeof receiptSchema>;
export const receiptSchema = v.object({
  ...adapterReceiptSchema.entries,
  output: v.string(),
  day: v.number(),
  minute: v.number(),
  endDay: v.number(),
  endMinute: v.number(),
  openingCash: v.number(),
  closingCash: v.number(),
  minutes: v.number(),
});
export type WorkerRequest = v.InferOutput<typeof workerRequestSchema>;
export const workerRequestSchema = v.object({
  moves: v.array(moveSchema),
  release: v.optional(releaseSchema),
});
export type WorkerReply = v.InferOutput<typeof workerReplySchema>;
export const workerReplySchema = v.union([
  v.object({ boot: v.picklist(["runtime", "mount"]) }),
  v.object({ error: v.string() }),
  v.object({
    state: snapshotSchema,
    history: v.array(v.number()),
    receipts: v.array(receiptSchema),
    actions: actionsSchema,
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
  item: string | null;
  qty: number;
  capacity: number | null;
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
  traffic: jsonObjectSchema,
  rules: jsonObjectSchema,
  recent: v.array(
    v.object({ day: v.number(), location: v.string(), channel: v.string(), message: v.string() }),
  ),
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
  terms: OrderTerms | QuoteTerms | null;
  display: string;
  channels: Campaigns | null;
  mail: Mail | null;
  directory: DirectoryEntry[];
}
export interface KnownOrder extends OrderTerms {
  id: number;
  supplier: string;
  arrival: { id: number; day: number; short: boolean } | null;
}
