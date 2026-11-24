import { assertValue } from "games-common/language";
import { useState, useMemo } from "react";

import { timing } from "@/game/commands";
import { fieldLabel } from "@/localization/messages";

import type { ObservationProps } from "./panel-props";

import { StorageBatches } from "./StorageBatches";
type Props = Pick<
  ObservationProps,
  "report" | "reports" | "t" | "lang" | "state" | "runCommand" | "disabled"
> & { openReport: (id: number) => void };
export function ReportGrid({
  report,
  reports,
  t,
  lang,
  state,
  runCommand,
  disabled,
  openReport,
}: Props) {
  const [sort, setSort] = useState<{ index: number; dir: number } | null>(null);
  const command = report.tool === "list_emails" ? "read" : null;
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
    return report.rows.toSorted(
      (a, b) =>
        String(a[sort.index]).localeCompare(String(b[sort.index]), lang, { numeric: true }) *
        sort.dir,
    );
  }, [report, sort, lang]);
  return (
    <table className="observation-grid">
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
                {fieldLabel(c, lang)} {sort?.index === i && (sort.dir === 1 ? "↑" : "↓")}
              </button>
            </th>
          ))}
          {command && <th>{t("read")}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const cached = readLetters.get(String(r[0]).toLowerCase());
          return (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} data-field={report.columns[j]}>
                  {c}
                  {j === 1 && report.batches && (
                    <StorageBatches report={report} product={String(r[0])} lang={lang} />
                  )}
                </td>
              ))}
              {command && (
                <td>
                  {cached !== undefined ? (
                    <button className="receipt-link" onClick={() => openReport(cached)}>
                      #{cached} · {t("noCharge")}
                    </button>
                  ) : (
                    <button
                      data-clock-verb={command}
                      disabled={disabled}
                      onClick={() => runCommand(command + " " + r[0])}
                    >
                      {t("read")} · {assertValue(timing(command, state)).minutes} min
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
