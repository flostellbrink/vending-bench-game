import type { KnownOrder } from "games-common/benchmark";

import type { Money, Translate } from "@/localization/messages";

interface Props {
  orders: KnownOrder[];
  t: Translate;
  money: Money;
  open: (id: number) => void;
}
export function OrderRegister({ orders, t, money, open }: Props) {
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
            {orders.map(({ arrival, ...order }) => (
              <tr key={order.order}>
                <td>
                  <button className="receipt-link" onClick={() => open(order.id)}>
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
                  {arrival ? (
                    <button className="receipt-link" onClick={() => open(arrival.id)}>
                      {t("day")} {arrival.day}
                      {arrival.short && " · " + t("incompleteOrder")}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
