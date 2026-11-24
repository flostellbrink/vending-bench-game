import { operatorText } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { clock, receiptEnd } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import CabinetBench from "./CabinetBench";
import { DayStatement } from "./DayStatement";
import { Metrics } from "./Metrics";
import { OrderSlip } from "./OrderSlip";
import { ReportGrid } from "./ReportGrid";
import { SupplierLetter } from "./SupplierLetter";
function ReceiptHeading({ report, t }: Pick<ObservationProps, "report" | "t">) {
  return (
    <header className="receipt-heading">
      <h2>{report.line}</h2>
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
  commandLine,
  stageCommand,
  openReport,
}: ObservationProps & { openReport: (id: number) => void }) {
  const text = report.display;
  const letterProps = {
    line: commandLine,
    state,
    t,
    disabled,
    stage: stageCommand,
    send: runCommand,
  };
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
      <ReceiptHeading report={report} t={t} />
      {report.mail ? (
        <article className="mail-paper">
          <h3>{report.mail.subject}</h3>
          <p>
            {report.mail.from} → {report.mail.to}
          </p>
          <pre>{report.mail.body}</pre>
          {from && (
            <SupplierLetter
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
                <SupplierLetter {...letterProps} to={entry.email} />
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
          {contact && <SupplierLetter {...letterProps} to={contact.email} />}
          {report.terms?.minimum !== undefined ? (
            <OrderSlip
              terms={report.terms}
              openReport={openReport}
              {...{
                report,
                reports,
                state,
                lang,
                t,
                money,
                runCommand,
                disabled,
                commandLine,
                stageCommand,
              }}
            />
          ) : (
            <>
              {report.terms?.order !== undefined && (
                <p className="terms">
                  {report.terms.order} · −{money(report.terms.paid)} · {t("expectedClose")}{" "}
                  {report.terms.eta}
                </p>
              )}
              {!!report.rows.length &&
                (report.tool === "get_machine_inventory" ? (
                  <CabinetBench
                    {...{
                      report,
                      reports,
                      state,
                      lang,
                      t,
                      commandLine,
                      stageCommand,
                      runCommand,
                      disabled,
                    }}
                  />
                ) : (
                  <ReportGrid
                    {...{ report, reports, t, lang, state, runCommand, disabled, openReport }}
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
