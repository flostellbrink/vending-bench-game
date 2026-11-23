import type { Report } from "games-common/benchmark";

import { address } from "@/game/commands";
export interface CabinetSlot {
  id: string;
  machine: string;
  code: string;
  size: string;
  product: string;
  quantity: number;
  capacity: number;
  price: string;
}
export function cabinetLayout(rows: Report["rows"]) {
  const machines = new Map<string, Map<string, CabinetSlot[]>>();
  const slots = new Map<string, CabinetSlot>();
  for (const [raw, size, product, quantity, capacity, price] of rows) {
    if (
      typeof raw !== "string" ||
      size == null ||
      product == null ||
      quantity == null ||
      capacity == null ||
      price == null
    )
      continue;
    const id = address(raw);
    const separator = id.lastIndexOf(".");
    const machine = id.slice(0, separator);
    const code = id.slice(separator + 1).toUpperCase();
    const shelf = code.replace(/\d+$/, "");
    const slot = {
      id,
      machine,
      code,
      size: String(size),
      product: String(product),
      quantity: Number(quantity),
      capacity: Number(capacity),
      price: String(price),
    };
    const shelves = machines.get(machine) ?? new Map<string, CabinetSlot[]>();
    const lanes = shelves.get(shelf) ?? [];
    lanes.push(slot);
    shelves.set(shelf, lanes);
    machines.set(machine, shelves);
    slots.set(id, slot);
  }
  return { machines, slots };
}
