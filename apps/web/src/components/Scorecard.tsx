import type { Snapshot, Rival, PersonalBest, Report } from "games-common/benchmark";

import { hasValue, type Optional } from "games-common/language";

import { msg } from "@/dictionary/index.ts";
import { rankedModels } from "@/game/model-rivals.ts";
import { type Money } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";

import { PaceReview } from "./PaceReview.tsx";
import "./financial-readouts.css";
interface Props {
  embedded?: boolean;
  seed: number;
  state: Optional<Snapshot>;
  rivals: Rival[];
  best: Optional<PersonalBest>;

  reports: Report[];
  openReport: (id: number) => void;
  money: Money;
  history: number[];
  reviewDay: (day: number) => void;
}
function standingsTitle(state: Optional<Snapshot>) {
  if (!state?.over) {
    return msg.operator.standings();
  }
  return state.failed ? msg.operator.bankrupt() : msg.screen.complete();
}
function CashEventRow({
  report,
  money,
  openReport,
}: {
  report: Report;
  money: Money;
  openReport: (id: number) => void;
}) {
  return (
    <tr>
      <td>
        {report.day} · {clock(report.minute)}
      </td>
      <td>
        <button
          aria-haspopup="dialog"
          className="receipt-link"
          onClick={() => openReport(report.id)}
        >
          #{report.id} {report.line}
        </button>
      </td>
      <td>{money(report.closingCash - report.openingCash)}</td>
      <td>{money(report.closingCash)}</td>
    </tr>
  );
}
export function Scorecard({
  embedded,
  seed,
  state,
  rivals,
  best,
  reports,
  openReport,
  money,
  history,
  reviewDay,
}: Props) {
  const score = state?.final?.reward;
  const models = rankedModels(rivals);
  return (
    <section className="sheet scorecard">
      {!embedded && <h2>{standingsTitle(state)}</h2>}
      {state?.final && (
        <dl className="end-totals">
          <div>
            <dt>{msg.operator.revenue()}</dt>
            <dd>{money(state.final.gross_revenue)}</dd>
          </div>
          <div>
            <dt>{msg.operator.siteFees()}</dt>
            <dd>{money(state.final.fees_paid)}</dd>
          </div>
          <div>
            <dt>{msg.operator.units()}</dt>
            <dd>{state.final.units_sold}</dd>
          </div>
        </dl>
      )}
      <table className="score-ranking">
        <thead>
          <tr>
            <th>{msg.operator.scoreOperator()}</th>
            <th>{msg.fields.score()}</th>
            <th>{msg.operator.difference()}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="player-score">
            <th scope="row">{msg.fields.player()}</th>
            <td>
              <strong>{hasValue(score) ? money(score) : "—"}</strong>
            </td>
            <td>—</td>
          </tr>
          {[
            ...(best ? [{ name: msg.operator.previousBest(), score: best.score }] : []),
            ...models.map((r) => ({ name: r.name, score: r.score })),
          ].map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{money(row.score)}</td>
              <td>{hasValue(score) ? money(score - row.score) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="score-notes">
        {!hasValue(score) && <p>{msg.operator.unfinished()}</p>}
        <p>{models.length ? msg.session.soloSeed({ seed }) : msg.operator.noRivals()}</p>
      </div>
      <PaceReview
        best={best}
        history={history}
        money={money}
        reviewDay={reviewDay}
        rivals={rivals}
        playerName={msg.fields.player()}
      />
      {reports.some((r) => r.openingCash !== r.closingCash) && (
        <details>
          <summary>{msg.operator.cashEvents()}</summary>
          <table>
            <thead>
              <tr>
                <th>{msg.operator.day()}</th>
                <th>{msg.operator.results()}</th>
                <th>{msg.operator.cashChange()}</th>
                <th>{msg.operator.bank()}</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .filter((r) => r.openingCash !== r.closingCash)
                .map((r) => (
                  <CashEventRow key={r.id} report={r} money={money} openReport={openReport} />
                ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
