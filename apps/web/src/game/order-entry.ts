import { commandForMove } from "./commands.ts";

export interface OrderLine {
  key: string;
  product: string;
  quantity: string;
  manual: boolean;
}
export function orderEntry(supplier: string, lines: readonly OrderLine[]) {
  const items = new Map<string, number>();
  for (const line of lines) {
    const product = line.product.trim(),
      quantity = line.quantity.trim();
    if (!quantity && (!line.manual || !product)) continue;
    if (
      !product ||
      !/^\d+$/.test(quantity) ||
      Number(quantity) < 1 ||
      !Number.isSafeInteger(Number(quantity))
    )
      return { error: "incomplete" as const };
    if (items.has(product)) return { error: "duplicate" as const };
    items.set(product, Number(quantity));
  }
  if (!items.size) return {};
  return {
    command: commandForMove([
      "order_goods",
      { supplier_id: supplier, items: Object.fromEntries(items) },
    ]),
  };
}
