import type { Report } from "games-common/benchmark";

import { useContext } from "react";

import { msg } from "@/dictionary";
import { commandForMove, priceOrder } from "@/game/commands";
import { orderEntry, type OrderLine } from "@/game/order-entry";
import { orderStatus } from "@/localization/messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import { ControlRow, Field, QuantityInput } from "./FormControls";
import { GuiToolInfo, ToolReferenceContext } from "./GuiToolInfo";
import { ProductInput } from "./ProductInput";
import { useOrderDraft, useQuoteQuantity } from "./QuoteDrafts";
import "./order-slip.css";

type Shared = Pick<ObservationProps, "state" | "runCommand" | "disabled"> & {
  report?: Report;
  supplier: string;
  supplierView?: boolean;
};

export function QuoteRequest({ supplier, runCommand, disabled, supplierView = false }: Shared) {
  const context = useContext(ToolReferenceContext);
  const { qty, change } = useQuoteQuantity(
    supplier,
    context?.release.toolDefaults.check_offers.quantity,
  );
  const valid = !disabled && Number.isSafeInteger(Number(qty)) && Number(qty) > 0;
  return (
    <form
      className="quote-request"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          runCommand(
            commandForMove(["check_offers", { supplier_id: supplier, quantity: Number(qty) }]),
            false,
            supplierView,
          );
      }}
    >
      <h3>{msg.operator.supplierQuote()}</h3>
      <ControlRow>
        <Field inline label={msg.operator.bundle()}>
          <QuantityInput required value={qty} onChange={(e) => change(e.currentTarget.value)} />
        </Field>
        <GuiToolInfo verb="check_offers">
          <button type="submit" disabled={!valid} data-clock-verb="check_offers" />
        </GuiToolInfo>
      </ControlRow>
    </form>
  );
}

type Props = Shared &
  Pick<ObservationProps, "reports" | "money"> & { openReport: (id: number) => void };

