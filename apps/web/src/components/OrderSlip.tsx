import type { QuoteTerms } from "games-common/benchmark";

import { assertValue } from "games-common/language";
import { useState } from "react";

import { quotedWord } from "@/game/command-words";
import { timing } from "@/game/commands";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import "./order-slip.css";
interface Props extends ObservationProps {
  terms: QuoteTerms;
  openReport: (id: number) => void;
}

export function OrderSlip({
  terms,
  report,
  reports,
  state,
  lang,
  t,
  money,
  runCommand,
  disabled,
  openReport,
}: Props) {
  const supplier = assertValue(report.args.supplier_id);
  const previous = reports.findLast(
    (r) =>
      r.id < report.id &&
      r.tool === report.tool &&
      r.args.supplier_id === supplier &&
      r.terms?.quantity === terms.quantity,
  );
  const newer = reports.findLast(
    (r) =>
      r.id > report.id &&
      r.tool === report.tool &&
      r.args.supplier_id === supplier &&
      r.terms?.quantity === terms.quantity,
  );
  const oldPrices = new Map(
    previous?.rows.flatMap(([id, value]) =>
      typeof id === "string" && typeof value === "number" ? [[id, value] as const] : [],
    ),
  );
  const rows = report.rows.map((row) => ({
    product: String(assertValue(row[0])),
    price: Number(assertValue(row[1])),
    discount: String(assertValue(row[2])),
  }));
  const [selection, setSelection] = useState<string[]>([]);
  const [qty, setQty] = useState(String(terms.quantity));
  const [submittedId, setSubmittedId] = useState<number>();
  const submitted =
    submittedId === undefined
      ? undefined
      : reports.find(
          (r) =>
            r.id === submittedId && r.tool === "order_goods" && r.args.supplier_id === supplier,
        );
  const editingQuote = Number(qty) !== terms.quantity;
  const total =
    rows.reduce(
      (cents, row) =>
        selection.includes(row.product)
          ? cents + Math.round(row.price * 100) * terms.quantity
          : cents,
      0,
    ) / 100;
  const expired = state.day > terms.until;
  const validQty = Number.isSafeInteger(Number(qty)) && Number(qty) > 0;
  const invalid = editingQuote
    ? "useNewQuote"
    : expired
      ? "expiredQuote"
      : total < terms.minimum
        ? "belowMinimum"
        : total > state.cash
          ? "lowCash"
          : null;

  function toggle(id: string) {
    setSubmittedId(undefined);
    setSelection((picked) =>
      picked.includes(id) ? picked.filter((product) => product !== id) : [...picked, id],
    );
  }
  return (
    <div className="order-slip">
      <div className="slip-head">
        <h3>{t("compose")}</h3>
        <b>{supplier}</b>
      </div>
      <div className="slip-layout">
        <div className="slip-catalog">
          <div className="slip-terms">
            <span>
              {t("expires")} <b>{terms.until}</b>
            </span>
            <span>
              {t("minimum")} <b>{money(terms.minimum)}</b>
            </span>
          </div>
          {previous && (
            <p className="quote-comparison">
              {t("versusQuote")} #{previous.id} · {t("day")} {previous.day} ·{" "}
              {clock(previous.minute)}
            </p>
          )}
          <div className="slip-ledger" tabIndex={0} role="region" aria-label={t("product")}>
            <table>
              <thead>
                <tr>
                  <th>{t("include")}</th>
                  <th>{t("product")}</th>
                  <th>{msg.fields.price({}, { locale: lang })}</th>
                  <th>{t("bundle")}</th>
                  <th>{t("total")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product: id, price, discount }) => (
                  <tr key={id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selection.includes(id)}
                        disabled={disabled || editingQuote}
                        aria-label={t("include") + " " + id}
                        onChange={() => toggle(id)}
                      />
                    </td>
                    <td>{id}</td>
                    <td>
                      {money(price)}
                      {discount !== "0%" && <small> (−{discount})</small>}
                      {oldPrices.has(id) && oldPrices.get(id) !== price && (
                        <small className="unit-delta">
                          Δ {price > assertValue(oldPrices.get(id)) ? "+" : ""}
                          {money(price - assertValue(oldPrices.get(id)))}
                        </small>
                      )}
                    </td>
                    <td>{terms.quantity}</td>
                    <td>{money(price * terms.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="slip-controls">
          <div className="quote-controls">
            <label>
              {t("nextQuoteQuantity")}{" "}
              <input
                aria-label={t("nextQuoteQuantity")}
                inputMode="numeric"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => {
                  setSubmittedId(undefined);
                  setQty(e.target.value);
                }}
              />
            </label>
            <button
              data-clock-verb="quote"
              disabled={disabled || !validQty}
              onClick={() => runCommand("quote " + supplier + " " + qty)}
            >
              {t("reprice")} · {assertValue(timing("quote", state)).minutes} min
            </button>
          </div>
          <div className="dispatch">
            {submitted?.terms?.order ? (
              <div role="status">
                <b>
                  {submitted.terms.order} <output>{money(submitted.terms.paid)}</output>
                </b>
                <small>
                  {t("expectedClose")} {submitted.terms.eta}
                </small>
                <button className="receipt-link" onClick={() => openReport(submitted.id)}>
                  {t("openReceipt")} #{submitted.id}
                </button>
                <button
                  onClick={() => {
                    setSubmittedId(undefined);
                    setSelection([]);
                  }}
                >
                  {t("newOrder")}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <b>
                    {t("quoted")} <output>{money(total)}</output>
                  </b>
                  <small>
                    {t("afterOrder")}: {money(state.cash - total)}
                  </small>
                  {invalid && (selection.length > 0 || expired || editingQuote) && (
                    <small>
                      {t(invalid)}
                      {(invalid === "belowMinimum" || invalid === "lowCash") && (
                        <>
                          {" "}
                          · {t("shortBy")}:{" "}
                          {money(
                            invalid === "belowMinimum" ? terms.minimum - total : total - state.cash,
                          )}
                        </>
                      )}
                    </small>
                  )}
                </div>
                {newer ? (
                  <button onClick={() => openReport(newer.id)}>
                    {t("newerQuote")} #{newer.id} · {t("noCharge")}
                  </button>
                ) : (
                  <button
                    data-clock-verb="order"
                    disabled={disabled || !selection.length || Boolean(invalid)}
                    onClick={() => {
                      setSubmittedId((reports.at(-1)?.id ?? 0) + 1);
                      runCommand(
                        [
                          "order",
                          supplier,
                          ...selection.flatMap((id) => [quotedWord(id), terms.quantity]),
                        ].join(" "),
                      );
                    }}
                  >
                    {t("sendOrder")} · {assertValue(timing("order", state)).minutes} min
                  </button>
                )}
                {submitted && <p role="status">{submitted.display}</p>}
              </>
            )}
          </div>
          <small>{t("latestQuote")}</small>
        </div>
      </div>
    </div>
  );
}
