import type { Actions, Release, Snapshot } from "games-common/benchmark";

import { entries } from "games-common/language";

import { commandGroups, local, syntax, toolFor } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { commandLabel, type Lang, type Translate } from "@/localization/messages";

import { GuiToolInfo } from "./GuiToolInfo";
interface Props {
  actions: Actions;
  release: Release;
  state: Snapshot | null;
  lang: Lang;
  t: Translate;
  openBrief: () => void;
}
export function CommandIndex({ actions, release, state, lang, t, openBrief }: Props) {
  const listed = new Set<string | undefined>(Object.values(commandGroups).flat().map(toolFor));
  return (
    <section className="sheet">
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
            .filter((v) => (toolFor(v) ?? "") in release.tools || (toolFor(v) ?? "") in actions)
            .map((v) => (
              <div className="manual" key={v}>
                <code>{syntax(v)}</code>
                <GuiToolInfo verb={v} />
                <span>{commandLabel(toolFor(v), lang)}</span>
                <small>{timeLabel(v, state, t)}</small>
              </div>
            ))}
        </section>
      ))}
      {Object.entries(release.tools)
        .filter(([tool]) => !listed.has(tool))
        .map(([tool, description]) => (
          <details key={tool}>
            <summary>
              <code>{tool}</code>
            </summary>
            <p lang="en">{description}</p>
          </details>
        ))}
      <h3>{t("local")}</h3>
      <p>{local.map(syntax).join(" · ")}</p>
    </section>
  );
}
