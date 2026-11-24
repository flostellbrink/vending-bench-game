import { msg } from "@/dictionary";

import type { ObservationProps } from "./panel-props";

import "./financial-readouts.css";
type Props = Pick<ObservationProps, "report" | "reports" | "state" | "money"> & {
  openReport: (id: number) => void;
};
export function DayStatement({ report, reports, state, money, openReport }: Props) {
  const earlier = reports.filter((r) => r.day === report.day && r.id < report.id);
  const opening = earlier[0]?.openingCash ?? report.openingCash;
  const fee = report.notices.some((notice) => notice.includes("could not pay")) ? 0 : state.fee;
  const paid = report.terms?.paid ?? 0;
  const other =
    (Math.round(report.closingCash * 100) -
      Math.round(report.openingCash * 100) +
      Math.round(fee * 100) +
      Math.round(paid * 100)) /
    100;
  return (
    <section className="day-statement">
      <header>
        <h3>{msg.operator.statement()}</h3>
        <span>
          {msg.operator.day()} {report.day}
        </span>
      </header>
      <dl>
        <div>
          <dt>{msg.operator.opening()}</dt>
          <dd>{money(opening)}</dd>
        </div>
        {earlier
          .filter((r) => r.openingCash !== r.closingCash)
          .map((r) => (
            <div key={r.id}>
              <dt>
                <button
                  aria-haspopup="dialog"
                  className="receipt-link"
                  onClick={() => openReport(r.id)}
                >
                  #{r.id} {r.line}
                </button>
              </dt>
              <dd>{money(r.closingCash - r.openingCash)}</dd>
            </div>
          ))}
        {paid > 0 && (
          <div>
            <dt>{report.terms?.order}</dt>
            <dd>{money(-paid)}</dd>
          </div>
        )}
        {(
          [
            [
              report.tool === "wait_for_next_day"
                ? msg.operator.netReceipts
                : msg.operator.otherCash,
              other,
            ],
            [msg.operator.fee, 0 - fee],
            [msg.operator.closing, report.closingCash],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label()}
            className={label === msg.operator.closing ? "statement-total" : undefined}
          >
            <dt>{label()}</dt>
            <dd>{money(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
