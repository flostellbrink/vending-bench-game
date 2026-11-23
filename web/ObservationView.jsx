import { useMemo, useState } from "react";
import { clock } from "./World.jsx";
import { timing } from "./commands.js";
import { address, operatorText } from "./commands.js";
import { stationMessages as msg } from "./station-messages.ts";

const number = (value, lang) => new Intl.NumberFormat(lang).format(value);

export function timeLabel(verb, state, t) {
  const span = timing(verb, state);
  if (!span) return t("noCharge");
  const end = span.rolls
    ? (state.day === state.days ? t("endRun") : t("next")) + " " + clock(span.to)
    : clock(span.to);
  return span.minutes + " min · " + clock(span.from) + " → " + end;
}

function ReceiptHeading({ report, t }) {
  return (
    <header className="receipt-heading">
      <h2>{report.line}</h2>
      <small>
        #{report.id} · {t("day")} {report.day} · {clock(report.minute)} →{" "}
        {report.endDay !== report.day ? t("day") + " " + report.endDay + " " : ""}
        {clock(report.endMinute)} · {report.minutes} min
      </small>
    </header>
  );
}

function OrderSlip({ report, state, lang, t, money, runCommand, disabled, draft, updateDraft }) {
  const selection = draft?.selection ?? [],
    qty = draft?.qty ?? String(report.terms.quantity);
  const setQty = (qty) => updateDraft(report.id, { selection, qty });
  const toggle = (id) =>
    updateDraft(report.id, {
      qty,
      selection: selection.includes(id) ? selection.filter((p) => p !== id) : [...selection, id],
    });
  const { terms, args, rows } = report;
  const total =
    rows.reduce(
      (cents, [id, unit]) =>
        cents + (selection.includes(id) ? Math.round(unit * 100) * terms.quantity : 0),
      0,
    ) / 100;
  const expired = state.day > terms.until;
  const order =
    "order " + args.supplier_id + " " + selection.map((id) => id + " " + terms.quantity).join(" ");
  const validQty = Number.isSafeInteger(Number(qty)) && Number(qty) > 0;
  const invalid =
    Number(qty) !== terms.quantity
      ? "useNewQuote"
      : expired
        ? "expiredQuote"
        : total < terms.minimum
          ? "belowMinimum"
          : total > state.cash
            ? "lowCash"
            : null;
  return (
    <div className="order-slip">
      <div className="slip-head">
        <h3>{t("compose")}</h3>
        <b>{args.supplier_id}</b>
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
            onChange={(e) => setQty(e.target.value)}
          />
        </label>
        <button
          data-clock-verb="quote"
          disabled={disabled || !validQty}
          onClick={() => runCommand("quote " + args.supplier_id + " " + qty)}
        >
          {t("reprice")} · {timing("quote", state).minutes} min
        </button>
      </div>
      <p>
        {t("expires")} {terms.until} · {t("minimum")} {money(terms.minimum, lang)}
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
          {rows.map(([id, price, discount]) => (
            <tr key={id}>
              <td>
                <input
                  type="checkbox"
                  checked={selection.includes(id)}
                  aria-label={t("include") + " " + id}
                  onChange={() => toggle(id)}
                />
              </td>
              <td>{id}</td>
              <td>
                {money(price, lang)}
                {discount !== "0%" && <small> (−{discount})</small>}
              </td>
              <td>{terms.quantity}</td>
              <td>{money(price * terms.quantity, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dispatch">
        <div>
          <b>
            {t("quoted")} {money(total, lang)}
          </b>
          <small>
            {t("afterOrder")}: {money(state.cash - total, lang)}
          </small>
          {invalid && (selection.length > 0 || expired) && <small>{t(invalid)}</small>}
        </div>
        <button
          data-clock-verb="order"
          disabled={disabled || !selection.length || Boolean(invalid)}
          onClick={() => runCommand(order)}
        >
          {t("sendOrder")} · {timing("order", state).minutes} min
        </button>
      </div>
      <small>{t("latestQuote")}</small>
    </div>
  );
}

function ReportGrid({ report, t, lang, state, runCommand, disabled }) {
  const [sort, setSort] = useState(null);
  const [slot, selectSlot] = useState(null);
  const [item, setItem] = useState(""),
    [quantity, setQuantity] = useState(""),
    [price, setPrice] = useState("");
  const cabinet = report.tool === "get_machine_inventory";
  const command =
    report.tool === "list_emails" ? "read" : report.tool === "search_web" ? "quote" : null;
  const rows = useMemo(() => {
    if (!sort) return report.rows;
    return report.rows
      .slice()
      .sort(
        (a, b) =>
          String(a[sort.index]).localeCompare(String(b[sort.index]), lang, { numeric: true }) *
          sort.dir,
      );
  }, [report, sort, lang]);
  return (
    <>
      {slot && (
        <section className="service-panel">
          <header>
            <h3>{address(slot[0])}</h3>
            <button onClick={() => selectSlot(null)}>{t("backToSlots")}</button>
          </header>
          <p>
            {t("seen")} · {t("day")} {report.day} {clock(report.minute)} · {slot[2]} · {slot[3]} /{" "}
            {slot[4]}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runCommand("refill " + address(slot[0]) + " " + item.trim() + " " + quantity);
            }}
          >
            <label>
              {msg.fields.product_id({}, { locale: lang })}
              <input value={item} required onChange={(e) => setItem(e.target.value)} />
            </label>
            <label>
              {msg.fields.quantity({}, { locale: lang })}
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <button data-clock-verb="refill" disabled={disabled || !item.trim() || !quantity}>
              {t("refill")} · {timeLabel("refill", state, t)}
            </button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runCommand("price " + address(slot[0]) + " " + price);
            }}
          >
            <label>
              {msg.fields.price({}, { locale: lang })}
              <input
                type="number"
                required
                min="0"
                step=".01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <button data-clock-verb="price" disabled={disabled || price === ""}>
              {t("setPrice")} · {timeLabel("price", state, t)}
            </button>
          </form>
        </section>
      )}
      {!slot && (
        <table>
          <thead>
            <tr>
              {report.columns.map((c, i) => (
                <th
                  key={c}
                  aria-sort={
                    sort?.index === i ? (sort.dir === 1 ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    onClick={() => setSort({ index: i, dir: sort?.index === i ? -sort.dir : 1 })}
                  >
                    {msg.fields[c] ? msg.fields[c]({}, { locale: lang }) : t(c)}{" "}
                    {sort?.index === i ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
                  </button>
                </th>
              ))}
              {command && <th>{t("charged")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>
                    {cabinet && j === 0 ? (
                      <button
                        className="receipt-link"
                        onClick={() => {
                          selectSlot(r);
                          setItem("");
                          setQuantity("");
                          setPrice("");
                        }}
                      >
                        {address(c)}
                      </button>
                    ) : (
                      c
                    )}
                  </td>
                ))}
                {command && (
                  <td>
                    <button
                      data-clock-verb={command}
                      disabled={disabled}
                      onClick={() => runCommand(command + " " + r[0])}
                    >
                      {t(command === "read" ? "read" : "reprice")} ·{" "}
                      {timing(command, state).minutes} min
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function DayStatement({ report, state, t, lang, money }) {
  const fee = report.output.includes("could not pay") ? 0 : state.fee;
  const net = report.closingCash - report.openingCash + fee;
  return (
    <section className="day-statement">
      <h3>
        {t("statement")} / {report.day}
      </h3>
      <dl>
        {[
          ["opening", report.openingCash],
          ["netReceipts", net],
          ["fee", -fee],
          ["closing", report.closingCash],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{money(value, lang)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Metrics({ data, lang }) {
  return (
    <dl className="metrics">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <dt>{k.replaceAll("_", " ")}</dt>
          <dd>
            {typeof v === "object" && v !== null ? (
              <Metrics data={v} lang={lang} />
            ) : typeof v === "number" ? (
              number(v, lang)
            ) : (
              String(v)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function ObservationView({
  report,
  state,
  lang,
  t,
  money,
  runCommand,
  disabled,
  draft,
  updateDraft,
}) {
  const text = report.display;
  return (
    <section className="report">
      <ReceiptHeading report={report} t={t} />
      {report.mail ? (
        <article className="mail-paper">
          <h3>{report.mail.subject}</h3>
          <p>
            {report.mail.from} → {report.mail.to}
          </p>
          <pre>{report.mail.body}</pre>
        </article>
      ) : (
        <>
          {report.directory.map((entry) => (
            <article className="supplier-entry" key={entry.id}>
              <div>
                <h3>{entry.name}</h3>
                <small>{entry.id}</small>
                <p>{entry.description}</p>
                <div>
                  {t("minimum")}: <b>{entry.minimum}</b> · {entry.email}
                </div>
              </div>
              <button
                data-clock-verb="quote"
                disabled={disabled}
                onClick={() => runCommand("quote " + entry.id)}
              >
                {t("reprice")} · {timeLabel("quote", state, t)}
              </button>
            </article>
          ))}
          {report.terms?.minimum != null ? (
            <OrderSlip
              {...{ report, state, lang, t, money, runCommand, disabled, draft, updateDraft }}
            />
          ) : (
            <>
              {report.terms?.order && (
                <p className="terms">
                  {report.terms.order} · −{money(report.terms.paid, lang)} · {t("expectedClose")}{" "}
                  {report.terms.eta}
                </p>
              )}
              {!!report.rows.length && (
                <ReportGrid {...{ report, t, lang, state, runCommand, disabled }} />
              )}
            </>
          )}
          {report.tool === "wait_for_next_day" && (
            <DayStatement {...{ report, state, t, lang, money }} />
          )}
          {report.channels && (
            <>
              <h3>{t("traffic")}</h3>
              <Metrics data={report.channels.traffic} lang={lang} />
              <h3>{t("printRules")}</h3>
              <Metrics data={report.channels.rules} lang={lang} />
              {report.channels.recent.length > 0 && (
                <>
                  <h3>{t("recentCampaigns")}</h3>
                  {report.channels.recent.map((m, i) => (
                    <p key={i}>
                      {t("day")} {m.day} / {m.location} / {m.channel} · {m.message}
                    </p>
                  ))}
                </>
              )}
            </>
          )}
          {text && <pre>{text}</pre>}
          {report.demand && <details><summary>{t("demand")}</summary><Metrics data={report.demand} lang={lang}/></details>}
        </>
      )}
      {report.notices?.length > 0 && (
        <div className="overnight-notices">
          {report.notices.map((notice, i) => (
            <p key={i}>{operatorText(notice)}</p>
          ))}
        </div>
      )}
    </section>
  );
}
