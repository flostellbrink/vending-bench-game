import type { Snapshot } from "games-common/benchmark";

import type { CommandLine } from "@/hooks/useCommandLine";

import { msg } from "@/dictionary";
import { projectPlan } from "@/game/shift-plan";
import { clock } from "@/scene/clock";

import "./shift-plan.css";

interface Props {
  state: Snapshot;
  shell: CommandLine;
  busy: boolean;
}

export function ShiftPlan({ state, shell, busy }: Props) {
  const { steps, editing, dispatchFirst, editStep, removeStep, moveStep } = shell;
  const projected = projectPlan(steps, state);
  const first = projected[0]?.span;
  const tomorrow = projected.find(({ span }) => span && span.day > state.day);
  const available = state.closes - state.minute;
  const today = projected.filter(({ span }) => span?.day === state.day);
  const last = today.at(-1)?.span;
  const remaining = last && !last.rolls ? state.closes - last.to : 0;
  return (
    <section className="shift-plan" aria-label={msg.operator.shiftPlan()}>
      <header>
        <b>{msg.operator.shiftPlan()}</b>
        <button disabled={busy || state.over || editing !== null} onClick={dispatchFirst}>
          {msg.operator.dispatchNext()}
          {first && " · " + first.minutes + " min"}
        </button>
      </header>
      {available > 0 && (
        <div className="plan-ruler" aria-label={msg.operator.remaining()}>
          <small>{clock(state.minute)}</small>
          <div className="plan-segments">
            {today.map(({ step, span }, i) => {
              if (!span) return null;
              const minutes = (span.rolls ? state.closes : span.to) - span.from;
              return (
                <i
                  key={step.id}
                  style={{ width: (100 * minutes) / available + "%" }}
                  title={step.line + " · " + span.minutes + " min"}
                >
                  {i + 1}
                </i>
              );
            })}
          </div>
          <small>{clock(state.closes)}</small>
        </div>
      )}
      {tomorrow?.span ? (
        <p className="plan-limit">
          {msg.operator.next()} · {clock(tomorrow.span.from)} <b>{tomorrow.step.verb}</b>
        </p>
      ) : (
        <p className="plan-limit">
          {msg.operator.remaining()} · {remaining} min
        </p>
      )}
      <ol>
        {projected.map(({ step, span }, index) => (
          <li key={step.id}>
            <div className="planned-line">
              <small>{index + 1}</small>
              <button
                className="planned-command"
                onClick={() => editStep(step)}
                disabled={busy}
                aria-label={msg.operator.editPlan() + ": " + step.line}
              >
                {step.line}
              </button>
              <button
                disabled={busy || index === 0}
                aria-label={msg.operator.planEarlier() + ": " + step.line}
                onClick={() => moveStep(step.id, -1)}
              >
                ↑
              </button>
              <button
                disabled={busy || index === steps.length - 1}
                aria-label={msg.operator.planLater() + ": " + step.line}
                onClick={() => moveStep(step.id, 1)}
              >
                ↓
              </button>
              <button
                disabled={busy}
                aria-label={msg.operator.removePlan() + ": " + step.line}
                onClick={() => removeStep(step.id)}
              >
                ×
              </button>
            </div>
            <small className={span?.rolls ? "plan-boundary" : "plan-time"}>
              {span
                ? msg.operator.day() +
                  " " +
                  span.day +
                  " · " +
                  clock(span.from) +
                  " → " +
                  (span.rolls
                    ? span.final
                      ? msg.operator.endRun()
                      : msg.operator.day() + " " + (span.day + 1) + " · " + clock(span.to)
                    : clock(span.to)) +
                  " · " +
                  span.minutes +
                  " min"
                : msg.operator.afterFinal()}
            </small>
            {span?.rolls && (
              <div className="shift-cut">
                <span>
                  {clock(state.closes)} · {msg.operator.shiftEnds()}
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
