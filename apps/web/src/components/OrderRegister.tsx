import type { KnownOrder, Report } from "games-common/benchmark";

import { useState } from "react";

import { msg } from "@/dictionary";
import { displayCell } from "@/game/reports";
import { fieldLabel, type Money } from "@/localization/messages";

import { ResultDialog } from "./ResultDialog";

interface Props {
  orders: KnownOrder[];

  money: Money;
  reports: Report[];
  supplier: string;
}
export function OrderRegister({ orders, money, reports, supplier }: Props) {
  const [selected, select] = useState<KnownOrder | null>(null);
  const receipt = reports.find((report) => report.id === selected?.id);
  return (
    <section className="sheet" aria-label={msg.operator.orders()}>
      {orders.length === 0 && <p>{msg.operator.empty()}</p>}
      {orders.length > 0 && (
        <table className="observation-grid order-register">
          <thead>
            <tr>
              <th scope="col">{msg.operator.order()}</th>
              <th scope="col" data-field="price">
                {msg.operator.amountPaid()}
              </th>
              <th scope="col">{msg.operator.expectedClose()}</th>
              <th scope="col">{msg.operator.arrived()}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.order}>
                <td>
                  <button
                    className="receipt-link"
                    aria-haspopup="dialog"
                    onClick={() => select(order)}
                  >
                    {order.order}
                  </button>
                </td>
                <td data-field="price">
                  <small className="order-cell-label" aria-hidden="true">
                    {msg.operator.amountPaid()}
                  </small>
                  {money(order.paid)}
                </td>
                <td>
                  <small className="order-cell-label" aria-hidden="true">
                    {msg.operator.expectedClose()}
                  </small>
                  {msg.operator.day()} {order.eta}
                </td>
                <td>
                  <small className="order-cell-label" aria-hidden="true">
                    {msg.operator.arrived()}
                  </small>
                  {order.arrival ? (
                    <span>
                      {msg.operator.day()} {order.arrival.day}
                      {order.arrival.short && " · " + msg.operator.incompleteOrder()}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && receipt && (
        <ResultDialog
          title={msg.operator.order() + " " + selected.order}
          close={() => select(null)}
        >
          <article className="order-receipt report">
            <p>
              {supplier} · {msg.operator.day()} {receipt.day}
            </p>
            <table className="observation-grid">
              <thead>
                <tr>
                  {receipt.columns.map((column) => (
                    <th key={column} scope="col">
                      {fieldLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipt.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td key={receipt.columns[index]} data-field={receipt.columns[index]}>
                        {displayCell(cell, receipt.columns[index], money)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <strong>
              {msg.operator.amountPaid()}: {money(selected.paid)}
            </strong>
            <p>
              {msg.operator.expectedClose()}: {msg.operator.day()} {selected.eta}
            </p>
            <p>
              {msg.operator.arrived()}:{" "}
              {selected.arrival
                ? msg.operator.day() +
                  " " +
                  selected.arrival.day +
                  (selected.arrival.short ? " · " + msg.operator.incompleteOrder() : "")
                : "—"}
            </p>
          </article>
        </ResultDialog>
      )}
    </section>
  );
}
