import type { Release, Report, Snapshot } from "games-common/benchmark";

import { hasValue, hoursPerDay, msPerDay, type Optional } from "games-common/language";
import { memo, useState } from "react";

import { msg } from "@/dictionary/index.ts";
import { timing } from "@/game/commands.ts";
import { useFormatters } from "@/localization/formatters.ts";
import { commandLabel } from "@/localization/messages.ts";
import { clock } from "@/scene/clock.ts";
import { useClock } from "@/scene/useClock.ts";
import { World } from "@/scene/World.tsx";

import { GuiToolInfo } from "./GuiToolInfo.tsx";

const minutesPerDay = hoursPerDay * 60;
interface Props {
  state: Optional<Snapshot>;
  release: Release;

  reports: Report[];

  sceneObject: Optional<string>;
  onOpen: (id: string) => void;
  previewVerb: string;
  disabled: boolean;
  closeDay: () => void;
}
export const OfficeDisplay = memo(function OfficeDisplay({
  state,
  release,
  reports,
  sceneObject,
  onOpen,
  previewVerb,
  disabled,
  closeDay,
}: Props) {
  const { date: dateFormat } = useFormatters();
  const [armedAt, setArmedAt] = useState<Optional<number>>(null);
  const targetTime = state ? state.day * minutesPerDay + state.minute : null;
  const armed = hasValue(armedAt) && armedAt === targetTime;
  const last = reports.at(-1);
  const visitEnd =
    state && last && last.endDay > last.day && (last.args.machine_id || last.args.slot)
      ? (last.day - 1) * minutesPerDay + state.closes
      : undefined;
  const time = useClock(state, visitEnd);
  const day = Math.floor(time / minutesPerDay);
  const date =
    state?.startDate && dateFormat.format(Date.parse(`${state.startDate}T00:00Z`) + day * msPerDay);
  const estimate = timing(armed ? "wait_for_next_day" : previewVerb, state);
  const shift = state ? state.closes - state.opens : 1;
  const spent = state
    ? Math.max(0, Math.min(1, ((time % minutesPerDay) - state.opens) / shift))
    : 0;
  const preview = estimate ? Math.min(1 - spent, estimate.minutes / shift) : 0;
  return (
    <>
      <div className="surface">
        <World
          value={time}
          state={state}

          reports={reports}
          sceneObject={sceneObject}
          onOpen={onOpen}
        />
      </div>
      <div className="transport">
        <b>
          {state
            ? `${msg.operator.day()} ${Math.min(release.days, day + 1)} / ${release.days}`
            : "—"}
        </b>
        <span>{date}</span>
        {state && (
          <div className="shift">
            <small>{clock(state.opens)}</small>
            <div className="shift-track" aria-hidden="true">
              <i style={{ width: `${spent * 100}%` }} />
              <i className="shift-preview" style={{ width: `${preview * 100}%` }} />
            </div>
            <small>{clock(state.closes)}</small>
          </div>
        )}
        <strong>{state ? clock(time) : "—"}</strong>
        <GuiToolInfo
          verb="wait_for_next_day"
          className="clock-close"
          type="button"
          armed={armed}
          disabled={disabled || !state || state.over}
          title={
            state
              ? `${
                  state.day === state.days
                    ? msg.operator.endRun()
                    : commandLabel("wait_for_next_day")
                } · ${state.closes - state.minute} min`
              : undefined
          }
          onBlur={() => setArmedAt(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setArmedAt(null);
            }
            if (event.repeat && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
            }
          }}
          onClick={() => {
            if (!armed) {
              setArmedAt(targetTime);
              return;
            }
            setArmedAt(null);
            closeDay();
          }}
        >
          <span className="clock-label">
            <span aria-hidden={armed}>{commandLabel("wait_for_next_day")}</span>
            <span aria-hidden={!armed}>{msg.operator.confirmClose()}</span>
          </span>
        </GuiToolInfo>
      </div>
    </>
  );
});
