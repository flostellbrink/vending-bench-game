import type { ReactNode } from "react";

import { msg } from "@/dictionary";
import { priceOrder } from "@/game/commands";
import { purchaseSupplier as supplierForPurchase } from "@/game/suppliers";
import { orderStatus } from "@/localization/messages";
import { clock, receiptEnd } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import CabinetBench from "./CabinetBench";
import { DayStatement } from "./DayStatement";
import { EmailComposer } from "./EmailComposer";
import { Metrics } from "./Metrics";
import { OrderSlip, QuoteRequest } from "./OrderSlip";
import { ReportGrid } from "./ReportGrid";
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
}: ObservationProps & {
  openReport: (id: number) => void;
  action?: ReactNode;
  openSupplier?: (id: string) => void;
}) {
  const text = report.display;
  const refusedOrder = report.tool === "order_goods" && text.startsWith("Order refused:");
  const estimate = refusedOrder
    ? priceOrder(
        report.line,
        { day: report.day, cash: report.openingCash },
        reports.filter((r) => r.id < report.id),
      )
    : null;
  const purchaseSupplier = supplierForPurchase(report, reports);
  const letterProps = { reports, disabled, send: runCommand };
  const contact =
    report.terms?.minimum === undefined
      ? undefined
      : reports.flatMap((r) => r.directory).find((entry) => entry.id === report.args.supplier_id);
  const from = report.mail?.from.match(/<([^<>\s]+@[^<>\s]+)>$/)?.[1];
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
      {report.mail ? (
        <article className="mail-paper">
          <h3>{report.mail.subject}</h3>
          <p>
            {report.mail.from} → {report.mail.to}
          </p>
          <pre>{report.mail.body}</pre>
          {from && (
            <EmailComposer
              key={report.id}
              {...letterProps}
              to={sent ? report.mail.to : from}
              subject={
                report.mail.subject.startsWith("Re: ")
                  ? report.mail.subject
                  : "Re: " + report.mail.subject
              }
            />
          )}
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
                  {msg.operator.minimum()}: <b>{entry.minimum}</b>
                </div>
                <div className="supplier-contact">
                  <span>{entry.email}</span>
                  <EmailComposer {...letterProps} to={entry.email} />
                </div>
              </div>
              <QuoteRequest supplier={entry.id} {...{ state, disabled, runCommand }} />
            </article>
          ))}
          {!action && contact && (
            <div className="supplier-contact">
              <span>{contact.email}</span>
              <EmailComposer key={contact.email} {...letterProps} to={contact.email} />
            </div>
          )}
          {report.terms?.minimum !== undefined && report.args.supplier_id ? (
            <OrderSlip
              key={report.id}
              supplier={report.args.supplier_id}
              openReport={openReport}
              {...{ report, reports, state, money, runCommand, disabled }}
            />
          ) : (
            <>
              {report.terms?.order !== undefined && (
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
              {!!report.rows.length &&
                (report.tool === "get_machine_inventory" ? (
                  <CabinetBench
                    live={Boolean(action)}
                    openReport={openReport}
                    {...{ report, reports, state, money, runCommand, disabled }}
                  />
                ) : (
                  <ReportGrid
                    {...{ report, reports, money, state, runCommand, disabled, openReport }}
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
              {estimate.cost !== undefined && (
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
      {report.endDay !== report.day && (
        <DayStatement {...{ report, reports, state, money, openReport }} />
      )}
      {report.notices?.length > 0 && (
        <div className="overnight-notices">
          {report.notices.map((notice, i) => (
            <p key={i}>{notice}</p>
          ))}
        </div>
      )}
    </section>
  );
}
