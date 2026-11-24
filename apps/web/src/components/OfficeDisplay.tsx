import type { Release, Report, Snapshot } from "games-common/benchmark";

import { memo, useState } from "react";

import type { Lang, Translate } from "@/localization/messages";

import { timing } from "@/game/commands";
import { clock } from "@/scene/clock";
import { useClock } from "@/scene/useClock";
import { World } from "@/scene/World";

import { GuiToolInfo } from "./GuiToolInfo";
interface Props {
  state: Snapshot | null;
  release: Release;
  lang: Lang;
  reports: Report[];
  t: Translate;
  sceneObject: string | null;
  onOpen: (id: string) => void;
  previewVerb: string;
  disabled: boolean;
  closeDay: () => void;
}
export const OfficeDisplay = memo(function OfficeDisplay({
  state,
  release,
  lang,
  reports,
  t,
  sceneObject,
  onOpen,
  previewVerb,
  disabled,
  closeDay,
}: Props) {
  const [armedAt, arm] = useState<number | null>(null);
  const targetTime = state ? state.day * 1440 + state.minute : null;
  const armed = armedAt !== null && armedAt === targetTime;
  const last = reports.at(-1);
  const visitEnd =
    state && last && last.endDay > last.day && (last.args.machine_id || last.args.slot)
      ? (last.day - 1) * 1440 + state.closes
      : undefined;
  const time = useClock(state, visitEnd);
  const day = Math.floor(time / 1440);
  const date =
    state?.startDate &&
    new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(
      Date.parse(state.startDate + "T00:00Z") + day * 86400000,
    );
  const estimate = timing(armed ? "wait_for_next_day" : previewVerb, state);
  const shift = state ? state.closes - state.opens : 1;
  const spent = state ? Math.max(0, Math.min(1, ((time % 1440) - state.opens) / shift)) : 0;
  const preview = estimate ? Math.min(1 - spent, estimate.minutes / shift) : 0;
  return (
    <>
      <div className="surface">
        <World
          value={time}
          state={state}
          t={t}
          reports={reports}
          sceneObject={sceneObject}
          onOpen={onOpen}
        />
      </div>
      <div className="transport">
        <b>
          {state ? t("day") + " " + Math.min(release.days, day + 1) + " / " + release.days : "—"}
        </b>
        <span>{date}</span>
        {state && (
          <div className="shift">
            <small>{clock(state.opens)}</small>
            <div className="shift-track" aria-hidden="true">
              <i style={{ width: spent * 100 + "%" }} />
              <i className="shift-preview" style={{ width: preview * 100 + "%" }} />
            </div>
            <small>{clock(state.closes)}</small>
          </div>
        )}
        <strong>{state ? clock(time) : "—"}</strong>
        <GuiToolInfo verb="wait_for_next_day">
          <button
            className="clock-close"
            type="button"
            data-clock-verb="wait_for_next_day"
            data-armed={armed}
            disabled={disabled || !state || state.over}
            title={
              state
                ? (state.day === state.days ? t("endRun") : t("closeShift")) +
                  " · " +
                  (state.closes - state.minute) +
                  " min"
                : undefined
            }
            onBlur={() => arm(null)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                arm(null);
              }
              if (event.repeat && (event.key === "Enter" || event.key === " "))
                event.preventDefault();
            }}
            onClick={() => {
              if (!armed) {
                arm(targetTime);
                return;
              }
              arm(null);
              closeDay();
            }}
          >
            <span className="clock-label">
              <span aria-hidden={armed}>{t("closeShift")}</span>
              <span aria-hidden={!armed}>{t("confirmClose")}</span>
            </span>
          </button>
        </GuiToolInfo>
      </div>
    </>
  );
});
