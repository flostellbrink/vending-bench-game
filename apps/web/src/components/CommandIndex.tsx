import type { Actions, Release, Snapshot } from "games-common/benchmark";

import { entries } from "games-common/language";
import { useState } from "react";

import { commandGroups, local, syntax, toolFor } from "@/game/commands";
import { timeLabel } from "@/game/time-label";
import { toolDefaults } from "@/game/tool-defaults";
import { commandLabel, type Lang, type Translate } from "@/localization/messages";

import "./command-manual.css";

interface Props {
  actions: Actions;
  release: Release;
  state: Snapshot | null;
  lang: Lang;
  t: Translate;
}

export function CommandIndex({ actions, release, state, lang, t }: Props) {
  const [choice, choose] = useState("search_web");
  const groups = entries(commandGroups).map(([key, names]) => ({
    label: t(key),
    names: names.filter((name) => name in release.tools || name in actions),
  }));
  const mapped = new Set<string>(groups.flatMap((group) => group.names));
  const other = Object.keys(release.tools).filter((tool) => !mapped.has(tool));
  const sections = [
    ...groups,
    { label: t("toolInformation"), names: other },
    { label: t("local"), names: local },
  ].filter((g) => g.names.length > 0);
  const selected = sections.some((s) => s.names.some((name) => name === choice))
    ? choice
    : (sections[0]?.names[0] ?? "help");
  const tool = selected === "help" ? undefined : selected;
  const description = tool ? release.tools[tool] : undefined;
  const defaults = toolDefaults(release, tool);
  return (
    <section className="command-manual">
      <nav className="manual-index" aria-label={t("help")}>
        {sections.map((section) => (
          <section key={section.label}>
            <h3>{section.label}</h3>
            <div>
              {section.names.map((name) => (
                <button
                  type="button"
                  key={name}
                  aria-pressed={name === selected}
                  onClick={() => choose(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>
      <article className="manual-page" aria-live="polite">
        <header>
          <h3>{selected}</h3>
          <span>{tool ? commandLabel(toolFor(tool), lang) : t("help")}</span>
        </header>
        <pre>{syntax(selected, actions)}</pre>
        <dl>
          <div>
            <dt>{t("timeCost")}</dt>
            <dd>{timeLabel(selected, state, t)}</dd>
          </div>
        </dl>
        {defaults && (
          <small>
            {t("defaults")}: <code>{defaults}</code>
          </small>
        )}
        {description && <p lang="en">{description}</p>}
        {!other.includes(selected) && <small>{t("notation")}</small>}
      </article>
    </section>
  );
}
