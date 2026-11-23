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
  return (
    <section className="sheet">
      <h2>{title}</h2>
      {backToBalance && (
        <button className="receipt-link" onClick={backToBalance}>
          {t("bank")}
        </button>
      )}
      {reports.length === 0 && <p>{t("empty")}</p>}
      {reports.toReversed().map((r) => (
        <button key={r.id} className="catalog" onClick={() => open(r.id)}>
          #{r.id} · {t("day")} {r.day} · {clock(r.minute)} · {r.line}
          {r.openingCash !== r.closingCash && " · " + money(r.closingCash - r.openingCash)}
        </button>
      ))}
    </section>
  );
}
