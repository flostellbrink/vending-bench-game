import { Fragment, useState, useMemo } from "react";

import { msg } from "@/dictionary";
import { commandForMove } from "@/game/commands";
import { displayCell } from "@/game/reports";
import { useFormatters } from "@/localization/formatters";
import { fieldLabel } from "@/localization/messages";
import { clock } from "@/scene/clock";

import type { ObservationProps } from "./panel-props";

import { GuiToolInfo } from "./GuiToolInfo";
import { StorageBatches } from "./StorageBatches";
type Props = Pick<ObservationProps, "report" | "reports" | "money" | "state" | "disabled"> & {
  openReport: (id: number) => void;
  runCommand?: ObservationProps["runCommand"];
};
export function ReportGrid({ report, reports, money, runCommand, disabled, openReport }: Props) {
  const { collator } = useFormatters();
  const [sort, setSort] = useState<{ index: number; dir: number } | null>(null);
  const command = report.tool === "list_emails" ? "read_email" : null;
  const dailySales = report.tool === "get_sales_report" && report.columns[0] === "day";
  const [evidenceDay, setEvidenceDay] = useState<number | null>(null);
  const service =
    dailySales && evidenceDay !== null
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
        if (prior.mail && prior.args.email_id)
          letters.set(prior.args.email_id.toLowerCase(), prior.id);
      }
    }
    return letters;
  }, [command, reports]);
  const rows = useMemo(() => {
    if (!sort) return report.rows;
    return report.rows.toSorted((a, b) => {
      const first = a[sort.index],
        second = b[sort.index];
      const difference =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : collator.compare(String(first), String(second));
      return difference * sort.dir;
    });
  }, [report, sort, collator]);
  return (
    <table className="observation-grid" data-report={report.tool}>
      <thead>
        <tr>
          {report.columns.map((c, i) => (
            <th
              key={c}
              data-field={c}
              scope="col"
              aria-sort={sort?.index === i ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
            >
              <button onClick={() => setSort({ index: i, dir: sort?.index === i ? -sort.dir : 1 })}>
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
                        aria-label={
                          msg.operator.serviceReceipts() + " · " + msg.operator.day() + " " + c
                        }
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
                    {cached !== undefined ? (
                      <button className="receipt-link" onClick={() => openReport(cached)}>
                        #{cached} · {msg.operator.noCharge()}
                      </button>
                    ) : runCommand ? (
                      <GuiToolInfo verb={command}>
                        <button
                          data-clock-verb={command}
                          disabled={disabled}
                          onClick={() =>
                            runCommand(commandForMove([command, { email_id: String(r[0]) }]))
                          }
                        />
                      </GuiToolInfo>
                    ) : (
                      "—"
                    )}
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
    </table>
  );
}
