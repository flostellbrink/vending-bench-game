import type { KnownOrder, Report } from "games-common/benchmark";

import { useId, useRef, useState } from "react";

import { msg } from "@/dictionary";
import { displayCell } from "@/game/reports";
import { fieldLabel, type Lang, type Money, type Translate } from "@/localization/messages";

import { ActionButton } from "./FormControls";

interface Props {
  orders: KnownOrder[];
  t: Translate;
  money: Money;
  reports: Report[];
  supplier: string;
  lang: Lang;
}
export function OrderRegister({ orders, t, money, reports, supplier, lang }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [selected, select] = useState<KnownOrder | null>(null);
  const receipt = reports.find((report) => report.id === selected?.id);
  function inspect(order: KnownOrder) {
    select(order);
    dialog.current?.showModal();
  }
  return (
    <section className="sheet" aria-label={t("orders")}>
      {orders.length === 0 && <p>{t("empty")}</p>}
      {orders.length > 0 && (
        <table className="observation-grid order-register">
          <thead>
            <tr>
              <th scope="col">{t("order")}</th>
              <th scope="col" data-field="price">
                {t("amountPaid")}
              </th>
              <th scope="col">{t("expectedClose")}</th>
              <th scope="col">{t("arrived")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.order}>
                <td>
                  <button
                    className="receipt-link"
                    aria-haspopup="dialog"
                    onClick={() => inspect(order)}
                  >
                    {order.order}
                  </button>
                </td>
                <td data-field="price">
                  <small className="order-cell-label" aria-hidden="true">
                    {t("amountPaid")}
                  </small>
                  {money(order.paid)}
                </td>
                <td>
                  <small className="order-cell-label" aria-hidden="true">
                    {t("expectedClose")}
                  </small>
                  {t("day")} {order.eta}
                </td>
                <td>
                  <small className="order-cell-label" aria-hidden="true">
                    {t("arrived")}
                  </small>
                  {order.arrival ? (
                    <span>
                      {t("day")} {order.arrival.day}
                      {order.arrival.short && " · " + t("incompleteOrder")}
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
      <dialog className="mail-composer" ref={dialog} aria-labelledby={heading}>
        <form method="dialog">
          <header>
            <h2 id={heading}>
              {t("order")} {selected?.order}
            </h2>
          </header>
          {selected && receipt && (
            <>
              <p>
                {supplier} · {t("day")} {receipt.day}
              </p>
              <table className="observation-grid">
                <thead>
                  <tr>
                    {receipt.columns.map((column) => (
                      <th key={column} scope="col">
                        {fieldLabel(column, lang)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receipt.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, index) => (
                        <td key={receipt.columns[index]}>
                          {displayCell(cell, receipt.columns[index], money)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <strong>
                {t("amountPaid")}: {money(selected.paid)}
              </strong>
              <p>
                {t("expectedClose")}: {t("day")} {selected.eta}
              </p>
              <p>
                {t("arrived")}:{" "}
                {selected.arrival
                  ? t("day") +
                    " " +
                    selected.arrival.day +
                    (selected.arrival.short ? " · " + t("incompleteOrder") : "")
                  : "—"}
              </p>
            </>
          )}
          <div className="compose-actions">
            <ActionButton type="submit">
              {msg.operator.closeDialog({}, { locale: lang })}
            </ActionButton>
          </div>
        </form>
      </dialog>
    </section>
  );
}
