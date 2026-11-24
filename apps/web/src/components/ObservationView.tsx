import type { ReactNode } from "react";

import { operatorText, priceOrder } from "@/game/commands";
import { purchaseSupplier as supplierForPurchase } from "@/game/suppliers";
import { timeLabel } from "@/game/time-label";
import { clock, receiptEnd } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import CabinetBench from "./CabinetBench";
import { DayStatement } from "./DayStatement";
import { EmailComposer } from "./EmailComposer";
import { GuiToolInfo } from "./GuiToolInfo";
import { Metrics } from "./Metrics";
import { OrderSlip } from "./OrderSlip";
import { ReportGrid } from "./ReportGrid";
function ReceiptHeading({
  report,
  t,
  action,
}: Pick<ObservationProps, "report" | "t"> & { action?: ReactNode }) {
  return (
    <header className="receipt-heading">
      {action ?? (report.terms?.order && <h3>{report.terms.order}</h3>)}
      <small>
        #{report.id} · {t("day")} {report.day} · {clock(report.minute)} →{" "}
        {receiptEnd(report, t("day"))} · {report.minutes} min
      </small>
    </header>
  );
}

export default function ObservationView({
  report,
  reports,
  state,
  lang,
  t,
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
        { order_goods: [] },
        reports.filter((r) => r.id < report.id),
      )
    : null;
  const purchaseSupplier = supplierForPurchase(report, reports);
  const letterProps = { state, reports, t, disabled, send: runCommand };
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
      <ReceiptHeading report={report} t={t} action={action} />
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
                  {t("minimum")}: <b>{entry.minimum}</b> · {entry.email}
                </div>
                <EmailComposer {...letterProps} to={entry.email} />
              </div>
              <GuiToolInfo verb="quote" cost={timeLabel("quote", state, t)}>
                <button
                  data-clock-verb="quote"
                  disabled={disabled}
                  onClick={() => runCommand("quote " + entry.id)}
                >
                  {t("reprice")}
                </button>
              </GuiToolInfo>
            </article>
          ))}
          {!action && contact && (
            <EmailComposer key={contact.email} {...letterProps} to={contact.email} />
          )}
          {report.terms?.minimum !== undefined ? (
            <OrderSlip
              key={report.id}
              terms={report.terms}
              openReport={openReport}
              {...{ report, reports, state, lang, t, money, runCommand, disabled }}
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
                  · {t("amountPaid")}: {money(report.terms.paid)} · {t("expectedClose")}{" "}
                  {report.terms.eta}
                </p>
              )}
              {!!report.rows.length &&
                (report.tool === "get_machine_inventory" ? (
                  <CabinetBench
                    live={Boolean(action)}
                    openReport={openReport}
                    {...{ report, reports, state, lang, t, money, runCommand, disabled }}
                  />
                ) : (
                  <ReportGrid
                    {...{
                      report,
                      reports,
                      t,
                      lang,
                      money,
                      state,
                      runCommand,
                      disabled,
                      openReport,
                    }}
                  />
                ))}
            </>
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
          {estimate && (
            <div className="terms">
              {estimate.cost !== undefined && (
                <p>
                  {t("quoted")}: {money(estimate.cost)} · {t("minimum")}: {money(estimate.minimum)}
                </p>
              )}
              {(estimate.status === "belowMinimum" || estimate.status === "lowCash") && (
                <p>
                  {t(estimate.status)} · {t("shortBy")}:{" "}
                  {money(
                    estimate.status === "belowMinimum"
                      ? estimate.minimum - estimate.cost
                      : -estimate.remaining,
                  )}
                </p>
              )}
              {(estimate.status === "needQuote" || estimate.status === "expiredQuote") && (
                <p>{t(estimate.status)}</p>
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
              <summary>{t("demand")}</summary>
              <Metrics data={report.demand} lang={lang} />
            </details>
          )}
        </>
      )}
      {report.endDay !== report.day && (
        <DayStatement {...{ report, reports, state, t, money, openReport }} />
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
