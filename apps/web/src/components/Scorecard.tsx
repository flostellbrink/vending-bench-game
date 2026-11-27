import type { Snapshot, Rival, PersonalBest, Report } from "games-common/benchmark";

import { hasValue, type Optional } from "games-common/language";

import { msg } from "@/dictionary/index.ts";
import { rankedModels } from "@/game/model-rivals.ts";
import { type Money } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";

import { PaceReview } from "./PaceReview.tsx";
import "./financial-readouts.css";
interface Props {
  seed: number;
  state: Optional<Snapshot>;
  rivals: Rival[];
  best: Optional<PersonalBest>;

  reports: Report[];
  openReport: (id: number) => void;
  money: Money;
  history: number[];
  reviewDay: (day: number) => void;
  /** Who made this run's moves. */
  operator?: string;
}
function standingsTitle(state: Optional<Snapshot>) {
  if (!state?.over) {
    return msg.operator.standings();
  }
  return state.failed ? msg.operator.bankrupt() : msg.screen.complete();
}
/** Rows by score, highest first. Equal scores share a rank, and this run comes first among them. */
function standings({
  score,
  operator,
  best,
  models,
}: {
  score: Optional<number>;
  operator: string;
  best: Optional<PersonalBest>;
  models: Rival[];
}) {
  const rows = [
    ...(hasValue(score) ? [{ name: operator, player: true, score }] : []),
    ...(best ? [{ name: msg.operator.previousBest(), player: false, score: best.score }] : []),
    ...models.map((model) => ({ name: model.name, player: false, score: model.score })),
  ].toSorted((a, b) => b.score - a.score);
  return rows.map((row) => ({
    ...row,
    rank: rows.findIndex((other) => other.score === row.score) + 1,
  }));
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
  seed,
  state,
  rivals,
  best,
  reports,
  openReport,
  money,
  history,
  reviewDay,
  operator = msg.fields.player(),
}: Props) {
  const score = state?.final?.reward;
  const models = rankedModels(rivals);
  return (
    <section className="sheet scorecard">
      <h2>{standingsTitle(state)}</h2>
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
            <th>{msg.operator.rank()}</th>
            <th>{msg.operator.scoreOperator()}</th>
            <th>{msg.fields.score()}</th>
          </tr>
        </thead>
        <tbody>
          {standings({ best, models, operator, score }).map((row) => (
            <tr key={row.name} className={row.player ? "player-score" : undefined}>
              <td>{row.rank}</td>
              <th scope="row">{row.name}</th>
              <td>{row.player ? <strong>{money(row.score)}</strong> : money(row.score)}</td>
            </tr>
          ))}
          {!hasValue(score) && (
            <tr className="player-score">
              <td>—</td>
              <th scope="row">{operator}</th>
              <td>
                <strong>—</strong>
              </td>
            </tr>
          )}
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
        playerName={operator}
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
