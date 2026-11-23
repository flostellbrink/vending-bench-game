import type { Snapshot } from "games-common/benchmark";

import type { Translate } from "@/localization/messages";

import { timing } from "@/game/commands";
import { clock } from "@/scene/clock";

export function timeLabel(verb: string, state: Snapshot | null, t: Translate): string {
  if (!state) return t("noCharge");
  const span = timing(verb, state);
  if (!span) return t("noCharge");
  const end = span.rolls
    ? (state.day === state.days ? t("endRun") : t("next")) + " " + clock(span.to)
    : clock(span.to);
  return span.minutes + " min · " + clock(span.from) + " → " + end;
}
