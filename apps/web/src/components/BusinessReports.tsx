import type { Release } from "games-common/benchmark";

import { useState } from "react";

import { address } from "@/game/commands";
import { stationMessages as msg } from "@/localization/station-messages";

import type { ObservationProps } from "./panel-props";

import { EmailComposer } from "./EmailComposer";
import { ControlInput, ControlRow, ControlSelect, Field, QuantityInput } from "./FormControls";
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
  const [folder, setFolder] = useState(defaults.folder);
  const [limit, setLimit] = useState(String(defaults.limit));
  const [unread, setUnread] = useState(defaults.unread_only);
  const valid = Number.isSafeInteger(Number(limit)) && Number(limit) > 0;
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
                ["inbox", folder, ...(unread ? ["--unread"] : []), "--limit", limit].join(" "),
                false,
                true,
              );
          }}
        >
          <ControlRow>
            <Field label={msg.fields.folder({}, options)}>
              <ControlSelect
                value={folder}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  if (value === "inbox" || value === "sent") setFolder(value);
                }}
              >
                <option value="inbox">{msg.operator.incomingMail({}, options)}</option>
                <option value="sent">{msg.operator.sentMail({}, options)}</option>
              </ControlSelect>
            </Field>
            <Field label={msg.fields.limit({}, options)}>
              <QuantityInput
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
            <GuiToolInfo verb="inbox">
              <button type="submit" disabled={disabled || !valid} data-clock-verb="inbox">
                {msg.operator.checkFolder({}, options)}
              </button>
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
  const { state, lang, t, reports, runCommand, disabled } = props;
  const options = { locale: lang };
  const defaults = props.release.toolDefaults.get_sales_report;
  const [site, setSite] = useState(defaults.location);
  const [days, setDays] = useState(String(defaults.days));
  const [byProduct, setByProduct] = useState(defaults.by_product);
  const valid = Number.isSafeInteger(Number(days)) && Number(days) > 0;
  const line = ["sales", days, site && address(site), byProduct && "--by-product"]
    .filter(Boolean)
    .join(" ");
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
          if (!disabled && valid) runCommand(line, false, true);
        }}
      >
        <ControlRow>
          <Field label={msg.fields.location({}, options)}>
            <ControlSelect value={site} onChange={(e) => setSite(e.currentTarget.value)}>
              <option value="">{msg.operator.allSites({}, options)}</option>
              {state.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </ControlSelect>
          </Field>
          <Field label={msg.fields.days({}, options)}>
            <QuantityInput required value={days} onChange={(e) => setDays(e.currentTarget.value)} />
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
          <GuiToolInfo verb="sales">
            <button disabled={disabled || !valid} data-clock-verb="sales">
              {t("execute")}
            </button>
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
