import type { Locale } from "@/dictionary/runtime";
import type { ToolName } from "@/game/commands";

import { msg } from "@/dictionary";

export type Lang = Locale;
export type Money = (value: number) => string;

export function commandLabel(tool: ToolName | undefined) {
  return tool && msg.commands[tool]();
}

export const orderStatus = {
  needQuote: msg.operator.needQuote,
  expiredQuote: msg.operator.expiredQuote,
  belowMinimum: msg.operator.belowMinimum,
  lowCash: msg.operator.lowCash,
  quoted: msg.operator.quoted,
};

const reportFields: Partial<Record<string, typeof msg.fields.slot>> = {
  slot: msg.fields.slot,
  product_id: msg.fields.product_id,
  quantity: msg.fields.quantity,
  price: msg.fields.price,
  subject: msg.fields.subject,
  email_id: msg.fields.email_id,
  product: msg.operator.product,
  size: msg.operator.size,
  capacity: msg.operator.capacity,
  averageCost: msg.operator.averageCost,
  day: msg.operator.day,
  sender: msg.operator.sender,
  discount: msg.operator.discount,
  weather: msg.operator.weather,
  units: msg.operator.units,
  revenue: msg.operator.revenue,
  date: msg.operator.dated,
};

export function fieldLabel(key: string) {
  const label = Object.hasOwn(reportFields, key) ? reportFields[key] : undefined;
  return label ? label() : key;
}
