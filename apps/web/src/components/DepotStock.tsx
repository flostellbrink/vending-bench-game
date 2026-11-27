import type { Report, ReportRow } from "games-common/benchmark";

import { useState, type ReactNode } from "react";

import { msg } from "@/dictionary/index.ts";
import { useFormatters } from "@/localization/formatters.ts";
import { fieldLabel, type Money } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";

import { StorageBatches } from "./StorageBatches.tsx";

interface Sort {
  column: number;
  direction: number;
}
interface Props {
  report?: Report;
  action: ReactNode;
  openReport: (id: number) => void;

  money: Money;
}

function ariaSort(column: number, sort: Sort) {
  if (sort.column !== column) {
    return undefined;
  }
  return sort.direction === 1 ? "ascending" : "descending";
}

function DepotLedger({
  report,
  rows,
  sort,
  setSort,
  money,
}: {
  report: Report;
  rows: ReportRow[];
  sort: Sort;
  setSort: (sort: Sort) => void;
  money: Money;
}) {
  function sortButton(i: number) {
    const field = report.columns[i];
    return (
      field && (
        <button
          onClick={() => setSort({ column: i, direction: sort.column === i ? -sort.direction : 1 })}
        >
          {fieldLabel(field)}
          {sort.column === i && (sort.direction === 1 ? " ↑" : " ↓")}
        </button>
      )
    );
  }
  return (
    <table className="observation-grid depot-ledger" aria-label={msg.operator.depotStock()}>
      <thead>
        <tr>
          {[1, 2, 3, 4].map((i) => (
            <th key={i} scope="col" aria-sort={ariaSort(i, sort)}>
              {sortButton(i)}
              {i === 1 && <small>{sortButton(0)}</small>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([id, name, size, qty, cost]) => (
          <tr key={String(id)}>
            <td>
              <b>{name}</b>
              <code>{id}</code>
              <StorageBatches report={report} product={String(id)} />
            </td>
            <td>{size}</td>
            <td>
              <b>{qty}</b>
            </td>
            <td>{typeof cost === "number" ? money(cost) : cost}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DepotStock({ report, action, openReport, money }: Props) {
  const { collator } = useFormatters();
  const [sort, setSort] = useState<Sort>({ column: 1, direction: 1 });
  const rows = report?.rows.toSorted((a, b) => {
    const left = a[sort.column];
    const right = b[sort.column];
    return (
      (typeof left === "number" && typeof right === "number"
        ? left - right
        : collator.compare(String(left), String(right))) * sort.direction
    );
  });
  return (
    <section className="depot-desk">
      <div className="depot-tools">
        {action}
        {report && (
          <button className="receipt-link" onClick={() => openReport(report.id)}>
            {msg.operator.seen()} · {msg.operator.day()} {report.day} / {clock(report.minute)} · #
            {report.id}
          </button>
        )}
      </div>
      {report &&
        (rows?.length ? (
          <DepotLedger report={report} rows={rows} sort={sort} setSort={setSort} money={money} />
        ) : (
          <p>{report.display || msg.operator.empty()}</p>
        ))}
    </section>
  );
}
