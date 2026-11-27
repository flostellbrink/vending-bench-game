import { hasValue, type Optional } from "games-common/language";
import { Fragment, useState, useMemo, type ReactNode } from "react";

import { msg } from "@/dictionary/index.ts";
import { commandForMove } from "@/game/commands.ts";
import { displayCell } from "@/game/reports.ts";
import { useFormatters } from "@/localization/formatters.ts";
import { fieldLabel } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";

import type { ObservationProps } from "./panel-props.ts";

import { GuiToolInfo } from "./GuiToolInfo.tsx";
import { StorageBatches } from "./StorageBatches.tsx";

interface Sort {
  index: number;
  dir: number;
}
function ariaSort(index: number, sort: Optional<Sort>) {
  if (sort?.index !== index) {
    return "none";
  }
  return sort.dir === 1 ? "ascending" : "descending";
}

/** Opens a letter of the mail list: free when an earlier read is on file. */
function LetterAction({
  command,
  emailId,
  cached,
  disabled,
  runCommand,
  openReport,
}: {
  command: "read_email";
  emailId: string;
  cached: Optional<number>;
  disabled: boolean;
  runCommand?: ObservationProps["runCommand"];
  openReport: (id: number) => void;
}) {
  if (hasValue(cached)) {
    return (
      <button className="receipt-link" onClick={() => openReport(cached)}>
        #{cached} · {msg.operator.noCharge()}
      </button>
    );
  }
  if (!runCommand) {
    return "—";
  }
  return (
    <GuiToolInfo
      verb={command}
      disabled={disabled}
      onClick={() => runCommand(commandForMove([command, { email_id: emailId }]))}
    />
  );
}

type Props = Pick<ObservationProps, "report" | "reports" | "money" | "state" | "disabled"> & {
  openReport: (id: number) => void;
  runCommand?: ObservationProps["runCommand"];
  visibleRows?: ObservationProps["report"]["rows"];
  footer?: ReactNode;
};
export function ReportGrid({
  report,
  reports,
  money,
  runCommand,
  disabled,
  openReport,
  visibleRows = report.rows,
  footer,
}: Props) {
  const { collator } = useFormatters();
  const [sort, setSort] = useState<Optional<Sort>>(null);
  const command = report.tool === "list_emails" ? "read_email" : null;
  const dailySales = report.tool === "get_sales_report" && report.columns[0] === "day";
  const [evidenceDay, setEvidenceDay] = useState<Optional<number>>(null);
  const service =
    dailySales && hasValue(evidenceDay)
      ? reports.filter(
          (r) =>
            r.id < report.id &&
            r.day === evidenceDay &&
            r.args.slot &&
            (!report.args.location || r.args.slot.split(":")[0] === report.args.location),
        )
      : [];
  const readLetters = useMemo(() => {
    const letters = new Map<string, number>();
    if (command) {
      for (const prior of reports) {
        if (prior.mail && prior.args.email_id) {
          letters.set(prior.args.email_id.toLowerCase(), prior.id);
        }
      }
    }
    return letters;
  }, [command, reports]);
  const rows = useMemo(() => {
    if (!sort) {
      return visibleRows;
    }
    return visibleRows.toSorted((a, b) => {
      const first = a[sort.index];
      const second = b[sort.index];
      const difference =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : collator.compare(String(first), String(second));
      return difference * sort.dir;
    });
  }, [visibleRows, sort, collator]);
  return (
    <table className="observation-grid" data-report={report.tool}>
      <thead>
        <tr>
          {report.columns.map((c, i) => (
            <th key={c} data-field={c} scope="col" aria-sort={ariaSort(i, sort)}>
              <button onClick={() => setSort({ dir: sort?.index === i ? -sort.dir : 1, index: i })}>
                {fieldLabel(c)} {sort?.index === i && (sort.dir === 1 ? "↑" : "↓")}
              </button>
            </th>
          ))}
          {command && <th>{msg.operator.read()}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const cached = readLetters.get(String(r[0]).toLowerCase());
          return (
            <Fragment key={dailySales ? r[0] : i}>
              <tr>
                {r.map((c, j) => (
                  <td key={j} data-field={report.columns[j]}>
                    {dailySales && j === 0 ? (
                      <button
                        className="receipt-link"
                        aria-expanded={evidenceDay === Number(c)}
                        aria-label={`${msg.operator.serviceReceipts()} · ${msg.operator.day()} ${c}`}
                        onClick={() => setEvidenceDay(evidenceDay === Number(c) ? null : Number(c))}
                      >
                        {c}
                      </button>
                    ) : (
                      displayCell(c, report.columns[j], money)
                    )}
                    {j === 1 && report.batches && (
                      <StorageBatches report={report} product={String(r[0])} />
                    )}
                  </td>
                ))}
                {command && (
                  <td>
                    <LetterAction
                      command={command}
                      emailId={String(r[0])}
                      cached={cached}
                      disabled={disabled}
                      runCommand={runCommand}
                      openReport={openReport}
                    />
                  </td>
                )}
              </tr>
              {dailySales && evidenceDay === Number(r[0]) && (
                <tr className="sales-evidence">
                  <td colSpan={report.columns.length}>
                    <strong>{msg.operator.serviceReceipts()}</strong>
                    {service.length ? (
                      service.map((entry) => (
                        <button
                          key={entry.id}
                          className="receipt-link"
                          onClick={() => openReport(entry.id)}
                        >
                          #{entry.id} · {clock(entry.minute)} · {entry.line}
                        </button>
                      ))
                    ) : (
                      <span>{msg.operator.empty()}</span>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
      {footer && <tfoot>{footer}</tfoot>}
    </table>
  );
}
