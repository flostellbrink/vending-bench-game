import { hasValue, type Optional } from "games-common/language";

import type { Locale } from "@/dictionary/runtime.ts";
import type { ToolName } from "@/game/commands.ts";

import { msg } from "@/dictionary/index.ts";

export type Lang = Locale;
export type Money = (value: number) => string;

export function commandLabel(tool: Optional<ToolName>) {
  return hasValue(tool) ? msg.commands[tool]() : undefined;
}

export const orderStatus = {
  belowMinimum: msg.operator.belowMinimum,
  expiredQuote: msg.operator.expiredQuote,
  lowCash: msg.operator.lowCash,
  needQuote: msg.operator.needQuote,
  quoted: msg.operator.quoted,
};

const reportFields: Partial<Record<string, typeof msg.fields.slot>> = {
  averageCost: msg.operator.averageCost,
  capacity: msg.operator.capacity,
  date: msg.operator.dated,
  day: msg.operator.day,
  discount: msg.operator.discount,
  email_id: msg.fields.email_id,
  price: msg.fields.price,
  product: msg.operator.product,
  product_id: msg.fields.product_id,
  quantity: msg.fields.quantity,
  revenue: msg.operator.revenue,
  sender: msg.operator.sender,
  size: msg.operator.size,
  slot: msg.fields.slot,
  subject: msg.fields.subject,
  units: msg.operator.units,
  weather: msg.operator.weather,
};

export function fieldLabel(key: string) {
  const label = Object.hasOwn(reportFields, key) ? reportFields[key] : undefined;
  return label ? label() : key;
}
