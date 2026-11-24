import type { Snapshot, Rival, PersonalBest, Report } from "games-common/benchmark";

import { msg } from "@/dictionary";
import { rankedModels } from "@/game/model-rivals";
import { type Money } from "@/localization/messages";
import { clock } from "@/scene/clock";

import { PaceReview } from "./PaceReview";
import "./financial-readouts.css";
interface Props {
  embedded?: boolean;
  seed: number;
  state: Snapshot | null;
  rivals: Rival[];
  best: PersonalBest | null;

  reports: Report[];
  openReport: (id: number) => void;
  money: Money;
  history: number[];
  reviewDay: (day: number) => void;
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
  const score = state?.final?.reward ?? null;
  const models = rankedModels(rivals);
  return (
    <section className="sheet scorecard">
      {!embedded && (
        <h2>
          {state?.over
            ? state.failed
              ? msg.operator.bankrupt()
              : msg.screen.complete()
            : msg.operator.standings()}
        </h2>
      )}
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
              <strong>{score === null ? "—" : money(score)}</strong>
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
              <td>{score === null ? "—" : money(score - row.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="score-notes">
        {score === null && <p>{msg.operator.unfinished()}</p>}
        <p>{models.length ? msg.session.soloSeed({ seed }) : msg.operator.noRivals()}</p>
      </div>
      <PaceReview
        {...{ history, rivals, best, money, reviewDay }}
        playerName={msg.fields.player()}
        scriptName={msg.fields.bot()}
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
                  <tr key={r.id}>
                    <td>
                      {r.day} · {clock(r.minute)}
                    </td>
                    <td>
                      <button
                        aria-haspopup="dialog"
                        className="receipt-link"
                        onClick={() => openReport(r.id)}
                      >
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