export function OrderSlip({
  report,
  reports,
  state,
  money,
  runCommand,
  disabled,
  openReport,
  supplier,
  supplierView = false,
}: Props) {
  const { draft, save } = useOrderDraft(supplier);
  const submitted = reports.find(
    (r) =>
      r.id === draft.submittedId && r.tool === "order_goods" && r.args.supplier_id === supplier,
  );
  const terms = report?.terms;
  const rows = report?.rows ?? [];
  const comparable =
    report &&
    terms &&
    reports.filter(
      (r) =>
        r.tool === "check_offers" &&
        r.args.supplier_id === supplier &&
        r.terms?.quantity === terms.quantity,
    );
  const previous = report && comparable?.findLast((r) => r.id < report.id);
  const newer = report && comparable?.findLast((r) => r.id > report.id);
  const oldPrices = new Map(
    previous?.rows.flatMap(([id, price]) =>
      typeof id === "string" && typeof price === "number" ? [[id, price] as const] : [],
    ),
  );
  const offered = new Set(rows.map((row) => String(row[0])));
  const entry = orderEntry(supplier, draft.lines);
  const command = entry.command;
  const estimate = command ? priceOrder(command, state, reports) : null;
  const evidence = estimate?.cost !== undefined ? estimate : null;
  const manualLines = draft.lines.filter((line) => line.manual || !offered.has(line.product));
  const amend = (line: OrderLine) => {
    const exists = draft.lines.some((item) => item.key === line.key);
    save({
      lines: exists
        ? draft.lines.map((item) => (item.key === line.key ? line : item))
        : [...draft.lines, line],
    });
  };
  const addLine = () =>
    save({
      lines: [
        ...draft.lines,
        { key: crypto.randomUUID(), product: "", quantity: "", manual: true },
      ],
    });
  const quantityLabel = msg.fields.quantity();
  const idLabel = msg.fields.product_id();
  const locked = disabled || Boolean(submitted?.terms?.order);
  const invalid =
    entry.error === "duplicate"
      ? msg.operator.duplicateOrderProduct()
      : entry.error === "incomplete"
        ? msg.operator.incompleteOrderLine()
        : null;
  return (
    <>
      {!supplierView && <QuoteRequest {...{ report, supplier, state, runCommand, disabled }} />}
      <form
        className="order-slip"
        data-reference={rows.length > 0}
        onSubmit={(event) => {
          event.preventDefault();
          if (!command || locked) return;
          save({ ...draft, submittedId: (reports.at(-1)?.id ?? 0) + 1 });
          runCommand(command, false, true);
        }}
      >
        <div className="slip-head">
          <h3>{msg.operator.compose()}</h3>
          {!supplierView && <b>{supplier}</b>}
        </div>
        {report && terms?.minimum !== undefined && (
          <div className="slip-terms">
            <span>
              {msg.operator.quotedAtQuantity()}: <b>{terms.quantity}</b>
            </span>
            <span>
              {msg.operator.expires()} <b>{terms.until}</b>
              {state.day > terms.until && (
                <strong className="slip-expired"> · {msg.operator.expiredOrderReference()}</strong>
              )}
            </span>
            <span>
              {msg.operator.minimum()} <b>{money(terms.minimum)}</b>
            </span>
            {supplierView && (
              <button type="button" className="slip-source" onClick={() => openReport(report.id)}>
                {msg.operator.source()} #{report.id} · {msg.operator.day()} {report.day} /{" "}
                {clock(report.minute)}
              </button>
            )}
          </div>
        )}
        {(previous || newer) && (
          <div className="quote-comparison">
            {previous && (
              <button
                type="button"
                className="receipt-link"
                onClick={() => openReport(previous.id)}
              >
                {msg.operator.versusQuote()} #{previous.id} · {msg.operator.day()} {previous.day}
              </button>
            )}
            {newer && (
              <button type="button" className="receipt-link" onClick={() => openReport(newer.id)}>
                {msg.operator.newerQuote()} #{newer.id} · {msg.operator.noCharge()}
              </button>
            )}
          </div>
        )}
        <div className="slip-ledger" role="region" aria-label={msg.operator.product()} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">{idLabel}</th>
                {rows.length > 0 && <th scope="col">{msg.operator.quotedUnitPrice()}</th>}
                <th scope="col">{quantityLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([raw, price, discount]) => {
                const product = String(raw),
                  key = "offered:" + product;
                const quantity = draft.lines.find((line) => line.key === key)?.quantity ?? "";
                const oldPrice = oldPrices.get(product);
                return (
                  <tr key={key} data-ordered={Boolean(quantity)}>
                    <td>{product}</td>
                    <td>
                      {typeof price === "number" ? money(price) : price}
                      {discount && discount !== "0%" && <small> (−{discount})</small>}
                      {typeof price === "number" &&
                        oldPrice !== undefined &&
                        oldPrice !== price && (
                          <small className="unit-delta">Δ {money(price - oldPrice)}</small>
                        )}
                    </td>
                    <td>
                      <QuantityInput
                        aria-label={quantityLabel + " · " + product}
                        value={quantity}
                        disabled={locked}
                        onChange={(e) =>
                          amend({ key, product, manual: false, quantity: e.currentTarget.value })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
              {manualLines.map((line) => (
                <tr key={line.key} className="manual-order-line">
                  <td>
                    <ProductInput
                      reports={reports}

                      label={idLabel}
                      value={line.product}
                      readOnly={!line.manual}
                      disabled={locked}
                      onChange={(product) => amend({ ...line, product })}
                    />
                  </td>
                  {rows.length > 0 && <td>—</td>}
                  <td>
                    <QuantityInput
                      aria-label={quantityLabel + (line.product ? " · " + line.product : "")}
                      disabled={locked}
                      value={line.quantity}
                      onChange={(e) => amend({ ...line, quantity: e.currentTarget.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="order-write">
          <button type="button" className="receipt-link" disabled={locked} onClick={addLine}>
            {msg.operator.addOrderProduct()}
          </button>
          {submitted?.terms?.order ? (
            <ControlRow>
              <button
                type="button"
                className="receipt-link"
                onClick={() => openReport(submitted.id)}
              >
                {submitted.terms.order} · {money(submitted.terms.paid)}
              </button>
              <span>
                {msg.operator.expectedClose()} {submitted.terms.eta}
              </span>
              <button
                type="button"
                onClick={() =>
                  save({ lines: [{ key: "manual", manual: true, product: "", quantity: "" }] })
                }
              >
                {msg.operator.newOrder()}
              </button>
            </ControlRow>
          ) : (
            <>
              {command && (
                <div className="basket-reading" role="status">
                  {evidence ? (
                    <>
                      {msg.operator.quoted()}: <output>{money(evidence.cost)}</output> ·{" "}
                      {msg.operator.afterOrder()}: {money(evidence.remaining)}
                      {evidence.status === "belowMinimum" || evidence.status === "lowCash" ? (
                        <small>{orderStatus[evidence.status]()}</small>
                      ) : null}
                    </>
                  ) : (
                    msg.operator.orderPriceUnknown()
                  )}
                </div>
              )}
              {invalid && <small role="status">{invalid}</small>}
              {submitted && (
                <button
                  type="button"
                  className="receipt-link"
                  onClick={() => openReport(submitted.id)}
                >
                  #{submitted.id} · {submitted.display}
                </button>
              )}
              <ControlRow>
                <GuiToolInfo verb="order_goods">
                  <button
                    type="submit"
                    data-clock-verb="order_goods"
                    disabled={locked || !command}
                  />
                </GuiToolInfo>
              </ControlRow>
            </>
          )}
        </div>
      </form>
    </>
  );
}
