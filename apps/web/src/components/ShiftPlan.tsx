import type { Snapshot } from "games-common/benchmark";

import type { CommandLine } from "@/hooks/useCommandLine";
import type { Translate } from "@/localization/messages";

import { projectPlan } from "@/game/shift-plan";
import { clock } from "@/scene/clock";

import "./shift-plan.css";

interface Props {
  state: Snapshot;
  shell: CommandLine;
  busy: boolean;
  t: Translate;
}

export function ShiftPlan({ state, shell, busy, t }: Props) {
  const { steps, editing, dispatchFirst, editStep, removeStep, moveStep } = shell;
  const projected = projectPlan(steps, state);
  const first = projected[0]?.span;
  const tomorrow = projected.find(({ span }) => span && span.day > state.day);
  const available = state.closes - state.minute;
  const today = projected.filter(({ span }) => span?.day === state.day);
  const last = today.at(-1)?.span;
  const remaining = last && !last.rolls ? state.closes - last.to : 0;
  return (
    <section className="shift-plan" aria-label={t("shiftPlan")}>
      <header>
        <b>{t("shiftPlan")}</b>
        <button disabled={busy || state.over || editing !== null} onClick={dispatchFirst}>
          {t("dispatchNext")}
          {first && " · " + first.minutes + " min"}
        </button>
      </header>
      {available > 0 && (
        <div className="plan-ruler" aria-label={t("remaining")}>
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
          {t("next")} · {clock(tomorrow.span.from)} <b>{tomorrow.step.verb}</b>
        </p>
      ) : (
        <p className="plan-limit">
          {t("remaining")} · {remaining} min
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
                aria-label={t("editPlan") + ": " + step.line}
              >
                {step.line}
              </button>
              <button
                disabled={busy || index === 0}
                aria-label={t("planEarlier") + ": " + step.line}
                onClick={() => moveStep(step.id, -1)}
              >
                ↑
              </button>
              <button
                disabled={busy || index === steps.length - 1}
                aria-label={t("planLater") + ": " + step.line}
                onClick={() => moveStep(step.id, 1)}
              >
                ↓
              </button>
              <button
                disabled={busy}
                aria-label={t("removePlan") + ": " + step.line}
                onClick={() => removeStep(step.id)}
              >
                ×
              </button>
            </div>
            <small className={span?.rolls ? "plan-boundary" : "plan-time"}>
              {span
                ? t("day") +
                  " " +
                  span.day +
                  " · " +
                  clock(span.from) +
                  " → " +
                  (span.rolls
                    ? span.final
                      ? t("endRun")
                      : t("day") + " " + (span.day + 1) + " · " + clock(span.to)
                    : clock(span.to)) +
                  " · " +
                  span.minutes +
                  " min"
                : t("afterFinal")}
            </small>
            {span?.rolls && (
              <div className="shift-cut">
                <span>
                  {clock(state.closes)} · {t("shiftEnds")}
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
