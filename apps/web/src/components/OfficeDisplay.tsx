import type { Release, Report, Snapshot } from "games-common/benchmark";

import { memo } from "react";

import type { Lang, Translate } from "@/localization/messages";

import { timing } from "@/game/commands";
import { clock } from "@/scene/clock";
import { useClock } from "@/scene/useClock";
import { World } from "@/scene/World";
interface Props {
  state: Snapshot | null;
  release: Release;
  lang: Lang;
  line: string;
  reports: Report[];
  t: Translate;
  selectedSite: string | null;
  onSiteSelect: (id: string) => void;
  previewVerb: string;
}
export const OfficeDisplay = memo(function OfficeDisplay({
  state,
  release,
  lang,
  line,
  reports,
  t,
  selectedSite,
  onSiteSelect,
  previewVerb,
}: Props) {
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
  const estimate = timing(previewVerb, state);
  const shift = state ? state.closes - state.opens : 1;
  const spent = state ? Math.max(0, Math.min(1, ((time % 1440) - state.opens) / shift)) : 0;
  const preview = estimate ? Math.min(1 - spent, estimate.minutes / shift) : 0;
  return (
    <>
      <div className="surface">
        <World
          value={time}
          state={state}
          line={line}
          t={t}
          reports={reports}
          selectedSite={selectedSite}
          onSiteSelect={onSiteSelect}
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
        {estimate && <small className="clock-estimate">+{estimate.minutes} min</small>}
        <strong>{state ? clock(time) : "—"}</strong>
      </div>
    </>
  );
});
