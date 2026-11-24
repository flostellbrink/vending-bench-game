import type { Snapshot, Rival, PersonalBest, Report } from "games-common/benchmark";

import {
  translate,
  type Lang,
  type Money,
  type ScreenTranslate,
  type Translate,
} from "@/localization/messages";
import { stationMessages as msg } from "@/localization/station-messages";
import { clock } from "@/scene/clock";

import { PaceReview } from "./PaceReview";
interface Props {
  state: Snapshot | null;
  rivals: Rival[];
  best: PersonalBest | null;
  lang: Lang;
  t: Translate;
  screen: ScreenTranslate;
  reports: Report[];
  openReport: (id: number) => void;
  money: Money;
  history: number[];
  reviewDay: (day: number) => void;
}
export function Scorecard({
  state,
  rivals,
  best,
  lang,
  t,
  screen,
  reports,
  openReport,
  money,
  history,
  reviewDay,
}: Props) {
  const score = state?.final?.reward ?? null;
  return (
    <section className="sheet scorecard">
      <h2>{state?.over ? (state.failed ? t("bankrupt") : screen("complete")) : t("standings")}</h2>
      {score === null ? (
        <p>{t("unfinished")}</p>
      ) : (
        <strong className="final-score">{money(score)}</strong>
      )}
      {!rivals.some((r) => r.kind === "model") && <p>{t("noRivals")}</p>}
      {state?.final && (
        <dl className="end-totals">
          <div>
            <dt>{t("revenue")}</dt>
            <dd>{money(state.final.gross_revenue)}</dd>
          </div>
          <div>
            <dt>{t("siteFees")}</dt>
            <dd>{money(state.final.fees_paid)}</dd>
          </div>
          <div>
            <dt>{t("units")}</dt>
            <dd>{state.final.units_sold}</dd>
          </div>
        </dl>
      )}
      <table>
        <thead>
          <tr>
            <th>{t("standings")}</th>
            <th>{t("score")}</th>
            <th>{t("difference")}</th>
          </tr>
        </thead>
        <tbody>
          {[
            ...(best ? [{ name: t("previousBest"), score: best.score }] : []),
            ...rivals.map((r) => ({
              name: r.kind === "script" ? translate(msg.fields.bot, lang) : r.name,
              score: r.score,
            })),
          ].map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{money(row.score)}</td>
              <td>{score === null ? "—" : money(score - row.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaceReview
        {...{ history, rivals, best, t, money, reviewDay }}
        playerName={translate(msg.fields.player, lang)}
        scriptName={translate(msg.fields.bot, lang)}
      />
      {reports.some((r) => r.openingCash !== r.closingCash) && (
        <details>
          <summary>{t("cashEvents")}</summary>
          <table>
            <thead>
              <tr>
                <th>{t("day")}</th>
                <th>{t("results")}</th>
                <th>{t("cashChange")}</th>
                <th>{t("bank")}</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .filter((r) => r.openingCash !== r.closingCash)
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.day} · {clock(r.minute)}
                    </td>
                    <td>
                      <button className="receipt-link" onClick={() => openReport(r.id)}>
                        #{r.id} {r.line}
                      </button>
                    </td>
                    <td>{money(r.closingCash - r.openingCash)}</td>
                    <td>{money(r.closingCash)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
