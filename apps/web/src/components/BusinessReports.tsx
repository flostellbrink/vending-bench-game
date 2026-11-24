import { useState } from "react";

import { address } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { stationMessages as msg } from "@/localization/station-messages";

import type { ObservationProps } from "./panel-props";

import { EmailComposer } from "./EmailComposer";
import { GuiToolInfo } from "./GuiToolInfo";
import ObservationView from "./ObservationView";
import "./business-reports.css";

type Props = Omit<ObservationProps, "report"> & { openReport: (id: number) => void };

export function Mailbox(props: Props) {
  const { reports, state, t, lang, runCommand, disabled } = props;
  const [folder, setFolder] = useState<"inbox" | "sent">(() =>
    reports.findLast((r) => r.tool === "list_emails")?.args.folder === "sent" ? "sent" : "inbox",
  );
  const options = { locale: lang };
  const report = reports.findLast(
    (r) => r.tool === "list_emails" && (r.args.folder ?? "inbox") === folder,
  );
  return (
    <section className="business-report sheet">
      <header className="report-actions">
        <div className="mail-folders" role="group" aria-label={msg.fields.folder({}, options)}>
          {(["inbox", "sent"] as const).map((id) => (
            <button
              type="button"
              key={id}
              aria-pressed={folder === id}
              onClick={() => setFolder(id)}
            >
              {id === "inbox"
                ? msg.operator.incomingMail({}, options)
                : msg.operator.sentMail({}, options)}
            </button>
          ))}
        </div>
        <GuiToolInfo verb="inbox" cost={timeLabel("inbox", state, t)}>
          <button
            type="button"
            disabled={disabled}
            data-clock-verb="inbox"
            onClick={() => runCommand("inbox " + folder, false, true)}
          >
            {msg.operator.checkFolder({}, options)}
          </button>
        </GuiToolInfo>
        <EmailComposer to="" {...{ state, t, disabled, reports }} send={runCommand} />
      </header>
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
  const last = reports.findLast((r) => r.tool === "get_sales_report")?.args;
  const [site, setSite] = useState(last?.location ?? "");
  const [days, setDays] = useState(last?.days?.toString() ?? "");
  const [byProduct, setByProduct] = useState(Boolean(last?.by_product));
  const line = ["sales", days, site && address(site), byProduct && "--by-product"]
    .filter(Boolean)
    .join(" ");
  const report = reports.findLast(
    (r) =>
      r.tool === "get_sales_report" &&
      (r.args.location ?? "") === site &&
      (r.args.days ?? undefined) === (days === "" ? undefined : Number(days)) &&
      Boolean(r.args.by_product) === byProduct,
  );
  return (
    <section className="business-report sheet">
      <form
        className="report-actions"
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) runCommand(line, false, true);
        }}
      >
        <label>
          {msg.fields.location({}, options)}
          <select value={site} onChange={(e) => setSite(e.currentTarget.value)}>
            <option value="">{msg.operator.allSites({}, options)}</option>
            {state.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {msg.fields.days({}, options)}
          <input
            type="number"
            min="1"
            step="1"
            value={days}
            placeholder="—"
            onChange={(e) => setDays(e.currentTarget.value)}
          />
        </label>
        <label className="report-breakdown">
          <input
            type="checkbox"
            checked={byProduct}
            onChange={(e) => setByProduct(e.currentTarget.checked)}
          />
          {msg.operator.productBreakdown({}, options)}
        </label>
        <GuiToolInfo verb="sales" cost={timeLabel("sales", state, t)}>
          <button disabled={disabled} data-clock-verb="sales">
            {t("execute")}
          </button>
        </GuiToolInfo>
      </form>
      {report ? (
        <ObservationView {...props} report={report} />
      ) : (
        <p>{msg.operator.noSalesObservation({}, options)}</p>
      )}
    </section>
  );
}
