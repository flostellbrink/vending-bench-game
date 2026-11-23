import type { KnownOrder, Report, Snapshot } from "games-common/benchmark";

import { address } from "@/game/commands";

import type { ObservationProps } from "./panel-props";

import "./dispatch.css";

interface Props extends Pick<
  ObservationProps,
  "t" | "lang" | "commandLine" | "runCommand" | "stageCommand" | "disabled"
> {
  state: Snapshot | null;
  orders: KnownOrder[];
  reports: Report[];
  onSite: (site: string) => void;
  onView: (id: number) => void;
  onCloseDraft: () => void;
}

export default function DispatchDesk({
  state,
  orders,
  reports,
  lang,
  t,
  onSite,
  onView,
  stageCommand,
  commandLine,
  runCommand,
  disabled,
  onCloseDraft,
}: Props) {
  const query = /^find\s/i.test(commandLine) ? commandLine.replace(/^find\s+/i, "") : "";
  if (!state) return null;

  const expected = orders.filter((order) => !order.arrival).toSorted((a, b) => a.eta - b.eta);
  const lastArrival = orders.find((order) => order.arrival);
  const arrival = lastArrival?.arrival;
  const lastDirectory = reports.findLast((report) => report.directory?.length);
  const remaining = Math.max(0, state.closes - state.minute);
  const digits = new Intl.NumberFormat(lang);

  return (
    <section className="dispatch-desk">
      <div className="dispatch-paper">
        <section className="dispatch-route" aria-label={t("serviceRoute")}>
          <h3>{t("serviceRoute")}</h3>
          <div className="dispatch-stations">
            {[{ id: "depot", name: t("depot") }, ...state.sites].map((site, index) => (
              <button
                key={site.id}
                className={index === 0 ? "route-stop route-depot" : "route-stop"}
                onClick={() => onSite(address(site.id))}
              >
                <i aria-hidden="true" />
                <span>{site.name}</span>
              </button>
            ))}
          </div>
          <form
            className="dispatch-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (query.trim()) runCommand("find " + query.trim(), true);
            }}
          >
            <label htmlFor="dispatch-query">{t("searchSuppliers")}</label>
            <div>
              <input
                id="dispatch-query"
                value={query}
                placeholder={t("searchExample")}
                onChange={(event) => stageCommand("find " + event.target.value)}
              />
              <button type="submit" disabled={!query.trim() || disabled} data-clock-verb="find">
                {t("execute")} · {state.costs.search_web ?? state.defaultCost} min
              </button>
            </div>
          </form>
          {lastDirectory && (
            <button className="dispatch-reference" onClick={() => onView(lastDirectory.id)}>
              {t("source")} #{lastDirectory.id} · {lastDirectory.line}
            </button>
          )}
        </section>
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
      </div>
      <div className="dispatch-shift">
        <span>
          {t("remaining")} <strong>{digits.format(remaining)} min</strong>
        </span>
        <button disabled={disabled} onClick={onCloseDraft} data-clock-verb="close">
          {commandLine.trim() === "close"
            ? t("execute") + " · " + remaining + " min"
            : t("closeShift")}
        </button>
      </div>
    </section>
  );
}
