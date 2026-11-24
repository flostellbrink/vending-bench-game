import type { Report } from "games-common/benchmark";

import { useState, type ReactNode } from "react";

import { fieldLabel, type Lang, type Money, type Translate } from "@/localization/messages";
import { clock } from "@/scene/clock";

import { StorageBatches } from "./StorageBatches";

interface Props {
  report?: Report;
  action: ReactNode;
  openReport: (id: number) => void;
  lang: Lang;
  money: Money;
  t: Translate;
}
export function DepotStock({ report, action, openReport, lang, money, t }: Props) {
  const [sort, setSort] = useState({ column: 1, direction: 1 });
  const rows = report?.rows.toSorted((a, b) => {
    const left = a[sort.column],
      right = b[sort.column];
    return (
      (typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), lang, { numeric: true })) * sort.direction
    );
  });
  function sortButton(i: number) {
    const field = report?.columns[i];
    return (
      field && (
        <button
          onClick={() => setSort({ column: i, direction: sort.column === i ? -sort.direction : 1 })}
        >
          {fieldLabel(field, lang)}
          {sort.column === i && (sort.direction === 1 ? " ↑" : " ↓")}
        </button>
      )
    );
  }
  return (
    <section className="depot-desk">
      <div className="depot-tools">
        {action}
        {report && (
          <button className="receipt-link" onClick={() => openReport(report.id)}>
            {t("seen")} · {t("day")} {report.day} / {clock(report.minute)} · #{report.id}
          </button>
        )}
      </div>
      {report && (
        <>
          {rows?.length ? (
            <table className="observation-grid depot-ledger" aria-label={t("depotStock")}>
              <thead>
                <tr>
                  {[1, 2, 3, 4].map((i) => (
                    <th
                      key={i}
                      scope="col"
                      aria-sort={
                        sort.column === i
                          ? sort.direction === 1
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
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
                      <StorageBatches report={report} product={String(id)} lang={lang} />
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
          ) : (
            <p>{report.display || t("empty")}</p>
          )}
        </>
      )}
    </section>
  );
}
