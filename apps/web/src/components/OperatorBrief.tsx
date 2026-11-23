import type { Release, Snapshot } from "games-common/benchmark";

import type { Translate, Money } from "@/localization/messages";

import { operatorText } from "@/game/commands";
import { clock } from "@/scene/clock";

interface Props {
  release: Release;
  state: Snapshot | null;
  t: Translate;
  money: Money;
}
export function OperatorBrief({ release, state, t, money }: Props) {
  return (
    <section className="sheet brief">
      <h2>
        {t("rules")} · {release.id}
      </h2>
      {state && (
        <p>
          {t("day")} {state.days} · {clock(state.opens)}–{clock(state.closes)} · {t("fee")}{" "}
          {money(state.fee)}
        </p>
      )}
      {operatorText(release.brief)
        .split(/\n\s*\n/)
        .map((section) => {
          const clean = section.trim().replaceAll("**", "");
          return /^\*\*[^*]+\*\*$/.test(section.trim()) ? (
            <h3 key={section} lang="en">
              {clean}
            </h3>
          ) : (
            <p key={section} lang="en">
              {clean.replace(/\n(?!-)/g, " ")}
            </p>
          );
        })}
    </section>
  );
}
