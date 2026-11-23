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
    <section className="sheet">
      <h2>{t("orders")}</h2>
      {orders.length === 0 && <p>{t("empty")}</p>}
      {orders.map((order) => (
        <div key={order.order} className="order-entry">
          <b>{order.order}</b> · {order.supplier} · {money(order.paid)}
          <div>
            {order.arrival
              ? t(order.arrival.short ? "incompleteOrder" : "arrived") +
                " · " +
                t("day") +
                " " +
                order.arrival.day
              : t("expectedClose") + " " + order.eta}
          </div>
          <button className="receipt-link" onClick={() => open(order.id)}>
            {t("source")} #{order.id}
          </button>
          {order.arrival && <ArrivalLink id={order.arrival.id} t={t} open={open} />}
        </div>
      ))}
    </section>
  );
}
function ArrivalLink({ id, t, open }: { id: number; t: Translate; open: (id: number) => void }) {
  return (
    <>
      {" "}
      ·{" "}
      <button className="receipt-link" onClick={() => open(id)}>
        {t("arrived")} #{id}
      </button>
    </>
  );
}
