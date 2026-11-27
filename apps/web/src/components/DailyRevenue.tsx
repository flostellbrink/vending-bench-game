import { useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { salesRange } from "@/game/sales-range.ts";
import { useFormatters } from "@/localization/formatters.ts";
import { clock } from "@/scene/clock.ts";

import type { ObservationProps } from "./panel-props.ts";

import { Field } from "./FormControls.tsx";
import { Metrics } from "./Metrics.tsx";
import { ReportGrid } from "./ReportGrid.tsx";
import "./daily-revenue.css";

type Props = ObservationProps & { openReport: (id: number) => void };

export function DailyRevenue({
  report,
  reports,
  state,
  money,
  runCommand,
  disabled,
  openReport,
}: Props) {
  const { number } = useFormatters();
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const first = String(report.rows[0]?.[1]);
  const last = String(report.rows.at(-1)?.[1]);
  const start = from >= first && from <= last ? from : first;
  const end = through >= start && through <= last ? through : last;
  const range = salesRange(report.rows, start, end);
  const demand = report.display
    .split("\n")
    .find((line) => line.startsWith("Yesterday's demand multipliers"));
  return (
    <section className="daily-revenue">
      <header className="sales-source">
        <button
          className="receipt-link"
          type="button"
          aria-haspopup="dialog"
          onClick={() => openReport(report.id)}
        >
          {msg.operator.source()} #{report.id}
        </button>
        <span>
          {msg.operator.day()} {report.day} · {clock(report.minute)}
        </span>
      </header>
      <fieldset className="sales-range">
        <legend>
          {msg.operator.salesDateRange()} · {msg.operator.noCharge()}
        </legend>
        <div>
          <Field label={msg.operator.rangeFrom()}>
            <input
              className="control-input"
              type="date"
              value={start}
              min={first}
              max={end}
              onChange={(event) => setFrom(event.currentTarget.value)}
            />
          </Field>
          <Field label={msg.operator.rangeThrough()}>
            <input
              className="control-input"
              type="date"
              value={end}
              min={start}
              max={last}
              onChange={(event) => setThrough(event.currentTarget.value)}
            />
          </Field>
        </div>
      </fieldset>
      <ReportGrid
        report={report}
        reports={reports}
        state={state}
        money={money}
        runCommand={runCommand}
        disabled={disabled}
        openReport={openReport}
        visibleRows={range.rows}
        footer={
          <>
            <tr>
              <th scope="row" colSpan={3}>
                {msg.operator.total()}
              </th>
              <td data-field="units">{number.format(range.units)}</td>
              <td data-field="revenue">{money(range.revenue)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                {msg.operator.averagePerDay()}
              </th>
              <td data-field="units">{number.format(range.averageUnits)}</td>
              <td data-field="revenue">{money(range.averageRevenue)}</td>
            </tr>
          </>
        }
      />
      {(report.demand || demand) && (
        <details className="sales-demand">
          <summary>
            {msg.operator.demand()} · {last}
          </summary>
          {report.demand ? <Metrics data={report.demand} /> : <p lang="en">{demand}</p>}
        </details>
      )}
    </section>
  );
}
