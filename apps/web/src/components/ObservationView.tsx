import type { DirectoryEntry } from "games-common/benchmark";
import type { ReactNode } from "react";

import { hasAny, hasValue } from "games-common/language";

import { msg } from "@/dictionary/index.ts";
import { priceOrder } from "@/game/commands.ts";
import { purchaseSupplier as supplierForPurchase } from "@/game/suppliers.ts";
import { orderStatus } from "@/localization/messages.ts";
import { clock, receiptEnd } from "@/scene/clock.ts";

import type { ObservationProps } from "./panel-props.ts";

import CabinetBench from "./CabinetBench.tsx";
import { DayStatement } from "./DayStatement.tsx";
import { EmailComposer } from "./EmailComposer.tsx";
import { Metrics } from "./Metrics.tsx";
import { OrderSlip } from "./OrderSlip.tsx";
import { ReportGrid } from "./ReportGrid.tsx";
function ReceiptHeading({
  report,
  action,
}: Pick<ObservationProps, "report"> & { action?: ReactNode }) {
  return (
    <header className="receipt-heading">
      {action ?? (report.terms?.order && <h3>{report.terms.order}</h3>)}
      <small>
        #{report.id} · {msg.operator.day()} {report.day} · {clock(report.minute)} →{" "}
        {receiptEnd(report, msg.operator.day())} · {report.minutes} min
      </small>
    </header>
  );
}

function DirectoryCard({
  entry,
  openSupplier,
}: {
  entry: DirectoryEntry;
  openSupplier?: (id: string) => void;
}) {
  return (
    <article>
      <header>
        <h3>{entry.name}</h3>
        <code>{entry.id}</code>
      </header>
      <p>{entry.description}</p>
      <dl>
        <div>
          <dt>{msg.operator.minimum()}</dt>
          <dd>{entry.minimum}</dd>
        </div>
      </dl>
      <address>{entry.email}</address>
      {openSupplier && (
        <button
          type="button"
          aria-haspopup="dialog"
          className="receipt-link"
          onClick={() => openSupplier(entry.id)}
        >
          {msg.operator.openSupplier()}
        </button>
      )}
    </article>
  );
}

