import type { CommandArgs } from "games-common/benchmark";

import { useState } from "react";

import { address, parse } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { stationMessages as msg } from "@/localization/station-messages";

import type { ObservationProps } from "./panel-props";

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
        <button
          type="button"
          disabled={disabled}
          data-clock-verb="inbox"
          onClick={() => runCommand("inbox " + folder, false, true)}
        >
          {msg.operator.checkFolder({}, options)} · {timeLabel("inbox", state, t)}
        </button>
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
  const { state, lang, t, reports, runCommand, disabled, stageCommand, commandLine } = props;
  const options = { locale: lang };
  const [lastQuery, rememberQuery] = useState(
    () => reports.findLast((r) => r.tool === "get_sales_report")?.line ?? "sales",
  );
  const line = /^sales(?:\s|$)/i.test(commandLine.trim()) ? commandLine.trim() : lastQuery;
  let args: CommandArgs | undefined;
  try {
    [, args] = parse(line, state, { get_sales_report: [] });
  } catch {
    // An incomplete shell command remains editable without becoming a paid report request.
  }
  const site = args?.location ?? "",
    days = args?.days?.toString() ?? "",
    byProduct = Boolean(args?.by_product);
  function stage(period: string, location: string, products: boolean) {
    stageCommand(
      ["sales", period, location && address(location), products && "--by-product"]
        .filter(Boolean)
        .join(" "),
    );
  }
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
          if (args && !disabled) {
            rememberQuery(line);
            runCommand(line, commandLine.trim() === line, true);
          }
        }}
      >
        <label>
          {msg.fields.location({}, options)}
          <select
            value={site}
            onChange={(e) => {
              const value = e.currentTarget.value;
              stage(days, value, byProduct);
            }}
          >
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
            onChange={(e) => {
              const value = e.currentTarget.value;
              stage(value, site, byProduct);
            }}
          />
        </label>
        <label className="report-breakdown">
          <input
            type="checkbox"
            checked={byProduct}
            onChange={(e) => {
              const value = e.currentTarget.checked;
              stage(days, site, value);
            }}
          />
          {msg.operator.productBreakdown({}, options)}
        </label>
        <button disabled={disabled || !args} data-clock-verb="sales">
          {t("execute")} · {timeLabel("sales", state, t)}
        </button>
      </form>
      {report ? (
        <ObservationView {...props} report={report} />
      ) : (
        <p>{msg.operator.noSalesObservation({}, options)}</p>
      )}
    </section>
  );
}
