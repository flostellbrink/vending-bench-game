import { operatorText } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import CabinetBench from "./CabinetBench";
import { DayStatement } from "./DayStatement";
import { Metrics } from "./Metrics";
import { OrderSlip } from "./OrderSlip";
import { ReportGrid } from "./ReportGrid";
function ReceiptHeading({ report, t }: Pick<ObservationProps, "report" | "t">) {
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
}: ObservationProps) {
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
          {report.terms?.minimum !== undefined ? (
            <OrderSlip
              terms={report.terms}
              {...{
                report,
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
                  <ReportGrid {...{ report, t, lang, state, runCommand, disabled }} />
                ))}
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
          {report.demand && (
            <details>
              <summary>{t("demand")}</summary>
              <Metrics data={report.demand} lang={lang} />
            </details>
          )}
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
