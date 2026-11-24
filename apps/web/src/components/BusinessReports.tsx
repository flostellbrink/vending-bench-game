import type { Release } from "games-common/benchmark";

import { useId, useState } from "react";

import { msg } from "@/dictionary";
import { commandForMove } from "@/game/commands";

import type { ObservationProps } from "./panel-props";

import { DailyRevenue } from "./DailyRevenue";
import { EmailComposer } from "./EmailComposer";
import { ActionForm, ControlInput, Field } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";
import ObservationView from "./ObservationView";
import "./business-reports.css";

type Props = Omit<ObservationProps, "report"> & {
  release: Release;
  openReport: (id: number) => void;
};

export function Mailbox(props: Props) {
  const { reports, runCommand, disabled } = props;
  const defaults = props.release.toolDefaults.list_emails;
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
          <EmailComposer to="" {...{ disabled, reports }} send={runCommand} />
        </div>
        <ActionForm
          className="mail-list-controls"
          aria-label={msg.commands.list_emails()}
          actions={
            <GuiToolInfo verb="list_emails">
              <button type="submit" disabled={disabled} data-clock-verb="list_emails" />
            </GuiToolInfo>
          }
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled)
              runCommand(
                commandForMove([
                  "list_emails",
                  { folder, unread_only: unread, limit: props.release.reportLimits.mailCount },
                ]),
                "inline",
              );
          }}
        >
          <Field label={msg.fields.folder()}>
            <ControlInput
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
            <ControlInput
              type="checkbox"
              checked={unread}
              onChange={(e) => setUnread(e.currentTarget.checked)}
            />
          </Field>
        </ActionForm>
      </div>
      {report ? (
        <ObservationView {...props} report={report} />
      ) : (
        <p className="readout-empty">{msg.operator.folderNotChecked()}</p>
      )}
      <div className="mail-lookup">
        <ActionForm
          className="compact"
          aria-label={msg.commands.read_email()}
          actions={
            <GuiToolInfo verb="read_email">
              <button
                type="submit"
                aria-haspopup="dialog"
                disabled={disabled || !emailId}
                data-clock-verb="read_email"
              />
            </GuiToolInfo>
          }
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled && emailId)
              runCommand(commandForMove(["read_email", { email_id: emailId }]));
          }}
        >
          <Field label={msg.fields.email_id()}>
            <ControlInput
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

export function SalesReports(props: Props) {
  const { state, reports, runCommand, disabled } = props;
  const defaults = props.release.toolDefaults.get_sales_report;
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
        actions={
          <GuiToolInfo verb="get_sales_report">
            <button disabled={disabled || !valid} data-clock-verb="get_sales_report" />
          </GuiToolInfo>
        }
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && valid)
            runCommand(
              commandForMove([
                "get_sales_report",
                {
                  days: byProduct ? Number(days) : props.release.reportLimits.salesDays,
                  location: site,
                  by_product: byProduct,
                },
              ]),
              "inline",
            );
        }}
      >
        <Field label={msg.fields.location()}>
          <ControlInput
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
            <ControlInput
              type="number"
              step="1"
              required
              value={days}
              onChange={(e) => setDays(e.currentTarget.value)}
            />
          </Field>
        )}
        <Field inline className="report-breakdown" label={msg.operator.productBreakdown()}>
          <ControlInput
            type="checkbox"
            checked={byProduct}
            onChange={(e) => setByProduct(e.currentTarget.checked)}
          />
        </Field>
      </ActionForm>
      {report && !byProduct && report.rows.length ? (
        <DailyRevenue key={site} {...props} report={report} />
      ) : report ? (
        <ObservationView {...props} report={report} />
      ) : (
        <p className="readout-empty">{msg.operator.noSalesObservation()}</p>
      )}
    </section>
  );
}
