import type { Report } from "games-common/benchmark";

export interface ObservedProduct {
  id: string;
  name?: string;
  size?: string;
  depot?: { quantity: number; day: number; minute: number; receipt: number };
}

type ProductReceipt = Pick<
  Report,
  "columns" | "rows" | "args" | "slots" | "tool" | "id" | "day" | "minute"
>;
export function observedProducts(reports: readonly ProductReceipt[]): ObservedProduct[] {
  const products = new Map<string, ObservedProduct>();
  function product(id: string) {
    const known = products.get(id);
    if (known) return known;
    const entry: ObservedProduct = { id };
    products.set(id, entry);
    return entry;
  }
  for (const report of reports) {
    const column = report.columns.indexOf("product_id");
    if (column >= 0) {
      const nameColumn = report.columns.indexOf("product");
      const sizeColumn = report.columns.indexOf("size");
      const qtyColumn = report.columns.indexOf("quantity");
      for (const row of report.rows) {
        const id = row[column];
        if (typeof id !== "string") continue;
        const entry = product(id),
          name = row[nameColumn],
          size = row[sizeColumn],
          qty = row[qtyColumn];
        if (typeof name === "string") entry.name = name;
        if (typeof size === "string") entry.size = size;
        if (
          report.tool === "get_storage_inventory" &&
          qtyColumn >= 0 &&
          qty !== undefined &&
          Number.isFinite(Number(qty))
        )
          entry.depot = {
            quantity: Number(qty),
            day: report.day,
            minute: report.minute,
            receipt: report.id,
          };
      }
    }
    const { slot, product_id } = report.args;
    const loaded = slot && report.slots[slot]?.item;
    if (product_id && loaded && (report.tool === "restock_machine" || report.tool === "swap_item"))
      product(product_id).name = loaded;
  }
  return [...products.values()];
}
