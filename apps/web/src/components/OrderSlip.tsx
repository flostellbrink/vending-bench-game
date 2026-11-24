import type { QuoteTerms } from "games-common/benchmark";

import { assertValue } from "games-common/language";
import { useContext, useId } from "react";

import { quotedWord } from "@/game/command-words";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import { GuiToolInfo, ToolReferenceContext } from "./GuiToolInfo";
import { useQuoteDraft } from "./QuoteDrafts";
import "./order-slip.css";
interface Props extends ObservationProps {
  terms: QuoteTerms;
  openReport: (id: number) => void;
  supplierView?: boolean;
}
export function QuoteRequest({
  report,
  supplier,
  t,
  runCommand,
  disabled,
  supplierView = false,
}: Pick<Props, "state" | "t" | "runCommand" | "disabled" | "supplierView"> & {
  supplier: string;
  report?: Props["report"];
}) {
  const inputId = useId();
  const context = useContext(ToolReferenceContext);
  const draftKey = report?.id ?? "supplier:" + supplier;
  const { draft, save } = useQuoteDraft(
    draftKey,
    report?.terms?.quantity ?? context?.release.toolDefaults.check_offers.quantity,
  );
  const qty = draft.quantity;
  const valid = !disabled && Number.isSafeInteger(Number(qty)) && Number(qty) > 0;
  return (
    <form
      className="quote-request"
      aria-labelledby={inputId + "-title"}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) runCommand("quote " + supplier + " " + qty, false, supplierView);
      }}
    >
      <h3 id={inputId + "-title"}>{t("supplierQuote")}</h3>
      <div className="control-row">
        <label htmlFor={inputId}>{t("bundle")}</label>
        <input
          className="control-line"
          id={inputId}
          type="number"
          min="1"
          required
          value={qty}
          onChange={(e) =>
            save(draftKey, { selection: draft.selection, quantity: e.currentTarget.value })
          }
        />
        <GuiToolInfo verb="quote">
          <button type="submit" disabled={!valid} data-clock-verb="quote">
            {t("reprice")}
          </button>
        </GuiToolInfo>
      </div>
    </form>
  );
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
  supplierView = false,
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
  const { draft, save } = useQuoteDraft(report.id, terms.quantity);
  const { selection, quantity: qty, submittedId } = draft;
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
  const maximum =
    rows.reduce((cents, row) => cents + Math.round(row.price * 100) * terms.quantity, 0) / 100;
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
    save(report.id, {
      quantity: qty,
      selection: selection.includes(id)
        ? selection.filter((product) => product !== id)
        : [...selection, id],
    });
  }
  return (
    <div className="order-slip" data-expired={expired}>
      {!supplierView && <QuoteRequest {...{ report, supplier, state, t, runCommand, disabled }} />}
      <div className="slip-layout">
        <div className="slip-catalog">
          <div className="slip-terms">
            <span>
              {t("expires")} <b>{terms.until}</b>
              {expired && <strong className="slip-expired"> · {t("expiredQuote")}</strong>}
            </span>
            <span>
              {t("minimum")} <b>{money(terms.minimum)}</b>
            </span>
            {supplierView && (
              <button className="slip-source" onClick={() => openReport(report.id)}>
                {t("source")} #{report.id} · {t("day")} {report.day} / {clock(report.minute)}
              </button>
            )}
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
                  <th scope="col">{t("product")}</th>
                  <th>{msg.fields.price({}, { locale: lang })}</th>
                  <th scope="col">
                    {msg.lineTotalFor({ units: terms.quantity }, { locale: lang })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product: id, price, discount }) => (
                  <tr key={id}>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={selection.includes(id)}
                          disabled={disabled || editingQuote}
                          aria-label={t("include") + " " + id}
                          onChange={() => toggle(id)}
                        />
                        <span>{id}</span>
                      </label>
                    </td>
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
                    <td>{money(price * terms.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="slip-controls">
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
                    save(report.id, { selection: [], quantity: String(terms.quantity) });
                  }}
                >
                  {t("newOrder")}
                </button>
              </div>
            ) : (
              <>
                <div className="basket-reading" aria-live="polite">
                  {selection.length > 0 && (
                    <>
                      <b>
                        {t("quoted")} <output>{money(total)}</output>
                      </b>
                      <small>
                        {t("afterOrder")}: {money(state.cash - total)}
                      </small>
                    </>
                  )}
                  {!selection.length &&
                    !expired &&
                    !editingQuote &&
                    (maximum < terms.minimum ? (
                      <span>
                        {t("allQuotedItems")}: <b>{money(maximum)}</b> · {t("shortBy")}:{" "}
                        <b>{money(terms.minimum - maximum)}</b>
                      </span>
                    ) : (
                      <span>{t("selectOrderItems")}</span>
                    ))}
                  {invalid &&
                    invalid !== "expiredQuote" &&
                    (selection.length > 0 || editingQuote) && (
                      <small>
                        {t(invalid)}
                        {(invalid === "belowMinimum" || invalid === "lowCash") && (
                          <>
                            {" "}
                            · {t("shortBy")}:{" "}
                            {money(
                              invalid === "belowMinimum"
                                ? terms.minimum - total
                                : total - state.cash,
                            )}
                          </>
                        )}
                      </small>
                    )}
                </div>
                {newer ? (
                  <button
                    onClick={() => {
                      if (selection.length)
                        save(newer.id, {
                          quantity: String(terms.quantity),
                          selection: selection.filter((item) =>
                            newer.rows.some(([id]) => id === item),
                          ),
                        });
                      openReport(newer.id);
                    }}
                  >
                    {t("newerQuote")} #{newer.id} · {t("noCharge")}
                  </button>
                ) : (
                  <div className="control-field">
                    <div className="control-row">
                      <GuiToolInfo verb="order">
                        <button
                          data-clock-verb="order"
                          disabled={disabled || !selection.length || Boolean(invalid)}
                          onClick={() => {
                            save(report.id, {
                              ...draft,
                              submittedId: (reports.at(-1)?.id ?? 0) + 1,
                            });
                            runCommand(
                              [
                                "order",
                                supplier,
                                ...selection.flatMap((id) => [quotedWord(id), terms.quantity]),
                              ].join(" "),
                            );
                          }}
                        >
                          {t("sendOrder")}
                        </button>
                      </GuiToolInfo>
                    </div>
                  </div>
                )}
                {submitted && <p role="status">{submitted.display}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