export default function ObservationView({
  report,
  reports,
  state,
  money,
  runCommand,
  disabled,
  openReport,
  action,
  openSupplier,
}: Omit<ObservationProps, "runCommand"> & {
  runCommand?: ObservationProps["runCommand"];
  openReport: (id: number) => void;
  action?: ReactNode;
  openSupplier?: (id: string) => void;
}) {
  const text = report.display;
  const refusedOrder = report.tool === "order_goods" && text.startsWith("Order refused:");
  const estimate = refusedOrder
    ? priceOrder(
        report.line,
        { cash: report.openingCash, day: report.day },
        reports.filter((r) => r.id < report.id),
      )
    : null;
  const purchaseSupplier = supplierForPurchase(report, reports);
  const quoted = hasValue(report.terms?.minimum);
  const contact = quoted
    ? reports.flatMap((r) => r.directory).find((entry) => entry.id === report.args.supplier_id)
    : undefined;
  const from = report.mail?.from.match(/<(?<address>[^<>\s]+@[^<>\s]+)>$/)?.groups?.address;
  const sent =
    report.args.email_id &&
    reports.some(
      (r) =>
        r.tool === "list_emails" &&
        r.args.folder === "sent" &&
        r.rows.some((row) => row[0] === report.args.email_id),
    );
  return (
    <section className="report">
      <ReceiptHeading report={report} action={action} />
      {report.endDay !== report.day && (
        <DayStatement
          money={money}
          openReport={openReport}
          report={report}
          reports={reports}
          state={state}
        />
      )}
      {report.notices?.length > 0 && (
        <div className="overnight-notices">
          {report.notices.map((notice, i) => (
            <p key={i}>{notice}</p>
          ))}
        </div>
      )}
      {report.mail ? (
        <article className="mail-paper">
          <h3>{report.mail.subject}</h3>
          <p>
            {report.mail.from} → {report.mail.to}
          </p>
          <pre>{report.mail.body}</pre>
          {from && runCommand && (
            <EmailComposer
              key={report.id}
              disabled={disabled}
              reports={reports}
              send={runCommand}
              to={sent ? report.mail.to : from}
              subject={
                report.mail.subject.startsWith("Re: ")
                  ? report.mail.subject
                  : `Re: ${report.mail.subject}`
              }
            />
          )}
        </article>
      ) : (
        <>
          {report.directory.length > 0 && (
            <ul className="directory-results">
              {report.directory.map((entry) => (
                <li key={entry.id}>
                  <DirectoryCard entry={entry} openSupplier={openSupplier} />
                </li>
              ))}
            </ul>
          )}
          {!action && contact && runCommand && (
            <div className="supplier-contact">
              <span>{contact.email}</span>
              <EmailComposer
                key={contact.email}
                disabled={disabled}
                reports={reports}
                send={runCommand}
                to={contact.email}
              />
            </div>
          )}
          {runCommand && quoted && report.args.supplier_id ? (
            <OrderSlip
              key={report.id}
              supplier={report.args.supplier_id}
              openReport={openReport}
              disabled={disabled}
              money={money}
              report={report}
              reports={reports}
              runCommand={runCommand}
              state={state}
            />
          ) : (
            <>
              {!runCommand && hasValue(report.terms?.minimum) && (
                <p className="terms">
                  {report.args.supplier_id} · {msg.operator.minimum()} {money(report.terms.minimum)}{" "}
                  · {msg.operator.expires()} {report.terms.until}
                </p>
              )}
              {hasValue(report.terms?.order) && (
                <p className="terms">
                  {purchaseSupplier && openSupplier ? (
                    <button className="receipt-link" onClick={() => openSupplier(purchaseSupplier)}>
                      {purchaseSupplier}
                    </button>
                  ) : (
                    (purchaseSupplier ?? report.args.to)
                  )}{" "}
                  · {msg.operator.amountPaid()}: {money(report.terms.paid)} ·{" "}
                  {msg.operator.expectedClose()} {report.terms.eta}
                </p>
              )}
              {hasAny(report.rows) &&
                (report.tool === "get_machine_inventory" && runCommand ? (
                  <CabinetBench
                    live={hasValue(action)}
                    openReport={openReport}
                    disabled={disabled}
                    money={money}
                    report={report}
                    reports={reports}
                    runCommand={runCommand}
                    state={state}
                  />
                ) : (
                  <ReportGrid
                    disabled={disabled}
                    money={money}
                    openReport={openReport}
                    report={report}
                    reports={reports}
                    runCommand={runCommand}
                    state={state}
                  />
                ))}
            </>
          )}
          {report.channels && (
            <>
              <h3>{msg.operator.traffic()}</h3>
              <Metrics data={report.channels.traffic} />
              <h3>{msg.operator.printRules()}</h3>
              <Metrics data={report.channels.rules} />
              {report.channels.recent.length > 0 && (
                <>
                  <h3>{msg.operator.recentCampaigns()}</h3>
                  {report.channels.recent.map((m, i) => (
                    <p key={i}>
                      {msg.operator.day()} {m.day} / {m.location} / {m.channel} · {m.message}
                    </p>
                  ))}
                </>
              )}
            </>
          )}
          {text && <pre>{text}</pre>}
          {estimate && (
            <div className="terms">
              {estimate.status !== "needQuote" && estimate.status !== "expiredQuote" && (
                <p>
                  {msg.operator.quoted()}: {money(estimate.cost)} · {msg.operator.minimum()}:{" "}
                  {money(estimate.minimum)}
                </p>
              )}
              {(estimate.status === "belowMinimum" || estimate.status === "lowCash") && (
                <p>
                  {orderStatus[estimate.status]()} · {msg.operator.shortBy()}:{" "}
                  {money(
                    estimate.status === "belowMinimum"
                      ? estimate.minimum - estimate.cost
                      : -estimate.remaining,
                  )}
                </p>
              )}
              {(estimate.status === "needQuote" || estimate.status === "expiredQuote") && (
                <p>{orderStatus[estimate.status]()}</p>
              )}
              {openSupplier && report.args.supplier_id && (
                <button
                  className="receipt-link"
                  onClick={() => openSupplier(report.args.supplier_id ?? "")}
                >
                  {report.args.supplier_id}
                </button>
              )}
            </div>
          )}
          {report.demand && (
            <details>
              <summary>{msg.operator.demand()}</summary>
              <Metrics data={report.demand} />
            </details>
          )}
        </>
      )}
    </section>
  );
}
