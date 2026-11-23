import type { ObservationProps } from "./panel-props";
type Props = Pick<ObservationProps, "report" | "state" | "t" | "money">;
export function DayStatement({ report, state, t, money }: Props) {
  const fee = report.output.includes("could not pay") ? 0 : state.fee;
  const net = report.closingCash - report.openingCash + fee;
  return (
    <section className="day-statement">
      <h3>
        {t("statement")} / {report.day}
      </h3>
      <dl>
        {(
          [
            ["opening", report.openingCash],
            ["netReceipts", net],
            ["fee", -fee],
            ["closing", report.closingCash],
          ] as const
        ).map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{money(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
