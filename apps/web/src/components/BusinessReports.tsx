import type { Release } from "games-common/benchmark";

import { useId, useState } from "react";

import { commandForMove } from "@/game/commands";
import { stationMessages as msg } from "@/localization/station-messages";

import type { ObservationProps } from "./panel-props";

import { EmailComposer } from "./EmailComposer";
import { ControlInput, ControlRow, Field } from "./FormControls";
import { GuiToolInfo } from "./GuiToolInfo";
import ObservationView from "./ObservationView";
import "./business-reports.css";

type Props = Omit<ObservationProps, "report"> & {
  release: Release;
  openReport: (id: number) => void;
};

export function Mailbox(props: Props) {
  const { reports, t, lang, runCommand, disabled } = props;
  const defaults = props.release.toolDefaults.list_emails;
  const [folder, setFolder] = useState<string>(defaults.folder);
  const folders = useId();
  const emailIds = useId();
  const [emailId, setEmailId] = useState("");
  const [limit, setLimit] = useState(String(defaults.limit));
  const [unread, setUnread] = useState(defaults.unread_only);
  const valid = limit !== "" && Number.isSafeInteger(Number(limit));
  const options = { locale: lang };
  const report = reports.findLast(
    (r) =>
      r.tool === "list_emails" &&
      (r.args.folder ?? defaults.folder) === folder &&
      (r.args.limit ?? defaults.limit) === Number(limit) &&
      (r.args.unread_only ?? defaults.unread_only) === unread,
  );
  return (
    <section className="business-report sheet">
      <div className="report-actions">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !disabled)
              runCommand(
                commandForMove([
                  "list_emails",
                  { folder, unread_only: unread, limit: Number(limit) },
                ]),
                false,
                true,
              );
          }}
        >
          <ControlRow>
            <Field label={msg.fields.folder({}, options)}>
              <ControlInput
                value={folder}
                list={folders}
                onChange={(e) => setFolder(e.currentTarget.value)}
              />
              <datalist id={folders}>
                <option value="inbox">{msg.operator.incomingMail({}, options)}</option>
                <option value="sent">{msg.operator.sentMail({}, options)}</option>
              </datalist>
            </Field>
            <Field label={msg.fields.limit({}, options)}>
              <ControlInput
                type="number"
                step="1"
                required
                value={limit}
                onChange={(e) => setLimit(e.currentTarget.value)}
              />
            </Field>
            <Field inline className="report-breakdown" label={msg.fields.unread_only({}, options)}>
              <ControlInput
                type="checkbox"
                checked={unread}
                onChange={(e) => setUnread(e.currentTarget.checked)}
              />
            </Field>
            <GuiToolInfo verb="list_emails">
              <button type="submit" disabled={disabled || !valid} data-clock-verb="list_emails" />
            </GuiToolInfo>
          </ControlRow>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled && emailId)
              runCommand(commandForMove(["read_email", { email_id: emailId }]));
          }}
        >
          <ControlRow>
            <Field label={msg.fields.email_id({}, options)}>
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
            <GuiToolInfo verb="read_email">
              <button type="submit" disabled={disabled || !emailId} data-clock-verb="read_email" />
            </GuiToolInfo>
          </ControlRow>
        </form>
        <EmailComposer to="" {...{ t, disabled, reports }} send={runCommand} />
      </div>
      {report ? (
        <ObservationView {...props} report={report} />
      ) : (
        <p>{msg.operator.folderNotChecked({}, options)}</p>
      )}
    </section>
  );
}

export function SalesReports(props: Props) {
  const { state, lang, reports, runCommand, disabled } = props;
  const options = { locale: lang };
  const defaults = props.release.toolDefaults.get_sales_report;
  const siteList = useId();
  const [site, setSite] = useState(defaults.location);
  const [days, setDays] = useState(String(defaults.days));
  const [byProduct, setByProduct] = useState(defaults.by_product);
  const valid = days !== "" && Number.isSafeInteger(Number(days));
  const report = reports.findLast(
    (r) =>
      r.tool === "get_sales_report" &&
      (r.args.location ?? defaults.location) === site &&
      (r.args.days ?? defaults.days) === Number(days) &&
      (r.args.by_product ?? defaults.by_product) === byProduct,
  );
  return (
    <section className="business-report sheet">
      <form
        className="report-actions"
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && valid)
            runCommand(
              commandForMove([
                "get_sales_report",
                { days: Number(days), location: site, by_product: byProduct },
              ]),
              false,
              true,
            );
        }}
      >
        <ControlRow>
          <Field label={msg.fields.location({}, options)}>
            <ControlInput
              list={siteList}
              value={site}
              placeholder={msg.operator.allSites({}, options)}
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
          <Field label={msg.fields.days({}, options)}>
            <ControlInput
              type="number"
              step="1"
              required
              value={days}
              onChange={(e) => setDays(e.currentTarget.value)}
            />
          </Field>
          <Field
            inline
            className="report-breakdown"
            label={msg.operator.productBreakdown({}, options)}
          >
            <ControlInput
              type="checkbox"
              checked={byProduct}
              onChange={(e) => setByProduct(e.currentTarget.checked)}
            />
          </Field>
          <GuiToolInfo verb="get_sales_report">
            <button disabled={disabled || !valid} data-clock-verb="get_sales_report" />
          </GuiToolInfo>
        </ControlRow>
      </form>
      {report ? (
        <ObservationView {...props} report={report} />
      ) : (
        <p>{msg.operator.noSalesObservation({}, options)}</p>
      )}
    </section>
  );
}
