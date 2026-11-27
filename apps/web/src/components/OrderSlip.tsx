import type { Report, ReportRow } from "games-common/benchmark";

import { hasAny, hasValue, type Optional } from "games-common/language";
import { useContext } from "react";

import type { Money } from "@/localization/messages.ts";

import { msg } from "@/dictionary/index.ts";
import { commandForMove, priceOrder, type OrderEstimate } from "@/game/commands.ts";
import { orderEntry, type OrderLine } from "@/game/order-entry.ts";
import { orderStatus } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";

import type { ObservationProps } from "./panel-props.ts";

import { ActionForm, Field, QuantityInput } from "./FormControls.tsx";
import { GuiToolInfo, ToolReferenceContext } from "./GuiToolInfo.tsx";
import { ProductInput } from "./ProductInput.tsx";
import { useOrderDraft, useQuoteQuantity } from "./QuoteDrafts.tsx";
import "./order-slip.css";

type Shared = Pick<ObservationProps, "state" | "runCommand" | "disabled"> & {
  report?: Report;
  supplier: string;
  supplierView?: boolean;
};

const entryErrors = {
  duplicate: () => msg.operator.duplicateOrderProduct(),
  incomplete: () => msg.operator.incompleteOrderLine(),
};

export function QuoteRequest({ supplier, runCommand, disabled, supplierView = false }: Shared) {
  const context = useContext(ToolReferenceContext);
  const { qty, change } = useQuoteQuantity(
    supplier,
    context?.release.toolDefaults.check_offers.quantity,
  );
  const valid = !disabled && Number.isSafeInteger(Number(qty)) && Number(qty) > 0;
  return (
    <section className="quote-request">
      <h3>{msg.operator.supplierQuote()}</h3>
      <ActionForm
        className="compact"
        aria-label={msg.operator.supplierQuote()}
        actions={<GuiToolInfo verb="check_offers" type="submit" disabled={!valid} />}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) {
            runCommand(
              commandForMove(["check_offers", { quantity: Number(qty), supplier_id: supplier }]),
              supplierView ? "inline" : "dialog",
            );
          }
        }}
      >
        <Field label={msg.operator.bundle()}>
          <QuantityInput required value={qty} onChange={(e) => change(e.currentTarget.value)} />
        </Field>
      </ActionForm>
    </section>
  );
}

/** A quoted product of the slip, with its unit price and the ordered quantity. */
function OfferedLine({
  row,
  quantity,
  oldPrice,
  money,
  locked,
  amend,
}: {
  row: ReportRow;
  quantity: string;
  oldPrice: Optional<number>;
  money: Money;
  locked: boolean;
  amend: (line: OrderLine) => void;
}) {
  const [raw, price, discount] = row;
  const product = String(raw);
  const key = `offered:${product}`;
  return (
    <tr data-ordered={hasAny(quantity)}>
      <td>{product}</td>
      <td>
        {typeof price === "number" ? money(price) : price}
        {discount && discount !== "0%" && <small> (−{discount})</small>}
        {typeof price === "number" && hasValue(oldPrice) && oldPrice !== price && (
          <small className="unit-delta">Δ {money(price - oldPrice)}</small>
        )}
      </td>
      <td>
        <QuantityInput
          aria-label={`${msg.fields.quantity()} · ${product}`}
          value={quantity}
          disabled={locked}
          onChange={(e) => amend({ key, manual: false, product, quantity: e.currentTarget.value })}
        />
      </td>
    </tr>
  );
}

/** A product that the player adds to the slip by hand. */
function ManualLine({
  line,
  reports,
  quoted,
  locked,
  amend,
}: {
  line: OrderLine;
  reports: Report[];
  quoted: boolean;
  locked: boolean;
  amend: (line: OrderLine) => void;
}) {
  return (
    <tr className="manual-order-line">
      <td>
        <ProductInput
          reports={reports}
          label={msg.fields.product_id()}
          value={line.product}
          readOnly={!line.manual}
          disabled={locked}
          onChange={(product) => amend({ ...line, product })}
        />
      </td>
      {quoted && <td>—</td>}
      <td>
        <QuantityInput
          aria-label={
            line.product ? `${msg.fields.quantity()} · ${line.product}` : msg.fields.quantity()
          }
          disabled={locked}
          value={line.quantity}
          onChange={(e) => amend({ ...line, quantity: e.currentTarget.value })}
        />
      </td>
    </tr>
  );
}

