import { address } from "../game/commands.ts";

export interface CabinetLayout {
  rows: { name: string; cells: { slot: string; column: number }[] }[];
  columns: number;
}

const { compare } = new Intl.Collator("en", { numeric: true });

export function cabinetLayout(slots: readonly string[], machine: string): CabinetLayout {
  const rows = new Map<string, Map<string, string>>();
  const prefix = `${machine}.`;
  const columns = new Set<string>();
  for (const id of slots) {
    const key = address(id);
    if (!key.startsWith(prefix)) {
      continue;
    }
    const slot = key.slice(prefix.length).toUpperCase();
    if (!slot) {
      continue;
    }
    const parts = /^(?<row>.*?)(?<column>\d+)$/.exec(slot)?.groups;
    const rowName = parts?.row ?? "";
    const column = parts?.column ?? slot;
    const row = rows.get(rowName) ?? new Map<string, string>();
    row.set(column, slot);
    rows.set(rowName, row);
    columns.add(column);
  }
  const ordered = [...columns].toSorted(compare);
  return {
    columns: ordered.length,
    rows: [...rows.entries()]
      .toSorted(([a], [b]) => compare(b, a))
      .map(([name, row]) => ({
        cells: [...row].map(([key, slot]) => ({ column: ordered.indexOf(key), slot })),
        name,
      })),
  };
}
