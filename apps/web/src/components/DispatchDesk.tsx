import type { KnownOrder, Snapshot } from "games-common/benchmark";

import type { ObservationProps } from "./panel-props";

import "./dispatch.css";

interface Props extends Pick<ObservationProps, "t" | "lang" | "disabled"> {
  state: Snapshot | null;
  orders: KnownOrder[];
  onView: (id: number) => void;
  onClose: () => void;
}

export default function DispatchDesk({ state, orders, lang, t, onView, disabled, onClose }: Props) {
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
          <button className="dispatch-reference" onClick={() => onView(arrival.id)}>
            {t(arrival.short ? "incompleteOrder" : "arrived")} · {lastArrival.order}
          </button>
        )}
      </section>
      <div className="dispatch-shift">
        <span>
          {t("remaining")} <strong>{digits.format(remaining)} min</strong>
        </span>
        <button disabled={disabled} onClick={onClose} data-clock-verb="close">
          {t("closeShift")} · {remaining} min
        </button>
      </div>
    </section>
  );
}