function OrderLedger({
  rows,
  lines,
  manualLines,
  oldPrices,
  reports,
  money,
  locked,
  amend,
}: {
  rows: ReportRow[];
  lines: OrderLine[];
  manualLines: OrderLine[];
  oldPrices: Map<string, number>;
  reports: Report[];
  money: Money;
  locked: boolean;
  amend: (line: OrderLine) => void;
}) {
  return (
    <div className="slip-ledger" role="region" aria-label={msg.operator.product()} tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">{msg.fields.product_id()}</th>
            {rows.length > 0 && <th scope="col">{msg.operator.quotedUnitPrice()}</th>}
            <th scope="col">{msg.fields.quantity()}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const product = String(row[0]);
            return (
              <OfferedLine
                key={`offered:${product}`}
                row={row}
                quantity={lines.find((line) => line.key === `offered:${product}`)?.quantity ?? ""}
                oldPrice={oldPrices.get(product)}
                money={money}
                locked={locked}
                amend={amend}
              />
            );
          })}
          {manualLines.map((line) => (
            <ManualLine
              key={line.key}
              line={line}
              reports={reports}
              quoted={rows.length > 0}
              locked={locked}
              amend={amend}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The price of the basket at the last quote, and the cash left after the order. */
function BasketReading({ evidence, money }: { evidence: Optional<OrderEstimate>; money: Money }) {
  if (!evidence || evidence.status === "needQuote" || evidence.status === "expiredQuote") {
    return (
      <div className="basket-reading" role="status">
        {msg.operator.orderPriceUnknown()}
      </div>
    );
  }
  return (
    <div className="basket-reading" role="status">
      {msg.operator.quoted()}: <output>{money(evidence.cost)}</output> · {msg.operator.afterOrder()}
      : {money(evidence.remaining)}
      {(evidence.status === "belowMinimum" || evidence.status === "lowCash") && (
        <small>{orderStatus[evidence.status]()}</small>
      )}
    </div>
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
    previous?.rows.flatMap(([id, price]): [string, number][] =>
      typeof id === "string" && typeof price === "number" ? [[id, price]] : [],
    ),
  );
  const offered = new Set(rows.map((row) => String(row[0])));
  const entry = orderEntry(supplier, draft.lines);
  const { command } = entry;
  const estimate = command ? priceOrder(command, state, reports) : null;
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
        { key: crypto.randomUUID(), manual: true, product: "", quantity: "" },
      ],
    });
  const locked = disabled || hasAny(submitted?.terms?.order);
  const invalid = entry.error ? entryErrors[entry.error]() : null;
  return (
    <>
      {!supplierView && (
        <QuoteRequest
          disabled={disabled}
          report={report}
          runCommand={runCommand}
          state={state}
          supplier={supplier}
        />
      )}
      <form
        className="order-slip"
        data-reference={rows.length > 0}
        onSubmit={(event) => {
          event.preventDefault();
          if (!command || locked) {
            return;
          }
          save({ ...draft, submittedId: (reports.at(-1)?.id ?? 0) + 1 });
          runCommand(command, "inline");
        }}
      >
        <div className="slip-head">
          <h3>{msg.operator.compose()}</h3>
          {!supplierView && <b>{supplier}</b>}
        </div>
        {report && hasValue(terms?.minimum) && (
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
        <OrderLedger
          rows={rows}
          lines={draft.lines}
          manualLines={manualLines}
          oldPrices={oldPrices}
          reports={reports}
          money={money}
          locked={locked}
          amend={amend}
        />
        {!submitted?.terms?.order && (
          <div className="ledger-add">
            <button type="button" className="receipt-link" disabled={locked} onClick={addLine}>
              {msg.operator.addOrderProduct()}
            </button>
          </div>
        )}
        <div className="order-write">
          {submitted?.terms?.order ? (
            <div className="order-confirmation">
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
                className="workbench-button"
                type="button"
                onClick={() =>
                  save({ lines: [{ key: "manual", manual: true, product: "", quantity: "" }] })
                }
              >
                {msg.operator.newOrder()}
              </button>
            </div>
          ) : (
            <>
              {command && <BasketReading evidence={estimate} money={money} />}
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
              <GuiToolInfo verb="order_goods" type="submit" disabled={locked || !command} />
            </>
          )}
        </div>
      </form>
    </>
  );
}
