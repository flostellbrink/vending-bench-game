import type { KnownOrder, Snapshot } from "games-common/benchmark";

import type { ObservationProps } from "./panel-props";

import "./dispatch.css";

interface Props extends Pick<ObservationProps, "t" | "lang"> {
  state: Snapshot | null;
  orders: KnownOrder[];
  onView: (id: number) => void;
  onOrders: () => void;
}

export default function DispatchDesk({ state, orders, lang, t, onView, onOrders }: Props) {
  if (!state) return null;

  const expected = orders.filter((order) => !order.arrival).toSorted((a, b) => a.eta - b.eta);
  const lastArrival = orders
    .filter((order) => order.arrival)
    .toSorted((a, b) => (b.arrival?.id ?? 0) - (a.arrival?.id ?? 0))[0];
  const arrival = lastArrival?.arrival;
  const remaining = Math.max(0, state.closes - state.minute);
  const digits = new Intl.NumberFormat(lang);

  return (
    <section className="dispatch-desk">
      <section className="dispatch-register">
        <h3>
          {t("deliveries")}
          <b>{digits.format(expected.length)}</b>
        </h3>
        {expected.length ? (
          <ul>
            {expected.map((order) => (
              <li key={order.order}>
                <button onClick={() => onView(order.id)}>
                  <strong>{order.order}</strong>
                  <span>
                    {t("expectedClose")} {order.eta}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("noDeliveries")}</p>
        )}
        {lastArrival && arrival && (
          <p className="arrival-links">
            <button className="dispatch-reference" onClick={() => onView(lastArrival.id)}>
              {lastArrival.order}
            </button>
            <button className="dispatch-reference" onClick={() => onView(arrival.id)}>
              {t(arrival.short ? "incompleteOrder" : "arrived")} · {t("day")} {arrival.day}
            </button>
          </p>
        )}
        {orders.length > 0 && (
          <button className="dispatch-reference" onClick={onOrders}>
            {t("allOrders")} ({orders.length})
          </button>
        )}
      </section>
      <div className="dispatch-shift">
        <span>
          {t("remaining")} <strong>{digits.format(remaining)} min</strong>
        </span>
      </div>
    </section>
  );
}
