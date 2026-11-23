import type { QuoteTerms, Snapshot } from "games-common/benchmark";

import { assertValue, first } from "games-common/language";

import { parse, syntax, timing } from "@/game/commands";
import { stationMessages as msg } from "@/localization/station-messages";

import type { ObservationProps } from "./panel-props";
interface Props extends Omit<ObservationProps, "reports"> {
  terms: QuoteTerms;
}
function orderItems(
  line: string,
  supplier: string,
  state: Snapshot,
): { items: Record<string, number>; complete: boolean } {
  const empty = { items: {}, complete: false };
  if (!/^order\s/i.test(line.trimStart())) return empty;
  const tokens = line.match(/"[^"]*"|[^\s"]+/g) ?? [];
  const prefixLength = tokens.length - (tokens.length % 2 || 2);
  // A trailing unfinished line item must not erase the earlier completed rows.
  for (const [candidate, complete] of [
    [line, true],
    [tokens.slice(0, prefixLength).join(" "), false],
  ] as const) {
    try {
      const [, args] = parse(candidate, state, { order_goods: [] });
      if (args.supplier_id === supplier && args.items) return { items: args.items, complete };
    } catch {
      continue;
    }
  }
  return empty;
}

export function OrderSlip({
  terms,
  report,
  state,
  lang,
  t,
  money,
  runCommand,
  disabled,
  commandLine,
  stageCommand,
}: Props) {
  const supplier = assertValue(report.args.supplier_id);
  const rows = report.rows.map((row) => ({
    product: String(assertValue(row[0])),
    price: Number(assertValue(row[1])),
    discount: String(assertValue(row[2])),
  }));
  const { items, complete } = orderItems(commandLine, supplier, state);
  const selection = Object.entries(items);
  const words = commandLine.trim().split(/\s+/);
  const editingQuote = words[0]?.toLowerCase() === "quote" && words[1] === supplier;
  const requestedSizes = new Set(Object.values(items));
  const suggestedSize = requestedSizes.size === 1 ? first(selection)[1] : terms.quantity;
  const qty = editingQuote ? (words[2] ?? "") : String(suggestedSize);
  const prices = new Map(rows.map((row) => [row.product, row.price]));
  const priced = selection.every(([id, count]) => prices.has(id) && count === terms.quantity);
  const total = priced
    ? selection.reduce(
        (cents, [id, count]) => cents + Math.round(assertValue(prices.get(id)) * 100) * count,
        0,
      ) / 100
    : null;
  const expired = state.day > terms.until;
  const validQty = Number.isSafeInteger(Number(qty)) && Number(qty) > 0;
  const invalid =
    editingQuote && Number(qty) !== terms.quantity
      ? "useNewQuote"
      : !priced
        ? "needQuote"
        : expired
          ? "expiredQuote"
          : total !== null && total < terms.minimum
            ? "belowMinimum"
            : total !== null && total > state.cash
              ? "lowCash"
              : null;

  function toggle(id: string) {
    const next = new Map(selection);
    if (next.has(id)) next.delete(id);
    else next.set(id, terms.quantity);
    const lines = Array.from(next, ([product, count]) => [
      /\s/.test(product) ? '"' + product + '"' : product,
      count,
    ]).flat();
    stageCommand(lines.length ? ["order", supplier, ...lines].join(" ") : "");
  }
  return (
    <div className="order-slip">
      <div className="slip-head">
        <h3>{t("compose")}</h3>
        <b>{supplier}</b>
      </div>
      <div className="quote-controls">
        <label>
          {t("nextQuoteQuantity")}{" "}
          <input
            aria-label={t("nextQuoteQuantity")}
            inputMode="numeric"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => stageCommand("quote " + supplier + " " + e.target.value)}
          />
        </label>
        <button
          data-clock-verb="quote"
          disabled={disabled || !validQty}
          onClick={() => runCommand("quote " + supplier + " " + qty, editingQuote)}
        >
          {t("reprice")} · {assertValue(timing("quote", state)).minutes} min
        </button>
      </div>
      <p>
        {t("expires")} {terms.until} · {t("minimum")} {money(terms.minimum)}
      </p>
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
                  checked={Object.hasOwn(items, id)}
                  disabled={disabled || (editingQuote && Number(qty) !== terms.quantity)}
                  aria-label={t("include") + " " + id}
                  onChange={() => toggle(id)}
                />
              </td>
              <td>{id}</td>
              <td>
                {money(price)}
                {discount !== "0%" && <small> (−{discount})</small>}
              </td>
              <td>{items[id] ?? terms.quantity}</td>
              <td>
                {items[id] != null && items[id] !== terms.quantity
                  ? "—"
                  : money(price * terms.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dispatch">
        <div>
          <b>
            {t("quoted")} {total == null ? "—" : money(total)}
          </b>
          <small>
            {t("afterOrder")}: {total == null ? "—" : money(state.cash - total)}
          </small>
          {invalid && (selection.length > 0 || expired || editingQuote) && (
            <small>{t(invalid)}</small>
          )}
          {!complete && selection.length > 0 && <small>{syntax("order")}</small>}
        </div>
        <button
          data-clock-verb="order"
          disabled={disabled || !complete || !selection.length || Boolean(invalid)}
          onClick={() => runCommand(commandLine.trim(), true)}
        >
          {t("sendOrder")} · {assertValue(timing("order", state)).minutes} min
        </button>
      </div>
      <small>{t("latestQuote")}</small>
    </div>
  );
}
