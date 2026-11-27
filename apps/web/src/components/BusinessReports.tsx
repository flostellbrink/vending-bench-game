import type { Release, Report } from "games-common/benchmark";

import { type Optional } from "games-common/language";
import { useId, useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { commandForMove } from "@/game/commands.ts";

import type { ObservationProps } from "./panel-props.ts";

import { DailyRevenue } from "./DailyRevenue.tsx";
import { EmailComposer } from "./EmailComposer.tsx";
import { ActionForm, Field } from "./FormControls.tsx";
import { GuiToolInfo } from "./GuiToolInfo.tsx";
import ObservationView from "./ObservationView.tsx";
import "./business-reports.css";

type Props = Omit<ObservationProps, "report"> & {
  release: Release;
  openReport: (id: number) => void;
};

export function Mailbox({
  release,
  state,
  reports,
  money,
  runCommand,
  disabled,
  openReport,
}: Props) {
  const defaults = release.toolDefaults.list_emails;
  const [folder, setFolder] = useState<string>(defaults.folder);
  const folders = useId();
  const emailIds = useId();
  const [emailId, setEmailId] = useState("");
  const [unread, setUnread] = useState(defaults.unread_only);
  const report = reports.findLast(
    (r) =>
      r.tool === "list_emails" &&
      (r.args.folder ?? defaults.folder) === folder &&
      (r.args.unread_only ?? defaults.unread_only) === unread,
  );
  return (
    <section className="business-report sheet">
      <div className="mail-workbench">
        <div className="mail-composition">
          <EmailComposer to="" disabled={disabled} reports={reports} send={runCommand} />
        </div>
        <ActionForm
          className="mail-list-controls"
          aria-label={msg.commands.list_emails()}
          actions={<GuiToolInfo verb="list_emails" type="submit" disabled={disabled} />}
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled) {
              runCommand(
                commandForMove([
                  "list_emails",
                  { folder, limit: release.reportLimits.mailCount, unread_only: unread },
                ]),
                "inline",
              );
            }
          }}
        >
          <Field label={msg.fields.folder()}>
            <input
              className="control-input"
              value={folder}
              list={folders}
              onChange={(e) => setFolder(e.currentTarget.value)}
            />
            <datalist id={folders}>
              <option value="inbox">{msg.operator.incomingMail()}</option>
              <option value="sent">{msg.operator.sentMail()}</option>
            </datalist>
          </Field>
          <Field inline className="report-breakdown" label={msg.fields.unread_only()}>
            <input
              className="control-input"
              type="checkbox"
              checked={unread}
              onChange={(e) => setUnread(e.currentTarget.checked)}
            />
          </Field>
        </ActionForm>
      </div>
      {report ? (
        <ObservationView
          report={report}
          reports={reports}
          state={state}
          money={money}
          runCommand={runCommand}
          disabled={disabled}
          openReport={openReport}
        />
      ) : (
        <p className="readout-empty">{msg.operator.folderNotChecked()}</p>
      )}
      <div className="mail-lookup">
        <ActionForm
          className="compact"
          aria-label={msg.commands.read_email()}
          actions={
            <GuiToolInfo verb="read_email" type="submit" popup disabled={disabled || !emailId} />
          }
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled && emailId) {
              runCommand(commandForMove(["read_email", { email_id: emailId }]));
            }
          }}
        >
          <Field label={msg.fields.email_id()}>
            <input
              className="control-input"
              required
              list={emailIds}
              value={emailId}
              onChange={(event) => setEmailId(event.currentTarget.value)}
            />
            <datalist id={emailIds}>
              {[
                ...new Set(
                  reports
                    .filter((r) => r.tool === "list_emails")
                    .flatMap((r) => r.rows.map((row) => String(row[0]))),
                ),
              ].map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </Field>
        </ActionForm>
      </div>
    </section>
  );
}

/** The latest sales report for the chosen site and breakdown. */
function SalesReading({
  report,
  daily,
  site,
  reports,
  state,
  money,
  runCommand,
  disabled,
  openReport,
}: Omit<Props, "release"> & { report: Optional<Report>; daily: boolean; site: string }) {
  if (!report) {
    return <p className="readout-empty">{msg.operator.noSalesObservation()}</p>;
  }
  if (daily && report.rows.length) {
    return (
      <DailyRevenue
        key={site}
        report={report}
        reports={reports}
        state={state}
        money={money}
        runCommand={runCommand}
        disabled={disabled}
        openReport={openReport}
      />
    );
  }
  return (
    <ObservationView
      report={report}
      reports={reports}
      state={state}
      money={money}
      runCommand={runCommand}
      disabled={disabled}
      openReport={openReport}
    />
  );
}

export function SalesReports({
  release,
  state,
  reports,
  money,
  runCommand,
  disabled,
  openReport,
}: Props) {
  const defaults = release.toolDefaults.get_sales_report;
  const siteList = useId();
  const [site, setSite] = useState(defaults.location);
  const [days, setDays] = useState(String(defaults.days));
  const [byProduct, setByProduct] = useState(defaults.by_product);
  const valid = !byProduct || (days !== "" && Number.isSafeInteger(Number(days)));
  const report = reports.findLast(
    (r) =>
      r.tool === "get_sales_report" &&
      (r.args.location ?? defaults.location) === site &&
      (!byProduct || (r.args.days ?? defaults.days) === Number(days)) &&
      (r.args.by_product ?? defaults.by_product) === byProduct,
  );
  return (
    <section className="business-report sheet">
      <ActionForm
        className={byProduct ? "sales-controls by-product" : "sales-controls"}
        aria-label={msg.commands.get_sales_report()}
        actions={<GuiToolInfo verb="get_sales_report" disabled={disabled || !valid} />}
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && valid) {
            runCommand(
              commandForMove([
                "get_sales_report",
                {
                  by_product: byProduct,
                  days: byProduct ? Number(days) : release.reportLimits.salesDays,
                  location: site,
                },
              ]),
              "inline",
            );
          }
        }}
      >
        <Field label={msg.fields.location()}>
          <input
            className="control-input"
            list={siteList}
            value={site}
            placeholder={msg.operator.allSites()}
            onChange={(e) => setSite(e.currentTarget.value)}
          />
          <datalist id={siteList}>
            {state.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </datalist>
        </Field>
        {byProduct && (
          <Field label={msg.fields.days()}>
            <input
              className="control-input"
              type="number"
              step="1"
              required
              value={days}
              onChange={(e) => setDays(e.currentTarget.value)}
            />
          </Field>
        )}
        <Field inline className="report-breakdown" label={msg.operator.productBreakdown()}>
          <input
            className="control-input"
            type="checkbox"
            checked={byProduct}
            onChange={(e) => setByProduct(e.currentTarget.checked)}
          />
        </Field>
      </ActionForm>
      <SalesReading
        report={report}
        daily={!byProduct}
        site={site}
        reports={reports}
        state={state}
        money={money}
        runCommand={runCommand}
        disabled={disabled}
        openReport={openReport}
      />
    </section>
  );
}
