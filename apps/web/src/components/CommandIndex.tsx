import type { Actions, Snapshot } from "games-common/benchmark";

import { entries } from "games-common/language";

import { commandGroups, local, syntax, toolFor } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { commandLabel, type Lang, type Translate } from "@/localization/messages";
interface Props {
  actions: Actions;
  state: Snapshot | null;
  lang: Lang;
  t: Translate;
  openBrief: () => void;
}
export function CommandIndex({ actions, state, lang, t, openBrief }: Props) {
  return (
    <section className="sheet">
      <h2>{t("help")}</h2>
      <p>
        {t("notation")} ·{" "}
        <button className="receipt-link" onClick={openBrief}>
          {t("rules")}
        </button>
      </p>
      {entries(commandGroups).map(([group, names]) => (
        <section key={group}>
          <h3>{t(group)}</h3>
          {names
            .filter((v) => (toolFor(v) ?? "") in actions)
            .map((v) => (
              <div className="manual" key={v}>
                <code>{syntax(v)}</code>
                <span>{commandLabel(toolFor(v), lang)}</span>
                <small>{timeLabel(v, state, t)}</small>
              </div>
            ))}
        </section>
      ))}
      <h3>{t("local")}</h3>
      <p>{local.map(syntax).join(" · ")}</p>
    </section>
  );
}
