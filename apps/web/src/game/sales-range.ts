import type { ReportRow } from "games-common/benchmark";

export function salesRange(rows: ReportRow[], from: string, through: string) {
  const selected = rows.filter(
    ([, date]) => typeof date === "string" && date >= from && date <= through,
  );
  let units = 0;
  let cents = 0;
  for (const row of selected) {
    units += Number(row[3]);
    cents += Math.round(Number(row[4]) * 100);
  }
  const revenue = cents / 100;
  return {
    averageRevenue: selected.length ? revenue / selected.length : 0,
    averageUnits: selected.length ? units / selected.length : 0,
    revenue,
    rows: selected,
    units,
  };
}
