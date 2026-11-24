import type { Report } from "games-common/benchmark";

import type { Money } from "@/localization/messages";

import { msg } from "@/dictionary";
import { clock } from "@/scene/clock";

interface Props {
  reports: Report[];

  money: Money;
  open: (id: number) => void;
}
export function ReportList({ reports, money, open }: Props) {
  const days = Map.groupBy(reports.toReversed(), (report) => report.day);
  return (
    <div className="sheet journal-sheet">
      {reports.length === 0 && <p>{msg.operator.empty()}</p>}
      {Array.from(days, ([day, entries]) => (
        <section className="journal-day" key={day}>
          <h3>
            {msg.operator.day()} {day}
          </h3>
          {entries.map((r) => (
            <button aria-haspopup="dialog" key={r.id} onClick={() => open(r.id)}>
              <small>#{r.id}</small>
              <time>{clock(r.minute)}</time>
              <span>{r.line}</span>
              {r.openingCash !== r.closingCash && (
                <b>
                  {r.closingCash > r.openingCash ? "+" : ""}
                  {money(r.closingCash - r.openingCash)}
                </b>
              )}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
