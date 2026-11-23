import { assertValue } from "games-common/language";
import { useState, useMemo } from "react";

import { timing } from "@/game/commands";
import { fieldLabel } from "@/localization/messages";

import type { ObservationProps } from "./panel-props";
type Props = Pick<ObservationProps, "report" | "t" | "lang" | "state" | "runCommand" | "disabled">;
export function ReportGrid({ report, t, lang, state, runCommand, disabled }: Props) {
  const [sort, setSort] = useState<{ index: number; dir: number } | null>(null);
  const command = report.tool === "list_emails" ? "read" : null;
  const rows = useMemo(() => {
    if (!sort) return report.rows;
    return report.rows.toSorted(
      (a, b) =>
        String(a[sort.index]).localeCompare(String(b[sort.index]), lang, { numeric: true }) *
        sort.dir,
    );
  }, [report, sort, lang]);
  return (
    <table>
      <thead>
        <tr>
          {report.columns.map((c, i) => (
            <th
              key={c}
              aria-sort={sort?.index === i ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
            >
              <button onClick={() => setSort({ index: i, dir: sort?.index === i ? -sort.dir : 1 })}>
                {fieldLabel(c, lang)} {sort?.index === i ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
              </button>
            </th>
          ))}
          {command && <th>{t("charged")}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
            {command && (
              <td>
                <button
                  data-clock-verb={command}
                  disabled={disabled}
                  onClick={() => runCommand(command + " " + r[0])}
                >
                  {t("read")} · {assertValue(timing(command, state)).minutes} min
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
