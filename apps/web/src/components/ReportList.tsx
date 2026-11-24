import type { Report } from "games-common/benchmark";

import type { Money, Translate } from "@/localization/messages";

import { clock } from "@/scene/clock";

interface Props {
  reports: Report[];
  title: string;
  t: Translate;
  money: Money;
  open: (id: number) => void;
  backToBalance?: () => void;
}
export function ReportList({ reports, title, t, money, open, backToBalance }: Props) {
  const days = Map.groupBy(reports.toReversed(), (report) => report.day);
  return (
    <section className="sheet journal-sheet" aria-label={title}>
      {backToBalance && (
        <button className="receipt-link" onClick={backToBalance}>
          {t("bank")}
        </button>
      )}
      {reports.length === 0 && <p>{t("empty")}</p>}
      {Array.from(days, ([day, entries]) => (
        <section className="journal-day" key={day}>
          <h3>
            {t("day")} {day}
          </h3>
          {entries.map((r) => (
            <button key={r.id} onClick={() => open(r.id)}>
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
    </section>
  );
}
